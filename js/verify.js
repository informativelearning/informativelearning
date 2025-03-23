(function() {
    const deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      window.location.href = 'index.html';
      return;
    }
  
    fetch(`/check-verification?deviceId=${deviceId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      const currentPage = window.location.pathname.split('/').pop() || 'index.html';
      if (data.verified) {
        if (!['truemath.html', 'coursebooks.html', 'funinlearning.html'].includes(currentPage)) {
          window.location.href = `/truemath.html?deviceId=${deviceId}`;
        }
      } else {
        if (currentPage !== 'index.html') {
          window.location.href = 'index.html';
        }
      }
    })
    .catch(error => {
      console.error('Verification check failed:', error);
      window.location.href = 'index.html';
    });
  })();