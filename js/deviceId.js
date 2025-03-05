// deviceId.js

(function() {
    /**
     * Generates a secure random device ID.
     * Uses the Crypto API if available, otherwise falls back to Math.random.
     */
    function generateDeviceId() {
      const timestamp = Date.now();
      let randomPart = '';
  
      if (window.crypto && crypto.getRandomValues) {
        // Generate 8 random bytes and convert them to a hexadecimal string.
        const randomArray = new Uint8Array(8);
        crypto.getRandomValues(randomArray);
        randomPart = Array.from(randomArray, byte =>
          byte.toString(16).padStart(2, '0')
        ).join('');
      } else {
        // Fallback for environments without crypto support.
        randomPart = Math.random().toString(36).substr(2, 9);
      }
  
      return `device-${timestamp}-${randomPart}`;
    }
  
    // Check if a device ID already exists in localStorage.
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = generateDeviceId();
      localStorage.setItem('deviceId', deviceId);
    }
  
    // Optionally log the device ID.
    console.log("Device ID:", deviceId);
  
    // Optionally display the device ID if an element with id "device-id" exists.
    const displayElement = document.getElementById('device-id');
    if (displayElement) {
      displayElement.textContent = deviceId;
    }

    // Make deviceId available globally
    window.deviceId = deviceId;

    // Register device with server
    fetch('https://informativecourses.fly.dev/register-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId })
    })
    .then(response => response.text())
    .then(data => {
        console.log('Registration response:', data);
        // Update UI if needed
        if (displayElement) {
            displayElement.textContent = `${deviceId} (Registered)`;
        }
    })
    .catch(error => {
        console.error('Registration error:', error);
        if (displayElement) {
            displayElement.textContent = `${deviceId} (Registration Failed)`;
        }
    });
})();