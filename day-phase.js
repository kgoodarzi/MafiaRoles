// Global variables
let gameState = null;
let allPlayersTimerComplete = false;  // New flag to track if all players have gone through the timer

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    console.log("Day Phase page loaded");
    
    // Wait for database manager to initialize
    if (typeof waitForDatabaseInit === 'function') {
        console.log("Waiting for database initialization...");
        await waitForDatabaseInit();
    }
    
    // Check if we're returning from the timer page
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('timerComplete') && urlParams.get('timerComplete') === 'true') {
        allPlayersTimerComplete = true;
        console.log("All players have completed the timer");
    }
    
    // Load game state from localStorage
    loadGameState();
    
    // Set up event listeners
    document.getElementById('discussion-timer-btn').addEventListener('click', startDiscussionTimer);
    document.getElementById('next-phase-btn').addEventListener('click', goToNextPhase);
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
            
            // Check for game-ending conditions
            const gameEndResult = checkGameEndingConditions();
            
            if (gameEndResult.gameOver) {
                // Game has ended, redirect to the game over page or show end game dialog
                gameState.gameOver = true;
                gameState.winningTeam = gameEndResult.winningTeam;
                gameState.endReason = gameEndResult.reason;
                
                // Save game state
                localStorage.setItem('gameState', JSON.stringify(gameState));
                
                // If it's a Chaos Day (3 players with at least one Mafia/Zodiac), go to Chaos Day page
                if (gameEndResult.chaosDay) {
                    gameState.chaosDay = true;
                    localStorage.setItem('gameState', JSON.stringify(gameState));
                    window.location.href = 'chaos-day.html';
                    return;
                }
                
                // Otherwise, go to game over page
                window.location.href = 'game-over.html';
                return;
            }
            
            // Update game status display
            updateGameStatus();
            
            // Display night events summary
            displayNightEvents();
            
            // Display alive players
            displayAlivePlayers();
            
            // Handle button visibility based on game state
            updateButtonVisibility();
            
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

