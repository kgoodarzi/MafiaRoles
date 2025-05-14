// Global variables
let gameState = null;
let timerInterval = null;
let secondsRemaining = 30; // Default timer value
let isTimerRunning = false;
let initialTimerValue = 30; // Store initial value for progress bar calculation

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("Role Identification page loaded");
    
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
    const nextPhaseBtn = document.getElementById('next-phase-btn');
    nextPhaseBtn.addEventListener('click', function() {
        console.log("Next phase button clicked");
        goToNextPhase();
    });
    
    document.getElementById('show-roles-btn').addEventListener('click', function() {
        console.log("Show roles button clicked");
        goToRoleAssignments();
    });
    
    document.getElementById('reset-btn').addEventListener('click', function() {
        console.log("Reset button clicked");
        resetGame();
    });
    
    // Timer button event listeners
    const startTimerBtn = document.getElementById('start-timer-btn');
    startTimerBtn.addEventListener('click', function() {
        console.log("Start timer button clicked");
        startTimer();
    });
    
    const pauseTimerBtn = document.getElementById('pause-timer-btn');
    pauseTimerBtn.addEventListener('click', function() {
        console.log("Pause timer button clicked");
        pauseTimer();
    });
    
    const resetTimerBtn = document.getElementById('reset-timer-btn');
    resetTimerBtn.addEventListener('click', function() {
        console.log("Reset timer button clicked");
        resetTimer();
    });
    
    // Debug the initial button state
    console.log("Start timer button disabled:", startTimerBtn.disabled);
    console.log("Next phase button disabled:", nextPhaseBtn.disabled);
    
    // Event listener for mafia team button
    document.getElementById('call-mafia-btn').addEventListener('click', function() {
        console.log("Call mafia button clicked");
        highlightRoleGroup('mafia');
        // Show mafia role action buttons
        document.getElementById('mafia-actions').style.display = 'block';
    });
    
    // Event listeners for mafia role action buttons
    setupMafiaRoleButtons();
    
    // Initialize timer display
    updateTimerDisplay();
});

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
            
            // We don't need to reset the current round - it should be at 0 coming from intro-day
            // and we'll increment it when going to day phase
            
            // Update game status display
            updateGameStatus();
            setupMafiaRoleButtons();
        } else {
            console.warn("No game state found in localStorage");
            document.getElementById('phase-info').innerHTML = `
                <div class="error-message">
                    <h3>Error: No game in progress</h3>
                    <p>Please start a game first.</p>
                </div>
            `;
            
            // Disable role buttons
            document.getElementById('show-mafia-btn').disabled = true;
            document.getElementById('show-godfather-btn').disabled = true;
            document.getElementById('show-bomber-btn').disabled = true;
            document.getElementById('show-magician-btn').disabled = true;
            document.getElementById('show-framer-btn').disabled = true;
            document.getElementById('show-consort-btn').disabled = true;
            
            // Also disable navigation buttons
            document.getElementById('next-phase-btn').disabled = true;
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
        <div><strong>Current Phase:</strong> First Identification Night</div>
        <div><strong>Round:</strong> ${gameState.currentRound}</div>
        <div><strong>Players:</strong> ${gameState.players.length}</div>
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
    console.log("startTimer function called");
    if (isTimerRunning) {
        console.log("Timer is already running, returning");
        return;
    }
    
    console.log("Setting isTimerRunning to true");
    isTimerRunning = true;
    document.getElementById('start-timer-btn').disabled = true;
    document.getElementById('pause-timer-btn').disabled = false;
    
    console.log("Starting interval");
    timerInterval = setInterval(function() {
        console.log("Timer tick, seconds remaining:", secondsRemaining);
        secondsRemaining--;
        updateTimerDisplay();
        
        if (secondsRemaining <= 0) {
            console.log("Timer reached zero");
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
    console.log("Interval ID:", timerInterval);
}

function pauseTimer() {
    console.log("pauseTimer function called");
    if (!isTimerRunning) {
        console.log("Timer is not running, returning");
        return;
    }
    
    console.log("Clearing interval:", timerInterval);
    clearInterval(timerInterval);
    isTimerRunning = false;
    document.getElementById('start-timer-btn').disabled = false;
    document.getElementById('pause-timer-btn').disabled = true;
    console.log("Timer paused at", secondsRemaining, "seconds");
}

function resetTimer() {
    console.log("resetTimer function called");
    // Clear interval if running
    if (isTimerRunning) {
        console.log("Clearing running timer interval");
        clearInterval(timerInterval);
        isTimerRunning = false;
    }
    
    // Reset to initial time from config
    secondsRemaining = typeof TIMER_CONFIG !== 'undefined' && TIMER_CONFIG.roleIdentification 
        ? TIMER_CONFIG.roleIdentification 
        : 30;
    initialTimerValue = secondsRemaining;
    
    console.log("Timer reset to", secondsRemaining, "seconds");
    updateTimerDisplay();
    
    // Reset button states
    document.getElementById('start-timer-btn').disabled = false;
    document.getElementById('pause-timer-btn').disabled = true;
}

// Go to the next phase
function goToNextPhase() {
    console.log("goToNextPhase function called");
    if (!gameState) {
        console.error("No game state available");
        return;
    }
    
    console.log("Current game phase:", gameState.gamePhase);
    
    try {
        // Update game state to next phase (day phase)
        gameState.gamePhase = 'day';
        
        // Increment round to 1 for the Second Day Phase
        gameState.currentRound = 1;
        
        // Set a flag that we've gone through the first identification night
        gameState.hadFirstIdenticationNight = true;
        
        // Make sure isIntroductionDay is set to false
        gameState.isIntroductionDay = false;
        
        localStorage.setItem('gameState', JSON.stringify(gameState));
        console.log("Game state updated to day phase, round set to 1");
        
        // Redirect to the day phase page for Round 1
        console.log("Redirecting to day-phase.html");
        window.location.href = 'day-phase.html';
    } catch (error) {
        console.error("Error navigating to next phase:", error);
        alert("Error navigating to next phase: " + error.message);
    }
}

// Go to role assignments page
function goToRoleAssignments() {
    console.log("Redirecting to role-assignments.html");
    window.location.href = 'role-assignments.html';
}

// Reset the game and return to home
function resetGame() {
    console.log("Resetting game");
    // Clear game state
    localStorage.removeItem('gameState');
    
    // Redirect to home page
    console.log("Redirecting to index.html");
    window.location.href = 'index.html';
} 