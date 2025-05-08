// Global variables
let selectedPlayers = [];
let totalPlayers = 0;
let customRoles = []; // Store custom role selection

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    console.log("Role selection page loaded");
    
    // Check for Supabase client
    if (!window.supabase) {
        console.error("Supabase client not initialized");
        document.getElementById('role-validation-message').textContent = 
            "Error: Database connection not available";
        return;
    }
    
    // Wait for database manager to initialize
    console.log("Waiting for database initialization...");
    await waitForDatabaseInit();
    
    // Load selected players from localStorage
    loadSelectedPlayers();
    
    // Check for customized roles
    loadCustomRoles();
    
    // Set up event listeners (only for assign roles button)
    document.getElementById('assign-roles-btn').addEventListener('click', assignRoles);
    document.getElementById('edit-roles-btn').addEventListener('click', navigateToRoleCustomize);
    
    // Initial calculation of role distribution
    updateRoleDistribution();
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

// Load selected players from localStorage
function loadSelectedPlayers() {
    try {
        const storedPlayers = localStorage.getItem('selectedPlayers');
        if (storedPlayers) {
            // Parse and normalize player data to ensure consistent field names
            const parsedPlayers = JSON.parse(storedPlayers);
            selectedPlayers = parsedPlayers.map(normalizePlayerData);
            
            // Sort players by sequence if available
            selectedPlayers.sort((a, b) => {
                const seqA = a.sequence !== undefined ? a.sequence : 9999;
                const seqB = b.sequence !== undefined ? b.sequence : 9999;
                return seqA - seqB;
            });
            
            totalPlayers = selectedPlayers.length;
            document.getElementById('total-players').textContent = totalPlayers;
            displaySelectedPlayers();
        } else {
            console.warn("No selected players found in localStorage");
            document.getElementById('role-validation-message').textContent = 
                "No players selected. Please go back and select players.";
            document.getElementById('assign-roles-btn').disabled = true;
        }
    } catch (error) {
        console.error("Error loading selected players:", error);
        document.getElementById('role-validation-message').textContent = 
            "Error loading selected players. Please try again.";
    }
}

// Load custom roles if available
function loadCustomRoles() {
    try {
        const storedRoles = localStorage.getItem('customizedRoles');
        if (storedRoles) {
            customRoles = JSON.parse(storedRoles);
            console.log("Loaded custom roles:", customRoles);
            
            // Validate the number of custom roles matches the player count
            if (customRoles.length !== totalPlayers) {
                console.warn("Custom roles count doesn't match player count. Reverting to default roles.");
                customRoles = [];
            }
        }
    } catch (error) {
        console.error("Error loading custom roles:", error);
        customRoles = [];
    }
}

// Normalize player data to ensure consistent field names
function normalizePlayerData(player) {
    if (!player) return null;
    
    const normalizedPlayer = { ...player };
    
    // Ensure name fields are set correctly
    normalizedPlayer.full_name = player.full_name || player.name || player.player_name || 'Unknown Player';
    normalizedPlayer.name = normalizedPlayer.full_name; // For backward compatibility
    
    // Ensure username/id is set correctly
    normalizedPlayer.username = player.username || player.user_name || player.id || 'unknown';
    normalizedPlayer.id = normalizedPlayer.username; // For backward compatibility
    
    // Ensure photo fields are set correctly
    normalizedPlayer.photo = player.photo || player.photoUrl || player.avatar || player.photo_url || 'images/default-avatar.svg';
    normalizedPlayer.photo_url = normalizedPlayer.photo; // For backward compatibility
    
    return normalizedPlayer;
}

// Navigate to role customization page
function navigateToRoleCustomize() {
    window.location.href = 'role-customize.html';
}

