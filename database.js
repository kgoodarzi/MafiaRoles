// Supabase configuration
const SUPABASE_URL = 'https://isagurhfcktnnldvntse.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzYWd1cmhmY2t0bm5sZHZudHNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzNTY4NTAsImV4cCI6MjA1OTkzMjg1MH0.WYOhUCj5wD7AUCuxpDerOkwV_XvBAGapTEztRoJC2Q0'; // This is a public key

// Initialize Supabase client
let supabaseClient;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Supabase client
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
});

// Database connection details for PostgreSQL
const PG_CONNECTION_STRING = 'postgresql://postgres:postgres@db.isagurhfcktnnldvntse.supabase.co:5432/postgres';

class DatabaseManager {
    constructor() {
        this.players = [];
        this.selectedPlayers = [];
    }

    async initialize() {
        try {
            // Wait for supabaseClient to be initialized
            if (!supabaseClient) {
                console.error('Supabase client not initialized');
                return;
            }
            
            // Load users from database
            await this.loadUsers();
        } catch (error) {
            console.error('Error initializing database:', error);
        }
    }

    async loadUsers() {
        try {
            // Check if we have a profiles table and create one if needed
            await this.createProfilesTableIfNeeded();
            
            // First try to get list of users from admin API (may not be available)
            let { data: adminUsers, error: adminError } = await supabaseClient.rpc('get_users_admin');
            
            if (adminError || !adminUsers || adminUsers.length === 0) {
                console.log('Admin API not available, falling back to auth users');
                
                // Alternatively, get all users registered in the system
                const { data: authData, error: authError } = await supabaseClient.auth.admin.listUsers();
                
                if (authError) {
                    console.error('Could not access admin users, falling back to player profiles');
                    
                    // As a fallback, try to get profiles from public.profiles table
                    const { data: profiles, error: profilesError } = await supabaseClient
                        .from('profiles')
                        .select('*');
                    
                    if (profilesError) {
                        console.error('Could not load user profiles:', profilesError);
                    } else {
                        this.players = (profiles || []).map(profile => ({
                            id: profile.id,
                            name: profile.full_name || 'User',
                            email: profile.email || '',
                            image_url: profile.avatar_url
                        }));
                    }
                    
                    return this.players;
                }
                
                // Process regular auth data
                this.players = (authData.users || []).map(user => ({
                    id: user.id,
                    name: (user.user_metadata && user.user_metadata.name) || user.email || 'User',
                    email: user.email,
                    image_url: user.user_metadata && user.user_metadata.avatar_url
                }));
            } else {
                // Process admin users data
                this.players = (adminUsers || []).map(user => ({
                    id: user.id,
                    name: (user.user_metadata && user.user_metadata.name) || user.email || 'User',
                    email: user.email,
                    image_url: user.user_metadata && user.user_metadata.avatar_url
                }));
            }
            
            // If we still have no users, create a few sample users for testing
            if (this.players.length === 0) {
                this.players = [
                    { id: 'sample1', name: 'John Doe', email: 'john@example.com', image_url: null },
                    { id: 'sample2', name: 'Jane Smith', email: 'jane@example.com', image_url: null },
                    { id: 'sample3', name: 'Alex Johnson', email: 'alex@example.com', image_url: null },
                    { id: 'sample4', name: 'Sarah Williams', email: 'sarah@example.com', image_url: null }
                ];
            }
            
            return this.players;
        } catch (error) {
            console.error('Error loading users:', error);
            // Create some sample users for testing
            this.players = [
                { id: 'sample1', name: 'John Doe', email: 'john@example.com', image_url: null },
                { id: 'sample2', name: 'Jane Smith', email: 'jane@example.com', image_url: null },
                { id: 'sample3', name: 'Alex Johnson', email: 'alex@example.com', image_url: null },
                { id: 'sample4', name: 'Sarah Williams', email: 'sarah@example.com', image_url: null }
            ];
            return this.players;
        }
    }

    async createProfilesTableIfNeeded() {
        try {
            // Check if profiles table exists
            const { error } = await supabaseClient
                .from('profiles')
                .select('id')
                .limit(1);
            
            if (error && error.code === '42P01') { // Table doesn't exist
                console.log('Creating profiles table');
                
                // Create the profiles table
                const createTableSQL = `
                    create table if not exists public.profiles (
                        id uuid references auth.users on delete cascade primary key,
                        full_name text,
                        email text,
                        avatar_url text,
                        created_at timestamp with time zone default timezone('utc'::text, now()) not null,
                        updated_at timestamp with time zone default timezone('utc'::text, now()) not null
                    );
                    
                    alter table public.profiles enable row level security;
                    
                    create policy "Public profiles are viewable by everyone."
                        on profiles for select
                        using ( true );
                    
                    create policy "Users can insert their own profile."
                        on profiles for insert
                        with check ( auth.uid() = id );
                    
                    create policy "Users can update own profile."
                        on profiles for update
                        using ( auth.uid() = id );
                `;
                
                // Execute the SQL (may not have permission)
                try {
                    await supabaseClient.rpc('exec_sql', { sql: createTableSQL });
                } catch (sqlError) {
                    console.error('Could not create profiles table:', sqlError);
                }
            }
        } catch (error) {
            console.error('Error checking/creating profiles table:', error);
        }
    }

    async addPlayer(name, image_url, user_id = null) {
        try {
            const { data, error } = await supabaseClient
                .from('players')
                .insert([
                    { name, image_url, user_id }
                ])
                .select();

            if (error) throw error;
            
            if (data && data.length > 0) {
                this.players.push(data[0]);
                return data[0];
            }
            return null;
        } catch (error) {
            console.error('Error adding player:', error);
            return null;
        }
    }

    async updatePlayer(id, updates) {
        try {
            const { data, error } = await supabaseClient
                .from('players')
                .update(updates)
                .eq('id', id)
                .select();

            if (error) throw error;
            
            // Update local copy
            const index = this.players.findIndex(p => p.id === id);
            if (index !== -1 && data && data.length > 0) {
                this.players[index] = data[0];
            }
            
            return data && data.length > 0 ? data[0] : null;
        } catch (error) {
            console.error('Error updating player:', error);
            return null;
        }
    }

    async deletePlayer(id) {
        try {
            const { error } = await supabaseClient
                .from('players')
                .delete()
                .eq('id', id);

            if (error) throw error;
            
            // Update local copy
            this.players = this.players.filter(p => p.id !== id);
            this.selectedPlayers = this.selectedPlayers.filter(p => p.id !== id);
            
            return true;
        } catch (error) {
            console.error('Error deleting player:', error);
            return false;
        }
    }

    async getPlayersByUserId(user_id) {
        try {
            const { data, error } = await supabaseClient
                .from('players')
                .select('*')
                .eq('user_id', user_id);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting players by user ID:', error);
            return [];
        }
    }

    selectPlayer(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (player && !this.selectedPlayers.some(p => p.id === playerId)) {
            this.selectedPlayers.push(player);
            return true;
        }
        return false;
    }

    deselectPlayer(playerId) {
        this.selectedPlayers = this.selectedPlayers.filter(p => p.id !== playerId);
    }

    clearSelectedPlayers() {
        this.selectedPlayers = [];
    }

    getSelectedPlayers() {
        return [...this.selectedPlayers];
    }
}

// Create a global instance
const dbManager = new DatabaseManager();

// Initialize database when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit to ensure Supabase is initialized
    setTimeout(() => {
        dbManager.initialize();
    }, 1000);
}); 