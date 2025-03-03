(function() {
  /**
   * Check if the Crypto API is available
   * @returns {boolean}
   */
  function isCryptoAvailable() {
    return !!(window.crypto && window.crypto.getRandomValues);
  }

  /**
   * Generates random bytes using Crypto API
   * @param {number} length - Number of bytes to generate
   * @returns {Uint8Array}
   */
  function getSecureRandomBytes(length) {
    try {
      const array = new Uint8Array(length);
      window.crypto.getRandomValues(array);
      return array;
    } catch (error) {
      console.warn('Crypto API failed:', error);
      return null;
    }
  }

  /**
   * Generates a secure random device ID
   * @returns {string}
   */
  function generateDeviceId() {
    const timestamp = Date.now();
    let randomPart = '';

    if (isCryptoAvailable()) {
      const randomArray = getSecureRandomBytes(8);
      if (randomArray) {
        randomPart = Array.from(randomArray, byte =>
          byte.toString(16).padStart(2, '0')
        ).join('');
      } else {
        // Fallback if getRandomValues fails
        randomPart = Math.random().toString(36).substr(2, 9);
      }
    } else {
      // Fallback for old browsers
      randomPart = Math.random().toString(36).substr(2, 9);
      console.warn('Crypto API not available, using Math.random() fallback');
    }

    return `device-${timestamp}-${randomPart}`;
  }

  // Initialize device ID
  try {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = generateDeviceId();
      localStorage.setItem('deviceId', deviceId);
    }

    // Make deviceId available globally
    window.deviceId = deviceId;
    console.log("Device ID:", deviceId);
    
    // Optional display
    const displayElement = document.getElementById('device-id');
    if (displayElement) {
      displayElement.textContent = deviceId;
    }
  } catch (error) {
    console.error('Failed to initialize device ID:', error);
  }
})();
