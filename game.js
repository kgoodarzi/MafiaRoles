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
        roleId === 'magician') {
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
        
        // Check if player is eliminated
        const isEliminated = isPlayerEliminated(player.id);
        
        // Try to get team from ROLES array
        if (typeof getRoleById === 'function') {
            const role = getRoleById(roleId);
            if (role) {
                teamClass = role.team;
            }
        }
        
        // Fallback for known roles if getRoleById is not available or fails
        if (roleId === 'mafia' || roleId === 'godfather' || roleId === 'bomber' || 
            roleId === 'magician') {
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
        
        // Get sequence display (add sequence number if available)
        const sequenceDisplay = player.sequence !== undefined ? ` (Seq #${player.sequence})` : '';
        
        // Set background color based on elimination status
        const bgColor = isEliminated ? 'rgba(128, 128, 128, 0.3)' : 'var(--card-bg)';
        const opacity = isEliminated ? '0.7' : '1';
        
        // Add summary item
        summaryHtml += `
            <div class="summary-item" data-team="${teamClass}" style="padding:12px;border-bottom:1px solid var(--border-color);display:flex;align-items:center;background-color:${bgColor};opacity:${opacity};border-left:4px solid ${getTeamBorderColor(teamClass)};">
                <div class="summary-avatar" style="margin-right:12px;">
                    <img src="${player.photo_url || 'images/default-avatar.svg'}" 
                         alt="${player.name}" 
                         style="width:50px;height:50px;object-fit:cover;border-radius:50%;"
                         onerror="this.src='images/default-avatar.svg'">
                </div>
                <div class="summary-info" style="flex-grow:1;display:flex;justify-content:space-between;align-items:center;">
                    <div style="font-weight:bold;text-align:left;">${player.name}</div>
                    ${isEliminated ? '<div style="color:#ff4c4c;font-size:0.8rem;text-align:center;flex-grow:1;">Eliminated</div>' : '<div style="flex-grow:1;"></div>'}
                    <div style="color:var(--text-secondary);font-size:0.9rem;text-align:right;">${roleName}</div>
                </div>
                <div class="summary-role-icon" style="margin-left:12px;width:40px;height:40px;border-radius:4px;overflow:hidden;">
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
            return 'var(--card-bg)'; // Dark background
        case 'independent':
            return 'var(--card-bg)'; // Dark background 
        case 'citizen':
        default:
            return 'var(--card-bg)'; // Dark background
    }
}

// Helper function to get border color based on team
function getTeamBorderColor(team) {
    switch(team) {
        case 'mafia':
            return '#ef4444'; // Red
        case 'independent':
            return '#8b5cf6'; // Purple
        case 'citizen':
        default:
            return '#10b981'; // Green
    }
}

// Start the actual game
function startGame() {
    if (!allRolesAssigned) {
        console.error("Not all roles have been assigned yet");
        return;
    }
    // Update game phase to start with introduction day
    gameState.gamePhase = 'intro-day';
    gameState.currentRound = 0;
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
    
    switch(phase) {
        case 'intro-day':
            phaseTitle = `Introduction Day Phase (Round ${round})`;
            phaseDesc = 'Players introduce themselves and get to know each other. No actions are taken during this phase.';
            break;
        case 'role-identification':
            phaseTitle = `First Identification Night (Round ${round})`;
            phaseDesc = 'The Mafia members open their eyes to see each other and have time to talk quietly.';
            break;
        case 'day':
            phaseTitle = `Day Phase - Round ${round}`;
            phaseDesc = 'Players discuss to identify and eliminate Mafia members.';
            break;
        case 'voting':
            phaseTitle = `Voting Phase - Round ${round}`;
            phaseDesc = 'Players vote to eliminate a suspect.';
            break;
        case 'night':
            phaseTitle = `Night Phase - Round ${round}`;
            phaseDesc = 'The Mafia and special roles perform their actions.';
            break;
        default:
            phaseTitle = `Game Phase`;
            phaseDesc = 'Current game phase';
    }
    
    document.getElementById('game-phase').innerHTML = `
        <h2>${phaseTitle}</h2>
        <p>${phaseDesc}</p>
    `;
    
    // Different actions based on game phase
    if (phase === 'intro-day') {
        document.getElementById('game-actions').innerHTML = `
            <button id="next-phase-btn" class="btn btn-primary">Next Phase</button>
            <div style="margin-top: 15px;">
                <button id="intro-timer-btn" class="btn btn-success" style="width: 100%;">Start Introduction Timers</button>
            </div>
            <div style="margin-top: 15px;">
                <button id="show-roles-btn" class="btn" style="width: 100%;">Show Role Assignments</button>
            </div>
            <div style="margin-top: 15px;">
                <button id="reset-btn" class="btn" style="width: 100%;">Back to Home (reset)</button>
            </div>
        `;
        document.getElementById('intro-timer-btn').onclick = startIntroductionTimers;
    } else {
        document.getElementById('game-actions').innerHTML = `
            <button id="next-phase-btn" class="btn btn-primary">Next Phase</button>
            <div style="margin-top: 15px;">
                <button id="show-roles-btn" class="btn" style="width: 100%;">Show Role Assignments</button>
            </div>
            <div style="margin-top: 15px;">
                <button id="reset-btn" class="btn" style="width: 100%;">Back to Home (reset)</button>
            </div>
        `;
    }
    
    document.getElementById('next-phase-btn').onclick = nextPhase;
    document.getElementById('show-roles-btn').onclick = toggleRoleAssignmentsView;
    document.getElementById('reset-btn').onclick = function() {
        // Clear game state and go back to home
        // (No need to save players, DatabaseManager handles that)
        localStorage.removeItem('gameState');
        localStorage.removeItem('selectedPlayers');
        window.location.href = 'index.html';
    };
    
    // Add a div for role assignments table (initially hidden)
    if (!document.getElementById('role-assignments-container')) {
        const gameInfoDiv = document.getElementById('game-info');
        const roleAssignmentsDiv = document.createElement('div');
        roleAssignmentsDiv.id = 'role-assignments-container';
        roleAssignmentsDiv.style.display = 'none';
        roleAssignmentsDiv.className = 'role-assignments';
        roleAssignmentsDiv.innerHTML = `
            <div class="role-assignments-header">
                <h3>Role Assignments</h3>
            </div>
            <div id="role-assignments-content"></div>
            <div style="text-align: center; margin-top: 25px;">
                <button id="hide-roles-btn" class="btn" style="width: 100%; max-width: 300px;">Return to Game</button>
            </div>
        `;
        gameInfoDiv.appendChild(roleAssignmentsDiv);
        document.getElementById('hide-roles-btn').onclick = toggleRoleAssignmentsView;
    }
}

// Toggle between game phase view and role assignments view
function toggleRoleAssignmentsView() {
    const gamePhaseElement = document.getElementById('game-phase');
    const actionsElement = document.getElementById('game-actions');
    const roleAssignmentsElement = document.getElementById('role-assignments-container');
    
    if (roleAssignmentsElement.style.display === 'none') {
        // Show role assignments
        gamePhaseElement.style.display = 'none';
        actionsElement.style.display = 'none';
        roleAssignmentsElement.style.display = 'block';
        
        // Generate and display role assignments table
        displayRoleAssignmentsTable();
    } else {
        // Hide role assignments and return to game
        gamePhaseElement.style.display = 'block';
        actionsElement.style.display = 'block';
        roleAssignmentsElement.style.display = 'none';
    }
}

// Display the role assignments table
function displayRoleAssignmentsTable() {
    if (!gameState || !gameState.players) return;
    
    const roleAssignmentsContent = document.getElementById('role-assignments-content');
    
    // Calculate team tallies
    const teamTallies = calculateTeamTallies();
    
    // Create team tallies section
    let talliesHtml = `
        <div class="team-tallies" style="margin-bottom:20px;padding:15px;border-radius:8px;background-color:var(--card-bg);border:1px solid var(--border-color);">
            <h3 style="margin-top:0;margin-bottom:15px;text-align:center;">Team Elimination Status</h3>
            <div style="display:flex;justify-content:space-around;flex-wrap:wrap;">
                <div class="team-tally" style="text-align:center;padding:10px;min-width:120px;">
                    <div style="font-weight:bold;color:var(--town-color, #4caf50);">Citizens</div>
                    <div style="margin-top:5px;font-size:1.1rem;">${teamTallies.town.alive} Alive / ${teamTallies.town.eliminated} Eliminated</div>
                </div>
                <div class="team-tally" style="text-align:center;padding:10px;min-width:120px;">
                    <div style="font-weight:bold;color:var(--mafia-color, #e53935);">Mafia</div>
                    <div style="margin-top:5px;font-size:1.1rem;">${teamTallies.mafia.alive} Alive / ${teamTallies.mafia.eliminated} Eliminated</div>
                </div>
                ${teamTallies.zodiacExists ? `
                <div class="team-tally" style="text-align:center;padding:10px;min-width:120px;">
                    <div style="font-weight:bold;color:var(--zodiac-color, #673ab7);">Zodiac</div>
                    <div style="margin-top:5px;font-size:1.1rem;">${teamTallies.zodiac.alive} Alive / ${teamTallies.zodiac.eliminated} Eliminated</div>
                </div>
                ` : ''}
            </div>
        </div>
    `;
    
    // Sort players by sequence if available
    const sortedPlayers = [...gameState.players].sort((a, b) => {
        const seqA = a.sequence !== undefined ? a.sequence : 9999;
        const seqB = b.sequence !== undefined ? b.sequence : 9999;
        return seqA - seqB;
    });
    
    // Create a visually appealing roles table
    let tableHtml = `
        <div class="roles-table" style="border:1px solid var(--border-color);border-radius:8px;overflow:hidden;">
    `;
    
    sortedPlayers.forEach(player => {
        let roleId = player.role;
        let teamClass = 'citizen';  // Default team class
        
        // Check if player is eliminated
        const isEliminated = isPlayerEliminated(player.id);
        
        // Try to get team from ROLES array
        if (typeof getRoleById === 'function') {
            const role = getRoleById(roleId);
            if (role) {
                teamClass = role.team;
            }
        }
        
        // Fallback for known roles if getRoleById is not available or fails
        if (roleId === 'mafia' || roleId === 'godfather' || roleId === 'bomber' || 
            roleId === 'magician') {
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
        
        // Get sequence display (add sequence number if available)
        const sequenceDisplay = player.sequence !== undefined ? ` (Seq #${player.sequence})` : '';
        
        // Set background color based on elimination status
        const bgColor = isEliminated ? 'rgba(128, 128, 128, 0.3)' : 'var(--card-bg)';
        const opacity = isEliminated ? '0.7' : '1';
        
        // Add table row
        tableHtml += `
            <div class="roles-table-row" data-team="${teamClass}" data-eliminated="${isEliminated}" 
                 style="padding:12px;border-bottom:1px solid var(--border-color);display:flex;align-items:center;
                 background-color:${bgColor};opacity:${opacity};border-left:4px solid ${getTeamBorderColor(teamClass)};">
                <div class="roles-table-avatar" style="margin-right:12px;width:40px;height:40px;border-radius:50%;overflow:hidden;">
                    <img src="${player.photo_url || 'images/default-avatar.svg'}" 
                         alt="${player.name}" 
                         style="width:100%;height:100%;object-fit:cover;"
                         onerror="this.src='images/default-avatar.svg'">
                </div>
                <div class="roles-table-info" style="flex-grow:1;display:flex;justify-content:space-between;align-items:center;">
                    <div style="font-weight:bold;text-align:left;">${player.name}${sequenceDisplay}</div>
                    ${isEliminated ? '<div style="color:#ff4c4c;font-size:0.8rem;text-align:center;flex-grow:1;">Eliminated</div>' : '<div style="flex-grow:1;"></div>'}
                    <div style="color:var(--text-secondary);font-size:0.9rem;text-align:right;">${roleName}</div>
                </div>
                <div class="roles-table-role-icon" style="margin-left:12px;width:35px;height:35px;border-radius:4px;overflow:hidden;">
                    <img src="${roleImageSrc}" 
                         alt="${roleName}" 
                         style="width:100%;height:100%;object-fit:cover;"
                         onerror="this.src='images/default-avatar.svg'">
                </div>
            </div>
        `;
    });
    
    tableHtml += `</div>`;
    
    // Add game status information
    tableHtml += `
        <div class="game-status-info" style="margin-top:20px;padding:15px;border-radius:8px;background-color:var(--card-bg);border:1px solid var(--border-color);">
            <div><strong>Current Phase:</strong> ${gameState.gamePhase.charAt(0).toUpperCase() + gameState.gamePhase.slice(1)}</div>
            <div><strong>Round:</strong> ${gameState.currentRound}</div>
        </div>
    `;
    
    // Combine tallies and table
    roleAssignmentsContent.innerHTML = talliesHtml + tableHtml;
}

