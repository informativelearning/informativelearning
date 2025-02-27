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
                // Open about:blank window
                const newWindow = window.open('about:blank', '_blank');
                if (newWindow) {
                    // Write the iframe container to the new window
                    newWindow.document.write(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <title>Dashboard</title>
                            <link rel="icon" type="image/x-icon" href="Dashboard-favicon.ico">
                            <style>
                                body, html {
                                    margin: 0;
                                    padding: 0;
                                    width: 100%;
                                    height: 100%;
                                    overflow: hidden;
                                }
                                iframe {
                                    width: 100%;
                                    height: 100%;
                                    border: none;
                                    position: absolute;
                                    top: 0;
                                    left: 0;
                                }
                            </style>
                        </head>
                        <body>
                            <iframe src="scientific.html" allowfullscreen></iframe>
                        </body>
                        </html>
                    `);
                    newWindow.document.close();
                }
                // Reset the secret phrase
                secretPhrase = '';
            }
        });
    }
});