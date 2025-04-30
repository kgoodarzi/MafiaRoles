// Supabase configuration
const SUPABASE_URL = 'https://isagurhfcktnnldvntse.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzYWd1cmhma2N0bm5sZHZudHNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDA0ODIyNTYsImV4cCI6MjAxNjA1ODI1Nn0.L-6B28H9yGkGgbj1KMdlSoTDeLkF8iRGJLHHBf2VEkU'; // This is a public key

// Initialize Supabase client
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Database connection details for PostgreSQL
const PG_CONNECTION_STRING = 'postgresql://postgres:postgres@db.isagurhfcktnnldvntse.supabase.co:5432/postgres';

class DatabaseManager {
    constructor() {
        this.players = [];
        this.selectedPlayers = [];
    }

    async initialize() {
        try {
            // Create players table if it doesn't exist
            await this.createPlayersTableIfNotExists();
            // Load players from database
            await this.loadPlayers();
        } catch (error) {
            console.error('Error initializing database:', error);
        }
    }

    async createPlayersTableIfNotExists() {
        try {
            // Check if table exists, create it if it doesn't
            const { error } = await supabase
                .from('players')
                .select('id')
                .limit(1);

            if (error && error.code === '42P01') { // Table doesn't exist
                await supabase.rpc('create_players_table');
            }
        } catch (error) {
            console.error('Error creating players table:', error);
        }
    }

    async loadPlayers() {
        try {
            const { data, error } = await supabase
                .from('players')
                .select('*');

            if (error) throw error;
            this.players = data || [];
            return this.players;
        } catch (error) {
            console.error('Error loading players:', error);
            return [];
        }
    }

    async addPlayer(name, image_url, user_id = null) {
        try {
            const { data, error } = await supabase
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
            const { data, error } = await supabase
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
            const { error } = await supabase
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
            const { data, error } = await supabase
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
    dbManager.initialize();
}); 