// Access control verification
// - Checks if device ID exists in localStorage
// - Verifies device authorization with server via /check-verification
// - Redirects unauthorized users to index.html 
// - Used on premium content pages to restrict access

(function() {
    // Get the device ID from localStorage
    const deviceId = localStorage.getItem('deviceId');

    // If no deviceId exists, redirect to index.html
    if (!deviceId) {
        window.location.href = 'index.html';
        return;
    }

    // Check verification status with the server
    fetch(`/check-verification?deviceId=${deviceId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        // If the device is not verified, redirect to index.html
        if (!data.verified) {
            window.location.href = 'index.html';
        }
        // If verified, do nothing (allow page to load)
    })
    .catch(error => {
        console.error('Verification check failed:', error);
        // On error, redirect to index.html for safety
        window.location.href = 'index.html';
    });
})();