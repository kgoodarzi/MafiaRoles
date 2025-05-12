// Global variables
let gameState = null;
let currentPlayerIndex = 0;
let allRolesViewed = false;
let roleIsVisible = false;

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    console.log("View roles page loaded");
    
    // Check for Supabase client
    if (!window.supabase) {
        console.error("Supabase client not initialized");
        document.getElementById('role-status').textContent = 
            "Error: Database connection not available";
        return;
    }
    
    // Wait for database manager to initialize
    console.log("Waiting for database initialization...");
    await waitForDatabaseInit();
    
    // Load game state from localStorage
    loadGameState();
    
    // Set up event listeners
    document.getElementById('toggle-role-btn').addEventListener('click', toggleRole);
    document.getElementById('next-player-btn').addEventListener('click', nextPlayer);
    document.getElementById('start-game-btn').addEventListener('click', proceedToGame);
    document.getElementById('view-assignments-btn').addEventListener('click', goToRoleAssignments);
    document.getElementById('back-home-btn').addEventListener('click', goToHomePage);
});

// Wait for database initialization
async function waitForDatabaseInit() {
    const maxAttempts = 10;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        if (window.dbManager && window.dbManager.initialized) {
            console.log("Database manager initialized");
            return true;
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
    }
    
    console.error("Database manager initialization timed out");
    return false;
}

// Load game state from localStorage
function loadGameState() {
    try {
        const storedGameState = localStorage.getItem('gameState');
        if (storedGameState) {
            gameState = JSON.parse(storedGameState);
            console.log("Game state loaded:", gameState);
            
            // Initialize the role reveal process
            initializeRoleReveal();
        } else {
            console.warn("No game state found in localStorage");
            document.getElementById('game-status').textContent = 
                "Error: No game data found. Please start a new game.";
        }
    } catch (error) {
        console.error("Error loading game state:", error);
        document.getElementById('game-status').textContent = 
            "Error loading game data. Please start a new game.";
    }
}

// Initialize the role reveal process
function initializeRoleReveal() {
    if (!gameState || !gameState.players || gameState.players.length === 0) {
        console.error("Invalid game state");
        return;
    }
    
    // Set initial status
    document.getElementById('game-status').textContent = "Players are ready to view their roles";
    
    // Reset index and view status
    currentPlayerIndex = 0;
    allRolesViewed = false;
    roleIsVisible = false;
    
    // Show the first player
    showCurrentPlayer();
}

// Show the current player's information (without revealing role)
function showCurrentPlayer() {
    if (!gameState || !gameState.players || currentPlayerIndex >= gameState.players.length) {
        console.error("Invalid game state or player index");
        return;
    }
    
    const player = gameState.players[currentPlayerIndex];
    const playerElement = document.getElementById('current-player');
    
    // Display player info
    playerElement.innerHTML = `
        <div class="player-card">
            <div class="player-image">
                <img src="${player.photo_url || 'images/default-avatar.svg'}" 
                     alt="${player.name}" 
                     onerror="this.src='images/default-avatar.svg'">
            </div>
            <div class="player-info">
                <h3>${player.name}</h3>
                <p>${currentPlayerIndex + 1} / ${gameState.players.length}</p>
            </div>
        </div>
    `;
    
    // Reset role display
    document.getElementById('role-display').innerHTML = `
        <div class="role-hidden">
            <p>Click "View Your Role" to see your assigned role</p>
        </div>
    `;
    
    // Reset toggle state
    roleIsVisible = false;
    
    // Update button states
    updateButtonStates();
}

// Toggle the role visibility
function toggleRole() {
    if (!gameState || !gameState.players || currentPlayerIndex >= gameState.players.length) {
        console.error("Invalid game state or player index");
        return;
    }
    
    // Toggle the visibility state
    roleIsVisible = !roleIsVisible;
    
    if (roleIsVisible) {
        showRole();
    } else {
        hideRole();
    }
    
    // Update button states
    updateButtonStates();
}

// Show the current player's role
function showRole() {
    const player = gameState.players[currentPlayerIndex];
    const roleDisplay = document.getElementById('role-display');
    
    // Get role information - handle special case for 'mafia' role
    let roleId = player.role;
    // Convert 'mafia' to 'regular_mafia' for compatibility with old saved games
    if (roleId === 'mafia') {
        roleId = 'regular_mafia';
    }
    
    const roleInfo = getRoleInfo(roleId);
    // Use image from images folder with prefix 'Role - '
    let roleImageName = roleId.charAt(0).toUpperCase() + roleId.slice(1);
    if (roleId === 'regular_mafia') {
        roleImageName = 'Mafia';  // Special case for mafia image
    }
    const roleImageSrc = `images/Role - ${roleImageName}.jpg`;
    
    // Get team for role
    let teamClass = 'citizen'; // Default team
    
    // Try to get team from ROLES array
    if (typeof getRoleById === 'function') {
        const role = getRoleById(roleId);
        if (role) {
            teamClass = role.team;
        }
    }
    
    // Fallback for known roles if getRoleById is not available or fails
    if (roleId === 'godfather' || roleId === 'regular_mafia' || roleId === 'bomber' || 
        roleId === 'magician' || roleId === 'godfather') {
        teamClass = 'mafia';
    } else if (roleId === 'zodiac') {
        teamClass = 'independent';
    }
    
    // Display role with enhanced styling
    roleDisplay.innerHTML = `
        <div class="role-card ${player.role}" data-team="${teamClass}">
            <div class="role-image-container">
                <img src="${roleImageSrc}" 
                     alt="${roleInfo.name}" 
                     onerror="this.src='images/default-avatar.svg'">
            </div>
            <h3>${roleInfo.name}</h3>
            <p class="role-description">${roleInfo.description}</p>
        </div>
    `;
}