// Display selected players in the UI
function displaySelectedPlayers() {
    const playersList = document.getElementById('selected-players-list');
    playersList.innerHTML = '';
    
    // Make sure all players are normalized
    selectedPlayers = selectedPlayers.map(normalizePlayerData).filter(p => p !== null);
    
    // Sort players by sequence before displaying
    selectedPlayers.sort((a, b) => {
        const seqA = a.sequence !== undefined ? a.sequence : 9999;
        const seqB = b.sequence !== undefined ? b.sequence : 9999;
        return seqA - seqB;
    });
    
    selectedPlayers.forEach((player, index) => {
        const playerCard = document.createElement('div');
        playerCard.className = 'player-card';
        playerCard.dataset.id = player.id;
        playerCard.dataset.sequence = player.sequence !== undefined ? player.sequence : index + 1;
        
        const imgSrc = player.photo || 'images/default-avatar.svg';
        
        playerCard.innerHTML = `
            <div class="player-container">
                <div class="player-image">
                    <img src="${imgSrc}" alt="${player.full_name}" onerror="this.src='images/default-avatar.svg'">
                </div>
                <div class="player-info">
                    <h3 class="player-name">${player.full_name}</h3>
                    <p class="player-sequence">Sequence: ${playerCard.dataset.sequence}</p>
                </div>
            </div>
        `;
        
        playersList.appendChild(playerCard);
    });

    // Save selected players to localStorage whenever they are changed
    saveSelectedPlayers();

    // After displaySelectedPlayers() in loadSelectedPlayers, also save to previousSelectedPlayers
    localStorage.setItem('previousSelectedPlayers', JSON.stringify(selectedPlayers));

    // On page load, if previousSelectedPlayers exists and selectedPlayers is empty, use it
    if ((!selectedPlayers || selectedPlayers.length === 0) && localStorage.getItem('previousSelectedPlayers')) {
        const previousPlayers = JSON.parse(localStorage.getItem('previousSelectedPlayers'));
        selectedPlayers = previousPlayers.map(normalizePlayerData).filter(p => p !== null);
        
        // Sort by sequence
        selectedPlayers.sort((a, b) => {
            const seqA = a.sequence !== undefined ? a.sequence : 9999;
            const seqB = b.sequence !== undefined ? b.sequence : 9999;
            return seqA - seqB;
        });
        
        totalPlayers = selectedPlayers.length;
        document.getElementById('total-players').textContent = totalPlayers;
        displaySelectedPlayers();
    }
}

// Update role distribution based on input values
function updateRoleDistribution() {
    // Only display current roles
    displayCurrentRoles();
    // Validate roles
    validateRoles();
}

// Updated validateRoles to only check player count
function validateRoles() {
    const validationMsg = document.getElementById('role-validation-message');
    const assignButton = document.getElementById('assign-roles-btn');
    
    if (totalPlayers < 5) {
        validationMsg.textContent = "Not enough players. Select at least 5 players.";
        validationMsg.className = "error";
        assignButton.disabled = true;
        return false;
    }
    
    validationMsg.textContent = "Role distribution is valid.";
    validationMsg.className = "success";
    assignButton.disabled = false;
    return true;
}

// Show current roles that will be assigned
function displayCurrentRoles() {
    let rolesList;
    
    // Use custom roles if available, otherwise use enabled roles
    if (customRoles && customRoles.length === totalPlayers) {
        rolesList = customRoles;
    } else {
        rolesList = (typeof getEnabledRoles === 'function' ? getEnabledRoles() : []);
        
        // Apply default role selection logic if no custom roles
        // Remove roles in the specified order if fewer than 12 players
        const removalOrder = [
            'zodiac',
            'citizen',
            'ocean',
            'gunman',
            'bomber',
            'bodyguard',
            'magician'
        ];
        let tempRoles = [...rolesList];
        if (totalPlayers < 12) {
            for (let i = 0; tempRoles.length > totalPlayers && i < removalOrder.length; i++) {
                const roleToRemove = tempRoles.findIndex(r => r.id === removalOrder[i]);
                if (roleToRemove !== -1) {
                    tempRoles.splice(roleToRemove, 1);
                }
            }
            while (tempRoles.length > totalPlayers) {
                tempRoles.pop();
            }
        } else {
            tempRoles = tempRoles.slice(0, totalPlayers);
        }
        rolesList = tempRoles;
    }
    
    const rolesContainer = document.getElementById('current-roles-list');
    if (!rolesList || !Array.isArray(rolesList) || rolesList.length === 0) {
        if (rolesContainer) {
            rolesContainer.innerHTML = "<div style='color:#888;padding:1rem;'>No roles available. Please check your roles configuration.</div>";
        }
        console.warn("No roles available for assignment. Check if roles.js is loaded and getEnabledRoles is defined.");
        return;
    }
    
    // Render roles
    if (rolesContainer) {
        rolesContainer.innerHTML = rolesList.map(role => 
            `<div class='role-card' data-team='${role.team}'>
                <div class="role-image-container">
                    <img src='${role.image}' alt='${role.name}'>
                </div>
                <h4>${role.name}</h4>
            </div>`
        ).join('');
    }
}