// Calculate team tallies
function calculateTeamTallies() {
    const tallies = {
        town: { alive: 0, eliminated: 0 },
        mafia: { alive: 0, eliminated: 0 },
        zodiac: { alive: 0, eliminated: 0 },
        zodiacExists: false
    };
    
    // Check if zodiac was in the original game setup
    tallies.zodiacExists = gameState.players.some(p => p.role === 'zodiac');
    
    // Count players by team and status
    gameState.players.forEach(player => {
        const isEliminated = isPlayerEliminated(player.id);
        const team = getPlayerTeam(player.role);
        
        if (team === 'mafia') {
            if (isEliminated) {
                tallies.mafia.eliminated++;
            } else {
                tallies.mafia.alive++;
            }
        } else if (team === 'independent' || player.role === 'zodiac') {
            if (isEliminated) {
                tallies.zodiac.eliminated++;
            } else {
                tallies.zodiac.alive++;
            }
        } else {
            // Default to town
            if (isEliminated) {
                tallies.town.eliminated++;
            } else {
                tallies.town.alive++;
            }
        }
    });
    
    return tallies;
}

// Helper function to determine a player's team
function getPlayerTeam(role) {
    // Mafia team roles
    if (['godfather', 'magician', 'bomber', 'regular_mafia', 'mafia'].includes(role)) {
        return 'mafia';
    }
    // Independent roles (zodiac)
    else if (role === 'zodiac') {
        return 'independent';
    }
    // All other roles are town
    else {
        return 'town';
    }
}

// Helper function to check if a player is eliminated
function isPlayerEliminated(playerId) {
    if (!gameState.eliminatedPlayers) return false;
    return gameState.eliminatedPlayers.some(eliminatedPlayer => eliminatedPlayer.id === playerId);
}

// Advance to the next phase following the new game flow
function nextPhase() {
    switch(gameState.gamePhase) {
        case 'intro-day':
            gameState.gamePhase = 'role-identification';
            break;
        case 'role-identification':
            gameState.gamePhase = 'day';
            break;
        case 'day':
            gameState.gamePhase = 'voting';
            break;
        case 'voting':
            gameState.gamePhase = 'night';
            break;
        case 'night':
            gameState.gamePhase = 'day';
            gameState.currentRound++;
            break;
        default:
            gameState.gamePhase = 'intro-day';
            break;
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

// Navigate to introduction timers page
function startIntroductionTimers() {
    // Save any current game state
    localStorage.setItem('gameState', JSON.stringify(gameState));
    
    // Navigate to timer page
    window.location.href = 'timer.html';
} 