// Hide the current player's role
function hideRole() {
    // Reset role display
    document.getElementById('role-display').innerHTML = `
        <div class="role-hidden">
            <p>Role is now hidden</p>
        </div>
    `;
}

// Update all button states based on current status
function updateButtonStates() {
    const toggleBtn = document.getElementById('toggle-role-btn');
    const nextBtn = document.getElementById('next-player-btn');
    const startBtn = document.getElementById('start-game-btn');
    const viewAssignmentsBtn = document.getElementById('view-assignments-btn');
    
    // Toggle button text based on role visibility
    toggleBtn.textContent = roleIsVisible ? 'Hide Role' : 'View Your Role';
    
    // Next player button should only be enabled when role has been viewed
    nextBtn.disabled = !roleIsVisible;
    
    // Start Game and View Role Assignments should only be enabled after all roles have been viewed
    startBtn.disabled = !allRolesViewed;
    viewAssignmentsBtn.disabled = !allRolesViewed;
}

// Move to the next player
function nextPlayer() {
    if (!roleIsVisible) {
        // Don't allow next player if role hasn't been viewed
        return;
    }
    
    currentPlayerIndex++;
    
    // Check if all players have seen their roles
    if (currentPlayerIndex >= gameState.players.length) {
        allRolesViewed = true;
        // Show proceed button
        document.getElementById('game-status').textContent = "All roles have been viewed";
        document.getElementById('current-player').innerHTML = `
            <div class="all-assigned">
                <h3>All players have seen their roles</h3>
                <p>You can now proceed to the game</p>
            </div>
        `;
        document.getElementById('role-display').innerHTML = '';
        
        // Hide role toggle button, since no more roles to show
        document.getElementById('toggle-role-btn').style.display = 'none';
        document.getElementById('next-player-btn').style.display = 'none';
        
        // Update button states
        updateButtonStates();
    } else {
        // Reset role visibility for new player
        roleIsVisible = false;
        // Show the next player
        showCurrentPlayer();
    }
}

// Proceed to the game after all roles have been viewed
function proceedToGame() {
    if (!allRolesViewed) {
        console.error("Not all roles have been viewed yet");
        return;
    }
    
    // Set game phase to "introduction-day" and initialize round to 0
    // Round 0 will be the introduction day with no actions
    gameState.gamePhase = 'day';
    gameState.currentRound = 0;
    gameState.isIntroductionDay = true; // Flag to indicate this is the introduction day
    
    // Save the updated game state
    localStorage.setItem('gameState', JSON.stringify(gameState));
    
    // Redirect to day phase for introductions
    window.location.href = 'day-phase.html';
}

// Go to role assignments page
function goToRoleAssignments() {
    window.location.href = 'role-assignments.html';
}

// Go to home page
function goToHomePage() {
    window.location.href = 'index.html';
}

// Helper function to get role information
function getRoleInfo(roleId) {
    // Try to get the role info from the ROLES array (from roles.js)
    if (typeof getRoleById === 'function') {
        const role = getRoleById(roleId);
        if (role) {
            return {
                name: role.name,
                description: role.description,
                image: role.image
            };
        }
    }
    
    // Fallback to hardcoded roles if getRoleById is not available
    const roleInfo = {
        mafia: {
            name: 'Mafia',
            description: 'Eliminate citizens without being caught. You know who the other mafia members are.',
            image: 'images/roles/mafia.png'
        },
        detective: {
            name: 'Detective',
            description: 'Investigate one player each night to determine if they are mafia.',
            image: 'images/roles/detective.png'
        },
        doctor: {
            name: 'Doctor',
            description: 'Save one player each night from being eliminated by the mafia.',
            image: 'images/roles/doctor.png'
        },
        citizen: {
            name: 'Citizen',
            description: 'Work with other players to identify the mafia during the day.',
            image: 'images/roles/citizen.png'
        }
    };
    
    return roleInfo[roleId] || {
        name: roleId.charAt(0).toUpperCase() + roleId.slice(1),
        description: 'This role is not defined in detail.',
        image: 'images/default-avatar.svg'
    };
}

// Helper function to check if a player is eliminated
function isPlayerEliminated(playerId) {
    if (!gameState || !gameState.eliminatedPlayers) return false;
    return gameState.eliminatedPlayers.some(eliminatedPlayer => eliminatedPlayer.id === playerId);
} 