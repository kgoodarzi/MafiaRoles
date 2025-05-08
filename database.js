// Supabase client initialization
if (!window.SUPABASE_URL) {
    window.SUPABASE_URL = 'https://isagurhfcktnnldvntse.supabase.co';
    window.SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzYWd1cmhmY2t0bm5sZHZudHNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzNTY4NTAsImV4cCI6MjA1OTkzMjg1MH0.WYOhUCj5wD7AUCuxpDerOkwV_XvBAGapTEztRoJC2Q0';
}

// Wait for Supabase to be initialized from supabase-init.js
function waitForSupabase(maxWaitMs = 20000) {
    return new Promise((resolve, reject) => {
        // Check if supabase is already initialized and functional
        if (window.supabase && typeof window.supabase.from === 'function') {
            console.log('Supabase already initialized and ready');
            return resolve(window.supabase);
        }
        
        console.log('Waiting for Supabase to initialize from supabase-init.js...');
        
        // Listen for the supabaseInitialized event from supabase-init.js
        const initListener = function() {
            if (window.supabase && typeof window.supabase.from === 'function') {
                console.log('Received supabaseInitialized event');
                document.removeEventListener('supabaseInitialized', initListener);
                resolve(window.supabase);
            }
        };
        
        document.addEventListener('supabaseInitialized', initListener);
        
        // Also set a timeout in case the event is never fired
        const timeout = setTimeout(() => {
            document.removeEventListener('supabaseInitialized', initListener);
            reject(new Error('Timed out waiting for Supabase to initialize'));
        }, maxWaitMs);
        
        // Poll periodically until Supabase is initialized as a fallback
        const interval = setInterval(() => {
            if (window.supabase && typeof window.supabase.from === 'function') {
                clearTimeout(timeout);
                clearInterval(interval);
                document.removeEventListener('supabaseInitialized', initListener);
                console.log('Supabase initialized during polling');
                resolve(window.supabase);
            }
        }, 100);
    });
}

// Initialize on document load
document.addEventListener('DOMContentLoaded', function() {
    try {
        // Create and initialize database manager with a short delay
        // to ensure supabase-init.js has a chance to initialize Supabase
        setTimeout(() => {
            try {
                if (!window.dbManager) {
                    window.dbManager = new DatabaseManager();
                    window.dbManager.initialize().catch(err => {
                        console.error('Database initialization error:', err);
                        // If database initialization fails, create a fallback manager with default players
                        createFallbackDbManager();
                    });
                }
            } catch (dbErr) {
                console.error('Error creating DatabaseManager:', dbErr);
                createFallbackDbManager();
            }
        }, 500);
    } catch (error) {
        console.error('Error in database.js initialization:', error);
        createFallbackDbManager();
    }
});

// Create a fallback database manager with default players
function createFallbackDbManager() {
    console.log('Creating fallback database manager with default players');
    const defaultPlayers = [
        { username: 'alice123', full_name: 'Alice', photo: 'images/default-avatar.svg', email: '', previously_selected: false },
        { username: 'bob456', full_name: 'Bob', photo: 'images/default-avatar.svg', email: '', previously_selected: false },
        { username: 'charlie789', full_name: 'Charlie', photo: 'images/default-avatar.svg', email: '', previously_selected: false },
        { username: 'david101', full_name: 'David', photo: 'images/default-avatar.svg', email: '', previously_selected: false },
        { username: 'emily202', full_name: 'Emily', photo: 'images/default-avatar.svg', email: '', previously_selected: false },
        { username: 'frank303', full_name: 'Frank', photo: 'images/default-avatar.svg', email: '', previously_selected: false }
    ];
    
    window.dbManager = {
        players: defaultPlayers,
        selectedPlayers: [],
        initialized: true,
        getSelectedPlayers: function() {
            return this.selectedPlayers;
        },
        togglePlayerSelection: function(playerId) {
            const playerIndex = this.selectedPlayers.findIndex(p => p.username === playerId);
            const player = this.players.find(p => p.username === playerId);
            
            if (playerIndex === -1 && player) {
                this.selectedPlayers.push(player);
            } else if (playerIndex !== -1) {
                this.selectedPlayers.splice(playerIndex, 1);
            }
            
            console.log('Player selection toggled, now have', this.selectedPlayers.length, 'selected');
            return this.selectedPlayers.length;
        },
        saveSelectedPlayers: function() {
            localStorage.setItem('selectedPlayers', JSON.stringify(this.selectedPlayers));
            return this.selectedPlayers;
        },
        updatePreviouslySelectedFlag: function() {
            console.log('Mock updating previously selected flag');
            return Promise.resolve();
        },
        verifyPreviouslySelectedStatus: function() {
            return Promise.resolve();
        },
        getPlayerById: function(playerId) {
            console.log('Fallback getPlayerById:', playerId);
            const player = this.players.find(p => p.username === playerId);
            if (player) {
                return Promise.resolve(player);
            } else {
                return Promise.reject(new Error('Player not found in fallback manager'));
            }
        },
        getPlayerByUsername: function(username) {
            console.log('Fallback getPlayerByUsername:', username);
            const player = this.players.find(p => p.username === username);
            if (player) {
                return Promise.resolve(player);
            } else {
                return Promise.reject(new Error('Player not found in fallback manager'));
            }
        },
        updatePlayer: function(playerId, name, email, photoFile) {
            console.log('Fallback updatePlayer:', playerId);
            const playerIndex = this.players.findIndex(p => p.username === playerId);
            if (playerIndex === -1) {
                return Promise.reject(new Error('Player not found in fallback manager'));
            }
            
            // Update player in the array
            const updatedPlayer = {
                ...this.players[playerIndex],
                full_name: name,
                email: email || this.players[playerIndex].email,
                updated_at: new Date().toISOString()
            };
            
            // If there's a new photo, create a fake URL
            if (photoFile) {
                // In a real environment, we'd upload and get a URL, but here just make a note
                updatedPlayer.photo = `images/default-avatar.svg#updated=${Date.now()}`; 
            }
            
            this.players[playerIndex] = updatedPlayer;
            
            // Also update in selected players if present
            const selectedIndex = this.selectedPlayers.findIndex(p => p.username === playerId);
            if (selectedIndex !== -1) {
                this.selectedPlayers[selectedIndex] = updatedPlayer;
            }
            
            return Promise.resolve(updatedPlayer);
        },
        updatePlayerByUsername: function(username, name, email, photoFile) {
            console.log(`Updating player with username: ${username}`);
            return this.updatePlayer(username, name, email, photoFile);
        },
        updatePlayerInCache: function(playerId, updatedPlayer) {
            // Update the player in the local cache
            if (this.players && this.players.length > 0) {
                const index = this.players.findIndex(p => p.username === playerId);
                
                if (index !== -1) {
                    this.players[index] = updatedPlayer;
                }
            }
            
            // Also update in selected players if present
            if (this.selectedPlayers && this.selectedPlayers.length > 0) {
                const selectedIndex = this.selectedPlayers.findIndex(p => p.username === playerId);
                
                if (selectedIndex !== -1) {
                    this.selectedPlayers[selectedIndex] = updatedPlayer;
                }
            }
        },
        updatePlayerInCacheByUsername: function(username, updatedPlayer) {
            // Update the player in the local cache
            if (this.players && this.players.length > 0) {
                const index = this.players.findIndex(p => p.username === username);
                
                if (index !== -1) {
                    this.players[index] = updatedPlayer;
                }
            }
            
            // Also update in selected players if present
            if (this.selectedPlayers && this.selectedPlayers.length > 0) {
                const selectedIndex = this.selectedPlayers.findIndex(p => p.username === username);
                
                if (selectedIndex !== -1) {
                    this.selectedPlayers[selectedIndex] = updatedPlayer;
                }
            }
        }
    };
    
    // Trigger display of players if on player selection page
    if (document.getElementById('players-container')) {
        const event = new Event('dbManagerReady');
        document.dispatchEvent(event);
    }
}

