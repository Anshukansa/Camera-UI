document.getElementById('start-session').addEventListener('click', function() {
    document.querySelector('.container').style.display = 'none';
    document.getElementById('portrait-container').style.display = 'flex';
    startVideoStream();
});

function startVideoStream() {
    const player = document.getElementById('player');
    const captureButton = document.getElementById('capture-button');
    const canvas = document.getElementById('output');
    const context = canvas.getContext('2d');

    // Get access to the camera
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            player.srcObject = stream;
        });

    captureButton.addEventListener('click', () => {
        // Draw the video frame to the canvas
        canvas.width = player.videoWidth;
        canvas.height = player.videoHeight;
        context.drawImage(player, 0, 0, canvas.width, canvas.height);

        // Optional: You can save the canvas image as a file or display it somewhere
        const dataUrl = canvas.toDataURL('image/png');
        console.log(dataUrl); // For demonstration purposes
    });
}
