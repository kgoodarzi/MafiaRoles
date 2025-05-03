// Supabase client initialization
const SUPABASE_URL = 'https://isagurhfcktnnldvntse.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzYWd1cmhmY2t0bm5sZHZudHNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzNTY4NTAsImV4cCI6MjA1OTkzMjg1MH0.WYOhUCj5wD7AUCuxpDerOkwV_XvBAGapTEztRoJC2Q0';
let supabaseClient;

// Initialize on document load
document.addEventListener('DOMContentLoaded', function() {
    try {
        console.log('Initializing Supabase client...');
        
        // Create Supabase client
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        window.supabase = supabaseClient; // Make available globally
        console.log('Supabase client initialized successfully');
        
        // Create and initialize database manager with a timeout
        // to ensure all initialization happens after Supabase is ready
        setTimeout(() => {
            try {
                window.dbManager = new DatabaseManager();
                window.dbManager.initialize().catch(err => {
                    console.error('Database initialization error:', err);
                });
            } catch (dbErr) {
                console.error('Error creating DatabaseManager:', dbErr);
            }
        }, 1000);
    } catch (error) {
        console.error('Error initializing Supabase client:', error);
    }
});

class DatabaseManager {
    constructor() {
        this.players = [];
        this.selectedPlayers = [];
        this.initialized = false;
        console.log('DatabaseManager created');
    }

    async initialize() {
        try {
            // Set initialized flag
            this.initialized = true;
            
            // Ensure previously_selected column exists in profiles table
            await this.ensurePreviouslySelectedColumn();
            
            // Load players from database
            await this.loadPlayers();
            
            console.log('DatabaseManager initialized with', this.players.length, 'players');
            return this.players;
        } catch (error) {
            console.error('Error initializing DatabaseManager:', error);
            this.initialized = false;
            throw error;
        }
    }

    async loadPlayers() {
        console.log('Loading players from database...');
        try {
            // Try to load from profiles table first
            console.log('Querying "profiles" table');
            const { data, error } = await supabaseClient
                .from('profiles')
                .select('username, full_name, photo, previously_selected');
            
            if (error) {
                console.error('Error querying profiles:', error);
                // Fall back to legacy table
                return this.loadLegacyPlayers();
            }
            
            if (data && data.length > 0) {
                console.log(`Found ${data.length} players in profiles table`);
                
                // Map to our player structure
                this.players = data.map(profile => ({
                    id: profile.username,
                    name: profile.full_name,
                    photo_url: profile.photo,
                    previously_selected: profile.previously_selected
                }));
                
                // Pre-select players that were previously selected
                this.selectedPlayers = [];
                for (const player of this.players) {
                    if (player.previously_selected) {
                        this.selectPlayer(player);
                    }
                }
                
                return this.players;
            } else {
                console.log('No players found in profiles table, checking legacy table');
                return this.loadLegacyPlayers();
            }
        } catch (error) {
            console.error('Error in loadPlayers:', error);
            return this.loadLegacyPlayers();
        }
    }
    
    async loadLegacyPlayers() {
        console.log('Loading players from legacy "mafia.players" table');
        try {
            const { data, error } = await supabaseClient
                .from('mafia.players')
                .select('*');
            
            if (error) {
                console.error('Error querying mafia.players:', error);
                throw error;
            }
            
            if (data && data.length > 0) {
                console.log(`Found ${data.length} players in legacy database`);
                this.players = data;
                return data;
            } else {
                console.log('No players found in database, adding sample players');
                await this.saveSamplePlayers();
                return this.players;
            }
        } catch (error) {
            console.error('Error in loadLegacyPlayers:', error);
            throw error;
        }
    }