class DatabaseManager {
    constructor() {
        this.players = [];
        this.selectedPlayers = [];
        this.initialized = false;
        this.initializationInProgress = false;
        console.log('DatabaseManager created');
    }

    async initialize() {
        try {
            // Set initialization in progress flag
            this.initializationInProgress = true;
            
            // Wait for Supabase to be ready before proceeding
            console.log('Waiting for Supabase to be ready...');
            try {
                await waitForSupabase(15000); // 15 second timeout
                console.log('Supabase is ready');
            } catch (supabaseError) {
                console.error('Error waiting for Supabase:', supabaseError);
                console.log('Will continue with initialization but database operations may fail');
            }
            
            // Check the actual supabase client
            if (!window.supabase || typeof window.supabase.from !== 'function') {
                console.error('Supabase initialization incomplete or invalid after waitForSupabase');
                console.log('Details:', {
                    clientExists: !!window.supabase,
                    hasFromMethod: typeof window?.supabase?.from === 'function'
                });
                
                // Try emergency fallback initialization
                if (typeof supabase !== 'undefined' && typeof supabase.createClient === 'function') {
                    console.log('Attempting emergency supabase initialization');
                    try {
                        window.supabase = supabase.createClient(
                            'https://isagurhfcktnnldvntse.supabase.co',
                            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzYWd1cmhmY2t0bm5sZHZudHNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzNTY4NTAsImV4cCI6MjA1OTkzMjg1MH0.WYOhUCj5wD7AUCuxpDerOkwV_XvBAGapTEztRoJC2Q0'
                        );
                        console.log('Emergency initialization completed');
                    } catch (e) {
                        console.error('Emergency initialization failed:', e);
                    }
                }
            }
            
            // Check storage bucket availability
            try {
                await this.checkStorageAvailability();
            } catch (storageError) {
                console.error('Error checking storage availability:', storageError);
                // Continue anyway
            }
            
            // Try to ensure previously_selected column exists in profiles table
            try {
                await this.ensurePreviouslySelectedColumn();
            } catch (columnError) {
                console.error('Error ensuring previously_selected column:', columnError);
                // Continue anyway
            }
            
            // Load players from database
            try {
                await this.loadPlayers();
                console.log('Players loaded successfully:', this.players.length);
            } catch (loadError) {
                console.error('Error loading players:', loadError);
                // Create fallback players if loading failed
                this.players = [
                    { username: 'alice123', full_name: 'Alice (Fallback)', photo: 'images/default-avatar.svg', email: '', previously_selected: false },
                    { username: 'bob456', full_name: 'Bob (Fallback)', photo: 'images/default-avatar.svg', email: '', previously_selected: false },
                    { username: 'charlie789', full_name: 'Charlie (Fallback)', photo: 'images/default-avatar.svg', email: '', previously_selected: false },
                    { username: 'david101', full_name: 'David (Fallback)', photo: 'images/default-avatar.svg', email: '', previously_selected: false },
                    { username: 'emily202', full_name: 'Emily (Fallback)', photo: 'images/default-avatar.svg', email: '', previously_selected: false },
                    { username: 'frank303', full_name: 'Frank (Fallback)', photo: 'images/default-avatar.svg', email: '', previously_selected: false }
                ];
            }
            
            // Set initialized flag even if there were errors
            this.initialized = true;
            this.initializationInProgress = false;
            
            console.log('DatabaseManager initialized with', this.players.length, 'players');
            
            // Dispatch an event to notify that the database manager is ready
            document.dispatchEvent(new CustomEvent('dbManagerReady', {
                detail: { success: true, playerCount: this.players.length }
            }));
            
            return this.players;
        } catch (error) {
            console.error('Fatal error initializing DatabaseManager:', error);
            
            // Even with fatal errors, we should set the initialized flag and provide fallback data
            this.initialized = true;
            this.initializationInProgress = false;
            
            // Create emergency fallback players
            this.players = [
                { username: 'alice123', full_name: 'Alice (Emergency)', photo: 'images/default-avatar.svg', email: '', previously_selected: false },
                { username: 'bob456', full_name: 'Bob (Emergency)', photo: 'images/default-avatar.svg', email: '', previously_selected: false },
                { username: 'charlie789', full_name: 'Charlie (Emergency)', photo: 'images/default-avatar.svg', email: '', previously_selected: false },
                { username: 'david101', full_name: 'David (Emergency)', photo: 'images/default-avatar.svg', email: '', previously_selected: false },
                { username: 'emily202', full_name: 'Emily (Emergency)', photo: 'images/default-avatar.svg', email: '', previously_selected: false },
                { username: 'frank303', full_name: 'Frank (Emergency)', photo: 'images/default-avatar.svg', email: '', previously_selected: false }
            ];
            
            // Still dispatch the event with error information
            document.dispatchEvent(new CustomEvent('dbManagerReady', {
                detail: { success: false, error: error.message, playerCount: this.players.length }
            }));
            
            return this.players;
        }
    }

