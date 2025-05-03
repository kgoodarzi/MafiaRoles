// Global variables
let gameState = null;
let currentPlayerIndex = 0;
let allRolesAssigned = false;

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    console.log("Game page loaded");
    
    // Check for Supabase client
    if (!window.supabase) {
        console.error("Supabase client not initialized");
        document.getElementById('game-status').textContent = 
            "Error: Database connection not available";
        return;
    }
    
    // Wait for database manager to initialize
    console.log("Waiting for database initialization...");
    await waitForDatabaseInit();
    
    // Load game state from localStorage
    loadGameState();
    
    // Set up event listeners
    document.getElementById('view-role-btn').addEventListener('click', viewRole);
    document.getElementById('hide-role-btn').addEventListener('click', hideRole);
    document.getElementById('next-player-btn').addEventListener('click', nextPlayer);
    document.getElementById('start-game-btn').addEventListener('click', startGame);
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
                <p>Player ${currentPlayerIndex + 1} of ${gameState.players.length}</p>
            </div>
        </div>
    `;
    
    // Reset role display
    document.getElementById('role-display').innerHTML = `
        <div class="role-hidden">
            <p>Click "View Your Role" to see your assigned role</p>
        </div>
    `;
    
    // Show appropriate buttons
    document.getElementById('view-role-btn').style.display = 'block';
    document.getElementById('hide-role-btn').style.display = 'none';
    document.getElementById('next-player-btn').style.display = 'none';
    document.getElementById('start-game-btn').style.display = 'none';
}

// View the current player's role
function viewRole() {
    if (!gameState || !gameState.players || currentPlayerIndex >= gameState.players.length) {
        console.error("Invalid game state or player index");
        return;
    }
    
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
        roleId === 'magician' || roleId === 'al-capon') {
        teamClass = 'mafia';
    } else if (roleId === 'zodiac') {
        teamClass = 'independent';
    }
    
    // Display role
    roleDisplay.innerHTML = `
        <div class="role-card ${player.role}" data-team="${teamClass}">
            <img src="${roleImageSrc}" 
                 alt="${roleInfo.name}" 
                 onerror="this.src='images/default-avatar.svg'">
            <h3>${roleInfo.name}</h3>
            <p>${roleInfo.description}</p>
        </div>
    `;
    // Update buttons
    document.getElementById('view-role-btn').style.display = 'none';
    document.getElementById('hide-role-btn').style.display = 'block';
    document.getElementById('next-player-btn').style.display = 'block';
}

// Hide the current player's role
function hideRole() {
    // Reset role display
    document.getElementById('role-display').innerHTML = `
        <div class="role-hidden">
            <p>Role is now hidden</p>
        </div>
    `;
    
    // Update buttons
    document.getElementById('view-role-btn').style.display = 'block';
    document.getElementById('hide-role-btn').style.display = 'none';
    document.getElementById('next-player-btn').style.display = 'block';
}

// Move to the next player
function nextPlayer() {
    currentPlayerIndex++;
    // Check if all players have seen their roles
    if (currentPlayerIndex >= gameState.players.length) {
        allRolesAssigned = true;
        // Show game start button
        document.getElementById('game-status').textContent = "All roles have been revealed";
        document.getElementById('current-player').innerHTML = `
            <div class="all-assigned">
                <h3>All players have seen their roles</h3>
                <p>You can now start the game</p>
            </div>
        `;
        document.getElementById('role-display').innerHTML = '';
        // Show the summary table of player roles
        showRolesSummaryTable();
        // Update buttons
        document.getElementById('view-role-btn').style.display = 'none';
        document.getElementById('hide-role-btn').style.display = 'none';
        document.getElementById('next-player-btn').style.display = 'none';
        document.getElementById('start-game-btn').style.display = 'block';
    } else {
        // Show the next player
        showCurrentPlayer();
    }
}

// Show a table of all players and their roles after all roles are revealed
function showRolesSummaryTable() {
    if (!gameState || !gameState.players) return;
    
    // Create a more visually appealing summary container
    let summaryHtml = `
        <div class="summary-container" style="margin-top:2rem;">
            <h3 style="margin-bottom:1rem;">Role Assignments</h3>
            <div class="summary-list" style="border:1px solid #ddd;border-radius:8px;overflow:hidden;">
    `;
    
    gameState.players.forEach(player => {
        let roleId = player.role;
        let teamClass = 'citizen';  // Default team class
        
        // Try to get team from ROLES array
        if (typeof getRoleById === 'function') {
            const role = getRoleById(roleId);
            if (role) {
                teamClass = role.team;
            }
        }
        
        // Fallback for known roles if getRoleById is not available or fails
        if (roleId === 'mafia' || roleId === 'godfather' || roleId === 'bomber' || 
            roleId === 'al-capon' || roleId === 'magician' || roleId === 'regular_mafia') {
            if (teamClass !== 'mafia') {
                teamClass = 'mafia';
            }
        } else if (roleId === 'zodiac') {
            teamClass = 'independent';
        }
        
        // For image path and proper role name
        let roleImageName = roleId;
        let roleName = "";
        
        // Get role info to get proper name
        const roleInfo = getRoleInfo(roleId);
        roleName = roleInfo.name;
        
        // Special case for 'mafia' and 'regular_mafia'
        if (roleId === 'mafia' || roleId === 'regular_mafia') {
            roleImageName = 'Mafia';
        } else {
            roleImageName = roleId.charAt(0).toUpperCase() + roleId.slice(1);
        }
        
        const roleImageSrc = `images/Role - ${roleImageName}.jpg`;
        
        // Add summary item
        summaryHtml += `
            <div class="summary-item" data-team="${teamClass}" style="padding:12px;border-bottom:1px solid #eee;display:flex;align-items:center;background-color:${getTeamBackgroundColor(teamClass)};">
                <div class="summary-avatar" style="margin-right:12px;">
                    <img src="${player.photo_url || 'images/default-avatar.svg'}" 
                         alt="${player.name}" 
                         style="width:50px;height:50px;object-fit:cover;border-radius:50%;"
                         onerror="this.src='images/default-avatar.svg'">
                </div>
                <div class="summary-info" style="flex-grow:1;">
                    <h3 style="margin:0;font-size:1rem;">${player.name}</h3>
                    <p class="summary-role" style="margin:0;color:#666;font-size:0.9rem;">${roleName}</p>
                </div>
                <div class="summary-role-icon" style="width:40px;height:40px;border-radius:4px;overflow:hidden;">
                    <img src="${roleImageSrc}" 
                         alt="${roleName}" 
                         style="width:100%;height:100%;object-fit:cover;"
                         onerror="this.src='images/default-avatar.svg'">
                </div>
            </div>
        `;
    });
    
    summaryHtml += `
            </div>
        </div>
    `;
    
    // Insert summary below the all-assigned message
    const currentPlayerDiv = document.getElementById('current-player');
    currentPlayerDiv.innerHTML += summaryHtml;
}

// Helper function to get background color based on team
function getTeamBackgroundColor(team) {
    switch(team) {
        case 'mafia':
            return '#ffcdd2'; // Pastel red
        case 'independent':
            return '#e1bee7'; // Pastel purple
        case 'citizen':
        default:
            return '#c8e6c9'; // Pastel green
    }
}

// Start the actual game
function startGame() {
    if (!allRolesAssigned) {
        console.error("Not all roles have been assigned yet");
        return;
    }
    // Update game phase
    gameState.gamePhase = 'night';
    gameState.currentRound = 1;
    // Save updated game state
    localStorage.setItem('gameState', JSON.stringify(gameState));
    // Display game info
    document.querySelector('.role-reveal').style.display = 'none';
    document.getElementById('game-info').style.display = 'block';
    renderGamePhase();
}

// Render the current game phase and actions
function renderGamePhase() {
    const phase = gameState.gamePhase;
    const round = gameState.currentRound;
    let phaseTitle = '';
    let phaseDesc = '';
    if (phase === 'night') {
        phaseTitle = `Night Phase - Round ${round}`;
        phaseDesc = 'The Mafia and special roles can now perform their actions.';
    } else if (phase === 'day') {
        phaseTitle = `Day Phase - Round ${round}`;
        phaseDesc = 'Players discuss and vote to eliminate a suspect.';
    } else {
        phaseTitle = `Game Phase`;
        phaseDesc = '';
    }
    document.getElementById('game-phase').innerHTML = `
        <h2>${phaseTitle}</h2>
        <p>${phaseDesc}</p>
    `;
    document.getElementById('game-actions').innerHTML = `
        <button id="next-phase-btn" class="btn btn-primary">Next Phase</button>
        <button id="reset-btn" class="btn" style="margin-left:1rem;">Back to Home (reset)</button>
    `;
    document.getElementById('next-phase-btn').onclick = nextPhase;
    document.getElementById('reset-btn').onclick = function() {
        // Clear game state and go back to home
        // (No need to save players, DatabaseManager handles that)
        localStorage.removeItem('gameState');
        localStorage.removeItem('selectedPlayers');
        window.location.href = 'index.html';
    };
}

// Advance to the next phase (cycle night/day, increment round)
function nextPhase() {
    if (gameState.gamePhase === 'night') {
        gameState.gamePhase = 'day';
    } else {
        gameState.gamePhase = 'night';
        gameState.currentRound++;
    }
    localStorage.setItem('gameState', JSON.stringify(gameState));
    renderGamePhase();
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
        civilian: {
            name: 'Civilian',
            description: 'Work with other players to identify the mafia during the day.',
            image: 'images/roles/civilian.png'
        }
    };
    
    return roleInfo[roleId] || {
        name: roleId.charAt(0).toUpperCase() + roleId.slice(1),
        description: 'This role is not defined in detail.',
        image: 'images/default-avatar.svg'
    };
} 