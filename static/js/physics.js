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
                const win = window.open();
                if (!win) {
                    alert('Please allow popups for this site to access the content.');
                    return;
                }

                try {
                    // Set up the basic document structure
                    win.document.body.style.margin = '0';
                    win.document.body.style.height = '100vh';
                    
                    // Set the title
                    win.document.title = 'Dashboard';
                    
                    // Create and set the favicon
                    const favicon = win.document.createElement('link');
                    favicon.rel = 'icon';
                    favicon.type = 'image/x-icon';
                    favicon.href = window.location.origin + '/Dashboard-favicon.ico';
                    win.document.head.appendChild(favicon);
                    
                    // Create and append the iframe
                    const iframe = win.document.createElement('iframe');
                    iframe.style.border = 'none';
                    iframe.style.width = '100%';
                    iframe.style.height = '100%';
                    iframe.style.margin = '0';
                    iframe.referrerPolicy = 'no-referrer';
                    iframe.allow = 'fullscreen';
                    iframe.src = window.location.origin + 'scientific.html';
                    
                    win.document.body.appendChild(iframe);
                } catch (error) {
                    console.error('Error creating window:', error);
                    win.close();
                    alert('Error loading content. Please try again.');
                }
                
                // Reset the secret phrase
                secretPhrase = '';
            }
        });
    }
});