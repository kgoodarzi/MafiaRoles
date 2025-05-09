// Global variables
let gameState = null;
let timerInterval = null;
let secondsRemaining = 30; // Default timer value
let isTimerRunning = false;
let initialTimerValue = 30; // Store initial value for progress bar calculation

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    console.log("Role Identification page loaded");
    
    // Wait for database manager to initialize
    console.log("Waiting for database initialization...");
    await waitForDatabaseInit();
    
    // Load game state from localStorage
    loadGameState();
    
    // Set timer value from config if available
    if (typeof TIMER_CONFIG !== 'undefined' && TIMER_CONFIG.roleIdentification) {
        secondsRemaining = TIMER_CONFIG.roleIdentification;
        initialTimerValue = secondsRemaining;
        updateTimerDisplay();
        console.log(`Timer set to ${secondsRemaining} seconds from config`);
    }
    
    // Set up event listeners
    document.getElementById('next-phase-btn').addEventListener('click', goToNextPhase);
    document.getElementById('show-roles-btn').addEventListener('click', goToRoleAssignments);
    document.getElementById('reset-btn').addEventListener('click', resetGame);
    
    // Timer button event listeners
    document.getElementById('start-timer-btn').addEventListener('click', startTimer);
    document.getElementById('pause-timer-btn').addEventListener('click', pauseTimer);
    document.getElementById('reset-timer-btn').addEventListener('click', resetTimer);
    
    // Event listener for mafia team button
    document.getElementById('call-mafia-btn').addEventListener('click', function() {
        highlightRoleGroup('mafia');
        // Show mafia role action buttons
        document.getElementById('mafia-actions').style.display = 'block';
    });
    
    // Event listeners for mafia role action buttons
    setupMafiaRoleButtons();
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
            
            // Check if specific Mafia roles exist and show/hide buttons accordingly
            updateMafiaRoleButtons();
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
            document.getElementById('start-timer-btn').disabled = true;
            document.getElementById('pause-timer-btn').disabled = true;
            document.getElementById('reset-timer-btn').disabled = true;
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
    
    // Count mafia players
    const mafiaPlayers = gameState.players.filter(player => {
        const role = getRoleById(player.role);
        return role && role.team === 'mafia';
    });
    
    gameStatusInfo.innerHTML = `
        <div><strong>Current Phase:</strong> First Night - Role Identification</div>
        <div><strong>Round:</strong> ${gameState.currentRound}</div>
        <div><strong>Total Players:</strong> ${gameState.players.length}</div>
        <div><strong>Mafia Players:</strong> ${mafiaPlayers.length}</div>
    `;
}

// Setup Mafia role action buttons
function setupMafiaRoleButtons() {
    // Godfather button
    document.getElementById('godfather-action-btn').addEventListener('click', function() {
        checkRolePresent('godfather');
    });
    
    // Mafioso button
    document.getElementById('mafioso-action-btn').addEventListener('click', function() {
        checkRolePresent('mafioso');
    });
    
    // Framer button
    document.getElementById('framer-action-btn').addEventListener('click', function() {
        checkRolePresent('framer');
    });
    
    // Consort button
    document.getElementById('consort-action-btn').addEventListener('click', function() {
        checkRolePresent('consort');
    });
}

// Update Mafia role buttons based on roles present in the game
function updateMafiaRoleButtons() {
    if (!gameState || !gameState.players) return;
    
    // Check if each role exists in the game
    const hasGodfather = gameState.players.some(player => player.role === 'godfather');
    const hasMafioso = gameState.players.some(player => player.role === 'mafioso');
    const hasFramer = gameState.players.some(player => player.role === 'framer');
    const hasConsort = gameState.players.some(player => player.role === 'consort');
    
    // Update button visibility
    document.getElementById('godfather-action-btn').style.display = hasGodfather ? 'block' : 'none';
    document.getElementById('mafioso-action-btn').style.display = hasMafioso ? 'block' : 'none';
    document.getElementById('framer-action-btn').style.display = hasFramer ? 'block' : 'none';
    document.getElementById('consort-action-btn').style.display = hasConsort ? 'block' : 'none';
}

// Check if a specific role is present in the game
function checkRolePresent(roleId) {
    if (!gameState || !gameState.players) return;
    
    const playersWithRole = gameState.players.filter(player => player.role === roleId);
    
    if (playersWithRole.length > 0) {
        const roleInfo = getRoleById(roleId);
        const roleName = roleInfo ? roleInfo.name : roleId;
        
        let playersList = playersWithRole.map(player => {
            return `${player.name}`;
        }).join('\n');
        
        alert(`${roleName}:\n${playersList}`);
    } else {
        alert(`No ${roleId} in this game.`);
    }
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

// Timer functions
function updateTimerDisplay() {
    const timerDisplay = document.getElementById('timer-display');
    const timerSection = document.getElementById('timer-section');
    const timerBar = document.getElementById('timer-bar');
    
    // Update timer text
    timerDisplay.textContent = secondsRemaining;
    
    // Calculate progress percentage
    const progressPercentage = (secondsRemaining / initialTimerValue) * 100;
    timerBar.style.width = `${progressPercentage}%`;
    
    // Update timer appearance based on time remaining
    if (secondsRemaining <= 5) {
        // Danger zone - less than 5 seconds
        timerDisplay.style.color = 'var(--mafia-color, #e53935)';
        timerSection.classList.remove('timer-warning');
        timerSection.classList.add('timer-danger');
    } else if (secondsRemaining <= 10) {
        // Warning zone - less than 10 seconds
        timerDisplay.style.color = 'var(--warning-color, #ff9800)';
        timerSection.classList.add('timer-warning');
        timerSection.classList.remove('timer-danger');
    } else {
        // Normal zone
        timerDisplay.style.color = '';
        timerSection.classList.remove('timer-warning', 'timer-danger');
    }
}

function startTimer() {
    if (isTimerRunning) return;
    
    isTimerRunning = true;
    document.getElementById('start-timer-btn').disabled = true;
    document.getElementById('pause-timer-btn').disabled = false;
    
    timerInterval = setInterval(function() {
        secondsRemaining--;
        updateTimerDisplay();
        
        if (secondsRemaining <= 0) {
            clearInterval(timerInterval);
            isTimerRunning = false;
            document.getElementById('start-timer-btn').disabled = true;
            document.getElementById('pause-timer-btn').disabled = true;
            
            // Play buzzer sound if available
            if (typeof playBuzzer === 'function') {
                playBuzzer();
            } else {
                alert("Time's up!");
            }
        }
    }, 1000);
}

function pauseTimer() {
    if (!isTimerRunning) return;
    
    clearInterval(timerInterval);
    isTimerRunning = false;
    document.getElementById('start-timer-btn').disabled = false;
    document.getElementById('pause-timer-btn').disabled = true;
}

function resetTimer() {
    // Clear interval if running
    if (isTimerRunning) {
        clearInterval(timerInterval);
        isTimerRunning = false;
    }
    
    // Reset to initial time from config
    secondsRemaining = typeof TIMER_CONFIG !== 'undefined' && TIMER_CONFIG.roleIdentification 
        ? TIMER_CONFIG.roleIdentification 
        : 30;
    initialTimerValue = secondsRemaining;
    
    updateTimerDisplay();
    
    // Reset button states
    document.getElementById('start-timer-btn').disabled = false;
    document.getElementById('pause-timer-btn').disabled = true;
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