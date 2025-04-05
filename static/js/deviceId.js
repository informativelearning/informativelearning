// static/js/deviceId.js
(function() {
  console.log("deviceId.js executing...");
  const STORAGE_KEY = 'deviceId';
  let currentDeviceId = localStorage.getItem(STORAGE_KEY);
  
  // Function to generate a simple unique ID
  function generateUniqueId() {
      const timestamp = Date.now();
      // Basic random string (or use crypto.randomUUID() if always available)
      const randomPart = Math.random().toString(36).substring(2, 10);
      const newId = `device-${timestamp}-${randomPart}`;
      console.log("Generated new device ID:", newId);
      return newId;
  }
  
  // Function to register the device with the backend
  async function registerDeviceOnServer(idToRegister) {
      console.log(`Attempting to register device ID: ${idToRegister} with server...`);
      try {
          const response = await fetch('/api/register-device', { // Calls the public API route
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({ deviceId: idToRegister })
          });
          
          const result = await response.json(); // Read response body
          
          if (!response.ok) {
              // Log non-OK HTTP statuses (like 400, 500)
              console.error(`Server registration failed with status ${response.status}:`, result.error || 'Unknown server error');
          } else if (result.success) {
              console.log(`Server registration success: ${result.message || 'OK'}`);
              // Optionally update UI based on result.modified if needed
          } else {
               // Handle cases where result.success might be false even with 200 OK
               console.warn('Server registration response indicated potential issue:', result);
          }
      } catch (error) {
          console.error('Network or fetch error during device registration:', error);
          // Handle network errors (e.g., server down, CORS issues if domains mismatch)
          // Maybe retry later? For now, just log it.
      }
  }
  
  // Main logic
  if (!currentDeviceId) {
      currentDeviceId = generateUniqueId();
      localStorage.setItem(STORAGE_KEY, currentDeviceId);
      // Register the *new* device immediately
      registerDeviceOnServer(currentDeviceId);
  } else {
      console.log("Found existing device ID:", currentDeviceId);
      // Always register the device on page load to ensure it's in the system
      // This helps if previous registration attempts failed
      registerDeviceOnServer(currentDeviceId);
  }
  
  // Make the ID globally available for other scripts (like verify.js)
  window.deviceId = currentDeviceId;
  console.log("window.deviceId set to:", window.deviceId);
  
  // Optional: Display ID somewhere for the user (e.g., if an element with id="userDeviceIdDisplay" exists)
  document.addEventListener('DOMContentLoaded', function() {
      const displayElement = document.getElementById('userDeviceIdDisplay');
      if (displayElement) {
          displayElement.textContent = `Your Device ID: ${currentDeviceId}`;
          displayElement.style.wordBreak = 'break-all'; // Help with long IDs
      }
  });
})(); // Immediately invoke the function