    async loadPlayers() {
        console.log('Loading players from database...');
        try {
            // Ensure Supabase is ready
            await waitForSupabase();
            
            // Add detailed diagnostic logging
            console.log('Supabase client ready for database query. Status check:');
            console.log('- Supabase initialized:', !!window.supabase);
            console.log('- Has .from() method:', typeof window.supabase?.from === 'function');
            
            // Try to load from profiles table
            try {
                console.log('Querying "profiles" table');
                const { data, error } = await window.supabase
                    .from('profiles')
                    .select('*')
                    .order('sequence', { ascending: true });
                
                if (error) {
                    console.error('Error loading profiles:', error);
                    throw error;
                }
                
                if (data && data.length > 0) {
                    console.log(`Loaded ${data.length} players from profiles table`);
                    this.players = data;
                    
                    // Also load previously selected players into selectedPlayers array
                    this.selectedPlayers = data.filter(player => player.previously_selected === true);
                    
                    // Sort selected players by sequence
                    this.selectedPlayers.sort((a, b) => {
                        const seqA = a.sequence !== undefined ? a.sequence : 9999;
                        const seqB = b.sequence !== undefined ? b.sequence : 9999;
                        return seqA - seqB;
                    });
                    
                    console.log(`Loaded ${this.selectedPlayers.length} previously selected players`);
                    
                    // Save to localStorage for future offline use
                    try {
                        if (typeof localStorage !== 'undefined') {
                            localStorage.setItem('players', JSON.stringify(this.players));
                            localStorage.setItem('selectedPlayers', JSON.stringify(this.selectedPlayers));
                            console.log('Saved players to localStorage');
                        }
                    } catch (saveError) {
                        console.error('Error saving players to localStorage:', saveError);
                    }
                    
                    return this.players;
                } else {
                    // No players found, create default players
                    console.log('No players found in profiles table');
                    throw new Error('No players found');
                }
            } catch (profilesError) {
                console.error('Error loading from profiles table:', profilesError);
                throw profilesError;
            }
        } catch (error) {
            console.error('Error in loadPlayers:', error);
            
            // Try to load from localStorage as fallback
            try {
                if (typeof localStorage !== 'undefined') {
                    const localPlayersJson = localStorage.getItem('players');
                    if (localPlayersJson) {
                        this.players = JSON.parse(localPlayersJson);
                        
                        // Sort players by sequence if available
                        this.players.sort((a, b) => {
                            const seqA = a.sequence !== undefined ? a.sequence : 9999;
                            const seqB = b.sequence !== undefined ? b.sequence : 9999;
                            return seqA - seqB;
                        });
                        
                        // Also try to load previously selected players
                        const selectedPlayersJson = localStorage.getItem('selectedPlayers');
                        if (selectedPlayersJson) {
                            this.selectedPlayers = JSON.parse(selectedPlayersJson);
                        } else {
                            // If no selected players in localStorage, use previously_selected flag
                            this.selectedPlayers = this.players.filter(player => player.previously_selected === true);
                        }
                        
                        console.log(`Loaded ${this.players.length} players from localStorage after error`);
                        console.log(`Loaded ${this.selectedPlayers.length} previously selected players`);
                        return this.players;
                    }
                }
            } catch (e) {
                console.error('Error accessing localStorage after main error:', e);
            }
            
            // If everything else failed, use fallback players
            console.log('All loading attempts failed, using fallback players');
            this.players = [
                { username: 'alice123', full_name: 'Alice (Fallback)', photo: 'images/default-avatar.svg', email: '', previously_selected: false, sequence: 1 },
                { username: 'bob456', full_name: 'Bob (Fallback)', photo: 'images/default-avatar.svg', email: '', previously_selected: false, sequence: 2 },
                { username: 'charlie789', full_name: 'Charlie (Fallback)', photo: 'images/default-avatar.svg', email: '', previously_selected: false, sequence: 3 },
                { username: 'david101', full_name: 'David (Fallback)', photo: 'images/default-avatar.svg', email: '', previously_selected: false, sequence: 4 },
                { username: 'emily202', full_name: 'Emily (Fallback)', photo: 'images/default-avatar.svg', email: '', previously_selected: false, sequence: 5 },
                { username: 'frank303', full_name: 'Frank (Fallback)', photo: 'images/default-avatar.svg', email: '', previously_selected: false, sequence: 6 }
            ];
            
            return this.players;
        }
    }
    
    async getPlayerById(playerId) {
        console.log(`Getting player with ID: ${playerId}`);
        
        // This method needs to be rewritten to use username as the primary key
        // In this context, we'll treat the passed "playerId" as if it were a username
        return this.getPlayerByUsername(playerId);
    }
    
