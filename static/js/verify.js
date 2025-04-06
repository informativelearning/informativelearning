// static/js/verify.js (Corrected for actual page roles and permissions)

(async function() {
  console.log("verify.js (Corrected v3) executing...");

  if (window.self !== window.top) {
      console.log("verify.js: Skipping, running in iframe.");
      return;
  }

  // --- Configuration ---
  const publicLandingPage = '/welcome/homepage.html';   // Public landing page path
  const verifiedLandingPage = '/welcome/truemath.html'; // Verified landing page / popup target path
  const proxyPath = '/';                               // Path for the main proxy UI
  const faviconPath = '/welcome/favicon.ico';           // Path to the favicon for the popup

  // --- Get Device ID (from deviceId.js) ---
  await new Promise(resolve => setTimeout(resolve, 20)); // Give deviceId.js a moment
  const deviceId = window.deviceId || localStorage.getItem('deviceId');
  console.log(`verify.js: Using deviceId: ${deviceId}`);

  // --- Page Definitions based on Pathname ---
  const currentPath = window.location.pathname;

  // Publicly accessible pages (full paths) - Anyone can see these
  const publicPaths = [
      '/welcome/homepage.html',
      '/welcome/about.html',
      '/welcome/contact.html',
      '/welcome/course.html',
      '/welcome/detail.html',
      '/welcome/feature.html',
      '/welcome/team.html',
      '/welcome/testimonial.html',
      '/welcome/scientific.html' // Still public based on previous info
      // Add any other truly public page paths here
  ];

  // All paths that require *at least* general verification (verified=1 and not expired)
  // Specific permissions are checked later if applicable.
  const protectedPaths = [
      proxyPath, // Proxy UI root
      '/welcome/truemath.html',
      '/welcome/coursebooks.html',
      '/welcome/funinlearning.html', // Games page
      '/welcome/collegecourses.html'
      // Add any other paths that require login/verification
  ];

  console.log(`verify.js: Current Path: ${currentPath}`);


  // --- Function to open the verified area popup & redirect original tab ---
  function openDashboardAndRedirect(currentDeviceId) {
      console.log("verify.js: User verified, attempting to open dashboard popup...");
      const win = window.open('', '_blank'); // Open blank target first

      if (!win || win.closed || typeof win.closed == 'undefined') {
          console.warn("verify.js: Popup blocked or failed to open.");
          alert('Popup blocked! Please allow popups for this site and reload to access verified content.');
          return false; // Indicate failure
      }
      try {
          win.document.title = 'Dashboard'; // Set title early
          setTimeout(() => { /* ... rest of popup generation logic ... */ }, 50);
          return true; // Popup initially opened successfully
      } catch (error) { /* ... error handling ... */ return false; }
  }


  // --- No Device ID Handling ---
  if (!deviceId) {
      console.log("verify.js: No deviceId found.");
      // If on a protected path -> Redirect
      if (protectedPaths.includes(currentPath)) {
           console.log(`verify.js: No deviceId, redirecting from protected path ${currentPath} to ${publicLandingPage}`);
           window.location.replace(publicLandingPage);
      } else { console.log(`verify.js: No deviceId, and on a public path (${currentPath}), staying.`); }
      return; // Stop execution
  }

  // --- Fetch Verification Status ---
  let verificationStatus = null;
  let apiError = false;
  try {
      console.log(`verify.js: Checking verification status for ${deviceId}...`);
      const response = await fetch(`/api/check-verification?deviceId=${encodeURIComponent(deviceId)}`);
      if (!response.ok) { throw new Error(`API check HTTP status ${response.status}`); }
      verificationStatus = await response.json();
      // Use the actual structure returned by your API check
      if (!verificationStatus || typeof verificationStatus.verified === 'undefined' || typeof verificationStatus.access === 'undefined') {
          throw new Error('Invalid API response format');
      }
      console.log("verify.js: Verification status received:", verificationStatus);
  } catch (error) {
      console.error("verify.js: Verification check failed:", error);
      apiError = true;
  }

  // Determine verification state, considering API errors
  const isVerified = verificationStatus?.verified && !apiError; // Check the verified flag from API
  const permissions = verificationStatus?.access || {}; // Use the 'access' object from API response

  console.log(`verify.js: Final Check - isVerified: ${isVerified}, Current Path: ${currentPath}, Permissions:`, permissions);

  // --- Apply Logic based on Status ---
  if (isVerified) {
      // --- Verified User ---
      console.log("verify.js: User is VERIFIED.");

      // Trigger popup/decoy IF user lands on a public page
      if (publicPaths.includes(currentPath)) {
          console.log(`verify.js: Verified user on public page (${currentPath}). Triggering popup/redirect.`);
          openDashboardAndRedirect(deviceId); // Redirect handled inside
          return; // Stop script execution after triggering
      }

      // Now check permissions for protected paths they might be on
      if (currentPath === proxyPath) { // Checking Proxy Root
          if (!permissions.proxy) {
               console.log(`verify.js: Verified user lacks proxy permission at ${proxyPath}, redirecting to ${verifiedLandingPage}`);
               window.location.replace(verifiedLandingPage);
               return;
          } else { console.log(`verify.js: Verified user WITH proxy permission allowed at ${proxyPath}.`); }
      }
      else if (currentPath === '/welcome/funinlearning.html') { // Checking Games Page
          if (!permissions.games) {
              console.log(`verify.js: Verified user lacks games permission, redirecting...`);
              window.location.replace(verifiedLandingPage); // Redirect to verified home
              return;
          } else { console.log(`verify.js: Verified user WITH games permission allowed.`); }
      }
      // Add checks for coursebooks, collegecourses using permissions.coursebooks, permissions.collegecourses if those exist
      // else if (currentPath === '/welcome/coursebooks.html' && !permissions.coursebooks) { ... redirect ... }
      // else if (currentPath === '/welcome/collegecourses.html' && !permissions.collegecourses) { ... redirect ... }


      // If verified and on an allowed page (like truemath.html or proxy with permission), just stay.
      console.log(`verify.js: Verified user allowed on current verified page: ${currentPath}`);

  } else {
      // --- Unverified User (or API Error or Expired) ---
      console.log("verify.js: User is NOT verified (or API error/expired).");
      // If user tries to access a protected path -> Redirect to public landing
      if (protectedPaths.includes(currentPath)) {
          console.log(`verify.js: Unverified user trying to access protected path ${currentPath}, redirecting to ${publicLandingPage}`);
          window.location.replace(publicLandingPage);
      } else {
           // Unverified user is on a public page, allow access.
           console.log(`verify.js: Unverified user on public path ${currentPath}, allowing access.`);
      }
  }

})();