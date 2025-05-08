// Global variables
let gameState = null;

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    console.log("Day Phase page loaded");
    
    // Wait for database manager to initialize
    console.log("Waiting for database initialization...");
    await waitForDatabaseInit();
    
    // Load game state from localStorage
    loadGameState();
    
    // Set up event listeners
    document.getElementById('next-phase-btn').addEventListener('click', goToNextPhase);
    document.getElementById('discussion-timer-btn').addEventListener('click', startDiscussionTimer);
    document.getElementById('show-roles-btn').addEventListener('click', goToRoleAssignments);
    document.getElementById('reset-btn').addEventListener('click', resetGame);
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
            
            // If game phase isn't set to day, update it
            if (gameState.gamePhase !== 'day') {
                gameState.gamePhase = 'day';
                localStorage.setItem('gameState', JSON.stringify(gameState));
            }
            
            // Update page subtitle
            document.getElementById('day-phase-subtitle').textContent = `Day Phase - Round ${gameState.currentRound}`;
            
            // Update game status display
            updateGameStatus();
            
            // Display alive players
            displayAlivePlayers();
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
            document.getElementById('discussion-timer-btn').disabled = true;
            document.getElementById('show-roles-btn').disabled = true;
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
        <div><strong>Current Phase:</strong> Day Phase</div>
        <div><strong>Round:</strong> ${gameState.currentRound}</div>
        <div><strong>Players Alive:</strong> ${getAlivePlayers().length} / ${gameState.players.length}</div>
    `;
}

// Display alive players
function displayAlivePlayers() {
    if (!gameState || !gameState.players) return;
    
    const alivePlayers = getAlivePlayers();
    const playersStatusElement = document.getElementById('players-status');
    
    // Sort players by sequence if available
    const sortedPlayers = [...alivePlayers].sort((a, b) => {
        const seqA = a.sequence !== undefined ? a.sequence : 9999;
        const seqB = b.sequence !== undefined ? b.sequence : 9999;
        return seqA - seqB;
    });
    
    let playersHtml = `<h3>Alive Players</h3><div class="players-grid">`;
    
    sortedPlayers.forEach(player => {
        playersHtml += `
            <div class="player-card small">
                <div class="player-image">
                    <img src="${player.photo_url || 'images/default-avatar.svg'}" 
                         alt="${player.name}" 
                         onerror="this.src='images/default-avatar.svg'">
                </div>
                <div class="player-info">
                    <h4>${player.name}</h4>
                    ${player.sequence !== undefined ? `<small>${player.sequence}</small>` : ''}
                </div>
            </div>
        `;
    });
    
    playersHtml += `</div>`;
    playersStatusElement.innerHTML = playersHtml;
}

// Get alive players (those not in eliminatedPlayers array)
function getAlivePlayers() {
    if (!gameState || !gameState.players) return [];
    
    // If eliminatedPlayers doesn't exist, initialize it
    if (!gameState.eliminatedPlayers) {
        gameState.eliminatedPlayers = [];
    }
    
    // Return players who are not in the eliminatedPlayers array
    return gameState.players.filter(player => 
        !gameState.eliminatedPlayers.some(eliminated => eliminated.id === player.id)
    );
}

// Go to the next phase
function goToNextPhase() {
    if (!gameState) return;
    
    // Update game state to next phase
    gameState.gamePhase = 'voting';
    localStorage.setItem('gameState', JSON.stringify(gameState));
    
    // Redirect to the next phase page
    window.location.href = 'voting-phase.html';
}

// Start discussion timer
function startDiscussionTimer() {
    // Redirect to the timer page for discussion
    window.location.href = 'timer.html?phase=discussion&returnTo=day-phase.html';
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