    async getPlayerByUsername(username) {
        console.log(`Getting player with username: ${username}`);
        
        // First check the already loaded players
        if (this.players && this.players.length > 0) {
            const player = this.players.find(p => 
                p.username === username
            );
            
            if (player) {
                console.log('Player found in local cache:', player);
                return this.normalizePlayerData(player);
            }
        }
        
        try {
            // Check if we should even attempt database operations
            const skipDbOps = typeof localStorage !== 'undefined' && 
                              localStorage.getItem('skip_db_updates') === 'true';
            
            if (skipDbOps) {
                console.log('Skipping database lookup due to previous failures');
                // Skip to localStorage check
                throw new Error('Skipping database operations');
            }
            
            // Ensure Supabase is ready
            await waitForSupabase();
            
            // Query the profiles table using username as primary key
            const { data, error } = await window.supabase
                .from('profiles')
                .select('*')
                .eq('username', username)
                .single();
            
            if (error) {
                console.error('Error getting player from profiles table:', error);
                throw new Error('Player not found in profiles table');
            }
            
            if (data) {
                console.log('Player found in profiles table:', data);
                return this.normalizePlayerData(data);
            } else {
                throw new Error('Player not found');
            }
        } catch (error) {
            console.error('Error in getPlayerByUsername:', error);
            
            // Try localStorage as a fallback
            if (typeof localStorage !== 'undefined') {
                try {
                    console.log('Trying to find player in localStorage');
                    const storedPlayersJSON = localStorage.getItem('players');
                    if (storedPlayersJSON) {
                        const storedPlayers = JSON.parse(storedPlayersJSON);
                        const player = storedPlayers.find(p => p.username === username);
                        if (player) {
                            console.log('Player found in localStorage:', player);
                            return this.normalizePlayerData(player);
                        }
                    }
                } catch (localStorageError) {
                    console.error('Error checking localStorage:', localStorageError);
                }
            }
            
            // If we reach here, create a minimal player object so the UI can proceed
            console.log('Creating minimal player object for', username);
            const minimalPlayer = {
                username: username,
                full_name: username, // Use username as name
                photo: 'images/default-avatar.svg',
                email: '',
                previously_selected: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            // Add to players cache for future lookups
            if (!this.players.some(p => p.username === username)) {
                this.players.push(minimalPlayer);
            }
            
            return minimalPlayer;
        }
    }
    
    // Helper method to normalize player data from different sources
    normalizePlayerData(player) {
        if (!player) return null;
        
        const normalizedPlayer = { ...player };
        
        // Ensure name is set correctly using full_name
        normalizedPlayer.full_name = player.full_name || player.name || player.player_name || 'Unknown Player';
        
        // Ensure username is set correctly
        normalizedPlayer.username = player.username || player.user_name || player.id || 'unknown';
        
        // Ensure photo is set correctly
        normalizedPlayer.photo = player.photo || player.photoUrl || player.avatar || player.photo_url || 'images/default-avatar.svg';
        
        // Ensure these fields exist
        if (!normalizedPlayer.email) normalizedPlayer.email = '';
        if (!normalizedPlayer.previously_selected) normalizedPlayer.previously_selected = false;
        
        console.log('Normalized player data:', normalizedPlayer);
        return normalizedPlayer;
    }
    
    async updatePlayer(playerId, name, email, photoFile) {
        console.log(`Updating player with ID: ${playerId}`);
        try {
            // Ensure Supabase is ready
            await waitForSupabase();
            
            // First get the player by ID to get their username
            const player = await this.getPlayerById(playerId).catch(e => null);
            
            if (!player || !player.username) {
                throw new Error('Could not find player username for ID: ' + playerId);
            }
            
            // Now use updatePlayerByUsername since we need to use username as the primary key
            return this.updatePlayerByUsername(player.username, name, email, photoFile);
        } catch (error) {
            console.error('Error in updatePlayer:', error);
            
            // For photo upload errors, we can proceed with updating other fields
            if (error.message && error.message.includes('Photo upload failed')) {
                console.log('Proceeding with player update without photo changes');
                // Try again without the photo file
                return this.updatePlayerByUsername(player.username, name, email, null);
            }
            
            throw error;
        }
    }
    
    async updatePlayerByUsername(username, name, email, photoFile) {
        console.log(`Updating player with username: ${username}`);
        try {
            // Ensure Supabase is ready
            await waitForSupabase();
            
            // Try to get the player first to understand current data
            const player = await this.getPlayerByUsername(username).catch(e => null);
            
            // Check if we have localStorage available
            const hasLocalStorage = typeof localStorage !== 'undefined';
            
            // Add diagnostics about the player data structure
            if (player) {
                console.log('Current player data:', player);
            } else {
                console.log('Unable to get current player data');
            }
            
            // Prepare update data with correct fields only
            const updateData = {
                full_name: name,
                updated_at: new Date().toISOString()
            };
            
            // Add email if provided
            if (email) updateData.email = email;
            
            // Base64 photo data for fallback
            let base64PhotoData = null;
            
            // If there's a new photo, try to upload it to Supabase images bucket
            if (photoFile) {
                let photoUploadAttempted = false;
                try {
                    photoUploadAttempted = true;
                    console.log('Processing photo file...');
                    
                    // Use the images bucket directly since we know it exists and works
                    const targetBucket = 'images';
                    
                    try {
                        // Generate a unique file name
                        const fileExt = photoFile.name.split('.').pop();
                        const fileName = `${username}_${Date.now()}.${fileExt}`;
                        
                        console.log(`Attempting to upload to ${targetBucket} bucket...`);
                        
                        // Upload the file to the bucket
                        const { data: uploadData, error: uploadError } = await window.supabase.storage
                            .from(targetBucket)
                            .upload(fileName, photoFile, {
                                cacheControl: '3600',
                                upsert: true
                            });
                        
                        if (uploadError) {
                            console.error(`Error uploading to ${targetBucket}:`, uploadError);
                            throw new Error(`Failed to upload to ${targetBucket}: ${uploadError.message}`);
                        }
                        
                        // Get the public URL
                        const { data: urlData } = await window.supabase.storage
                            .from(targetBucket)
                            .getPublicUrl(fileName);
                        
                        if (!urlData || !urlData.publicUrl) {
                            console.error(`Failed to get public URL from ${targetBucket}`);
                            throw new Error(`Failed to get public URL for uploaded file`);
                        }
                        
                        const publicUrl = urlData.publicUrl;
                        console.log(`Successfully uploaded image: ${publicUrl}`);
                        
                        // Update the photo field with the URL
                        updateData.photo = publicUrl;
                    } catch (uploadError) {
                        console.error(`Error uploading image:`, uploadError);
                        throw uploadError; // Re-throw to be caught by outer try/catch
                    }
                } catch (photoError) {
                    console.error('Error processing photo:', photoError);
                    
                    // If photo upload was attempted but failed, continue without photo update
                    if (photoUploadAttempted) {
                        console.log('Continuing with player update but without photo changes');
                        // Don't update the photo field, keeping the existing one
                        if (player && player.photo) {
                            console.log('Keeping existing photo URL:', player.photo);
                        }
                    } else {
                        // This is a more serious error, might be best to propagate
                        throw new Error(`Photo upload failed: ${photoError.message}`);
                    }
                }
            }
            
            // Create the updated player object for cache and local storage
            const updatedPlayerData = player ? { ...player, ...updateData } : { 
                username: username, 
                ...updateData
            };
            
            // Save to localStorage as a backup
            if (hasLocalStorage) {
                try {
                    // Get existing stored players
                    const storedPlayersJSON = localStorage.getItem('players') || '[]';
                    let storedPlayers = [];
                    try {
                        storedPlayers = JSON.parse(storedPlayersJSON);
                    } catch (e) {
                        console.error('Error parsing stored players:', e);
                        storedPlayers = [];
                    }
                    
                    // Update or add the player
                    const existingIndex = storedPlayers.findIndex(p => p.username === username);
                    if (existingIndex >= 0) {
                        storedPlayers[existingIndex] = updatedPlayerData;
                    } else {
                        storedPlayers.push(updatedPlayerData);
                    }
                    
                    // Save back to localStorage
                    localStorage.setItem('players', JSON.stringify(storedPlayers));
                    console.log('Player data saved to localStorage');
                    
                    // Also update the selected players if this player is in that list
                    try {
                        const storedSelectedJSON = localStorage.getItem('selectedPlayers') || '[]';
                        let storedSelected = [];
                        try {
                            storedSelected = JSON.parse(storedSelectedJSON);
                        } catch (e) {
                            console.log('No valid selected players in storage');
                            storedSelected = [];
                        }
                        
                        // Update the player if in selected list
                        const selectedIndex = storedSelected.findIndex(p => p.username === username);
                        if (selectedIndex >= 0) {
                            storedSelected[selectedIndex] = updatedPlayerData;
                            localStorage.setItem('selectedPlayers', JSON.stringify(storedSelected));
                            console.log('Updated player in selected players list');
                        }
                    } catch (e) {
                        console.error('Error updating selected players:', e);
                    }
                } catch (storageError) {
                    console.error('Error saving to localStorage:', storageError);
                }
            }
            
            // Try to update in profiles table
            let updateSuccessful = false;
            let updatedPlayer = null;
            
            console.log('Attempting to update player in profiles table:', updateData);
            
            const { data, error } = await window.supabase
                .from('profiles')
                .update(updateData)
                .eq('username', username)
                .select()
                .single();
            
            if (error) {
                console.error('Error updating player in profiles table:', error);
                
                // Database update failed, use local cache and storage
                console.log('Database update failed, updating cache and localStorage only');
                // Update local cache
                this.updatePlayerInCacheByUsername(username, updatedPlayerData);
                return updatedPlayerData;
            } else {
                console.log('Player updated in profiles table:', data);
                updatedPlayer = data;
                updateSuccessful = true;
            }
            
            // Update local cache with database result or our constructed object
            const finalResult = updatedPlayer || updatedPlayerData;
            this.updatePlayerInCacheByUsername(username, finalResult);
            
            return finalResult;
        } catch (error) {
            console.error('Error in updatePlayerByUsername:', error);
            
            // Attempt to use localStorage as a fallback if an error occurs
            if (typeof localStorage !== 'undefined') {
                try {
                    const storedPlayersJSON = localStorage.getItem('players') || '[]';
                    const storedPlayers = JSON.parse(storedPlayersJSON);
                    const existingPlayer = storedPlayers.find(p => p.username === username);
                    
                    if (existingPlayer) {
                        console.log('Returning player from localStorage after error');
                        return existingPlayer;
                    }
                } catch (e) {
                    console.error('Error accessing localStorage after main error:', e);
                }
            }
            
            throw error;
        }
    }
    
    updatePlayerInCache(playerId, updatedPlayer) {
        // Update the player in the local cache
        if (this.players && this.players.length > 0) {
            const index = this.players.findIndex(p => 
                p.username === playerId
            );
            
            if (index !== -1) {
                this.players[index] = updatedPlayer;
            }
        }
        
        // Also update in selected players if present
        if (this.selectedPlayers && this.selectedPlayers.length > 0) {
            const selectedIndex = this.selectedPlayers.findIndex(p => 
                p.username === playerId
            );
            
            if (selectedIndex !== -1) {
                this.selectedPlayers[selectedIndex] = updatedPlayer;
            }
        }
    }
    
    updatePlayerInCacheByUsername(username, updatedPlayer) {
        // Update the player in the local cache
        if (this.players && this.players.length > 0) {
            const index = this.players.findIndex(p => 
                p.username === username
            );
            
            if (index !== -1) {
                this.players[index] = updatedPlayer;
            }
        }
        
        // Also update in selected players if present
        if (this.selectedPlayers && this.selectedPlayers.length > 0) {
            const selectedIndex = this.selectedPlayers.findIndex(p => 
                p.username === username
            );
            
            if (selectedIndex !== -1) {
                this.selectedPlayers[selectedIndex] = updatedPlayer;
            }
        }
    }
    
    async loadLegacyPlayers() {
        console.log('Loading players from legacy "mafia.players" table');
        try {
            // Ensure Supabase is ready
            await waitForSupabase();
            
            // Try to ensure table exists first
            await this.ensurePlayersTableExists();
            
            console.log('Attempting to query mafia.players table');
            const { data, error } = await window.supabase
                .from('mafia.players')
                .select('*');
            
            if (error) {
                console.error('Error querying mafia.players:', error);
                console.log('Error details:', {
                    code: error.code,
                    message: error.message,
                    details: error.details
                });
                
                // If table doesn't exist or access error, try creating it
                if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
                    console.log('Table does not exist, attempting to create it');
                    const tableCreated = await this.ensurePlayersTableExists();
                    if (tableCreated) {
                        // Try again after creating the table
                        return this.saveSamplePlayers();
                    }
                }
                
                throw error;
            }
            
            if (data && data.length > 0) {
                console.log(`Found ${data.length} players in legacy database:`, data.map(p => p.name));
                this.players = data;
                return data;
            } else {
                console.log('No players found in database, adding sample players');
                return this.saveSamplePlayers();
            }
        } catch (error) {
            console.error('Error in loadLegacyPlayers:', error);
            
            // Create fallback players if all database methods fail
            console.log('Creating fallback players after all database methods failed');
            this.players = [
                { username: 'alice123', full_name: 'Alice (Offline)', photo: 'images/default-avatar.svg', email: '', previously_selected: false },
                { username: 'bob456', full_name: 'Bob (Offline)', photo: 'images/default-avatar.svg', email: '', previously_selected: false },
                { username: 'charlie789', full_name: 'Charlie (Offline)', photo: 'images/default-avatar.svg', email: '', previously_selected: false },
                { username: 'david101', full_name: 'David (Offline)', photo: 'images/default-avatar.svg', email: '', previously_selected: false },
                { username: 'emily202', full_name: 'Emily (Offline)', photo: 'images/default-avatar.svg', email: '', previously_selected: false },
                { username: 'frank303', full_name: 'Frank (Offline)', photo: 'images/default-avatar.svg', email: '', previously_selected: false }
            ];
            return this.players;
        }
    }

