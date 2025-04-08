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
        '/welcome/scientific.html'
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

    // Flag to track if we've already processed this page load
    // This prevents infinite loops and duplicated popups
    const processedKey = `processedPath_${currentPath}`;
    const alreadyProcessed = sessionStorage.getItem(processedKey);
    
    if (alreadyProcessed) {
        console.log(`verify.js: Already processed this path (${currentPath}), skipping actions`);
        return; // Stop execution if we've already processed this path in this session
    }
  
    // --- Function to open the verified area popup & redirect original tab ---
    function openDashboardAndRedirect(currentDeviceId) {
        console.log("verify.js: User verified, attempting to open dashboard popup...");
        
        // Set flag to prevent recursive processing
        sessionStorage.setItem(processedKey, 'true');
        
        try {
            // Open popup with deviceId
            const popupUrl = `${verifiedLandingPage}?deviceId=${encodeURIComponent(currentDeviceId)}`;
            const win = window.open(popupUrl, '_blank');
            
            if (!win || win.closed || typeof win.closed == 'undefined') {
                console.warn("verify.js: Popup blocked or failed to open.");
                alert('Popup blocked! Please allow popups for this site and reload to access verified content.');
                return false; // Indicate failure
            }
            
            // After successful popup, redirect the original tab to public landing
            // But only if we're not already there
            if (currentPath !== publicLandingPage) {
                console.log("verify.js: Redirecting original tab to public landing...");
                setTimeout(() => {
                    window.location.href = publicLandingPage;
                }, 100);
            } else {
                console.log("verify.js: Already on public landing, no redirect needed");
            }
            
            return true; // Popup initially opened successfully
        } catch (e) {
            console.error("verify.js: Error in popup handling:", e);
            return false;
        }
    }
  
    // --- No Device ID Handling ---
    if (!deviceId) {
        console.log("verify.js: No deviceId found.");
        // If on a protected path -> Redirect
        if (protectedPaths.includes(currentPath) || currentPath.startsWith(proxyPath)) {
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
            // We're allowing verified users to access all other protected paths by default
            console.log(`verify.js: Verified user accessing protected path: ${currentPath}`);
            // If you want to enforce specific permissions for these paths,
            // add additional logic here
        }
        
        // If verified and on an allowed page, just stay
        console.log(`verify.js: Verified user allowed on current page: ${currentPath}`);
  
    } else {
        // --- Unverified User (or API Error or Expired) ---
        console.log("verify.js: User is NOT verified (or API error/expired).");
        
        // Check if the current path is protected or starts with the proxy path
        const isOnProtectedPath = protectedPaths.includes(currentPath) || 
                                  (currentPath === '/' || currentPath.startsWith('/uv/') || 
                                   currentPath.startsWith('/epoxy/') || currentPath.startsWith('/baremux/'));
        
        // If user tries to access a protected path -> Redirect to public landing
        if (isOnProtectedPath) {
            console.log(`verify.js: Unverified user trying to access protected path ${currentPath}, redirecting to ${publicLandingPage}`);
            window.location.replace(publicLandingPage);
        } else {
            // Unverified user is on a public page, allow access
            console.log(`verify.js: Unverified user on public path ${currentPath}, allowing access.`);
        }
    }
  
})();