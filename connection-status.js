// Connection status handler script
document.addEventListener('DOMContentLoaded', function() {
    // Get status element
    const statusElem = document.getElementById('connection-status');
    if (!statusElem) return;
    
    // Set the initial loading state with icon
    statusElem.className = 'status-loading';
    statusElem.innerHTML = `
        <div class="status-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.25-11.25v-2h1.5v2h-1.5zm0 8.5v2h1.5v-2h-1.5zm8-6.5h-2v1.5h2v-1.5zm-13 0h-2v1.5h2v-1.5z"/>
            </svg>
        </div>
        <div class="status-tooltip">Checking database connection...</div>
    `;
    
    // Try to initialize connection if needed
    const tryInitializeConnection = function() {
        if (window.supabaseInit && typeof window.supabaseInit.initialize === 'function') {
            window.supabaseInit.initialize().catch(err => {
                console.error('Error initializing connection from status handler:', err);
            });
        }
    };
    
    // Check if we have connection status in localStorage first
    const checkStoredStatus = function() {
        try {
            const saved = localStorage.getItem('supabaseInitialized');
            if (saved) {
                const data = JSON.parse(saved);
                const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
                
                // If we have recent status, use it first
                if (data.timestamp > fiveMinutesAgo) {
                    if (data.status === 'success') {
                        showConnected();
                        return true;
                    } else if (data.status === 'error') {
                        showOfflineMode('Using offline mode (from cache)');
                        
                        // Try to initialize again in the background
                        setTimeout(tryInitializeConnection, 500);
                        return true;
                    }
                }
            }
        } catch (e) {
            console.error('Error checking stored connection status:', e);
        }
        return false;
    };
    
    // If no status in localStorage or status is old, check live
    if (!checkStoredStatus()) {
        // Wait for supabaseInitialized event
        document.addEventListener('supabaseInitialized', function() {
            setTimeout(updateConnectionStatus, 500);
        });
        
        // Also check after a delay in case event isn't fired
        setTimeout(updateConnectionStatus, 3000);
    }
    
    // Function to update connection status
    function updateConnectionStatus() {
        // If already connected, don't recheck
        if (statusElem.className === 'status-ok') {
            return;
        }
        
        if (window.supabase && typeof window.supabase.from === 'function') {
            // Check if we can actually reach the database with a simple query
            window.supabase.from('profiles').select('count', { count: 'exact', head: true })
                .then(() => {
                    // Connected successfully
                    showConnected();
                })
                .catch(err => {
                    // Supabase client exists but can't connect to database
                    console.error('Error connecting to database:', err);
                    showOfflineMode('Connection error: Using offline mode');
                    
                    // Try to initialize the database manager with fallback data
                    if (window.createFallbackDbManager && typeof window.createFallbackDbManager === 'function') {
                        window.createFallbackDbManager();
                    }
                });
        } else if (window.dbManager && window.dbManager.initialized) {
            // We have a database manager but no Supabase client - using fallback
            showOfflineMode('Using offline mode with default players');
        } else {
            // Try to initialize connection one more time
            tryInitializeConnection();
            
            // No database connection at all
            statusElem.className = 'status-error';
            statusElem.innerHTML = `
                <div class="status-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/>
                    </svg>
                </div>
                <div class="status-tooltip">Database connection failed. Click to retry.</div>
            `;
            
            // Add click handler to retry connection
            statusElem.onclick = function() {
                statusElem.className = 'status-loading';
                statusElem.innerHTML = `
                    <div class="status-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.25-11.25v-2h1.5v2h-1.5zm0 8.5v2h1.5v-2h-1.5zm8-6.5h-2v1.5h2v-1.5zm-13 0h-2v1.5h2v-1.5z"/>
                        </svg>
                    </div>
                    <div class="status-tooltip">Retrying connection...</div>
                `;
                
                // Try to initialize again
                tryInitializeConnection();
                
                // Check status again after a delay
                setTimeout(updateConnectionStatus, 1500);
            };
            
            console.error('Database connection failed');
        }
    }
    
    // Helper to show connected status
    function showConnected() {
        statusElem.className = 'status-ok';
        statusElem.innerHTML = `
            <div class="status-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                </svg>
            </div>
            <div class="status-tooltip">Database connected</div>
        `;
        console.log('Database connected successfully');
    }
    
    // Helper to show offline mode status
    function showOfflineMode(message) {
        statusElem.className = 'status-warning';
        statusElem.innerHTML = `
            <div class="status-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8 4a.905.905 0 0 0-.9.995l.35 3.507a.552.552 0 0 0 1.1 0l.35-3.507A.905.905 0 0 0 8 4zm.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>
                </svg>
            </div>
            <div class="status-tooltip">${message}</div>
        `;
        console.log(message);
        
        // Make it clickable to retry
        statusElem.onclick = function() {
            statusElem.className = 'status-loading';
            statusElem.innerHTML = `
                <div class="status-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.25-11.25v-2h1.5v2h-1.5zm0 8.5v2h1.5v-2h-1.5zm8-6.5h-2v1.5h2v-1.5zm-13 0h-2v1.5h2v-1.5z"/>
                    </svg>
                </div>
                <div class="status-tooltip">Retrying connection...</div>
            `;
            
            // Try to initialize again
            tryInitializeConnection();
            
            // Check status again after a delay
            setTimeout(updateConnectionStatus, 1500);
        };
    }
}); 