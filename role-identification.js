// Global variables
let gameState = null;

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    console.log("Role Identification page loaded");
    
    // Wait for database manager to initialize
    console.log("Waiting for database initialization...");
    await waitForDatabaseInit();
    
    // Load game state from localStorage
    loadGameState();
    
    // Set up event listeners
    document.getElementById('next-phase-btn').addEventListener('click', goToNextPhase);
    document.getElementById('show-roles-btn').addEventListener('click', goToRoleAssignments);
    document.getElementById('reset-btn').addEventListener('click', resetGame);
    
    // Event listeners for role group buttons
    document.getElementById('call-mafia-btn').addEventListener('click', function() {
        highlightRoleGroup('mafia');
    });
    document.getElementById('call-independent-btn').addEventListener('click', function() {
        highlightRoleGroup('independent');
    });
    document.getElementById('call-citizens-btn').addEventListener('click', function() {
        highlightRoleGroup('citizen');
    });
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
            
            // If game phase isn't set to role-identification, update it
            if (gameState.gamePhase !== 'role-identification') {
                gameState.gamePhase = 'role-identification';
                localStorage.setItem('gameState', JSON.stringify(gameState));
            }
            
            // Update game status display
            updateGameStatus();
        } else {
            console.warn("No game state found in localStorage");
            document.getElementById('phase-info').innerHTML = `
                <div class="error-message">
                    <h3>Error: No game in progress</h3>
                    <p>Please start a game first.</p>
                </div>
            `;
            
            // Disable buttons
            document.getElementById('next-phase-btn').disabled = true;
            document.getElementById('show-roles-btn').disabled = true;
            document.getElementById('call-mafia-btn').disabled = true;
            document.getElementById('call-independent-btn').disabled = true;
            document.getElementById('call-citizens-btn').disabled = true;
        }
    } catch (error) {
        console.error("Error loading game state:", error);
        document.getElementById('phase-info').innerHTML = `
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
        <div><strong>Current Phase:</strong> Role Identification Night</div>
        <div><strong>Round:</strong> ${gameState.currentRound}</div>
        <div><strong>Players:</strong> ${gameState.players.length}</div>
    `;
}

// Highlight a specific role group
function highlightRoleGroup(teamType) {
    if (!gameState || !gameState.players) return;
    
    // Get all players of the specified team
    let players = [];
    let teamName = '';
    
    if (teamType === 'mafia') {
        teamName = 'Mafia Team';
        players = gameState.players.filter(player => {
            const role = getRoleById(player.role);
            return role && role.team === 'mafia';
        });
    } else if (teamType === 'independent') {
        teamName = 'Independent Roles';
        players = gameState.players.filter(player => {
            const role = getRoleById(player.role);
            return role && role.team === 'independent';
        });
    } else if (teamType === 'citizen') {
        teamName = 'Citizen Special Roles';
        players = gameState.players.filter(player => {
            const role = getRoleById(player.role);
            return role && role.team === 'citizen' && role.id !== 'citizen';
        });
    }
    
    if (players.length === 0) {
        alert(`No ${teamName} found in this game.`);
        return;
    }
    
    // Display the players in this team
    let playersList = players.map(player => {
        const role = getRoleById(player.role);
        return `${player.name} - ${role ? role.name : player.role}`;
    }).join('\n');
    
    alert(`${teamName}:\n${playersList}`);
}

// Go to the next phase
function goToNextPhase() {
    if (!gameState) return;
    
    // Update game state to next phase
    gameState.gamePhase = 'day';
    localStorage.setItem('gameState', JSON.stringify(gameState));
    
    // Redirect to the next phase page
    window.location.href = 'day-phase.html';
}

// Go to role assignments page
function goToRoleAssignments() {
    window.location.href = 'role-assignments.html';
}

// Reset the game and return to home
function resetGame() {
    // Clear game state
    localStorage.removeItem('gameState');
    
    // Redirect to home page
    window.location.href = 'index.html';
} 