    async saveSamplePlayers() {
        console.log('Saving sample players...');
        const samplePlayers = [
            { username: 'alice123', full_name: 'Alice', photo: 'images/default-avatar.svg', email: '', previously_selected: false },
            { username: 'bob456', full_name: 'Bob', photo: 'images/default-avatar.svg', email: '', previously_selected: false },
            { username: 'charlie789', full_name: 'Charlie', photo: 'images/default-avatar.svg', email: '', previously_selected: false }
        ];

        try {
            const { data, error } = await window.supabase
                .from('mafia.players')
                .insert(samplePlayers)
                .select();

            if (error) {
                console.error('Error saving sample players:', error);
                throw error;
            }

            console.log('Sample players saved successfully:', data);
            this.players = data;
            return data;
        } catch (error) {
            console.error('Failed to save sample players:', error);
            throw error;
        }
    }

    async addPlayer(playerData) {
        console.log(`Adding new player:`, playerData);
        try {
            // Add player to database
            const { data, error } = await window.supabase
                .from('mafia.players')
                .insert(playerData)
                .select();
            
            if (error) {
                console.error('Error adding player:', error);
                throw error;
            }
            
            if (data && data.length > 0) {
                console.log('Player added successfully:', data[0]);
                this.players.push(data[0]);
                return data[0];
            }
            
            throw new Error('No data returned from insert operation');
        } catch (error) {
            console.error('Failed to add player:', error);
            throw error;
        }
    }

