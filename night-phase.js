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
    if (!gameState) return;
    
    // Update game state to next phase (day) and increment round
    gameState.gamePhase = 'day';
    gameState.currentRound++;
    localStorage.setItem('gameState', JSON.stringify(gameState));
    
    // Redirect to the day phase page
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