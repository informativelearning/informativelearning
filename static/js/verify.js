// static/js/verify.js (Simplified version)

(async function() {
    console.log("verify.js (Simplified version) executing...");
  
    if (window.self !== window.top) {
        console.log("verify.js: Skipping, running in iframe.");
        return;
    }
  
    // --- Configuration with ABSOLUTE paths ---
    const publicLandingPage = '/welcome/homepage.html';   // Public landing page path
    const verifiedLandingPage = '/welcome/truemath.html'; // Verified landing page / popup target path
  
    // --- Get Device ID (from deviceId.js) ---
    await new Promise(resolve => setTimeout(resolve, 20)); // Give deviceId.js a moment
    const deviceId = window.deviceId || localStorage.getItem('deviceId');
    console.log(`verify.js: Using deviceId: ${deviceId}`);
  
    // --- Page Definitions based on Pathname ---
    // Always get the FULL path including starting slash
    const currentPath = window.location.pathname;
    console.log(`verify.js: Current Path: ${currentPath}`);
  
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
  
    // All paths that require verification
    const protectedPaths = [
        '/welcome/truemath.html',
        '/welcome/coursebooks.html',
        '/welcome/funinlearning.html',
        '/welcome/collegecourses.html',
        '/' // Proxy UI root
        // Add any other paths that require verification
    ];
  
    // Flag to track if we've already processed this page load
    // This prevents infinite loops and duplicated popups
    const processedKey = `processedPath_${currentPath}`;
    const alreadyProcessed = sessionStorage.getItem(processedKey);
    
    if (alreadyProcessed) {
        console.log(`verify.js: Already processed this path (${currentPath}), skipping actions`);
        return; // Stop execution if we've already processed this path in this session
    }
    
    // Mark this path as processed to prevent loops
    sessionStorage.setItem(processedKey, 'true');
  
    // --- Function to open the verified area popup & redirect original tab ---
    function openDashboardAndRedirect(currentDeviceId) {
        console.log("verify.js: User verified, attempting to open dashboard popup...");
        
        try {
            // Open popup with deviceId - ensure full URL
            const popupUrl = `${verifiedLandingPage}?deviceId=${encodeURIComponent(currentDeviceId)}`;
            console.log(`verify.js: Opening popup to: ${popupUrl}`);
            const win = window.open(popupUrl, '_blank');
            
            if (!win || win.closed || typeof win.closed == 'undefined') {
                console.warn("verify.js: Popup blocked or failed to open.");
                alert('Popup blocked! Please allow popups for this site and reload to access verified content.');
                return false; // Indicate failure
            }
            
            // After successful popup, redirect the original tab to public landing
            // But only if we're not already there
            if (currentPath !== publicLandingPage) {
                console.log(`verify.js: Redirecting original tab to: ${publicLandingPage}`);
                // Slight delay to ensure popup opens first
                setTimeout(() => {
                    window.location.href = publicLandingPage;
                }, 300);
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
        if (protectedPaths.includes(currentPath) || currentPath.startsWith('/uv/') || 
            currentPath.startsWith('/epoxy/') || currentPath.startsWith('/baremux/')) {
             console.log(`verify.js: No deviceId, redirecting from protected path ${currentPath} to ${publicLandingPage}`);
             window.location.replace(publicLandingPage);
        } else { 
            console.log(`verify.js: No deviceId, and on a public path (${currentPath}), staying.`); 
        }
        return; // Stop execution
    }
  
    // --- Fetch Verification Status ---
    let isVerified = false;
    let apiError = false;
    try {
        console.log(`verify.js: Checking verification status for ${deviceId}...`);
        const response = await fetch(`/api/check-verification?deviceId=${encodeURIComponent(deviceId)}`);
        
        console.log("verify.js: API Response Status:", response.status);
        
        if (!response.ok) { 
            throw new Error(`API check HTTP status ${response.status}`); 
        }
        
        const verificationStatus = await response.json();
        console.log("verify.js: Raw API response:", JSON.stringify(verificationStatus));
        
        // Simplified verification check - we just need the boolean verified value
        if (typeof verificationStatus.verified === 'undefined') {
            throw new Error('Invalid API response format');
        }
        
        isVerified = verificationStatus.verified === true;
        console.log(`verify.js: Verification status: ${isVerified ? 'Verified' : 'Not Verified'}`);
    } catch (error) {
        console.error("verify.js: Verification check failed:", error);
        apiError = true;
    }
  
    // --- Apply Logic based on Status ---
    if (isVerified && !apiError) {
        // --- Verified User ---
        console.log("verify.js: User is VERIFIED.");
  
        // SPECIAL CASE: If verified user directly accesses truemath.html, allow it
        if (currentPath === verifiedLandingPage) {
            console.log(`verify.js: Verified user directly accessing ${verifiedLandingPage}, allowing access`);
            return; // Stop here and allow access
        }
  
        // Trigger popup/decoy IF user lands on a public page
        if (publicPaths.includes(currentPath)) {
            console.log(`verify.js: Verified user on public page (${currentPath}). Triggering popup/redirect.`);
            openDashboardAndRedirect(deviceId);
            return; // Stop script execution after triggering
        }
        
        // If verified and on an allowed page, just stay
        console.log(`verify.js: Verified user allowed on current page: ${currentPath}`);
  
    } else {
        // --- Unverified User (or API Error or Expired) ---
        console.log("verify.js: User is NOT verified (or API error/expired).");
        
        // Check if the current path is protected or starts with the proxy path
        const isOnProtectedPath = protectedPaths.includes(currentPath) || 
                                  currentPath.startsWith('/uv/') || 
                                  currentPath.startsWith('/epoxy/') || 
                                  currentPath.startsWith('/baremux/');
        
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