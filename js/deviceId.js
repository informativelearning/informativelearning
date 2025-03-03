console.log('DeviceID script starting...'); // Debug log

(function() {
    function generateId() {
        try {
            const timestamp = Date.now();
            let random = Math.random().toString(36).substring(2, 10);
            return `MSL-${timestamp}-${random}`;
        } catch (error) {
            console.error('Error generating ID:', error);
            return null;
        }
    }

    function updateUI(deviceId) {
        try {
            // Get UI elements
            const idElement = document.getElementById('device-id');
            const statusElement = document.getElementById('verification-status');
            const accessElement = document.getElementById('access-time');

            console.log('Found elements:', {
                idElement: !!idElement,
                statusElement: !!statusElement,
                accessElement: !!accessElement
            });

            // Update device ID
            if (idElement) {
                idElement.textContent = deviceId || 'Error';
            }

            // Update status
            if (statusElement) {
                statusElement.textContent = 'Active';
                statusElement.className = 'status-verified';
            }

            // Update access time
            if (accessElement) {
                accessElement.textContent = new Date().toLocaleString();
            }
        } catch (error) {
            console.error('Error updating UI:', error);
        }
    }

    function init() {
        console.log('Initializing device ID...'); // Debug log
        try {
            // Try to get existing device ID
            let deviceId = localStorage.getItem('deviceId');
            
            // Generate new ID if none exists
            if (!deviceId) {
                deviceId = generateId();
                if (deviceId) {
                    localStorage.setItem('deviceId', deviceId);
                }
            }

            console.log('Device ID:', deviceId); // Debug log
            updateUI(deviceId);

        } catch (error) {
            console.error('Error in init:', error);
            updateUI(null);
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();