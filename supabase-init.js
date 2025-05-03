// Supabase initialization and persistence utility
(function() {
    // Default Supabase credentials
    const DEFAULT_SUPABASE_URL = 'https://isagurhfcktnnldvntse.supabase.co';
    const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzYWd1cmhmY2t0bm5sZHZudHNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzNTY4NTAsImV4cCI6MjA1OTkzMjg1MH0.WYOhUCj5wD7AUCuxpDerOkwV_XvBAGapTEztRoJC2Q0';

    // Diagnostic information to help debug issues
    console.log('Supabase init script loaded. Diagnostic information:');
    console.log('- Window supabase object exists:', window.supabase !== undefined);
    if (window.supabase !== undefined) {
        console.log('- Supabase object type:', typeof window.supabase);
        console.log('- Has from method:', typeof window.supabase.from === 'function');
    }
    console.log('- Supabase global object exists:', typeof supabase !== 'undefined');
    if (typeof supabase !== 'undefined') {
        console.log('- Global supabase has createClient:', typeof supabase.createClient === 'function');
    }

    // Store Supabase initialization status in localStorage
    function saveConnectionStatus(status) {
        try {
            localStorage.setItem('supabaseInitialized', JSON.stringify({
                timestamp: Date.now(),
                status: status,
                url: window.SUPABASE_URL || DEFAULT_SUPABASE_URL,
                key: (window.SUPABASE_KEY || DEFAULT_SUPABASE_KEY).substring(0, 20) + '...' // Store partial key for security
            }));
        } catch (e) {
            console.error('Error saving connection status to localStorage:', e);
        }
    }

    // Wait for Supabase library to be fully loaded
    function waitForSupabase(maxAttempts = 10) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            
            function checkSupabase() {
                attempts++;
                if (typeof supabase !== 'undefined' && typeof supabase.createClient === 'function') {
                    console.log('Supabase library is loaded and ready');
                    resolve(true);
                } else if (attempts >= maxAttempts) {
                    console.error('Timed out waiting for Supabase library to load');
                    reject(new Error('Supabase library not loaded after timeout'));
                } else {
                    console.log(`Waiting for Supabase library (attempt ${attempts}/${maxAttempts})...`);
                    setTimeout(checkSupabase, 300);
                }
            }
            
            checkSupabase();
        });
    }

    // Create Supabase client directly (used for direct initialization)
    function createSupabaseClient() {
        // Make sure we have credentials
        if (!window.SUPABASE_URL) {
            window.SUPABASE_URL = DEFAULT_SUPABASE_URL;
            window.SUPABASE_KEY = DEFAULT_SUPABASE_KEY;
        }
        
        // Check if supabase is defined
        if (typeof supabase === 'undefined' || typeof supabase.createClient !== 'function') {
            console.error('ERROR: Supabase library not available!');
            console.log('Script tag context:', document.querySelector('script[src*="supabase-js"]')?.outerHTML || 'Not found');
            
            // Add information about scripts loaded
            console.log('All scripts:', Array.from(document.querySelectorAll('script')).map(s => s.src || 'inline script'));
            
            // Try to dynamically load Supabase if it's missing
            if (typeof supabase === 'undefined') {
                console.log('Attempting to dynamically load Supabase library');
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
                script.async = false;
                document.head.appendChild(script);
                
                // We'll need to return false here since loading is async
                // A subsequent call to createSupabaseClient should work once loaded
                return false;
            }
            
            return false;
        }
        
        try {
            console.log('Creating Supabase client with URL:', window.SUPABASE_URL);
            
            // Direct and simple client creation - using additional options for reliability
            const options = { 
                auth: { 
                    autoRefreshToken: true,
                    persistSession: true 
                },
                realtime: {
                    params: {
                        eventsPerSecond: 1
                    }
                },
                global: {
                    fetch: window.fetch.bind(window)
                }
            };
            
            // Create client and store on window
            window.supabase = supabase.createClient(
                window.SUPABASE_URL, 
                window.SUPABASE_KEY,
                options
            );
            
            // Verify supabase object was created properly
            if (window.supabase && typeof window.supabase.from === 'function') {
                console.log('Successfully created Supabase client');
                
                // Log available methods for debug
                console.log('Available methods:', Object.keys(window.supabase));
                
                // Log a visual confirmation when successful
                console.log('%c Supabase client initialized successfully! ', 
                            'background: #3ECF8E; color: white; padding: 4px; border-radius: 4px;');
                
                return true;
            } else {
                console.error('Client created but verification failed - missing .from() method');
                // Check what's in the object to help diagnose
                console.log('Client object keys:', Object.keys(window.supabase || {}));
                
                // Try a last resort approach
                console.log('Attempting last resort client creation');
                window.supabase = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
                
                // Check if that worked
                if (window.supabase && typeof window.supabase.from === 'function') {
                    console.log('Last resort client creation successful');
                    return true;
                }
                
                return false;
            }
        } catch (error) {
            console.error('Exception during direct client creation:', error);
            console.log('Error details:', error.stack || error);
            
            // Try one more approach with minimal options
            try {
                console.log('Trying minimal client creation approach');
                window.supabase = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
                
                if (window.supabase && typeof window.supabase.from === 'function') {
                    console.log('Minimal client creation worked');
                    return true;
                }
            } catch (e) {
                console.error('Minimal client creation also failed:', e);
            }
            
            return false;
        }
    }

    // Initialize Supabase client
    async function initializeSupabase() {
        console.log('Starting Supabase client initialization...');
        
        try {
            // First check if client already exists and is valid
            if (window.supabase && typeof window.supabase.from === 'function') {
                console.log('Supabase client already exists and appears valid');
                saveConnectionStatus('success');
                document.dispatchEvent(new Event('supabaseInitialized'));
                return true;
            }
            
            // Wait for Supabase library to be fully loaded
            await waitForSupabase();
            
            // Create client directly (more reliable than previous approach)
            const clientCreated = createSupabaseClient();
            if (!clientCreated) {
                throw new Error('Failed to create Supabase client');
            }
            
            // Verify the client was created properly
            if (window.supabase && typeof window.supabase.from === 'function') {
                console.log('Supabase client is initialized and methods are available');
                saveConnectionStatus('success');
                
                // Test the connection with a simple query
                try {
                    const result = await window.supabase.from('profiles').select('count', { 
                        count: 'exact', 
                        head: true 
                    });
                    
                    console.log('Successfully connected to Supabase database:', result);
                    saveConnectionStatus('success');
                    
                    // Dispatch a global event that other scripts can listen for
                    document.dispatchEvent(new Event('supabaseInitialized'));
                    return true;
                } catch (queryError) {
                    console.error('Error testing database connection:', queryError);
                    saveConnectionStatus('error');
                    
                    // Still dispatch event since the client is initialized, even if the test query failed
                    document.dispatchEvent(new Event('supabaseInitialized'));
                    return false;
                }
            } else {
                // Last resort attempt - recreate client directly
                console.error('Client verification failed after initial creation - attempting emergency recreation');
                
                // Try a desperate direct approach
                window.supabase = supabase.createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY);
                
                if (window.supabase && typeof window.supabase.from === 'function') {
                    console.log('Emergency client creation worked');
                    saveConnectionStatus('success');
                    document.dispatchEvent(new Event('supabaseInitialized'));
                    return true;
                } else {
                    console.error('Supabase client initialization failed - client methods not available');
                    saveConnectionStatus('error');
                    return false;
                }
            }
        } catch (error) {
            console.error('Error in Supabase initialization process:', error);
            saveConnectionStatus('error');
            
            // Try emergency fallback
            try {
                console.log('Attempting emergency fallback initialization');
                window.supabase = supabase.createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY);
                if (window.supabase && typeof window.supabase.from === 'function') {
                    console.log('Emergency fallback succeeded');
                    saveConnectionStatus('success');
                    document.dispatchEvent(new Event('supabaseInitialized'));
                    return true;
                }
            } catch (e) {
                console.error('Emergency fallback failed:', e);
            }
            
            return false;
        }
    }

    // Check if we've recently initialized Supabase successfully
    function checkPreviousInitialization() {
        try {
            const saved = localStorage.getItem('supabaseInitialized');
            if (saved) {
                const data = JSON.parse(saved);
                const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
                
                // If initialized within the last 5 minutes, consider it valid
                if (data.timestamp > fiveMinutesAgo && data.status === 'success') {
                    console.log('Using recently initialized Supabase connection');
                    return true;
                }
            }
        } catch (e) {
            console.error('Error checking previous initialization:', e);
        }
        return false;
    }

    // Initialize immediately on script load - don't wait for DOMContentLoaded
    console.log('Attempting immediate Supabase initialization');
    if (typeof supabase !== 'undefined' && typeof supabase.createClient === 'function') {
        console.log('Supabase library available immediately');
        createSupabaseClient();
    }

    // Also initialize on DOMContentLoaded as a fallback
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM content loaded - checking Supabase status');
        
        // After a short delay, check if we already have a working client
        setTimeout(() => {
            if (window.supabase && typeof window.supabase.from === 'function') {
                console.log('Supabase client already initialized by the time DOM loaded');
                document.dispatchEvent(new Event('supabaseInitialized'));
                return;
            }
            
            // Check if we have a recent initialization
            if (checkPreviousInitialization()) {
                // Still initialize to be safe but consider it pre-validated
                initializeSupabase();
            } else {
                // Fresh initialization
                initializeSupabase();
            }
        }, 100);
    });

    // Export public methods
    window.supabaseInit = {
        initialize: initializeSupabase,
        checkStatus: checkPreviousInitialization,
        createClient: createSupabaseClient
    };
})(); 