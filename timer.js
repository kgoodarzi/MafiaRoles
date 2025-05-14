// Timer functionality for player introductions
let currentPlayerIndex = 0;
let timerInterval = null;
let secondsRemaining = 60;
let isCountingDown = true;
let overtimeSeconds = 0;
let buzzerTimeout = null;
let audioContext = null;
let gameStateForTimer = null;
let returnToPage = 'game.html'; // Default return page
let timerType = 'player'; // Default timer type: 'player', 'mafia', etc.
let timerDuration = 60; // Default timer duration in seconds

// Initialize the timer page
document.addEventListener('DOMContentLoaded', function() {
    console.log("Timer page loaded");
    
    // Check URL parameters for phase and returnTo values
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('returnTo')) {
        returnToPage = urlParams.get('returnTo');
        console.log("Return to page set to:", returnToPage);
        
        // Update the back button text based on returnTo page
        const backButton = document.getElementById('back-to-game-btn');
        if (backButton) {
            if (returnToPage.includes('intro-day')) {
                backButton.textContent = 'Back to Introduction Day';
            } else if (returnToPage.includes('day-phase')) {
                backButton.textContent = 'Back to Day Phase';
            } else if (returnToPage.includes('role-identification')) {
                backButton.textContent = 'Back to Role Identification';
            } else if (returnToPage.includes('voting-phase')) {
                backButton.textContent = 'Back to Voting Phase';
            } else if (returnToPage.includes('night-phase')) {
                backButton.textContent = 'Back to Night Phase';
            }
        }
    }
    
    // Check if a specific timer type is set
    if (urlParams.has('timerType')) {
        timerType = urlParams.get('timerType');
        console.log("Timer type set to:", timerType);
    }
    
    // Check if a specific duration is set
    if (urlParams.has('duration')) {
        timerDuration = parseInt(urlParams.get('duration'), 10);
        if (isNaN(timerDuration) || timerDuration <= 0) {
            timerDuration = 60; // Fallback to default if invalid
        }
        secondsRemaining = timerDuration;
        console.log("Timer duration set to:", timerDuration);
    }

    // Check if we have game state in localStorage
    const storedGameState = localStorage.getItem('gameState');
    if (storedGameState) {
        gameStateForTimer = JSON.parse(storedGameState);
        
        // Sort players by sequence if available
        if (gameStateForTimer.players && gameStateForTimer.players.length > 0) {
            gameStateForTimer.players.sort((a, b) => {
                const seqA = a.sequence !== undefined ? a.sequence : 9999;
                const seqB = b.sequence !== undefined ? b.sequence : 9999;
                return seqA - seqB;
            });
            console.log("Players sorted by sequence order");
        }
        
        // Set up display based on timer type
        if (timerType === 'mafia') {
            setupMafiaTimer();
        } else {
            // Default player timer setup
            showCurrentPlayerTimer();
        }
        
        // Set up button event listeners
        document.getElementById('start-pause-btn').addEventListener('click', toggleTimer);
        document.getElementById('reset-btn').addEventListener('click', resetTimer);
        
        // For player timers, add next player functionality
        if (timerType === 'player') {
            document.getElementById('next-player-btn').addEventListener('click', nextPlayer);
            
            // Ensure Next Player button has btn-success class
            const nextPlayerBtn = document.getElementById('next-player-btn');
            nextPlayerBtn.classList.remove('btn-primary', 'btn-warning');
            nextPlayerBtn.classList.add('btn-success');
        }
        
        document.getElementById('back-to-game-btn').addEventListener('click', backToGame);
        
        // Initialize audio context
        try {
            // AudioContext must be initialized after user interaction
            document.getElementById('start-pause-btn').addEventListener('click', initializeAudio, { once: true });
        } catch (e) {
            console.error("Web Audio API not supported:", e);
        }
    } else {
        console.error("No game state found");
        document.getElementById('timer-container').innerHTML = `
            <div class="error-message">
                <h3>Error: No game in progress</h3>
                <p>Please start a game first.</p>
                <a href="index.html" class="btn" style="margin-top: 20px;">Back to Home</a>
            </div>
        `;
    }
});

// Initialize audio context after user interaction
function initializeAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log("Audio context initialized");
    } catch (e) {
        console.error("Failed to initialize audio context:", e);
    }
}

// Play buzzer sound
function playBuzzer(duration = 1000) {
    if (!audioContext) return;
    
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        
        // Stop the buzzer after the specified duration
        setTimeout(() => {
            oscillator.stop();
        }, duration);
    } catch (e) {
        console.error("Error playing buzzer:", e);
    }
}