    async ensurePlayersTableExists() {
        console.log('Checking if mafia.players exists');
        try {
            // Try a simple count query - if table doesn't exist, this will error
            const { error } = await window.supabase
                .from('mafia.players')
                .select('id', { count: 'exact', head: true });
                
            if (error) {
                console.error('Error checking mafia.players existence:', error);
                console.log('Attempting to create mafia.players table');
                
                try {
                    // First try to create the schema if it doesn't exist
                    const { error: schemaError } = await window.supabase
                        .sql`CREATE SCHEMA IF NOT EXISTS mafia`;
                    
                    if (schemaError) {
                        console.error('Error creating mafia schema:', schemaError);
                    }
                    
                    // Then try to create the table
                    const { error: tableError } = await window.supabase
                        .sql`
                        CREATE TABLE IF NOT EXISTS mafia.players (
                            username TEXT PRIMARY KEY,
                            full_name TEXT NOT NULL,
                            phone TEXT,
                            previously_selected BOOLEAN DEFAULT FALSE
                        )`;
                    
                    if (tableError) {
                        console.error('Error creating mafia.players table:', tableError);
                        
                        // Try alternative approach with RPC if SQL query fails
                        console.log('Trying alternative approach with function call');
                        const { error: rpcError } = await window.supabase
                            .rpc('create_players_table');
                        
                        if (rpcError) {
                            console.error('RPC approach also failed:', rpcError);
                            return false;
                        } else {
                            console.log('Successfully created mafia.players table');
                            return true;
                        }
                    } else {
                        console.log('Successfully created mafia.players table');
                        return true;
                    }
                } catch (createErr) {
                    console.error('Exception creating mafia.players table:', createErr);
                    
                    // Try one more approach - using a simpler query format
                    try {
                        console.log('Trying simpler query format for table creation');
                        const result = await window.supabase.auth.getSession();
                        console.log('Current auth session:', result);
                        return false;
                    } catch (e) {
                        console.error('Final attempt failed:', e);
                        return false;
                    }
                }
            } else {
                console.log('mafia.players table exists');
                return true;
            }
        } catch (error) {
            console.error('Error in ensurePlayersTableExists:', error);
            return false;
        }
    }

    // Player selection methods
    selectPlayer(player) {
        const existingIndex = this.selectedPlayers.findIndex(p => p.username === player.username);
        if (existingIndex === -1) {
            this.selectedPlayers.push(player);
            console.log(`Player ${player.full_name} (username: ${player.username}) selected`);
        }
        return this.selectedPlayers.length;
    }

