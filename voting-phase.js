// Global variables
let gameState = null;
let selectedPlayer = null;

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    console.log("Voting Phase page loaded");
    
    // Wait for database manager to initialize
    console.log("Waiting for database initialization...");
    await waitForDatabaseInit();
    
    // Load game state from localStorage
    loadGameState();
    
    // Set up event listeners
    document.getElementById('next-phase-btn').addEventListener('click', goToNextPhase);
    document.getElementById('reveal-votes-btn').addEventListener('click', revealVotes);
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
            
            // If game phase isn't set to voting, update it
            if (gameState.gamePhase !== 'voting') {
                gameState.gamePhase = 'voting';
                localStorage.setItem('gameState', JSON.stringify(gameState));
            }
            
            // Update page subtitle
            document.getElementById('voting-phase-subtitle').textContent = `Voting Phase - Round ${gameState.currentRound}`;
            
            // Update game status display
            updateGameStatus();
            
            // Display voting players
            displayVotingPlayers();
            
            // Initially disable next phase button until voting is complete
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
            document.getElementById('reveal-votes-btn').disabled = true;
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
        <div><strong>Current Phase:</strong> Voting Phase</div>
        <div><strong>Round:</strong> ${gameState.currentRound}</div>
        <div><strong>Players Alive:</strong> ${getAlivePlayers().length} / ${gameState.players.length}</div>
    `;
}

// Display players for voting
function displayVotingPlayers() {
    if (!gameState || !gameState.players) return;
    
    const alivePlayers = getAlivePlayers();
    const votingPlayersElement = document.getElementById('voting-players');
    
    // Sort players by sequence if available
    const sortedPlayers = [...alivePlayers].sort((a, b) => {
        const seqA = a.sequence !== undefined ? a.sequence : 9999;
        const seqB = b.sequence !== undefined ? b.sequence : 9999;
        return seqA - seqB;
    });
    
    let playersHtml = ``;
    
    sortedPlayers.forEach(player => {
        playersHtml += `
            <div class="player-card votable" data-player-id="${player.id}">
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
    
    votingPlayersElement.innerHTML = playersHtml;
    
    // Add click event listeners to the player cards
    document.querySelectorAll('.player-card.votable').forEach(card => {
        card.addEventListener('click', function() {
            // Remove selected class from all cards
            document.querySelectorAll('.player-card.votable').forEach(c => {
                c.classList.remove('selected');
            });
            
            // Add selected class to this card
            this.classList.add('selected');
            
            // Store the selected player ID
            selectedPlayer = this.dataset.playerId;
        });
    });
}

// Reveal voting results
function revealVotes() {
    if (!selectedPlayer) {
        alert('Please select a player to eliminate first.');
        return;
    }
    
    // Find the selected player
    const player = gameState.players.find(p => p.id === selectedPlayer);
    if (!player) {
        alert('Selected player not found.');
        return;
    }
    
    // Show voting results
    const votingResultsElement = document.getElementById('voting-results-content');
    const roleInfo = getRoleInfo(player.role);
    
    votingResultsElement.innerHTML = `
        <div class="eliminated-player">
            <div class="player-card large">
                <div class="player-image">
                    <img src="${player.photo_url || 'images/default-avatar.svg'}" 
                         alt="${player.name}" 
                         onerror="this.src='images/default-avatar.svg'">
                </div>
                <div class="player-info">
                    <h3>${player.name}</h3>
                    <p>has been eliminated</p>
                </div>
            </div>
            <div class="revealed-role">
                <h4>Revealed Role: ${roleInfo.name}</h4>
                <p>${roleInfo.description}</p>
            </div>
        </div>
    `;
    
    document.getElementById('voting-result').style.display = 'block';
    
    // Add the player to eliminatedPlayers in gameState
    if (!gameState.eliminatedPlayers) {
        gameState.eliminatedPlayers = [];
    }
    
    gameState.eliminatedPlayers.push({
        id: player.id,
        name: player.name,
        role: player.role,
        eliminatedInRound: gameState.currentRound,
        eliminatedInPhase: 'voting'
    });
    
    // Save updated gameState
    localStorage.setItem('gameState', JSON.stringify(gameState));
    
    // Enable next phase button
    document.getElementById('next-phase-btn').disabled = false;
    
    // Disable the reveal votes button
    document.getElementById('reveal-votes-btn').disabled = true;
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
    
    // Increment round counter for night phase - needed here to ensure proper round numbering
    if (gameState.currentRound === 0) {
        // Going from Round 0 to Round 1
        gameState.currentRound = 1;
    }
    
    // Update game phase
    gameState.gamePhase = 'night';
    
    // Determine if this will be the second introductory night
    // This happens after the first voting phase in Round 1
    // and we haven't had a second intro night yet
    if (gameState.currentRound === 1 && !gameState.hadSecondIntroNight) {
        // Set up for second introductory night with Mafia timer
        gameState.isSecondIntroNight = true;
    }
    
    localStorage.setItem('gameState', JSON.stringify(gameState));
    
    // Redirect to the night phase
    window.location.href = 'night-phase.html';
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

// Helper function to get role information
function getRoleInfo(roleId) {
    // Try to get the role info from the ROLES array (from roles.js)
    if (typeof getRoleById === 'function') {
        const role = getRoleById(roleId);
        if (role) {
            return {
                name: role.name,
                description: role.description,
                image: role.image
            };
        }
    }
    
    // Fallback to hardcoded roles if getRoleById is not available
    const roleInfo = {
        mafia: {
            name: 'Mafia',
            description: 'Eliminate citizens without being caught. You know who the other mafia members are.',
            image: 'images/roles/mafia.png'
        },
        detective: {
            name: 'Detective',
            description: 'Investigate one player each night to determine if they are mafia.',
            image: 'images/roles/detective.png'
        },
        doctor: {
            name: 'Doctor',
            description: 'Save one player each night from being eliminated by the mafia.',
            image: 'images/roles/doctor.png'
        },
        citizen: {
            name: 'Citizen',
            description: 'Work with other players to identify the mafia during the day.',
            image: 'images/roles/citizen.png'
        }
    };
    
    return roleInfo[roleId] || {
        name: roleId.charAt(0).toUpperCase() + roleId.slice(1),
        description: 'This role is not defined in detail.',
        image: 'images/default-avatar.svg'
    };
} 