// Display the current player's timer
function showCurrentPlayerTimer() {
    if (!gameStateForTimer || !gameStateForTimer.players || currentPlayerIndex >= gameStateForTimer.players.length) {
        console.error("Invalid game state or player index");
        return;
    }
    
    const player = gameStateForTimer.players[currentPlayerIndex];
    const playerDisplay = document.getElementById('player-display');
    
    // Reset timer values
    secondsRemaining = 60;
    isCountingDown = true;
    overtimeSeconds = 0;
    
    // Clear any existing intervals
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    // Clear any buzzer timeouts
    if (buzzerTimeout) {
        clearTimeout(buzzerTimeout);
        buzzerTimeout = null;
    }
    
    // Update player info with simplified display
    playerDisplay.innerHTML = `
        <div class="player-card">
            <div class="player-image">
                <img src="${player.photo_url || 'images/default-avatar.svg'}" 
                     alt="${player.name}" 
                     onerror="this.src='images/default-avatar.svg'">
            </div>
            <div class="player-info">
                <h3>${player.name}</h3>
                <p>${currentPlayerIndex + 1} / ${gameStateForTimer.players.length}</p>
            </div>
        </div>
    `;
    
    // Update timer display
    updateTimerDisplay();
    
    // Reset button state
    const startPauseBtn = document.getElementById('start-pause-btn');
    startPauseBtn.textContent = 'Start';
    startPauseBtn.classList.remove('btn-warning');
    startPauseBtn.classList.add('btn-primary');
    
    // Ensure Next Player button maintains its green styling
    const nextPlayerBtn = document.getElementById('next-player-btn');
    nextPlayerBtn.classList.remove('btn-primary', 'btn-warning');
    nextPlayerBtn.classList.add('btn-success');
}

// Update the timer display
function updateTimerDisplay() {
    const timerDisplay = document.getElementById('timer-display');
    
    if (isCountingDown) {
        timerDisplay.innerHTML = `
            <div class="countdown">
                <h2>${formatTime(secondsRemaining)}</h2>
                <p>Time Remaining</p>
            </div>
        `;
        
        // Change color based on time remaining
        if (secondsRemaining <= 10) {
            timerDisplay.classList.add('warning');
        } else {
            timerDisplay.classList.remove('warning', 'overtime');
        }
    } else {
        timerDisplay.innerHTML = `
            <div class="overtime">
                <h2>+${formatTime(overtimeSeconds)}</h2>
                <p>Overtime</p>
            </div>
        `;
        timerDisplay.classList.add('overtime');
        timerDisplay.classList.remove('warning');
    }
}

// Format time as MM:SS
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Toggle timer between start and pause
function toggleTimer() {
    const startPauseBtn = document.getElementById('start-pause-btn');
    
    if (timerInterval) {
        // Pause timer
        clearInterval(timerInterval);
        timerInterval = null;
        
        // Clear any buzzer timeouts
        if (buzzerTimeout) {
            clearTimeout(buzzerTimeout);
            buzzerTimeout = null;
        }
        
        startPauseBtn.textContent = 'Resume';
        startPauseBtn.classList.remove('btn-warning');
        startPauseBtn.classList.add('btn-primary');
    } else {
        // Start/resume timer
        timerInterval = setInterval(updateTimer, 1000);
        
        startPauseBtn.textContent = 'Pause';
        startPauseBtn.classList.remove('btn-primary');
        startPauseBtn.classList.add('btn-warning');
    }
}

// Update timer every second
function updateTimer() {
    if (isCountingDown) {
        // Countdown
        secondsRemaining--;
        
        // Check if countdown is complete
        if (secondsRemaining <= 0) {
            isCountingDown = false;
            playBuzzer(); // Play buzzer when time is up
            
            // Schedule regular buzzer for overtime
            scheduleBuzzer();
        }
    } else {
        // Overtime
        overtimeSeconds++;
        
        // Every 5 seconds in overtime, schedule a buzzer
        if (overtimeSeconds % 5 === 0) {
            playBuzzer();
        }
    }
    
    // Update display
    updateTimerDisplay();
}

// Schedule buzzer for overtime
function scheduleBuzzer() {
    // Clear any existing timeout
    if (buzzerTimeout) {
        clearTimeout(buzzerTimeout);
    }
    
    // Find next 5-second mark and schedule buzzer
    const nextBuzzerIn = 5 - (overtimeSeconds % 5);
    if (nextBuzzerIn === 5) return; // We just played it
    
    buzzerTimeout = setTimeout(() => {
        if (!isCountingDown && timerInterval) {
            playBuzzer();
        }
    }, nextBuzzerIn * 1000);
}