    deselectPlayer(player) {
        const index = this.selectedPlayers.findIndex(p => p.username === player.username);
        if (index !== -1) {
            this.selectedPlayers.splice(index, 1);
            console.log(`Player ${player.full_name} (username: ${player.username}) deselected`);
        }
        return this.selectedPlayers.length;
    }
    
    // Toggle player selection (used by player-selection.js)
    togglePlayerSelection(playerId) {
        console.log(`DEBUG: Toggling selection for player ID: ${playerId}`);
        
        // Find the player in our players array
        const player = this.players.find(p => p.username === playerId);
        if (!player) {
            console.error(`DEBUG: Player with username ${playerId} not found in players list`);
            // Dump player list for debugging
            console.log('DEBUG: Available players:', this.players.map(p => ({ username: p.username, full_name: p.full_name })));
            return this.selectedPlayers.length;
        }
        
        // Check if player is already selected
        const existingIndex = this.selectedPlayers.findIndex(p => p.username === playerId);
        
        if (existingIndex === -1) {
            // Player not selected, add to selection
            
            // Assign next sequence number if not already set
            if (player.sequence === undefined) {
                // Find the highest sequence number currently in use
                const maxSequence = this.selectedPlayers.reduce((max, p) => {
                    return Math.max(max, p.sequence !== undefined ? p.sequence : 0);
                }, 0);
                
                // Set next sequence number
                player.sequence = maxSequence + 1;
                
                // Update the sequence in the database
                if (window.supabase) {
                    window.supabase
                        .from('profiles')
                        .update({ sequence: player.sequence })
                        .eq('username', playerId)
                        .then(({ error }) => {
                            if (error) {
                                console.error('Error updating player sequence:', error);
                            } else {
                                console.log(`Player ${playerId} sequence updated to ${player.sequence}`);
                            }
                        });
                }
            }
            
            this.selectedPlayers.push(player);
            console.log(`DEBUG: Player ${player.full_name} (username: ${playerId}) selected with sequence ${player.sequence}`);
        } else {
            // Player already selected, remove from selection
            this.selectedPlayers.splice(existingIndex, 1);
            console.log(`DEBUG: Player ${player.full_name} (username: ${playerId}) deselected`);
        }
        
        console.log('DEBUG: Current selected players:', this.selectedPlayers.map(p => ({ 
            username: p.username, 
            full_name: p.full_name,
            sequence: p.sequence
        })));
        
        // Update the selection status in the database immediately
        this.updatePreviouslySelectedFlag()
            .then(() => {
                console.log('DEBUG: Successfully updated previously_selected flags');
                // Verify the update worked by directly reading from the database
                this.verifyPreviouslySelectedStatus();
            })
            .catch(error => {
                console.error('DEBUG: Error updating previously_selected flags:', error);
            });
        
        return this.selectedPlayers.length;
    }

    getSelectedPlayers() {
        return [...this.selectedPlayers];
    }

    saveSelectedPlayers() {
        console.log('Saving selected players');
        try {
            // Sort selected players by sequence
            this.selectedPlayers.sort((a, b) => {
                const seqA = a.sequence !== undefined ? a.sequence : 9999;
                const seqB = b.sequence !== undefined ? b.sequence : 9999;
                return seqA - seqB;
            });
            
            // Save to localStorage
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('selectedPlayers', JSON.stringify(this.selectedPlayers));
                console.log(`Saved ${this.selectedPlayers.length} players to localStorage`);
            } else {
                console.warn('localStorage not available, cannot save selected players');
            }
            
            // Try to update selected status in database
            this.updatePreviouslySelectedFlag()
                .then(() => console.log('Updated previously_selected flags in database'))
                .catch(error => console.error('Error updating previously_selected flags:', error));
            
            return this.selectedPlayers;
        } catch (error) {
            console.error('Error in saveSelectedPlayers:', error);
            
            // Attempt direct localStorage save as fallback
            try {
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('selectedPlayers', JSON.stringify(this.selectedPlayers));
                }
            } catch (e) {
                console.error('Fatal error saving selected players:', e);
            }
            
