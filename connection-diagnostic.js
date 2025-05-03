// Connection diagnostic tool
(function() {
    console.log('%c Database Connection Diagnostic Tool ', 'background: #555; color: white; padding: 4px; border-radius: 4px;');
    
    // Function to check database connection status
    async function checkDatabaseConnection() {
        console.group('Database Connection Status');
        
        // Check if Supabase client exists
        console.log('1. Supabase Client Check:');
        if (window.supabase) {
            console.log('✓ Supabase client object exists on window');
            console.log('- Client type:', typeof window.supabase);
            console.log('- Available methods:', Object.keys(window.supabase).join(', '));
            
            if (typeof window.supabase.from === 'function') {
                console.log('✓ .from() method is available');
            } else {
                console.error('✗ .from() method is not available');
            }
        } else {
            console.error('✗ No Supabase client found on window object');
        }
        
        // Check global Supabase object
        console.log('\n2. Global Supabase Library:');
        if (typeof supabase !== 'undefined') {
            console.log('✓ Global supabase object exists');
            console.log('- Has createClient():', typeof supabase.createClient === 'function');
        } else {
            console.error('✗ Global supabase object not found');
        }
        
        // Check DatabaseManager
        console.log('\n3. Database Manager:');
        if (window.dbManager) {
            console.log('✓ dbManager exists');
            console.log('- Initialized:', window.dbManager.initialized);
            console.log('- Players loaded:', window.dbManager.players?.length || 0);
            
            if (window.dbManager.players?.length > 0) {
                console.log('- First player:', window.dbManager.players[0].name);
            } else {
                console.warn('- No players found in dbManager');
            }
        } else {
            console.error('✗ dbManager not found');
        }
        
        // Check localStorage status
        console.log('\n4. LocalStorage Status:');
        try {
            const savedStatus = localStorage.getItem('supabaseInitialized');
            if (savedStatus) {
                const status = JSON.parse(savedStatus);
                console.log('✓ Saved connection status found');
                console.log('- Last connected:', new Date(status.timestamp).toLocaleString());
                console.log('- Status:', status.status);
            } else {
                console.warn('- No saved connection status');
            }
        } catch (e) {
            console.error('- Error accessing localStorage:', e);
        }
        
        // Try a test query
        console.log('\n5. Test Database Query:');
        if (window.supabase && typeof window.supabase.from === 'function') {
            try {
                console.log('Attempting test query...');
                const { data, error } = await window.supabase
                    .from('profiles')
                    .select('count', { count: 'exact', head: true });
                
                if (error) {
                    console.error('✗ Query failed:', error.message);
                } else {
                    console.log('✓ Query succeeded!');
                    console.log('- Count:', data);
                }
            } catch (e) {
                console.error('✗ Exception during test query:', e);
            }
        } else {
            console.error('✗ Cannot run test query - Supabase client not available');
        }
        
        // Check scripts
        console.log('\n6. Script Loading:');
        const supabaseScript = document.querySelector('script[src*="supabase-js"]');
        if (supabaseScript) {
            console.log('✓ Supabase script found in page');
            console.log('- Source:', supabaseScript.src);
        } else {
            console.error('✗ Supabase script not found in page');
        }
        
        const initScript = document.querySelector('script[src*="supabase-init.js"]');
        if (initScript) {
            console.log('✓ Initialization script found');
        } else {
            console.error('✗ Initialization script not found');
        }
        
        console.groupEnd();
    }
    
    // Run diagnostics
    setTimeout(checkDatabaseConnection, 1000);
    
    // Add diagnostic button to page
    document.addEventListener('DOMContentLoaded', function() {
        // Create diagnostic button
        const diagButton = document.createElement('button');
        diagButton.textContent = 'Run Connection Diagnostics';
        diagButton.style.position = 'fixed';
        diagButton.style.bottom = '10px';
        diagButton.style.right = '10px';
        diagButton.style.zIndex = '9999';
        diagButton.style.padding = '8px 12px';
        diagButton.style.background = '#555';
        diagButton.style.color = 'white';
        diagButton.style.border = 'none';
        diagButton.style.borderRadius = '4px';
        diagButton.style.cursor = 'pointer';
        
        diagButton.addEventListener('click', function() {
            checkDatabaseConnection();
        });
        
        document.body.appendChild(diagButton);
    });
    
    // Expose diagnostic function globally
    window.diagnoseDatabaseConnection = checkDatabaseConnection;
})(); 