// Reset the timer
function resetTimer() {
    // Clear any existing intervals
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    // Clear any buzzer timeouts
    if (buzzerTimeout) {
        clearTimeout(buzzerTimeout);
        buzzerTimeout = null;
    }
    
    // Reset values
    secondsRemaining = 60;
    isCountingDown = true;
    overtimeSeconds = 0;
    
    // Update display
    updateTimerDisplay();
    
    // Reset button state
    const startPauseBtn = document.getElementById('start-pause-btn');
    startPauseBtn.textContent = 'Start';
    startPauseBtn.classList.remove('btn-warning');
    startPauseBtn.classList.add('btn-primary');
}

// Update nextPlayer function to handle the completion of timer for all players
function nextPlayer() {
    // Clear timer if it's running
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    // Clear any buzzer timeouts
    if (buzzerTimeout) {
        clearTimeout(buzzerTimeout);
        buzzerTimeout = null;
    }
    
    // Make sure the Next Player button maintains its green styling
    const nextPlayerBtn = document.getElementById('next-player-btn');
    nextPlayerBtn.classList.remove('btn-primary', 'btn-warning');
    nextPlayerBtn.classList.add('btn-success');
    
    currentPlayerIndex++;
    
    // Check if we've gone through all players
    if (currentPlayerIndex >= gameStateForTimer.players.length) {
        // All players have gone through their time
        currentPlayerIndex = 0; // Reset to first player
        
        // Show alert
        //alert("All players have completed their turns. Returning to the game.");
        
        // Return to the appropriate page with timerComplete flag
        if (returnToPage.includes('day-phase')) {
            window.location.href = `${returnToPage}?timerComplete=true`;
        } else {
            window.location.href = returnToPage;
        }
    } else {
        // Show next player
        showCurrentPlayerTimer();
    }
}

// Update backToGame function to check if all players have gone through the timer
function backToGame() {
    // Determine if all players have gone through the timer
    const allPlayersComplete = currentPlayerIndex >= gameStateForTimer.players.length - 1;
    
    if (allPlayersComplete && returnToPage.includes('day-phase')) {
        // If all players have had their turn and we're returning to day phase
        window.location.href = `${returnToPage}?timerComplete=true`;
    } else {
        // Otherwise just return to the original page
        window.location.href = returnToPage;
    }
}

// Setup the mafia timer display
function setupMafiaTimer() {
    // Reset timer values
    secondsRemaining = timerDuration;
    isCountingDown = true;
    overtimeSeconds = 0;
    
    // Clear any existing intervals
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    // Clear any buzzer timeouts
    if (buzzerTimeout) {
        clearTimeout(buzzerTimeout);
        buzzerTimeout = null;
    }
    
    // Get mafia players
    const mafiaPlayers = getMafiaPlayers();
    
    // Update player display with mafia info
    const playerDisplay = document.getElementById('player-display');
    
    // Update the display based on mafia players
    if (mafiaPlayers.length > 0) {
        let mafiaHtml = `
            <div class="mafia-timer-info">
                <h3>Mafia Discussion Time</h3>
                <p>Mafia members can discuss strategy for ${timerDuration} seconds</p>
            </div>
            <div class="mafia-members">
                <h4>Mafia Members:</h4>
                <div class="players-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(120px, 1fr));gap:10px;margin:20px 0;">
        `;
        
        // Add each mafia player
        mafiaPlayers.forEach(player => {
            mafiaHtml += `
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
        
        mafiaHtml += `</div></div>`;
        playerDisplay.innerHTML = mafiaHtml;
    } else {
        playerDisplay.innerHTML = `
            <div class="mafia-timer-info">
                <h3>Mafia Discussion Time</h3>
                <p>Mafia members can discuss strategy for ${timerDuration} seconds</p>
                <p><em>No Mafia members found in game state.</em></p>
            </div>
        `;
    }
    
    // Update timer display
    updateTimerDisplay();
    
    // Reset button state
    const startPauseBtn = document.getElementById('start-pause-btn');
    startPauseBtn.textContent = 'Start';
    startPauseBtn.classList.remove('btn-warning');
    startPauseBtn.classList.add('btn-primary');
    
    // Hide the next player button if we're not in player timer mode
    const nextPlayerBtn = document.getElementById('next-player-btn');
    if (nextPlayerBtn) {
        nextPlayerBtn.style.display = 'none';
    }
}

// Get mafia players from game state
function getMafiaPlayers() {
    if (!gameStateForTimer || !gameStateForTimer.players) return [];
    
    // Return all mafia-team players who are alive
    return gameStateForTimer.players.filter(player => {
        // Check if player is eliminated
        const isEliminated = gameStateForTimer.eliminatedPlayers && 
                            gameStateForTimer.eliminatedPlayers.some(p => p.id === player.id);
        
        // Check if player is on mafia team
        const isMafia = player.role === 'regular_mafia' || 
                        player.role === 'godfather' || 
                        player.role === 'bomber' || 
                        player.role === 'magician';
        
        return isMafia && !isEliminated;
    });
} 