            return this.selectedPlayers;
        }
    }
    
    async updatePreviouslySelectedFlag() {
        if (!this.selectedPlayers || this.selectedPlayers.length === 0) {
            console.log('DEBUG: No players selected, nothing to update');
            return;
        }
        
        console.log('DEBUG: Updating previously_selected flag for players in database');
        console.log('DEBUG: Current selected players:', this.selectedPlayers.map(p => ({ 
            username: p.username, 
            full_name: p.full_name || p.name,
            sequence: p.sequence
        })));
        
        try {
            // First, set all player flags to false
            console.log('DEBUG: Resetting all previously_selected flags to false');
            const { data: resetData, error: resetError } = await window.supabase
                .from('profiles')
                .update({ previously_selected: false })
                .neq('username', 'dummy_value')  // Update all rows
                .select('username, full_name, previously_selected');
                
            if (resetError) {
                console.error('DEBUG: Error resetting previously_selected flags:', resetError);
            } else {
                console.log('DEBUG: Successfully reset all previously_selected flags to false', resetData);
            }
            
            // Get usernames from selected players
            const selectedPlayerUsernames = this.selectedPlayers.map(player => player.username);
            console.log('DEBUG: Selected player usernames:', selectedPlayerUsernames);
            
            // Set selected players' flags to true
            if (selectedPlayerUsernames.length > 0) {
                console.log('DEBUG: Setting previously_selected=true for usernames:', selectedPlayerUsernames);
                
                const { data: updateData, error: updateError } = await window.supabase
                    .from('profiles')
                    .update({ previously_selected: true })
                    .in('username', selectedPlayerUsernames)
                    .select('username, full_name, previously_selected');
                    
                if (updateError) {
                    console.error('DEBUG: Error updating previously_selected flags:', updateError);
                } else {
                    console.log('DEBUG: Successfully updated previously_selected flags in database:', updateData);
                }
            } else {
                console.error('DEBUG: Could not find any usernames in selected players');
            }
            
            // Update sequence values for each selected player
            for (const player of this.selectedPlayers) {
                if (player.username && player.sequence !== undefined) {
                    console.log(`DEBUG: Updating sequence for ${player.username} to ${player.sequence}`);
                    
                    const { data: seqData, error: seqError } = await window.supabase
                        .from('profiles')
                        .update({ sequence: player.sequence })
                        .eq('username', player.username)
                        .select('username, full_name, sequence');
                        
                    if (seqError) {
                        console.error(`DEBUG: Error updating sequence for ${player.username}:`, seqError);
                    } else {
                        console.log(`DEBUG: Successfully updated sequence for ${player.username} to ${player.sequence}`);
                    }
                }
            }
            
            // Verify the update worked
            await this.verifyPreviouslySelectedStatus();
        } catch (error) {
            console.error('DEBUG: Error in updatePreviouslySelectedFlag:', error);
            throw error;
        }
    }
    
    // Verify method to check database values directly
    async verifyPreviouslySelectedStatus() {
        console.log('DEBUG: Verifying previously_selected status in database');
        try {
            const { data, error } = await window.supabase
                .from('profiles')
                .select('username, full_name, previously_selected, sequence')
                .order('sequence', { ascending: true });
                
            if (error) {
                console.error('DEBUG: Error verifying previously_selected:', error);
            } else {
                console.log('DEBUG: Current database values for previously_selected and sequence:', 
                    data.map(p => ({ 
                        username: p.username, 
                        name: p.full_name, 
                        selected: p.previously_selected,
                        sequence: p.sequence
                    }))
                );
                
                // For true values only
                const selectedInDb = data.filter(p => p.previously_selected === true);
                console.log('DEBUG: Players with previously_selected=true in database:', 
                    selectedInDb.map(p => ({ 
                        username: p.username, 
                        name: p.full_name,
                        sequence: p.sequence 
                    }))
                );
                
                // Compare with our selected players
                const ourSelectedIds = this.selectedPlayers.map(p => p.username);
                console.log('DEBUG: Our selected player IDs:', ourSelectedIds);
                
                // Log sequence values from selected players
                console.log('DEBUG: Our selected player sequences:', 
                    this.selectedPlayers.map(p => ({ 
                        username: p.username, 
                        sequence: p.sequence 
                    }))
                );
            }
        } catch (error) {
            console.error('DEBUG: Error in verifyPreviouslySelectedStatus:', error);
        }
    }
    
    // Force update method for direct use
    async forceUpdateSelectedPlayers() {
        console.log('DEBUG: Force updating selected players');
        try {
            // First check the database structure
            const { data: tableInfo, error: tableError } = await window.supabase
                .from('profiles')
                .select('*')
                .limit(1);
                
            if (tableError) {
                console.error('DEBUG: Error checking profiles table:', tableError);
            } else {
                console.log('DEBUG: Profiles table structure:', tableInfo);
            }
            
            // Now attempt the update
            await this.updatePreviouslySelectedFlag();
            
            return true;
        } catch (error) {
            console.error('DEBUG: Error in forceUpdateSelectedPlayers:', error);
            return false;
        }
    }

    async ensurePreviouslySelectedColumn() {
        console.log('Ensuring previously_selected column exists in profiles table');
        try {
            // Make sure Supabase is ready first
            await waitForSupabase();
            
            console.log('Supabase client ready, checking previously_selected column');
            
            // Verify window.supabase has the from method
            if (!window.supabase || typeof window.supabase.from !== 'function') {
                console.error('Supabase client not properly initialized. window.supabase:', window.supabase);
                throw new Error('Supabase client not properly initialized');
            }
            
            // Check if column exists
            const { data, error } = await window.supabase
                .from('profiles')
                .select('previously_selected')
                .limit(1);
            
            if (error) {
                // Column might not exist, check error message
                if (error.message && error.message.includes('does not exist')) {
                    console.log('previously_selected column does not exist, adding it');
                    
                    // Add the column
                    const { error: alterError } = await window.supabase
                        .rpc('add_previously_selected_column');
                    
                    if (alterError) {
                        console.error('Error adding previously_selected column using RPC:', alterError);
                        
                        // Try direct SQL as fallback
                        try {
                            const { error: sqlError } = await window.supabase
                                .sql`ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS previously_selected BOOLEAN DEFAULT false`;
                            
                            if (sqlError) {
                                console.error('Error adding previously_selected column with SQL:', sqlError);
                                return false;
                            } else {
                                console.log('Successfully added previously_selected column with SQL');
                                return true;
                            }
                        } catch (sqlErr) {
                            console.error('Exception in SQL alter table:', sqlErr);
                            return false;
                        }
                    } else {
                        console.log('Successfully added previously_selected column using RPC');
                        return true;
                    }
                } else {
                    console.error('Unexpected error checking profiles table:', error);
                    return false;
                }
            } else {
                console.log('previously_selected column already exists');
                return true;
            }
        } catch (error) {
            console.error('Error in ensurePreviouslySelectedColumn:', error);
            return false;
        }
    }

    async checkStorageAvailability() {
        console.log('Checking storage availability...');
        try {
            // Ensure Supabase is ready
            await waitForSupabase();
            
            // Check available buckets
            const { data: buckets, error: bucketError } = await window.supabase
                .storage
                .listBuckets();
            
            if (bucketError) {
                console.error('Error listing buckets:', bucketError);
                if (bucketError.message.includes('permission denied')) {
                    console.log('Storage permission denied. Photo uploads will likely fail.');
                }
                return false;
            }
            
            if (!buckets || buckets.length === 0) {
                console.log('No storage buckets found. Photo uploads will likely fail.');
                return false;
            }
            
            console.log('Available storage buckets:', buckets.map(b => b.name).join(', '));
            
            // Check for preferred bucket
            const preferredBucket = 'player-photos';
            const hasPreferredBucket = buckets.some(b => b.name === preferredBucket);
            
            if (!hasPreferredBucket) {
                console.log(`Preferred bucket "${preferredBucket}" not found. Will use available buckets instead.`);
            }
            
            return true;
        } catch (error) {
            console.error('Error checking storage availability:', error);
            return false;
        }
    }
} 