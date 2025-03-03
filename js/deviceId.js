// deviceId.js

(function() {
    const STORAGE_KEY = 'deviceId';
    const VERIFIED_KEY = 'verified';
    const ACCESS_WINDOW_KEY = 'accessWindow';
    
    class DeviceManager {
        constructor() {
            this.deviceId = null;
            this.verificationStatus = false;
            this.lastAccessTime = null;
        }

        init() {
            try {
                this.deviceId = this.getOrCreateDeviceId();
                this.verificationStatus = this.loadVerificationStatus();
                this.lastAccessTime = this.loadLastAccessTime();
                this.updateUI();
                console.debug('Device Manager initialized:', { 
                    deviceId: this.deviceId,
                    verified: this.verificationStatus 
                });
            } catch (error) {
                console.error('Failed to initialize Device Manager:', error);
            }
        }

        generateDeviceId() {
            try {
                const timestamp = Date.now();
                let randomPart = '';
                
                if (window.crypto && crypto.getRandomValues) {
                    const randomArray = new Uint8Array(8);
                    crypto.getRandomValues(randomArray);
                    randomPart = Array.from(randomArray, byte =>
                        byte.toString(16).padStart(2, '0')
                    ).join('');
                } else {
                    randomPart = Math.random().toString(36).substr(2, 9);
                }
                
                return `MSL-${timestamp}-${randomPart}`;
            } catch (error) {
                console.error('Error generating device ID:', error);
                return `MSL-${Date.now()}-fallback`;
            }
        }

        getOrCreateDeviceId() {
            let deviceId = localStorage.getItem(STORAGE_KEY);
            if (!deviceId) {
                deviceId = this.generateDeviceId();
                localStorage.setItem(STORAGE_KEY, deviceId);
            }
            return deviceId;
        }

        loadVerificationStatus() {
            return localStorage.getItem(VERIFIED_KEY) === 'true';
        }

        loadLastAccessTime() {
            const time = localStorage.getItem(ACCESS_WINDOW_KEY);
            return time ? parseInt(time, 10) : null;
        }

        updateUI() {
            const displayElement = document.getElementById('device-id');
            if (displayElement) {
                displayElement.textContent = this.deviceId;
                displayElement.dataset.verified = this.verificationStatus;
            }

            const statusElement = document.getElementById('verification-status');
            if (statusElement) {
                statusElement.textContent = this.verificationStatus ? 'Verified' : 'Unverified';
                statusElement.className = this.verificationStatus ? 'status-verified' : 'status-unverified';
            }
        }

        // Admin Methods
        verify(adminKey) {
            if (this.validateAdminKey(adminKey)) {
                this.verificationStatus = true;
                localStorage.setItem(VERIFIED_KEY, 'true');
                this.updateUI();
                return true;
            }
            return false;
        }

        validateAdminKey(key) {
            // Implement your validation logic here
            return key === 'your-admin-key';
        }

        checkAccessWindow() {
            const now = Date.now();
            const lastAccess = this.lastAccessTime;
            const windowSize = 30 * 60 * 1000; // 30 minutes
            const cooldown = 3 * 60 * 60 * 1000; // 3 hours

            if (!lastAccess || (now - lastAccess) > cooldown) {
                this.lastAccessTime = now;
                localStorage.setItem(ACCESS_WINDOW_KEY, now.toString());
                return true;
            }

            return (now - lastAccess) < windowSize;
        }

        // Public API
        static getInstance() {
            if (!this.instance) {
                this.instance = new DeviceManager();
            }
            return this.instance;
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            DeviceManager.getInstance().init();
        });
    } else {
        DeviceManager.getInstance().init();
    }

    // Make device manager available globally
    window.deviceManager = DeviceManager.getInstance();
})();