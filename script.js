// Get elements
const galleryButton = document.getElementById('gallery-button');
const popup = document.getElementById('gallery-popup');
const backButton = document.getElementById('back-button');
const startSessionButton = document.getElementById('start-session');
const portraitContainer = document.getElementById('portrait-container');
const container = document.querySelector('.container');
const player = document.getElementById('player');
const captureButton = document.getElementById('photo-capture-button');
const canvas = document.getElementById('output');
const context = canvas.getContext('2d');
const popupContent = document.querySelector('.popup-content');
const switchCameraButton = document.getElementById('switch-camera');
const flashToggleButton = document.getElementById('flash-toggle');
let cameraStream;
let currentCamera = 'environment'; // 'environment' for back camera, 'user' for front camera

let db;

// Function to request camera permissions
async function requestCameraPermission() {
    try {
        const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
        player.srcObject = cameraStream;
        return true;
    } catch (error) {
        showError("Camera permission denied.");
        return false;
    }
}

// Function to request location permissions
function requestLocationPermission() {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => resolve(position),
                (error) => {
                    let errorMessage;
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = "Permission denied.";
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = "Position unavailable.";
                            break;
                        case error.TIMEOUT:
                            errorMessage = "Request timed out.";
                            break;
                        default:
                            errorMessage = "An unknown error occurred.";
                            break;
                    }
                    reject(new Error(errorMessage));
                }
            );
        } else {
            reject(new Error("Geolocation not supported."));
        }
    });
}

// Function to get address from coordinates
async function getAddressFromCoordinates(lat, lon) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.display_name) {
            return data.display_name;
        } else {
            return "No address found.";
        }
    } catch (error) {
        return "Error getting address.";
    }
}

function initDB() {
    let request = indexedDB.open("cleanCamDB", 1);

    request.onerror = function(event) {
        console.log("Error opening DB", event);
    };

    request.onsuccess = function(event) {
        db = event.target.result;
        console.log("DB opened", db);
    };

    request.onupgradeneeded = function(event) {
        db = event.target.result;
        let objectStore = db.createObjectStore("photos", { autoIncrement: true });
        console.log("Object store created", objectStore);
    };
}

initDB();

// Start new session
startSessionButton.addEventListener('click', async function() {
    const cameraPermission = await requestCameraPermission();
    const locationPermission = await requestLocationPermission().catch((error) => {
        showError(error.message);
        return false;
    });

    if (cameraPermission && locationPermission) {
        container.style.display = 'none';
        portraitContainer.style.display = 'flex';
        startVideoStream();
    } else {
        showError("Permissions are required to start the session.");
    }
});

// Start video stream
function startVideoStream() {
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            player.srcObject = stream;
        });
}

// Capture photo
captureButton.addEventListener('click', () => {
    // Draw the video frame to the canvas
    canvas.width = player.videoWidth;
    canvas.height = player.videoHeight;
    context.drawImage(player, 0, 0, canvas.width, canvas.height);

    // Get the data URL of the captured image
    const dataUrl = canvas.toDataURL('image/png');

    // Store the captured photo in IndexedDB
    storePhoto(dataUrl);
});

// Store photo in IndexedDB
function storePhoto(photo) {
    let transaction = db.transaction(["photos"], "readwrite");
    let objectStore = transaction.objectStore("photos");
    let request = objectStore.add({ image: photo });

    request.onsuccess = function(event) {
        console.log("Photo stored", event);
    };

    request.onerror = function(event) {
        console.log("Error storing photo", event);
    };
}

// Show gallery popup
galleryButton.addEventListener('click', () => {
    popup.classList.add('show');
    displayGalleryPhotos();
});

// Hide gallery popup
backButton.addEventListener('click', () => {
    popup.classList.remove('show');
});

// Display photos in the gallery popup
function displayGalleryPhotos() {
    popupContent.innerHTML = ''; // Clear the current content

    let transaction = db.transaction(["photos"], "readonly");
    let objectStore = transaction.objectStore("photos");
    let request = objectStore.getAll();

    request.onsuccess = function(event) {
        let photos = event.target.result;

        photos.forEach(photo => {
            const imgElement = document.createElement('img');
            imgElement.src = photo.image;
            imgElement.style.width = '100px'; // You can adjust the size
            imgElement.style.margin = '10px'; // You can adjust the spacing
            popupContent.appendChild(imgElement);
        });
    };

    request.onerror = function(event) {
        console.log("Error retrieving photos", event);
    };
}

function showError(message) {
    alert(message); // Simple error handling for demonstration
}

// Toggle Flash
flashToggleButton.addEventListener('click', async () => {
    try {
        const track = cameraStream.getVideoTracks()[0];
        const capabilities = track.getCapabilities();
        
        if (!capabilities.torch) {
            console.log('Torch (flash) not available');
            return;
        }
        
        const mode = track.getSettings().torch ? false : true;
        await track.applyConstraints({ torch: mode });
        flashToggleButton.classList.toggle('active', mode);
    } catch (error) {
        console.error('Error toggling flash', error);
    }
});

// Switch Camera
switchCameraButton.addEventListener('click', async () => {
    const videoConstraints = {
        video: {
            facingMode: { exact: currentCamera === 'environment' ? 'user' : 'environment' }
        }
    };

    try {
        cameraStream = await navigator.mediaDevices.getUserMedia(videoConstraints);
        player.srcObject = cameraStream;
        currentCamera = currentCamera === 'environment' ? 'user' : 'environment';
    } catch (error) {
        console.log('Error switching camera', error);
    }
});

// Function to start the default camera (back camera)
async function startDefaultCamera() {
    const videoConstraints = {
        video: {
            facingMode: 'environment'
        }
    };

    try {
        cameraStream = await navigator.mediaDevices.getUserMedia(videoConstraints);
        player.srcObject = cameraStream;
    } catch (error) {
        console.log('Error starting default camera', error);
    }
}

// Call the function to start the default camera when the page loads
startDefaultCamera();
