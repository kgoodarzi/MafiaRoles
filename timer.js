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
        
        // Set up initial player
        showCurrentPlayerTimer();
        
        // Set up button event listeners
        document.getElementById('start-pause-btn').addEventListener('click', toggleTimer);
        document.getElementById('reset-btn').addEventListener('click', resetTimer);
        document.getElementById('next-player-btn').addEventListener('click', nextPlayer);
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

// Move to the next player
function nextPlayer() {
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
    
    // Move to next player
    currentPlayerIndex++;
    
    // Check if all players have had their turn
    if (currentPlayerIndex >= gameStateForTimer.players.length) {
        // All players done, go back to game
        backToGame();
    } else {
        // Show next player
        showCurrentPlayerTimer();
    }
}

// Return to the game page
function backToGame() {
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
    
    // Navigate back to the appropriate page
    window.location.href = returnToPage;
} 