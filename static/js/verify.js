// static/js/verify.js (Fixed version)

(async function() {
    console.log("verify.js (Fixed version 3.0) executing...");
  
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
        '/welcome/scientific.html',
        '/index.html'  // Add index.html here if it's a public page
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
        const win = window.open(verifiedLandingPage + '?deviceId=' + encodeURIComponent(currentDeviceId), '_blank');
        
        if (!win || win.closed || typeof win.closed == 'undefined') {
            console.warn("verify.js: Popup blocked or failed to open.");
            alert('Popup blocked! Please allow popups for this site and reload to access verified content.');
            return false; // Indicate failure
        }
        
        // After successful popup, redirect the original tab to public landing
        setTimeout(() => {
            console.log("verify.js: Redirecting original tab to public landing...");
            window.location.href = publicLandingPage;
        }, 100);
        
        return true; // Popup initially opened successfully
    }
  
    // --- No Device ID Handling ---
    if (!deviceId) {
        console.log("verify.js: No deviceId found.");
        // If on a protected path -> Redirect
        if (protectedPaths.includes(currentPath) || currentPath === proxyPath || 
            currentPath.startsWith('/uv/') || currentPath.startsWith('/epoxy/') || 
            currentPath.startsWith('/baremux/')) {
             console.log(`verify.js: No deviceId, redirecting from protected path ${currentPath} to ${publicLandingPage}`);
             window.location.replace(publicLandingPage);
        } else { 
            console.log(`verify.js: No deviceId, and on a public path (${currentPath}), staying.`); 
        }
        return; // Stop execution
    }
  
    // --- Fetch Verification Status ---
    let verificationStatus = null;
    let apiError = false;
    try {
        console.log(`verify.js: Checking verification status for ${deviceId}...`);
        const response = await fetch(`/api/check-verification?deviceId=${encodeURIComponent(deviceId)}`);
        
        console.log("verify.js: API Response Status:", response.status);
        
        if (!response.ok) { 
            throw new Error(`API check HTTP status ${response.status}`); 
        }
        
        verificationStatus = await response.json();
        console.log("verify.js: Raw API response:", JSON.stringify(verificationStatus));
        
        // Validate response structure
        if (!verificationStatus || typeof verificationStatus.verified === 'undefined') {
            throw new Error('Invalid API response format');
        }
        
        console.log("verify.js: Verification status processed:", verificationStatus);
    } catch (error) {
        console.error("verify.js: Verification check failed:", error);
        apiError = true;
    }
  
    // Determine verification state, considering API errors
    const isVerified = verificationStatus?.verified === true && !apiError;
    
    // Extract permissions - ensure we handle legacy and new format
    const permissions = {
        proxy: verificationStatus?.access?.proxy === true,
        games: verificationStatus?.access?.games === true,
        other: verificationStatus?.access?.other || ''
    };
  
    console.log(`verify.js: Final Check - isVerified: ${isVerified}, Current Path: ${currentPath}, Permissions:`, permissions);
  
    // --- Apply Logic based on Status ---
    if (isVerified) {
        // --- Verified User ---
        console.log("verify.js: User is VERIFIED.");
  
        // Trigger popup/decoy IF user lands on a public page
        if (publicPaths.includes(currentPath)) {
            console.log(`verify.js: Verified user on public page (${currentPath}). Triggering popup/redirect.`);
            openDashboardAndRedirect(deviceId);
            return; // Stop script execution after triggering
        }
  
        // Handle exact path matches for permissions first
        if (currentPath === '/' || currentPath.startsWith('/?')) { // Proxy root with possible query params
            if (!permissions.proxy) {
                console.log(`verify.js: Verified user lacks proxy permission, redirecting to ${verifiedLandingPage}`);
                window.location.replace(verifiedLandingPage);
                return;
            } else { 
                console.log(`verify.js: Verified user WITH proxy permission allowed at ${currentPath}.`); 
            }
        }
        else if (currentPath === '/welcome/funinlearning.html') { // Games page
            if (!permissions.games) {
                console.log(`verify.js: Verified user lacks games permission, redirecting to ${verifiedLandingPage}`);
                window.location.replace(verifiedLandingPage);
                return;
            } else { 
                console.log(`verify.js: Verified user WITH games permission allowed at ${currentPath}.`); 
            }
        }
        // For coursebooks and collegecourses, use the 'other' permission if available
        // or default to allow for verified users
        else if (protectedPaths.includes(currentPath)) {
            // Allow verified users to access all other protected paths by default
            console.log(`verify.js: Verified user accessing protected path: ${currentPath}`);
            // Specifically allow access to truemath.html
            if (currentPath === '/welcome/truemath.html') {
                console.log(`verify.js: Verified user accessing truemath.html - allowed`);
                return; // Explicitly allow and exit
            }
        }
        
        // If verified and on an allowed page, just stay
        console.log(`verify.js: Verified user allowed on current page: ${currentPath}`);
  
    } else {
        // --- Unverified User (or API Error or Expired) ---
        console.log("verify.js: User is NOT verified (or API error/expired).");
        
        // Check if the current path is protected
        const isOnProtectedPath = protectedPaths.includes(currentPath) || 
                                  currentPath === '/' || currentPath.startsWith('/uv/') || 
                                  currentPath.startsWith('/epoxy/') || currentPath.startsWith('/baremux/');
        
        // If user tries to access a protected path -> Redirect to public landing
        if (isOnProtectedPath) {
            console.log(`verify.js: Unverified user trying to access protected path ${currentPath}, redirecting to ${publicLandingPage}`);
            window.location.replace(publicLandingPage); // Always redirect to homepage.html
        } else {
            // Unverified user is on a public page, allow access
            console.log(`verify.js: Unverified user on public path ${currentPath}, allowing access.`);
        }
    }
  
})();