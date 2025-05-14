// Global variables
let gameState = null;

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    console.log("Intro Day page loaded");
    
    // Wait for database manager to initialize
    console.log("Waiting for database initialization...");
    await waitForDatabaseInit();
    
    // Load game state from localStorage
    loadGameState();
    
    // Set up event listeners
    document.getElementById('next-phase-btn').addEventListener('click', goToNextPhase);
    document.getElementById('intro-timer-btn').addEventListener('click', startIntroductionTimers);
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
            
            // If game phase isn't set to intro-day, update it
            if (gameState.gamePhase !== 'intro-day') {
                gameState.gamePhase = 'intro-day';
                localStorage.setItem('gameState', JSON.stringify(gameState));
            }
            
            // Make sure round is set to 0 for introduction day
            if (gameState.currentRound !== 0) {
                gameState.currentRound = 0;
                gameState.isIntroductionDay = true;
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
            document.getElementById('intro-timer-btn').disabled = true;
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
        <div><strong>Current Phase:</strong> Introduction Day</div>
        <div><strong>Round:</strong> ${gameState.currentRound}</div>
        <div><strong>Players:</strong> ${gameState.players.length}</div>
    `;
}

// Go to the next phase
function goToNextPhase() {
    if (!gameState) return;
    
    // Update game state to next phase
    gameState.gamePhase = 'role-identification';
    localStorage.setItem('gameState', JSON.stringify(gameState));
    
    // Redirect to the next phase page
    window.location.href = 'role-identification.html';
}

// Start introduction timers
function startIntroductionTimers() {
    // Redirect to the timer page for introduction
    window.location.href = 'timer.html?phase=introduction&returnTo=intro-day.html';
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