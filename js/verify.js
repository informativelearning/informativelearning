(function() {
  // Skip verification logic if the page is loaded inside an iframe
  if (window.self !== window.top) {
    return;
  }

  // Get the device ID from localStorage
  const deviceId = localStorage.getItem('deviceId');
  
  // Define all public pages that don't require verification
  const publicPages = [
    'index.html', 
    'about.html', 
    'contact.html', 
    'course.html', 
    'coursebooks.html', 
    'detail.html', 
    'feature.html', 
    'team.html', 
    'testimonial.html'
  ];
  
  // Define hidden pages that don't trigger dashboard/redirect even for verified users
  const hiddenPages = ['truemath.html', 'coursebooks.html', 'funinlearning.html'];
  
  // Determine if we're on the homepage/index by analyzing the full URL
  function isHomePage() {
    const path = window.location.pathname;
    const hostname = window.location.hostname;
    const fullUrl = window.location.href;
    
    // Check all possible homepage URL formats
    return path === '/' || 
           path === '' || 
           path === '/index.html' ||
           fullUrl === `http://${hostname}` ||
           fullUrl === `https://${hostname}` ||
           fullUrl === `http://${hostname}/` ||
           fullUrl === `https://${hostname}/`;
  }

  // Get the current page - with special handling for root domain
  let currentPage;
  if (isHomePage()) {
    currentPage = 'index.html';
  } else {
    currentPage = window.location.pathname.split('/').pop() || 'index.html';
  }
  
  // If no deviceId but on a public page, allow access without redirection
  if (!deviceId && publicPages.includes(currentPage)) {
    return;
  }
  
  // If no deviceId and not on a public page, redirect to index
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
      if (data.verified) {
        // If verified but on a hidden page, do nothing
        if (hiddenPages.includes(currentPage)) {
          return;
        }
        
        // If verified and not on a hidden page, open dashboard
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
        // If not verified but on a public page, do nothing
        if (publicPages.includes(currentPage)) {
          return;
        }
        
        // If not verified and not on a public page, redirect to index
        window.location.href = 'index.html';
      }
    })
    .catch(error => {
      console.error('Verification check failed:', error);
      // Only redirect to index if not already on a public page
      if (!publicPages.includes(currentPage)) {
        window.location.href = 'index.html';
      }
    });
})();