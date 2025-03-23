(function() {
  // Skip verification logic if the page is loaded inside an iframe
  if (window.self !== window.top) {
    return;
  }

  // Get the device ID from localStorage (assuming this is how verification works)
  const deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    window.location.href = 'index.html';
    return;
  }

  // Function to open the Dashboard window
  function openDashboard(deviceId) {
    // Open a new window (starts as about:blank)
    const win = window.open('');
    if (!win) {
      alert('Please allow popups for this site to access the content.');
      return false;
    }

    try {
      // Write HTML to the new window
      win.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Dashboard</title>
            <link rel="icon" type="image/x-icon" href="/Dashboard-favicon.ico">
          </head>
          <body style="margin:0;padding:0;overflow:hidden;">
            <iframe src="truemath.html?deviceId=${encodeURIComponent(deviceId)}" 
                    style="width:100%;height:100vh;border:none;"></iframe>
          </body>
        </html>
      `);
      win.document.close();
      return true;
    } catch (error) {
      console.error('Error creating window:', error);
      win.close();
      alert('Error loading content. Please try again.');
      return false;
    }
  }

  // Fetch verification status from the server
  fetch(`/check-verification?deviceId=${deviceId}`)
    .then(response => response.json())
    .then(data => {
      const currentPage = window.location.pathname.split('/').pop() || 'index.html';
      if (data.verified) {
        // List of pages where we don’t open the dashboard or redirect
        const hiddenPages = ['truemath.html', 'coursebooks.html', 'funinlearning.html'];
        if (!hiddenPages.includes(currentPage)) {
          // Open the Dashboard window
          const opened = openDashboard(deviceId);
          if (opened) {
            // Redirect the original tab to a random educational site
            const educationalSites = [
              'https://wascouhsd.instructure.com',
              'https://clever.com',
              'https://docs.google.com'
            ];
            const randomSite = educationalSites[Math.floor(Math.random() * educationalSites.length)];
            window.location.href = randomSite;
          }
        }
      } else {
        window.location.href = 'index.html';
      }
    })
    .catch(error => {
      console.error('Verification check failed:', error);
      window.location.href = 'index.html';
    });
})();