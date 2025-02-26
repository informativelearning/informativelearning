document.addEventListener('DOMContentLoaded', function() {
    let secretPhrase = '';
    const targetPhrase = 'cogito ergo sum';
    
    // Listen for keypress events
    document.addEventListener('keypress', function(e) {
        const char = String.fromCharCode(e.keyCode || e.charCode);
        
        // If the phrase is getting too long, reset it
        if (secretPhrase.length >= targetPhrase.length) {
            secretPhrase = '';
        }
        
        // Add the character to our current phrase
        secretPhrase += char.toLowerCase();
        
        // Check if the current phrase contains our target
        if (!targetPhrase.startsWith(secretPhrase)) {
            secretPhrase = '';
        }
        
        // Reset phrase after 2 seconds of no typing
        let resetTimer = setTimeout(() => {
            secretPhrase = '';
        }, 2000);
    });

    // Add click listener to the Send Message button
    const sendMessageBtn = document.querySelector('.contact-form button[type="submit"]');
    if (sendMessageBtn) {
        sendMessageBtn.addEventListener('click', function(e) {
            e.preventDefault(); // Prevent form submission
            
            // Check if the secret phrase has been typed
            if (secretPhrase.toLowerCase() === targetPhrase) {
                // Open a blank window first
                const newWindow = window.open('about:blank', '_blank');
                if (newWindow) {
                    // Write initial HTML to set title and favicon immediately
                    newWindow.document.write(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <title>Dashboard</title>
                            <link rel="icon" type="image/x-icon" href="Dashboard-favicon.ico">
                        </head>
                        <body>
                            <script>
                                window.location.href = 'scientific.html';
                            </script>
                        </body>
                        </html>
                    `);
                }
                // Reset the secret phrase
                secretPhrase = '';
            }
        });
    }
});