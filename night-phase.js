// Global variables
let gameState = null;
let selectedTarget = null;
let nightActionResults = {};

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    console.log("Night Phase page loaded");
    
    // Wait for database manager to initialize
    console.log("Waiting for database initialization...");
    await waitForDatabaseInit();
    
    // Load game state from localStorage
    loadGameState();
    
    // Set up event listeners
    document.getElementById('next-phase-btn').addEventListener('click', goToNextPhase);
    document.getElementById('reveal-results-btn').addEventListener('click', revealNightResults);
    document.getElementById('show-roles-btn').addEventListener('click', goToRoleAssignments);
    document.getElementById('reset-btn').addEventListener('click', resetGame);
    
    // Role action buttons
    document.getElementById('mafia-action-btn').addEventListener('click', function() {
        handleRoleAction('mafia');
    });
    document.getElementById('detective-action-btn').addEventListener('click', function() {
        handleRoleAction('detective');
    });
    document.getElementById('doctor-action-btn').addEventListener('click', function() {
        handleRoleAction('doctor');
    });
    document.getElementById('special-action-btn').addEventListener('click', function() {
        handleRoleAction('special');
    });
    document.getElementById('zodiac-action-btn').addEventListener('click', function() {
        handleRoleAction('zodiac');
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
            
            // Initialize bomber bombs count if not set
            if (gameState.bomberBombs === undefined) {
                gameState.bomberBombs = 1; // Bomber starts with 1 bomb
                localStorage.setItem('gameState', JSON.stringify(gameState));
            }
            
            // Initialize doctor self-saves count if not set
            if (gameState.doctorSelfSaves === undefined) {
                gameState.doctorSelfSaves = 2; // Doctor starts with 2 self-saves
                localStorage.setItem('gameState', JSON.stringify(gameState));
            }
            
            // If game phase isn't set to night, update it
            if (gameState.gamePhase !== 'night') {
                gameState.gamePhase = 'night';
                localStorage.setItem('gameState', JSON.stringify(gameState));
            }
            
            // Update page subtitle
            document.getElementById('night-phase-subtitle').textContent = `Night Phase - Round ${gameState.currentRound}`;
            
            // Update game status display
            updateGameStatus();
            
            // Initially disable next phase button until night results are shown
            document.getElementById('next-phase-btn').disabled = true;
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
            document.getElementById('reveal-results-btn').disabled = true;
            document.getElementById('show-roles-btn').disabled = true;
            document.getElementById('mafia-action-btn').disabled = true;
            document.getElementById('detective-action-btn').disabled = true;
            document.getElementById('doctor-action-btn').disabled = true;
            document.getElementById('special-action-btn').disabled = true;
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
        <div><strong>Current Phase:</strong> Night Phase</div>
        <div><strong>Round:</strong> ${gameState.currentRound}</div>
        <div><strong>Players Alive:</strong> ${getAlivePlayers().length} / ${gameState.players.length}</div>
    `;
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

// Handle role-specific actions
function handleRoleAction(roleType) {
    const alivePlayers = getAlivePlayers();
    
    // Create player selection modal
    let modalTitle = '';
    let modalAction = '';
    
    switch(roleType) {
        case 'mafia':
            modalTitle = 'Mafia Elimination';
            modalAction = 'Choose a player to eliminate:';
            break;
        case 'detective':
            modalTitle = 'Detective Investigation';
            modalAction = 'Choose a player to investigate:';
            break;
        case 'doctor':
            modalTitle = 'Doctor Protection';
            modalAction = 'Choose a player to protect:';
            break;
        case 'special':
            modalTitle = 'Special Ability';
            modalAction = 'Choose a player to target:';
            break;
        case 'zodiac':
            modalTitle = 'Zodiac Elimination';
            modalAction = 'Choose a player to eliminate:';
            break;
    }
    
    // Create a simple modal for player selection
    let playerSelectionHtml = `
        <div class="modal" style="position:fixed;top:0;left:0;width:100%;height:100%;background-color:rgba(0,0,0,0.7);display:flex;justify-content:center;align-items:center;z-index:1000;">
            <div class="modal-content" style="background-color:var(--card-bg);border-radius:8px;padding:20px;width:90%;max-width:600px;">
                <h3>${modalTitle}</h3>
                <p>${modalAction}</p>
                <div class="players-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(120px, 1fr));gap:10px;margin:20px 0;">
    `;
    
    // Add player cards
    alivePlayers.forEach(player => {
        playerSelectionHtml += `
            <div class="player-card small selectable" data-player-id="${player.id}" style="cursor:pointer;border:2px solid transparent;transition:all 0.2s;">
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
    
    playerSelectionHtml += `
                </div>
                <div style="display:flex;justify-content:space-between;margin-top:20px;">
                    <button id="modal-cancel-btn" class="btn">Cancel</button>
                    <button id="modal-confirm-btn" class="btn btn-primary" disabled>Confirm</button>
                </div>
            </div>
        </div>
    `;
    
    // Add the modal to the page
    const modalElement = document.createElement('div');
    modalElement.innerHTML = playerSelectionHtml;
    document.body.appendChild(modalElement);
    
    // Add event listeners to player cards for selection
    const playerCards = document.querySelectorAll('.player-card.selectable');
    playerCards.forEach(card => {
        card.addEventListener('click', function() {
            // Special case for Doctor with no self-saves left
            if (roleType === 'doctor' && gameState.doctorSelfSaves === 0) {
                // Get the doctor player
                const doctorPlayer = alivePlayers.find(p => p.role === 'doctor');
                
                // If this is the doctor card and no self-saves left, don't allow selection
                if (doctorPlayer && this.dataset.playerId === doctorPlayer.id) {
                    alert("You have no self-saves remaining!");
                    return;
                }
            }
            
            // Deselect all cards
            playerCards.forEach(c => c.style.border = '2px solid transparent');
            
            // Select this card
            this.style.border = '2px solid var(--primary-color)';
            selectedTarget = this.dataset.playerId;
            
            // Enable confirm button
            document.getElementById('modal-confirm-btn').disabled = false;
        });
    });
    
    // Add event listeners to modal buttons
    document.getElementById('modal-cancel-btn').addEventListener('click', function() {
        document.body.removeChild(modalElement);
        selectedTarget = null;
    });
    
    document.getElementById('modal-confirm-btn').addEventListener('click', function() {
        if (selectedTarget) {
            // Store the action result
            const targetPlayer = gameState.players.find(p => p.id === selectedTarget);
            
            if (targetPlayer) {
                nightActionResults[roleType] = {
                    targetId: targetPlayer.id,
                    targetName: targetPlayer.name,
                    action: roleType
                };
                
                // Check if Doctor is protecting themselves and decrement self-saves
                if (roleType === 'doctor') {
                    const doctorPlayer = alivePlayers.find(p => p.role === 'doctor');
                    if (doctorPlayer && targetPlayer.id === doctorPlayer.id) {
                        // Doctor is protecting themselves, decrement self-saves
                        gameState.doctorSelfSaves--;
                        localStorage.setItem('gameState', JSON.stringify(gameState));
                        
                        // Update the display
                        const selfSavesCount = document.getElementById('doctor-self-saves-count');
                        if (selfSavesCount) {
                            selfSavesCount.textContent = gameState.doctorSelfSaves;
                            
                            // Change color based on remaining self-saves
                            if (gameState.doctorSelfSaves === 0) {
                                selfSavesCount.style.color = 'var(--mafia-color, #e53935)';
                                document.getElementById('doctor-self-saves').innerHTML += `
                                    <p class="warning-text" style="color:var(--warning-color, #ff9800)">
                                        Doctor can no longer protect themselves!
                                    </p>
                                `;
                            } else if (gameState.doctorSelfSaves === 1) {
                                selfSavesCount.style.color = 'var(--warning-color, #ff9800)';
                            }
                        }
                    }
                }
                
                // Show feedback that the action was recorded
                alert(`${modalTitle} action recorded for ${targetPlayer.name}.`);
            }
        }
        
        document.body.removeChild(modalElement);
        selectedTarget = null;
    });
}

// Reveal night results
function revealNightResults() {
    // Check if any actions were taken
    if (Object.keys(nightActionResults).length === 0) {
        alert('No night actions were recorded.');
        return;
    }
    
    // Determine night outcomes
    // (In a real game, this would have complex logic for determining
    // the interactions between mafia kills, doctor saves, etc.)
    
    // For this demo, we'll just show the actions taken
    const nightResultsElement = document.getElementById('night-results-content');
    let resultsHtml = `<div class="night-actions-summary">`;
    
    // Show mafia target
    if (nightActionResults.mafia) {
        const target = nightActionResults.mafia;
        resultsHtml += `
            <div class="action-result mafia">
                <h4>Mafia chose to eliminate:</h4>
                <p>${target.targetName}</p>
            </div>
        `;
        
        // Add the player to eliminatedPlayers in gameState
        // (unless saved by the doctor)
        const wasSaved = nightActionResults.doctor && 
                          nightActionResults.doctor.targetId === target.targetId;
        
        if (!wasSaved) {
            if (!gameState.eliminatedPlayers) {
                gameState.eliminatedPlayers = [];
            }
            
            // Check if already eliminated
            if (!gameState.eliminatedPlayers.some(p => p.id === target.targetId)) {
                const player = gameState.players.find(p => p.id === target.targetId);
                if (player) {
                    gameState.eliminatedPlayers.push({
                        id: player.id,
                        name: player.name,
                        role: player.role,
                        eliminatedInRound: gameState.currentRound,
                        eliminatedInPhase: 'night'
                    });
                }
            }
        }
    }
    
    // Show doctor protection
    if (nightActionResults.doctor) {
        const target = nightActionResults.doctor;
        resultsHtml += `
            <div class="action-result doctor">
                <h4>Doctor chose to protect:</h4>
                <p>${target.targetName}</p>
            </div>
        `;
        
        // If doctor protected the mafia's target, show that
        if (nightActionResults.mafia && 
            nightActionResults.mafia.targetId === target.targetId) {
            resultsHtml += `
                <div class="action-result save">
                    <h4>Doctor saved ${target.targetName} from elimination!</h4>
                </div>
            `;
        }
    }
    
    // Show detective investigation
    if (nightActionResults.detective) {
        const target = nightActionResults.detective;
        const player = gameState.players.find(p => p.id === target.targetId);
        
        let investigationResult = "Citizen";
        if (player) {
            const role = getRoleById(player.role);
            if (role && role.team === 'mafia') {
                investigationResult = "Mafia";
            }
        }
        
        resultsHtml += `
            <div class="action-result detective">
                <h4>Detective investigated:</h4>
                <p>${target.targetName}</p>
                <p>Result: <strong>${investigationResult}</strong></p>
            </div>
        `;
    }
    
    // Add other special actions if any
    if (nightActionResults.special) {
        const target = nightActionResults.special;
        resultsHtml += `
            <div class="action-result special">
                <h4>Special ability was used on:</h4>
                <p>${target.targetName}</p>
            </div>
        `;
    }
    
    // Add Zodiac action if any
    if (nightActionResults.zodiac) {
        const target = nightActionResults.zodiac;
        resultsHtml += `
            <div class="action-result zodiac">
                <h4>Zodiac chose to eliminate:</h4>
                <p>${target.targetName}</p>
            </div>
        `;
        
        // Special handling for Bodyguard (Zodiac dies if targeting Bodyguard)
        const targetPlayer = gameState.players.find(p => p.id === target.targetId);
        if (targetPlayer && targetPlayer.role === 'bodyguard') {
            // Zodiac dies instead
            resultsHtml += `
                <div class="action-result danger">
                    <h4>The Bodyguard protected themselves!</h4>
                    <p>The Zodiac was eliminated instead.</p>
                </div>
            `;
            
            // Find the Zodiac player to mark as eliminated
            const zodiacPlayer = gameState.players.find(p => p.role === 'zodiac');
            if (zodiacPlayer) {
                // Check if eliminatedPlayers exists, if not create it
                if (!gameState.eliminatedPlayers) {
                    gameState.eliminatedPlayers = [];
                }
                
                // Add Zodiac to eliminated players if not already there
                const alreadyEliminated = gameState.eliminatedPlayers.some(
                    p => p.id === zodiacPlayer.id
                );
                
                if (!alreadyEliminated) {
                    gameState.eliminatedPlayers.push({
                        id: zodiacPlayer.id,
                        name: zodiacPlayer.name,
                        role: 'zodiac',
                        eliminatedBy: 'bodyguard',
                        round: gameState.currentRound
                    });
                    
                    // Save the updated game state
                    localStorage.setItem('gameState', JSON.stringify(gameState));
                }
            }
        } else {
            // If not targeting Bodyguard, check for protection by Doctor
            if (nightActionResults.doctor && 
                nightActionResults.doctor.targetId === target.targetId) {
                resultsHtml += `
                    <div class="action-result save">
                        <h4>Doctor saved ${target.targetName} from Zodiac's elimination!</h4>
                    </div>
                `;
            } else {
                // Target is eliminated (if not immune)
                // Check if target is immune (Zodiac is immune to Mafia and Professional)
                if (targetPlayer && (targetPlayer.role === 'professional' || targetPlayer.role === 'regular_mafia' || 
                    targetPlayer.role === 'godfather' || targetPlayer.role === 'bomber' || 
                    targetPlayer.role === 'magician')) {
                    // Target was not eliminated
                    resultsHtml += `
                        <div class="action-result warning">
                            <h4>${target.targetName} was not affected!</h4>
                        </div>
                    `;
                } else {
                    // Check if eliminatedPlayers exists, if not create it
                    if (!gameState.eliminatedPlayers) {
                        gameState.eliminatedPlayers = [];
                    }
                    
                    // Add target to eliminated players if not already there
                    const alreadyEliminated = gameState.eliminatedPlayers.some(
                        p => p.id === target.targetId
                    );
                    
                    if (!alreadyEliminated && targetPlayer) {
                        gameState.eliminatedPlayers.push({
                            id: targetPlayer.id,
                            name: targetPlayer.name,
                            role: targetPlayer.role,
                            eliminatedBy: 'zodiac',
                            round: gameState.currentRound
                        });
                        
                        // Save the updated game state
                        localStorage.setItem('gameState', JSON.stringify(gameState));
                        
                        resultsHtml += `
                            <div class="action-result danger">
                                <h4>${target.targetName} was eliminated by the Zodiac!</h4>
                            </div>
                        `;
                    }
                }
            }
        }
    }
    
    resultsHtml += `</div>`;
    
    // Show the results
    nightResultsElement.innerHTML = resultsHtml;
    document.getElementById('night-result').style.display = 'block';
    
    // Save updated gameState
    localStorage.setItem('gameState', JSON.stringify(gameState));
    
    // Enable next phase button
    document.getElementById('next-phase-btn').disabled = false;
    
    // Disable the reveal results button
    document.getElementById('reveal-results-btn').disabled = true;
}

// Go to the next phase
function goToNextPhase() {
    // Before proceeding, check game-ending conditions
    if (checkGameOver()) {
        // If game is over, redirect to game-over page
        window.location.href = 'game-over.html';
        return;
    }
    
    // Increment round counter and go to day phase
    gameState.currentRound++;
    gameState.gamePhase = 'day';
    localStorage.setItem('gameState', JSON.stringify(gameState));
    
    // Redirect to day phase
    window.location.href = 'day-phase.html';
}

// Check if game is over
function checkGameOver() {
    const alivePlayers = getAlivePlayers();
    
    // Check if all mafia and independent (zodiac) players are eliminated
    const mafiaAlive = alivePlayers.some(p => 
        p.role === 'godfather' || p.role === 'regular_mafia' || 
        p.role === 'magician' || p.role === 'bomber'
    );
    
    const zodiacAlive = alivePlayers.some(p => p.role === 'zodiac');
    
    // If no mafia and no zodiac alive, town wins
    if (!mafiaAlive && !zodiacAlive) {
        // Set game over state
        gameState.gameOver = true;
        gameState.winner = 'town';
        gameState.winReason = 'All Mafia and Zodiac players have been eliminated!';
        localStorage.setItem('gameState', JSON.stringify(gameState));
        return true;
    }
    
    // Check if only mafia remain
    const townAlive = alivePlayers.some(p => 
        p.role === 'citizen' || p.role === 'detective' || 
        p.role === 'doctor' || p.role === 'bodyguard' || 
        p.role === 'professional' || p.role === 'gunman' || 
        p.role === 'ocean'
    );
    
    if (mafiaAlive && !townAlive && !zodiacAlive) {
        // Mafia wins
        gameState.gameOver = true;
        gameState.winner = 'mafia';
        gameState.winReason = 'All Town members have been eliminated!';
        localStorage.setItem('gameState', JSON.stringify(gameState));
        return true;
    }
    
    // Check if only zodiac remains with 1 other player
    if (zodiacAlive && alivePlayers.length <= 2) {
        // Zodiac wins
        gameState.gameOver = true;
        gameState.winner = 'zodiac';
        gameState.winReason = 'Zodiac is one of the last two players alive!';
        localStorage.setItem('gameState', JSON.stringify(gameState));
        return true;
    }
    
    // Game is not over
    return false;
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

// Helper function to get role by ID (wrapper for the global function)
function getRoleById(roleId) {
    if (typeof window.getRoleById === 'function') {
        return window.getRoleById(roleId);
    }
    
    // Fallback logic if global function doesn't exist
    const defaultRoles = {
        'citizen': { id: 'citizen', name: 'Citizen', team: 'citizen' },
        'mafia': { id: 'mafia', name: 'Mafia', team: 'mafia' },
        'regular_mafia': { id: 'regular_mafia', name: 'Mafia', team: 'mafia' },
        'godfather': { id: 'godfather', name: 'Godfather', team: 'mafia' },
        'detective': { id: 'detective', name: 'Detective', team: 'citizen' },
        'doctor': { id: 'doctor', name: 'Doctor', team: 'citizen' },
        'zodiac': { id: 'zodiac', name: 'Zodiac', team: 'independent' }
    };
    
    return defaultRoles[roleId];
}

// Function to check if Zodiac can act on the current night
function canZodiacActTonight() {
    // Zodiac can act every odd night (1, 3, 5, etc.)
    return gameState.currentRound % 2 === 1;
}

// Update non-Mafia role sections based on game setup
function updateNonMafiaRoleSections() {
    const allPlayers = gameState.players || [];
    const alivePlayers = getAlivePlayers();
    
    // List of roles to check
    const rolesToCheck = [
        { id: 'detective', elementId: 'detective-call' },
        { id: 'doctor', elementId: 'doctor-call' },
        { id: 'professional', elementId: 'professional-call' },
        { id: 'gunman', elementId: 'gunman-call' },
        { id: 'ocean', elementId: 'ocean-call' },
        { id: 'zodiac', elementId: 'zodiac-call' }
    ];
    
    rolesToCheck.forEach(role => {
        // Check if role exists in game setup
        const roleExists = allPlayers.some(p => p.role === role.id);
        const roleAlive = alivePlayers.some(p => p.role === role.id);
        
        const roleSection = document.getElementById(role.elementId);
        if (roleSection) {
            // Special case for Professional - check if bullets are used up
            if (role.id === 'professional') {
                // ... existing professional code ...
            }
            
            // Special case for Doctor - check if self-saves are used up
            if (role.id === 'doctor') {
                // Add self-saves counter to doctor section
                const doctorStatus = document.getElementById('doctor-status');
                if (doctorStatus) {
                    // Get the doctor player
                    const doctorPlayer = alivePlayers.find(p => p.role === 'doctor');
                    
                    // Add self-saves counter
                    const selfSavesCounter = document.createElement('div');
                    selfSavesCounter.id = 'doctor-self-saves';
                    selfSavesCounter.className = 'action-result';
                    selfSavesCounter.innerHTML = `
                        <p><strong>Self-saves remaining:</strong> <span id="doctor-self-saves-count">${gameState.doctorSelfSaves}</span></p>
                    `;
                    
                    // Check if counter already exists
                    if (!document.getElementById('doctor-self-saves')) {
                        doctorStatus.insertAdjacentElement('afterend', selfSavesCounter);
                    } else {
                        // Update existing counter
                        document.getElementById('doctor-self-saves-count').textContent = gameState.doctorSelfSaves;
                    }
                    
                    // Change color based on remaining self-saves
                    const selfSavesCount = document.getElementById('doctor-self-saves-count');
                    if (selfSavesCount) {
                        if (gameState.doctorSelfSaves === 0) {
                            selfSavesCount.style.color = 'var(--mafia-color, #e53935)';
                            selfSavesCounter.innerHTML += `
                                <p class="warning-text" style="color:var(--warning-color, #ff9800)">
                                    Doctor can no longer protect themselves!
                                </p>
                            `;
                        } else if (gameState.doctorSelfSaves === 1) {
                            selfSavesCount.style.color = 'var(--warning-color, #ff9800)';
                        } else {
                            selfSavesCount.style.color = 'var(--success-color, #4caf50)';
                        }
                    }
                    
                    // Disable self-selection for Doctor if no self-saves remaining
                    if (gameState.doctorSelfSaves === 0 && doctorPlayer) {
                        const doctorPlayerCard = document.querySelector(`.player-card[data-player-id="${doctorPlayer.id}"]`);
                        if (doctorPlayerCard) {
                            doctorPlayerCard.classList.add('disabled');
                            doctorPlayerCard.title = "No self-saves remaining";
                        }
                    }
                }
            }
            
            // Special case for Zodiac - check if they can act tonight
            if (role.id === 'zodiac') {
                const canAct = canZodiacActTonight();
                const zodiacCanActValue = document.getElementById('zodiac-can-act-value');
                if (zodiacCanActValue) {
                    zodiacCanActValue.textContent = canAct ? 'Yes' : 'No';
                    zodiacCanActValue.style.color = canAct ? 'var(--success-color, #4caf50)' : 'var(--warning-color, #ff9800)';
                }
                
                // Show/hide action button based on whether Zodiac can act
                const zodiacActionBtn = document.getElementById('zodiac-action-btn');
                if (zodiacActionBtn) {
                    zodiacActionBtn.disabled = !canAct;
                    zodiacActionBtn.style.opacity = canAct ? '1' : '0.5';
                    if (!canAct) {
                        zodiacActionBtn.title = "Zodiac can only act on odd-numbered nights (1, 3, 5, etc.)";
                    } else {
                        zodiacActionBtn.title = "";
                    }
                }
            }
            
            // Only show the section if the role exists in the game and the player is still alive
            if (roleExists && roleAlive) {
                roleSection.style.display = 'block';
            } else {
                roleSection.style.display = 'none';
            }
        }
    });
}

// Update Mafia role sections based on game setup
function updateMafiaRoleSections() {
    const allPlayers = gameState.players || [];
    const alivePlayers = getAlivePlayers();
    
    // Check if any Mafia roles exist in the game
    const mafiaExists = allPlayers.some(p => 
        p.role === 'godfather' || p.role === 'regular_mafia' || 
        p.role === 'magician' || p.role === 'bomber'
    );
    
    // Check if any Mafia roles are still alive
    const mafiaAlive = alivePlayers.some(p => 
        p.role === 'godfather' || p.role === 'regular_mafia' || 
        p.role === 'magician' || p.role === 'bomber'
    );
    
    // Show or hide the Mafia call section
    const mafiaCall = document.getElementById('mafia-call');
    if (mafiaCall) {
        if (mafiaExists && mafiaAlive) {
            mafiaCall.style.display = 'block';
            
            // Show or hide specific Mafia role sections
            const godfatherAction = document.getElementById('godfather-action');
            const magicianAction = document.getElementById('magician-action');
            const bomberAction = document.getElementById('bomber-action');
            
            // Godfather section
            if (godfatherAction) {
                const godfatherExists = allPlayers.some(p => p.role === 'godfather');
                const godfatherAlive = alivePlayers.some(p => p.role === 'godfather');
                godfatherAction.style.display = (godfatherExists && godfatherAlive) ? 'block' : 'none';
            }
            
            // Magician section
            if (magicianAction) {
                const magicianExists = allPlayers.some(p => p.role === 'magician');
                const magicianAlive = alivePlayers.some(p => p.role === 'magician');
                magicianAction.style.display = (magicianExists && magicianAlive) ? 'block' : 'none';
            }
            
            // Bomber section
            if (bomberAction) {
                const bomberExists = allPlayers.some(p => p.role === 'bomber');
                const bomberAlive = alivePlayers.some(p => p.role === 'bomber');
                const hasBombs = gameState.bomberBombs > 0;
                
                // Update the bomber bombs count display
                const bomberBombsCount = document.getElementById('bomber-bombs-count');
                if (bomberBombsCount) {
                    bomberBombsCount.textContent = gameState.bomberBombs;
                    // Change color based on available bombs
                    bomberBombsCount.style.color = hasBombs ? 
                        'var(--success-color, #4caf50)' : 'var(--warning-color, #ff9800)';
                }
                
                // Disable bomber player selection and code selection if no bombs left
                const bomberPlayers = document.getElementById('bomber-players');
                const bomberCode = document.getElementById('bomber-code');
                
                if (!hasBombs) {
                    // Add warning message if bomber has no bombs left
                    const bomberBombsRemaining = document.getElementById('bomber-bombs-remaining');
                    if (bomberBombsRemaining) {
                        bomberBombsRemaining.classList.add('warning');
                        bomberBombsRemaining.innerHTML = `
                            <p><strong>Bombs remaining:</strong> <span style="color:var(--warning-color, #ff9800)">0</span></p>
                            <p class="danger-text" style="color:var(--mafia-color, #e53935)">No bombs left to use!</p>
                        `;
                    }
                    
                    // Disable bomber player selection
                    if (bomberPlayers) {
                        bomberPlayers.classList.add('disabled');
                        bomberPlayers.style.opacity = '0.5';
                        bomberPlayers.style.pointerEvents = 'none';
                    }
                    
                    // Disable bomber code selection
                    if (bomberCode) {
                        bomberCode.classList.add('disabled');
                        bomberCode.style.opacity = '0.5';
                        bomberCode.style.pointerEvents = 'none';
                    }
                }
                
                bomberAction.style.display = (bomberExists && bomberAlive) ? 'block' : 'none';
            }
        } else {
            mafiaCall.style.display = 'none';
        }
    }
}

// Validate bomber target and code selections
function validateBomberSelections() {
    const mafiaDoneBtn = document.getElementById('mafia-action-btn');
    const bomberTarget = nightState.actions.mafia.bomber.target;
    const bomberCode = nightState.actions.mafia.bomber.code;
    
    // Check if the bomber is trying to place a bomb
    if (bomberTarget) {
        // If bomber has a target, they must also select a code
        if (!bomberCode) {
            // Show error message
            alert("You must select a code for the bomb!");
            return false;
        }
        
        // Check if the bomber has bombs left
        if (gameState.bomberBombs <= 0) {
            alert("The Bomber has no bombs left to use!");
            return false;
        }
        
        // Decrement the bomber's bomb count
        gameState.bomberBombs--;
        localStorage.setItem('gameState', JSON.stringify(gameState));
        
        // Update the bomber bombs count display
        const bomberBombsCount = document.getElementById('bomber-bombs-count');
        if (bomberBombsCount) {
            bomberBombsCount.textContent = gameState.bomberBombs;
            // Change color based on available bombs
            bomberBombsCount.style.color = gameState.bomberBombs > 0 ? 
                'var(--success-color, #4caf50)' : 'var(--warning-color, #ff9800)';
        }
        
        // Disable bomber player selection and code selection if no bombs left
        if (gameState.bomberBombs <= 0) {
            // Add warning message if bomber has no bombs left
            const bomberBombsRemaining = document.getElementById('bomber-bombs-remaining');
            if (bomberBombsRemaining) {
                bomberBombsRemaining.classList.add('warning');
                bomberBombsRemaining.innerHTML = `
                    <p><strong>Bombs remaining:</strong> <span style="color:var(--warning-color, #ff9800)">0</span></p>
                    <p class="danger-text" style="color:var(--mafia-color, #e53935)">No bombs left to use!</p>
                `;
            }
            
            // Disable bomber player selection
            const bomberPlayers = document.getElementById('bomber-players');
            if (bomberPlayers) {
                bomberPlayers.classList.add('disabled');
                bomberPlayers.style.opacity = '0.5';
                bomberPlayers.style.pointerEvents = 'none';
            }
            
            // Disable bomber code selection
            const bomberCode = document.getElementById('bomber-code');
            if (bomberCode) {
                bomberCode.classList.add('disabled');
                bomberCode.style.opacity = '0.5';
                bomberCode.style.pointerEvents = 'none';
            }
        }
    }
    
    return true;
} 