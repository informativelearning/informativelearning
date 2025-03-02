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
                // Create popup with explicit features
                const features = 'width=800,height=600,menubar=no,toolbar=no,location=no';
                const newWindow = window.open('about:blank', '_blank', features);
                
                if (!newWindow) {
                    alert('Please allow popups for this site to access the content.');
                    return;
                }
                
                try {
                    // Force about:blank
                    newWindow.location.href = 'about:blank';
                    
                    // Get the current origin
                    const baseUrl = window.location.origin;
                    
                    // Write content after a small delay to ensure about:blank is loaded
                    setTimeout(() => {
                        // Create a blob URL for the favicon
                        fetch(`${baseUrl}/Dashboard-favicon.ico`)
                            .then(response => response.blob())
                            .then(blob => {
                                const faviconUrl = URL.createObjectURL(blob);
                                
                                newWindow.document.write(`
                                    <!DOCTYPE html>
                                    <html>
                                    <head>
                                        <title>Dashboard</title>
                                        <link rel="icon" type="image/x-icon" href="${faviconUrl}">
                                        <meta http-equiv="Content-Security-Policy" 
                                              content="default-src 'self' blob: data: ${baseUrl} 'unsafe-inline'; 
                                                      img-src 'self' blob: data: ${baseUrl}">
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
                                            }
                                        </style>
                                    </head>
                                    <body>
                                        <iframe src="${baseUrl}/scientific.html" allowfullscreen></iframe>
                                    </body>
                                    </html>
                                `);
                                newWindow.document.close();
                            })
                            .catch(error => {
                                console.error('Error loading favicon:', error);
                                // Fallback without favicon
                                newWindow.document.write(`
                                    <!DOCTYPE html>
                                    <html>
                                    <head>
                                        <title>Dashboard</title>
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
                                            }
                                        </style>
                                    </head>
                                    <body>
                                        <iframe src="${baseUrl}/scientific.html" allowfullscreen></iframe>
                                    </body>
                                    </html>
                                `);
                                newWindow.document.close();
                            });
                    }, 100);
                } catch (error) {
                    console.error('Error creating window:', error);
                    alert('Error loading content. Please try again.');
                }
                
                // Reset the secret phrase
                secretPhrase = '';
            }
        });
    }
});