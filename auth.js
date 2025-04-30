class AuthManager {
    constructor() {
        this.currentUser = null;
        this.onAuthStateChange = null;
    }

    async initialize() {
        try {
            // Wait for supabaseClient to be initialized
            if (!supabaseClient) {
                console.error('Supabase client not initialized');
                return;
            }
            
            // Check if user is already logged in
            const { data, error } = await supabaseClient.auth.getSession();
            if (error) throw error;
            
            if (data.session) {
                this.currentUser = data.session.user;
                this.notifyAuthStateChange();
            }

            // Listen for auth changes
            const { data: authListener } = supabaseClient.auth.onAuthStateChange((event, session) => {
                if (event === 'SIGNED_IN' && session) {
                    this.currentUser = session.user;
                } else if (event === 'SIGNED_OUT') {
                    this.currentUser = null;
                }
                this.notifyAuthStateChange();
            });

        } catch (error) {
            console.error('Error initializing auth:', error);
        }
    }

    notifyAuthStateChange() {
        if (typeof this.onAuthStateChange === 'function') {
            this.onAuthStateChange(this.currentUser);
        }
    }

    async registerUser(email, password, name) {
        try {
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name
                    }
                }
            });

            if (error) throw error;
            
            // Set current user
            if (data.user) {
                this.currentUser = data.user;
                this.notifyAuthStateChange();
                return data.user;
            }

            return null;
        } catch (error) {
            console.error('Error registering user:', error);
            throw error;
        }
    }

    async loginUser(email, password) {
        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;
            
            // Set current user
            if (data.user) {
                this.currentUser = data.user;
                this.notifyAuthStateChange();
                return data.user;
            }

            return null;
        } catch (error) {
            console.error('Error logging in user:', error);
            throw error;
        }
    }

    async logoutUser() {
        try {
            const { error } = await supabaseClient.auth.signOut();
            if (error) throw error;
            
            this.currentUser = null;
            this.notifyAuthStateChange();
            return true;
        } catch (error) {
            console.error('Error logging out user:', error);
            return false;
        }
    }

    async uploadProfileImage(file) {
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${this.currentUser.id}-${Date.now()}.${fileExt}`;
            const filePath = `profile-images/${fileName}`;

            // Upload file
            const { error: uploadError } = await supabaseClient.storage
                .from('profile-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data } = supabaseClient.storage
                .from('profile-images')
                .getPublicUrl(filePath);

            return data.publicUrl;
        } catch (error) {
            console.error('Error uploading profile image:', error);
            throw error;
        }
    }

    async updateUserProfile(updates) {
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }

        try {
            const { data, error } = await supabaseClient.auth.updateUser({
                data: updates
            });

            if (error) throw error;
            
            if (data.user) {
                this.currentUser = data.user;
                this.notifyAuthStateChange();
                return data.user;
            }

            return null;
        } catch (error) {
            console.error('Error updating user profile:', error);
            throw error;
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isLoggedIn() {
        return !!this.currentUser;
    }
}

// Create a global instance
const authManager = new AuthManager();

// DOM elements and event handlers for auth UI
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for supabaseClient to be initialized
    setTimeout(() => {
        authManager.initialize();
    }, 1200);
    
    // DOM Elements
    const registerForm = document.querySelector('.tab-content.register');
    const loginForm = document.querySelector('.tab-content.login');
    const tabs = document.querySelectorAll('.tab');
    const registerNameInput = document.getElementById('register-name');
    const registerEmailInput = document.getElementById('register-email');
    const registerPasswordInput = document.getElementById('register-password');
    const loginEmailInput = document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');
    const registerBtn = document.getElementById('register-btn');
    const loginBtn = document.getElementById('login-btn');
    const profileImage = document.getElementById('profile-image');
    const profileNameEl = document.getElementById('profile-name');
    const profileEmailEl = document.getElementById('profile-email');
    const logoutBtn = document.getElementById('logout-btn');
    const backToGameBtn = document.getElementById('back-to-game-btn');
    const navGameBtn = document.getElementById('nav-game');
    const navAccountBtn = document.getElementById('nav-account');
    
    // Tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            
            // Update tab active state
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Update content visibility
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.querySelector(`.tab-content.${tabName}`).classList.add('active');
        });
    });
    
    // Register form submission
    registerBtn.addEventListener('click', async () => {
        const name = registerNameInput.value.trim();
        const email = registerEmailInput.value.trim();
        const password = registerPasswordInput.value;
        const imageFile = profileImage.files[0];
        
        if (!name || !email || !password) {
            alert('Please fill in all required fields');
            return;
        }
        
        try {
            // Register the user
            const user = await authManager.registerUser(email, password, name);
            
            // Upload profile image if provided
            if (imageFile) {
                const imageUrl = await authManager.uploadProfileImage(imageFile);
                await authManager.updateUserProfile({ avatar_url: imageUrl });
                
                // Create a player record with the profile image
                await dbManager.addPlayer(name, imageUrl, user.id);
            } else {
                // Create a player record without image
                await dbManager.addPlayer(name, null, user.id);
            }
            
            // Navigate to account screen
            showScreen('account-screen');
            updateProfileDisplay();
            
        } catch (error) {
            alert(`Registration failed: ${error.message}`);
        }
    });
    
    // Login form submission
    loginBtn.addEventListener('click', async () => {
        const email = loginEmailInput.value.trim();
        const password = loginPasswordInput.value;
        
        if (!email || !password) {
            alert('Please enter both email and password');
            return;
        }
        
        try {
            await authManager.loginUser(email, password);
            showScreen('account-screen');
            updateProfileDisplay();
        } catch (error) {
            alert(`Login failed: ${error.message}`);
        }
    });
    
    // Logout
    logoutBtn.addEventListener('click', async () => {
        try {
            await authManager.logoutUser();
            showScreen('user-registration-screen');
        } catch (error) {
            alert(`Logout failed: ${error.message}`);
        }
    });
    
    // Back to game
    backToGameBtn.addEventListener('click', () => {
        showScreen('setup-screen');
    });
    
    // Navigation menu
    navGameBtn.addEventListener('click', () => {
        navGameBtn.classList.add('active');
        navAccountBtn.classList.remove('active');
        showScreen('setup-screen');
    });
    
    navAccountBtn.addEventListener('click', () => {
        navGameBtn.classList.remove('active');
        navAccountBtn.classList.add('active');
        
        if (authManager.isLoggedIn()) {
            showScreen('account-screen');
            updateProfileDisplay();
        } else {
            showScreen('user-registration-screen');
        }
    });
    
    // Update profile display
    function updateProfileDisplay() {
        const user = authManager.getCurrentUser();
        if (!user) return;
        
        const userData = user.user_metadata || {};
        profileNameEl.textContent = userData.name || 'User';
        profileEmailEl.textContent = user.email;
        
        // Set profile image if available
        const profileImageContainer = document.querySelector('.profile-image');
        if (userData.avatar_url) {
            profileImageContainer.innerHTML = `<img src="${userData.avatar_url}" alt="Profile">`;
        } else {
            profileImageContainer.innerHTML = `<div class="default-avatar">${(userData.name || 'U')[0]}</div>`;
        }
    }
    
    // Helper to show a screen
    function showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }
    
    // Set auth state change handler
    authManager.onAuthStateChange = (user) => {
        if (user) {
            updateProfileDisplay();
        }
    };
}); 