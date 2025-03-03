// deviceId.js

(function() {
    function generateId() {
        try {
            const timestamp = Date.now();
            let random = '';
            
            if (window.crypto && crypto.getRandomValues) {
                const array = new Uint8Array(4);
                crypto.getRandomValues(array);
                random = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
            } else {
                random = Math.random().toString(36).substring(2, 10);
            }
            
            return `DEV-${timestamp}-${random}`;
        } catch (error) {
            console.error('Error generating ID:', error);
            return `DEV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
    }

    function initDeviceId() {
        try {
            // Get or create device ID
            let deviceId = localStorage.getItem('deviceId');
            if (!deviceId) {
                deviceId = generateId();
                localStorage.setItem('deviceId', deviceId);
            }

            // Update UI elements
            const idElement = document.getElementById('device-id');
            const statusElement = document.getElementById('verification-status');
            const accessElement = document.getElementById('access-time');

            if (idElement) idElement.textContent = deviceId;
            if (statusElement) statusElement.textContent = 'Active';
            if (accessElement) accessElement.textContent = new Date().toLocaleString();

            // Add verification status
            const isVerified = localStorage.getItem('verified') === 'true';
            if (statusElement) {
                statusElement.textContent = isVerified ? 'Verified' : 'Unverified';
                statusElement.className = isVerified ? 'status-verified' : 'status-unverified';
            }

            console.log('Device ID initialized:', deviceId);
        } catch (error) {
            console.error('Failed to initialize device ID:', error);
            // Show error in UI
            const elements = ['device-id', 'verification-status', 'access-time'];
            elements.forEach(id => {
                const element = document.getElementById(id);
                if (element) element.textContent = 'Error loading';
            });
        }
    }

    // Initialize when DOM is fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDeviceId);
    } else {
        initDeviceId();
    }
})();