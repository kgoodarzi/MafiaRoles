// Global variables
let gameState = null;

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    console.log("Role assignments page loaded");
    
    // Wait for database manager to initialize
    console.log("Waiting for database initialization...");
    await waitForDatabaseInit();
    
    // Load game state from localStorage
    loadGameState();
    
    // Display role assignments
    displayRoleAssignmentsTable();
    
    // Add event listener for start/resume button
    document.getElementById('start-resume-btn').addEventListener('click', startOrResumeGame);
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
            
            // Update game status display
            updateGameStatus();
            
            // Update start/resume button text based on game phase
            updateStartResumeButton();
        } else {
            console.warn("No game state found in localStorage");
            document.getElementById('role-assignments-content').innerHTML = `
                <div class="error-message">
                    <h3>Error: No game in progress</h3>
                    <p>Please start a game first.</p>
                </div>
            `;
            
            // Disable the start/resume button
            document.getElementById('start-resume-btn').disabled = true;
        }
    } catch (error) {
        console.error("Error loading game state:", error);
        document.getElementById('role-assignments-content').innerHTML = `
            <div class="error-message">
                <h3>Error loading game data</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Update game status information
function updateGameStatus() {
    if (!gameState) return;
    
    const gameStatusInfo = document.getElementById('game-status-info');
    gameStatusInfo.innerHTML = `
        <div><strong>Current Phase:</strong> ${gameState.gamePhase.charAt(0).toUpperCase() + gameState.gamePhase.slice(1)}</div>
        <div><strong>Round:</strong> ${gameState.currentRound}</div>
    `;
}

// Update the start/resume button text based on the current game phase
function updateStartResumeButton() {
    if (!gameState) return;
    
    const startResumeBtn = document.getElementById('start-resume-btn');
    
    if (gameState.gamePhase === 'setup') {
        startResumeBtn.textContent = 'Start Game';
    } else {
        startResumeBtn.textContent = `Resume Game (${gameState.gamePhase.charAt(0).toUpperCase() + gameState.gamePhase.slice(1)} Phase)`;
    }
}

// Handle the start/resume game button click
function startOrResumeGame() {
    if (!gameState) return;
    
    let targetPage = 'game.html';
    
    // Determine which page to navigate to based on game phase
    switch (gameState.gamePhase) {
        case 'setup':
            // New game - update phase to intro-day and redirect
            gameState.gamePhase = 'intro-day';
            gameState.currentRound = 1;
            localStorage.setItem('gameState', JSON.stringify(gameState));
            targetPage = 'intro-day.html';
            break;
        case 'intro-day':
            targetPage = 'intro-day.html';
            break;
        case 'role-identification':
            targetPage = 'role-identification.html';
            break;
        case 'day':
            targetPage = 'day-phase.html';
            break;
        case 'voting':
            targetPage = 'voting-phase.html';
            break;
        case 'night':
            targetPage = 'night-phase.html';
            break;
        default:
            // Fallback to intro-day if unknown phase
            gameState.gamePhase = 'intro-day';
            localStorage.setItem('gameState', JSON.stringify(gameState));
            targetPage = 'intro-day.html';
            break;
    }
    
    // Redirect to the appropriate page
    window.location.href = targetPage;
}

// Display the role assignments table
function displayRoleAssignmentsTable() {
    if (!gameState || !gameState.players) {
        console.error("No valid game state found");
        return;
    }
    
    const roleAssignmentsContent = document.getElementById('role-assignments-content');
    
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
        
        // Get sequence display (add sequence number if available)
        const sequenceDisplay = player.sequence !== undefined ? ` (${player.sequence})` : '';
        
        // Add table row
        tableHtml += `
            <div class="roles-table-row" data-team="${teamClass}" style="padding:12px;border-bottom:1px solid var(--border-color);display:flex;align-items:center;background-color:var(--card-bg);border-left:4px solid ${getTeamBorderColor(teamClass)};">
                <div class="roles-table-avatar" style="margin-right:12px;width:40px;height:40px;border-radius:50%;overflow:hidden;">
                    <img src="${player.photo_url || 'images/default-avatar.svg'}" 
                         alt="${player.name}" 
                         style="width:100%;height:100%;object-fit:cover;"
                         onerror="this.src='images/default-avatar.svg'">
                </div>
                <div class="roles-table-info" style="flex-grow:1;">
                    <div style="font-weight:bold;">${player.name}${sequenceDisplay}</div>
                    <div style="color:var(--text-secondary);font-size:0.9rem;">${roleName}</div>
                </div>
                <div class="roles-table-role-icon" style="width:35px;height:35px;border-radius:4px;overflow:hidden;">
                    <img src="${roleImageSrc}" 
                         alt="${roleName}" 
                         style="width:100%;height:100%;object-fit:cover;"
                         onerror="this.src='images/default-avatar.svg'">
                </div>
            </div>
        `;
    });
    
    tableHtml += `</div>`;
    
    roleAssignmentsContent.innerHTML = tableHtml;
}

// Helper function to get team border color
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