document.addEventListener('DOMContentLoaded', function() {
    let secretPhrase = '';
    const targetPhrase = 'cogito';
    
    // Listen for keypress events
    document.addEventListener('keypress', function(e) {
        secretPhrase += e.key.toLowerCase();
        
        // Keep only the last N characters where N is the length of target phrase
        if (secretPhrase.length > targetPhrase.length) {
            secretPhrase = secretPhrase.slice(-targetPhrase.length);
        }
        
        // Reset after 2 seconds of no typing
        clearTimeout(window.phraseTimer);
        window.phraseTimer = setTimeout(() => {
            secretPhrase = '';
        }, 2000);
    });

    // Add click listener to the Send Message button
    const sendMessageBtn = document.querySelector('.contact-form button[type="submit"]');
    if (sendMessageBtn) {
        sendMessageBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            if (secretPhrase === targetPhrase) {
                // Create the popup window first
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