// Update button visibility based on game state
function updateButtonVisibility() {
    const nextPhaseBtn = document.getElementById('next-phase-btn');
    const discussionTimerBtn = document.getElementById('discussion-timer-btn');
    
    // Show Next Phase button if all players have completed the timer
    if (allPlayersTimerComplete) {
        // Show Next Phase button
        if (nextPhaseBtn) {
            nextPhaseBtn.style.display = 'block';
            
            // Update button text if there's a bomb
            if (gameState.bomberAction && gameState.bomberAction.targetId && gameState.bomberAction.code) {
                nextPhaseBtn.textContent = 'Proceed to Bomb Defusing';
            } else {
                nextPhaseBtn.textContent = 'Next Phase (Voting)';
            }
        }
        
        // Hide discussion timer button
        if (discussionTimerBtn) {
            discussionTimerBtn.style.display = 'none';
        }
    } 
    else {
        // When timers are not complete, hide Next Phase button and show Discussion Timer
        if (nextPhaseBtn) {
            nextPhaseBtn.style.display = 'none';
        }
        
        if (discussionTimerBtn) {
            discussionTimerBtn.style.display = 'block';
        }
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
    
    // Add bomb info if there's a bomb placed
    if (gameState.bomberAction && gameState.bomberAction.targetId && gameState.bomberAction.code) {
        const targetPlayer = gameState.players.find(p => p.id === gameState.bomberAction.targetId);
        if (targetPlayer) {
            gameStatusInfo.innerHTML += `
                <div style="margin-top: 10px; color: #ff4c4c;">
                    <strong>⚠️ A bomb has been placed in front of ${targetPlayer.name}!</strong>
                    <div>Bomb defusing will happen before voting.</div>
                </div>
            `;
        }
    }
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
        // Check if this player has a bomb in front of them
        const hasBomb = gameState.bomberAction && 
                      gameState.bomberAction.targetId === player.id;
        
        const bombIndicator = hasBomb ? 
            `<div style="position: absolute; top: -10px; right: -10px; background-color: #ff4c4c; color: white; border-radius: 50%; width: 25px; height: 25px; display: flex; align-items: center; justify-content: center; font-weight: bold;">💣</div>` : '';
        
        playersHtml += `
            <div class="player-card small position-relative">
                ${bombIndicator}
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

// Display summary of night events
function displayNightEvents() {
    if (!gameState || !gameState.nightResults) return;
    
    const nightEventsElement = document.getElementById('night-events');
    if (!nightEventsElement) return;
    
    // Skip displaying night events during introduction day (round 0)
    if (gameState.isIntroductionDay || gameState.currentRound === 0) {
        nightEventsElement.innerHTML = `
            <h3>Introduction Day</h3>
            <p>This is the introduction day. Players should introduce themselves and get to know each other.</p>
            <p>No night actions have occurred yet.</p>
        `;
        return;
    }
    
    let eventsHtml = `<h3>Night Events</h3>`;
    
    // Show deaths
    if (gameState.nightResults.deaths && gameState.nightResults.deaths.length > 0) {
        eventsHtml += `<div class="night-deaths">`;
        gameState.nightResults.deaths.forEach(death => {
            eventsHtml += `
                <div class="death-report">
                    <h4>${death.name} was eliminated during the night</h4>
                </div>
            `;
        });
        eventsHtml += `</div>`;
    } else {
        eventsHtml += `<p>No players were eliminated during the night.</p>`;
    }
    
    nightEventsElement.innerHTML = eventsHtml;
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

// Check for game-ending conditions
function checkGameEndingConditions() {
    const alivePlayers = getAlivePlayers();
    
    // Get counts of each team
    const mafiaCount = alivePlayers.filter(p => 
        ['godfather', 'magician', 'bomber', 'regular_mafia'].includes(p.role)
    ).length;
    
    const townCount = alivePlayers.filter(p => 
        !['godfather', 'magician', 'bomber', 'regular_mafia', 'zodiac'].includes(p.role)
    ).length;
    
    const zodiacAlive = alivePlayers.some(p => p.role === 'zodiac');
    
    // Check if zodiac exists in the game at all
    const zodiacExists = gameState.players.some(p => p.role === 'zodiac');
    
    // 1. Only one player left
    if (alivePlayers.length === 1) {
        const lastPlayer = alivePlayers[0];
        let winningTeam = 'town'; // Default
        
        // Determine winning team based on last player
        if (['godfather', 'magician', 'bomber', 'regular_mafia'].includes(lastPlayer.role)) {
            winningTeam = 'mafia';
        } else if (lastPlayer.role === 'zodiac') {
            winningTeam = 'zodiac';
        }
        
        return {
            gameOver: true,
            winningTeam: winningTeam,
            reason: `Only ${lastPlayer.name} (${capitalizeFirstLetter(lastPlayer.role)}) remains alive.`,
            chaosDay: false
        };
    }
    
    // 2. Two players left
    if (alivePlayers.length === 2) {
        // If Zodiac is one of them, Zodiac wins
        if (zodiacAlive) {
            return {
                gameOver: true,
                winningTeam: 'zodiac',
                reason: 'Zodiac has reached final 2 players and wins!',
                chaosDay: false
            };
        }
        
        // If both are town, town wins
        if (mafiaCount === 0) {
            return {
                gameOver: true,
                winningTeam: 'town',
                reason: 'Only townsfolk remain - Town wins!',
                chaosDay: false
            };
        }
        
        // If at least one is Mafia, Mafia wins
        if (mafiaCount > 0) {
            return {
                gameOver: true,
                winningTeam: 'mafia',
                reason: 'Mafia has reached parity with Town - Mafia wins!',
                chaosDay: false
            };
        }
    }
    
    // 3. Mafia equals or outnumbers town (and no Zodiac)
    if (mafiaCount >= townCount && !zodiacAlive && alivePlayers.length > 2) {
        return {
            gameOver: true,
            winningTeam: 'mafia',
            reason: 'Mafia has reached parity with or outnumbers Town - Mafia wins!',
            chaosDay: false
        };
    }
    
    // 4. Chaos Day - exactly 3 players with at least one Mafia or Zodiac
    if (alivePlayers.length === 3 && (mafiaCount > 0 || zodiacAlive)) {
        return {
            gameOver: true,
            winningTeam: 'undecided', // To be determined in Chaos Day
            reason: 'Three players remain with at least one Mafia or Zodiac - Chaos Day!',
            chaosDay: true
        };
    }
    
    // Game continues
    return {
        gameOver: false
    };
}

// Go to the next phase
function goToNextPhase() {
    if (!gameState) return;
    
    console.log("Going to next phase. allPlayersTimerComplete:", allPlayersTimerComplete);
    console.log("Current game state:", gameState.gamePhase, "Round:", gameState.currentRound, "isIntroductionDay:", gameState.isIntroductionDay);
    
    // Check if there's a bomb to defuse first
    if (gameState.bomberAction && gameState.bomberAction.targetId && gameState.bomberAction.code) {
        console.log("Bomb detected, redirecting to bomb defuse page before voting...");
        window.location.href = 'bomb-defuse.html';
        return;
    }
    
    // If all players have gone through timer, go to voting regardless of day
    if (allPlayersTimerComplete) {
        console.log("All players have completed timer, going to voting phase");
        gameState.gamePhase = 'voting';
        localStorage.setItem('gameState', JSON.stringify(gameState));
        window.location.href = 'voting-phase.html';
        return;
    }
    
    // Handle introduction day transition
    if (gameState.isIntroductionDay || gameState.currentRound === 0) {
        // After introduction day, proceed to night with no actions
        gameState.gamePhase = 'night';
        gameState.isIntroductionDay = false;
        
        // Initialize empty night results if not present
        if (!gameState.nightResults) {
            gameState.nightResults = { deaths: [] };
        }
        
        localStorage.setItem('gameState', JSON.stringify(gameState));
        
        // Go to night phase with no actions
        console.log("Going to night phase after introduction day");
        window.location.href = 'night-phase.html';
        return;
    }
    
    // If no bomb and not introduction day, go directly to voting phase
    gameState.gamePhase = 'voting';
    localStorage.setItem('gameState', JSON.stringify(gameState));
    
    // Redirect to the voting phase page
    console.log("Redirecting to voting phase");
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

// Helper function to capitalize first letter of a string
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
} 