// Save selected players to localStorage whenever they are changed
function saveSelectedPlayers() {
    // Make sure all players are normalized before saving
    const normalizedPlayers = selectedPlayers.map(normalizePlayerData).filter(p => p !== null);
    localStorage.setItem('selectedPlayers', JSON.stringify(normalizedPlayers));
}

// Assign roles to players and advance to game page
function assignRoles() {
    if (!validateRoles()) {
        return;
    }

    if (totalPlayers < 5) {
        document.getElementById('role-validation-message').textContent =
            "Not enough players. Select at least 5 players.";
        return;
    }

    try {
        // Make sure all players are normalized
        selectedPlayers = selectedPlayers.map(normalizePlayerData).filter(p => p !== null);
        
        // Ensure players are sorted by sequence
        selectedPlayers.sort((a, b) => {
            const seqA = a.sequence !== undefined ? a.sequence : 9999;
            const seqB = b.sequence !== undefined ? b.sequence : 9999;
            return seqA - seqB;
        });
        
        let rolesToAssign;
        
        // Use custom roles if available, otherwise use enabled roles
        if (customRoles && customRoles.length === totalPlayers) {
            rolesToAssign = [...customRoles];
        } else {
            // Always use getEnabledRoles() from roles.js
            let rolesList = (typeof getEnabledRoles === 'function' ? getEnabledRoles() : []);
            // Defensive: fallback to empty array if not found
            if (!rolesList || !Array.isArray(rolesList)) rolesList = [];
            // Ensure there are enough roles (add extra citizens if needed)
            while (rolesList.length < totalPlayers) {
                const citizenRole = rolesList.find(r => r.id === 'citizen');
                if (citizenRole) rolesList.push(citizenRole);
                else break;
            }
            // Remove roles in the specified order if fewer than 12 players
            const removalOrder = [
                'zodiac',
                'ocean',
                'citizen', // remove one of the two
                'gunman',
                'bomber',
                'bodyguard',
                'magician'
            ];
            rolesToAssign = rolesList.slice(0, totalPlayers);
            if (totalPlayers < 12) {
                let tempRoles = [...rolesList];
                for (let i = 0; tempRoles.length > totalPlayers && i < removalOrder.length; i++) {
                    const roleToRemove = tempRoles.findIndex(r => r.id === removalOrder[i]);
                    if (roleToRemove !== -1) {
                        tempRoles.splice(roleToRemove, 1);
                    }
                }
                // If still more roles than players, remove from end
                while (tempRoles.length > totalPlayers) {
                    tempRoles.pop();
                }
                rolesToAssign = tempRoles;
            }
        }
        
        // Shuffle roles
        rolesToAssign = shuffleArray(rolesToAssign);
        
        // Assign roles to players (store role id)
        const playersWithRoles = selectedPlayers.map((player, index) => {
            return {
                ...player,
                role: rolesToAssign[index] ? rolesToAssign[index].id : 'citizen',
                // Ensure sequence is preserved
                sequence: player.sequence !== undefined ? player.sequence : index + 1
            };
        });
        
        // Save to localStorage for the game page
        localStorage.setItem('gameState', JSON.stringify({
            players: playersWithRoles,
            currentRound: 0,
            gamePhase: 'setup',
            eliminatedPlayers: []
        }));
        
        // Redirect to view-roles page instead of role-assignments page
        window.location.href = 'view-roles.html';
    } catch (error) {
        console.error("Error assigning roles:", error);
        document.getElementById('role-validation-message').textContent =
            "Error assigning roles. Please try again.";
    }
}

// Fisher-Yates shuffle algorithm for randomizing roles
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
} 
