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
    'detail.html', 
    'feature.html', 
    'team.html', 
    'testimonial.html'
  ];
  
  // Define hidden pages that don't trigger dashboard/redirect
  const hiddenPages = ['truemath.html', 'coursebooks.html', 'funinlearning.html'];
  
  // Define protected pages requiring deviceId in the URL for server validation
  const protectedPages = ['truemath.html', 'funinlearning.html', 'coursebooks.html', 'collegecourses.html'];

  // Determine if we're on the homepage/index
  function isHomePage() {
    const path = window.location.pathname;
    const hostname = window.location.hostname;
    const fullUrl = window.location.href;
    return path === '/' || 
           path === '' || 
           path === '/index.html' ||
           fullUrl === `http://${hostname}` ||
           fullUrl === `https://${hostname}` ||
           fullUrl === `http://${hostname}/` ||
           fullUrl === `https://${hostname}/`;
  }

  // Get the current page
  let currentPage = isHomePage() ? 'index.html' : window.location.pathname.split('/').pop() || 'index.html';

  // **New Logic**: Check if on a protected page without deviceId in URL
  if (protectedPages.includes(currentPage) && !window.location.search.includes('deviceId') && deviceId) {
    window.location.href = `${currentPage}?deviceId=${encodeURIComponent(deviceId)}`;
    return;
  }

  // If no deviceId but on a public page, allow access
  if (!deviceId && publicPages.includes(currentPage)) {
    return;
  }
  
  // If no deviceId and not on a public page, redirect to index
  if (!deviceId) {
    window.location.href = 'index.html';
    return;
  }

  function openDashboard(deviceId) {
    const win = window.open('');
    if (!win) {
      alert('Please allow popups for this site to access the content.');
      return false;
    }
    try {
      win.document.body.style.margin = '0';
      win.document.body.style.height = '100vh';
      win.document.body.style.padding = '0';
      win.document.body.style.overflow = 'hidden';
      win.document.title = 'Dashboard';
      const favicon = win.document.createElement('link');
      favicon.rel = 'icon';
      favicon.type = 'image/x-icon';
      favicon.href = window.location.origin + '/Dashboard-favicon.ico';
      win.document.head.appendChild(favicon);
      const iframe = win.document.createElement('iframe');
      iframe.style.border = 'none';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.margin = '0';
      iframe.src = `truemath.html?deviceId=${encodeURIComponent(deviceId)}`;
      win.document.body.appendChild(iframe);
      return true;
    } catch (error) {
      console.error('Error creating window:', error);
      win.close();
      alert('Error loading content. Please try again.');
      return false;
    }
  }

  // Fetch verification status
  fetch(`/check-verification?deviceId=${deviceId}`)
    .then(response => response.json())
    .then(data => {
      if (data.verified) {
        if (hiddenPages.includes(currentPage)) {
          return;
        }
        if (!hiddenPages.includes(currentPage)) {
          const opened = openDashboard(deviceId);
          if (opened) {
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
        if (publicPages.includes(currentPage)) {
          return;
        }
        window.location.href = 'index.html';
      }
    })
    .catch(error => {
      console.error('Verification check failed:', error);
      if (!publicPages.includes(currentPage)) {
        window.location.href = 'index.html';
      }
    });
})();