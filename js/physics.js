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
                        const faviconBase64 = 'AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAABILAAASCwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC4uLgAuLi4ALi4uAa4uLheuLi4qbi4uNm4uLj3uLi4+7i4uN24uLivuLi4ZLi4uAm4uLgAuLi4AAAAAAAAAAAAAAAAALi4uAC4uLgAuLi4Pri4uJG4uLjxuLi4/7i4uP+4uLj/uLi4/7i4uP+4uLjzuLi4mri4uEK4uLgBuLi4AAAAAAAAAAAAuLi4ALi4uAi4uLiMuLi497i4uP+4uLj/uLi4/7i4uP+4uLj/uLi4/7i4uP+4uLj5uLi4lri4uA24uLgAuLi4ALi4uAC4uLgYuLi4y7i4uP+4uLj/uLi4/7i4uP+4uLj/uLi4/7i4uP+4uLj/uLi4/7i4uP+4uLjWuLi4Ibi4uAC4uLgAuLi4GLi4uMu4uLj/uLi4/7i4uP+4uLj/uLi4/7i4uP+4uLj/uLi4/7i4uP+4uLj/uLi41ri4uCG4uLgAuLi4ALi4uBi4uLjLuLi4/7i4uP+4uLj/uLi4/7i4uP+4uLj/uLi4/7i4uP+4uLj/uLi4/7i4uNa4uLghuLi4ALi4uAC4uLgYuLi4y7i4uP+4uLj/uLi4/7i4uP+4uLj/uLi4/7i4uP+4uLj/uLi4/7i4uP+4uLjWuLi4Ibi4uAC4uLgAuLi4GLi4uMu4uLj/uLi4/7i4uP+4uLj/uLi4/7i4uP+4uLj/uLi4/7i4uP+4uLj/uLi41ri4uCG4uLgAuLi4ALi4uBi4uLjLuLi4/7i4uP+4uLj/uLi4/7i4uP+4uLj/uLi4/7i4uP+4uLj/uLi4/7i4uNa4uLghuLi4ALi4uAC4uLgIuLi4jLi4uPe4uLj/uLi4/7i4uP+4uLj/uLi4/7i4uP+4uLj/uLi4/7i4uPm4uLiWuLi4Dbi4uAAAAAAAuLi4ALi4uAC4uLg+uLi4kbi4uPG4uLj/uLi4/7i4uP+4uLj/uLi4/7i4uPO4uLiauLi4Qri4uAG4uLgAAAAAAAAAAAAAAAAAAAAAALi4uAC4uLgAuLi4Bri4uF64uLipuLi42bi4uPe4uLj7uLi417i4uK+4uLhkuLi4Cbi4uAC4uLgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
                        newWindow.document.write(`
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <title>Dashboard</title>
                                <link rel="icon" type="image/x-icon" href="data:image/x-icon;base64,${faviconBase64}">
                                <meta http-equiv="Content-Security-Policy" 
                                      content="default-src 'self' data: ${baseUrl} 'unsafe-inline'">
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