    async saveSamplePlayers() {
        console.log('Saving sample players...');
        const samplePlayers = [
            { name: 'Alice', photo_url: 'images/default-avatar.svg' },
            { name: 'Bob', photo_url: 'images/default-avatar.svg' },
            { name: 'Charlie', photo_url: 'images/default-avatar.svg' }
        ];

        try {
            const { data, error } = await supabaseClient
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
            const { data, error } = await supabaseClient
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

    async ensureStorageBucket() {
        try {
            console.log('Checking player-photos storage bucket...');
            const { data, error } = await supabaseClient
                .storage
                .getBucket('player-photos');
                
            if (error) {
                console.log('Storage bucket does not exist, creating...');
                const { error: createError } = await supabaseClient
                    .storage
                    .createBucket('player-photos', {
                        public: true
                    });
                    
                if (createError) {
                    console.error('Error creating storage bucket:', createError);
                    return false;
                }
                
                console.log('Storage bucket created successfully');
            } else {
                console.log('Storage bucket exists');
            }
            
            return true;
        } catch (error) {
            console.error('Failed to check/create storage bucket:', error);
            return false;
        }
    }

    async ensurePlayersTableExists() {
        console.log('Checking if mafia.players exists');
        try {
            // Try a simple count query - if table doesn't exist, this will error
            const { error } = await supabaseClient
                .from('mafia.players')
                .select('id', { count: 'exact', head: true });
                
            if (error) {
                console.error('Error checking mafia.players existence:', error);
                console.log('Attempting to create mafia.players table');
                
                try {
                    // Try to create the table and schema
                    const { error: createError } = await supabaseClient
                        .sql`
                        CREATE SCHEMA IF NOT EXISTS mafia;
                        CREATE TABLE IF NOT EXISTS mafia.players (
                            id SERIAL PRIMARY KEY,
                            name TEXT NOT NULL,
                            phone TEXT,
                            photo_url TEXT
                        );
                        `;
                    
                    if (createError) {
                        console.error('Error creating mafia.players table:', createError);
                        return false;
                    } else {
                        console.log('Successfully created mafia.players table');
                        return true;
                    }
                } catch (createErr) {
                    console.error('Exception creating mafia.players table:', createErr);
                    return false;
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
        const existingIndex = this.selectedPlayers.findIndex(p => p.id === player.id);
        if (existingIndex === -1) {
            this.selectedPlayers.push(player);
            console.log(`Player ${player.name} (ID: ${player.id}) selected`);
        }
        return this.selectedPlayers.length;
    }

    deselectPlayer(player) {
        const index = this.selectedPlayers.findIndex(p => p.id === player.id);
        if (index !== -1) {
            this.selectedPlayers.splice(index, 1);
            console.log(`Player ${player.name} (ID: ${player.id}) deselected`);
        }
        return this.selectedPlayers.length;
    }
    
    // Toggle player selection (used by player-selection.js)
    togglePlayerSelection(playerId) {
        console.log(`DEBUG: Toggling selection for player ID: ${playerId}`);
        
        // Find the player in our players array
        const player = this.players.find(p => p.id == playerId);
        if (!player) {
            console.error(`DEBUG: Player with ID ${playerId} not found in players list`);
            // Dump player list for debugging
            console.log('DEBUG: Available players:', this.players.map(p => ({ id: p.id, name: p.name })));
            return this.selectedPlayers.length;
        }
        
        // Check if player is already selected
        const existingIndex = this.selectedPlayers.findIndex(p => p.id == playerId);
        
        if (existingIndex === -1) {
            // Player not selected, add to selection
            this.selectedPlayers.push(player);
            console.log(`DEBUG: Player ${player.name} (ID: ${playerId}) selected`);
        } else {
            // Player already selected, remove from selection
            this.selectedPlayers.splice(existingIndex, 1);
            console.log(`DEBUG: Player ${player.name} (ID: ${playerId}) deselected`);
        }
        
        console.log('DEBUG: Current selected players:', this.selectedPlayers.map(p => ({ id: p.id, name: p.name })));
        
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
        console.log('Saving selected players to local storage');
        localStorage.setItem('selectedPlayers', JSON.stringify(this.selectedPlayers));
        
        // Also update the previously_selected flag in the database
        this.updatePreviouslySelectedFlag().catch(error => {
            console.error('Error updating previously_selected flags:', error);
        });
        
        return this.selectedPlayers;
    }
    
    async updatePreviouslySelectedFlag() {
        if (!this.selectedPlayers || this.selectedPlayers.length === 0) {
            console.log('DEBUG: No players selected, nothing to update');
            return;
        }
        
        console.log('DEBUG: Updating previously_selected flag for players in database');
        console.log('DEBUG: Current selected players:', this.selectedPlayers.map(p => ({ id: p.id, name: p.name })));
        
        try {
            // First, set all player flags to false
            console.log('DEBUG: Resetting all previously_selected flags to false');
            const { data: resetData, error: resetError } = await supabaseClient
                .from('profiles')
                .update({ previously_selected: false })
                .neq('username', 'dummy_value')  // Update all rows
                .select('username, previously_selected');
                
            if (resetError) {
                console.error('DEBUG: Error resetting previously_selected flags:', resetError);
            } else {
                console.log('DEBUG: Successfully reset all previously_selected flags to false', resetData);
            }
            
            // Get IDs from selected players
            // We need to handle multiple ID formats to match with usernames in profiles
            const selectedPlayerIds = this.selectedPlayers.map(player => player.id);
            console.log('DEBUG: Selected player IDs:', selectedPlayerIds);
            
            // Directly try to insert the list of IDs for debugging
            console.log('DEBUG: About to update the following usernames to true:', selectedPlayerIds);
            
            // Set selected players' flags to true directly using the IDs we have
            if (selectedPlayerIds.length > 0) {
                console.log('DEBUG: Setting previously_selected=true for usernames:', selectedPlayerIds);
                
                const { data: updateData, error: updateError } = await supabaseClient
                    .from('profiles')
                    .update({ previously_selected: true })
                    .in('username', selectedPlayerIds)
                    .select('username, full_name, previously_selected');
                    
                if (updateError) {
                    console.error('DEBUG: Error updating previously_selected flags:', updateError);
                    
                    // If direct update failed, try a broader approach using like queries
                    console.log('DEBUG: Trying broader matching approach');
                    
                    // Try to match by name
                    for (const player of this.selectedPlayers) {
                        try {
                            const { data: matchData, error: matchError } = await supabaseClient
                                .from('profiles')
                                .update({ previously_selected: true })
                                .eq('full_name', player.name)
                                .select('username, full_name, previously_selected');
                                
                            if (matchError) {
                                console.error(`DEBUG: Error updating for player ${player.name}:`, matchError);
                            } else {
                                console.log(`DEBUG: Updated by name for ${player.name}:`, matchData);
                            }
                        } catch (err) {
                            console.error(`DEBUG: Exception updating for player ${player.name}:`, err);
                        }
                    }
                } else {
                    console.log('DEBUG: Successfully updated previously_selected flags in database:', updateData);
                }
            } else {
                console.error('DEBUG: Could not find any matching usernames in profiles table for selected players');
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
            const { data, error } = await supabaseClient
                .from('profiles')
                .select('username, full_name, previously_selected')
                .order('previously_selected', { ascending: false });
                
            if (error) {
                console.error('DEBUG: Error verifying previously_selected:', error);
            } else {
                console.log('DEBUG: Current database values for previously_selected:', 
                    data.map(p => ({ 
                        username: p.username, 
                        name: p.full_name, 
                        selected: p.previously_selected 
                    }))
                );
                
                // For true values only
                const selectedInDb = data.filter(p => p.previously_selected === true);
                console.log('DEBUG: Players with previously_selected=true in database:', 
                    selectedInDb.map(p => ({ username: p.username, name: p.full_name }))
                );
                
                // Compare with our selected players
                const ourSelectedIds = this.selectedPlayers.map(p => p.id);
                console.log('DEBUG: Our selected player IDs:', ourSelectedIds);
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
            const { data: tableInfo, error: tableError } = await supabaseClient
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
            // Check if column exists
            const { data, error } = await supabaseClient
                .from('profiles')
                .select('previously_selected')
                .limit(1);
            
            if (error) {
                // Column might not exist, check error message
                if (error.message && error.message.includes('does not exist')) {
                    console.log('previously_selected column does not exist, adding it');
                    
                    // Add the column
                    const { error: alterError } = await supabaseClient
                        .rpc('add_previously_selected_column');
                    
                    if (alterError) {
                        console.error('Error adding previously_selected column using RPC:', alterError);
                        
                        // Try direct SQL as fallback
                        try {
                            const { error: sqlError } = await supabaseClient
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
} 