// Global variables
let selectedPlayers = [];
let totalPlayers = 0;

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
    
    // Set up event listeners (only for assign roles button)
    document.getElementById('assign-roles-btn').addEventListener('click', assignRoles);
    
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
            selectedPlayers = JSON.parse(storedPlayers);
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

// Display selected players in the UI
function displaySelectedPlayers() {
    const playersList = document.getElementById('selected-players-list');
    playersList.innerHTML = '';
    
    selectedPlayers.forEach(player => {
        const playerCard = document.createElement('div');
        playerCard.className = 'player-card';
        playerCard.dataset.id = player.id;
        
        const imgSrc = player.photo_url || 'images/default-avatar.svg';
        
        playerCard.innerHTML = `
            <div class="player-container">
                <div class="player-image">
                    <img src="${imgSrc}" alt="${player.name}" onerror="this.src='images/default-avatar.svg'">
                </div>
                <div class="player-info">
                    <h3 class="player-name">${player.name}</h3>
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
        selectedPlayers = JSON.parse(localStorage.getItem('previousSelectedPlayers'));
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
        // Always use getEnabledRoles() from roles.js
        let rolesList = (typeof getEnabledRoles === 'function' ? getEnabledRoles() : []);
        // Defensive: fallback to empty array if not found
        if (!rolesList || !Array.isArray(rolesList)) rolesList = [];
        // Ensure there are enough roles (add extra citizens if needed)
        while (rolesList.length < 12) {
            const citizenRole = rolesList.find(r => r.id === 'citizen');
            if (citizenRole) rolesList.push(citizenRole);
            else break;
        }
        // Remove roles in the specified order if fewer than 12 players
        const removalOrder = [
            'zodiac',
            'citizen', // remove one of the two
            'ocean',
            'gunman',
            'bomber',
            'bodyguard',
            'magician'
        ];
        let rolesToAssign = rolesList.slice(0, totalPlayers);
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
        // Shuffle roles
        rolesToAssign = shuffleArray(rolesToAssign);
        // Assign roles to players (store role id)
        const playersWithRoles = selectedPlayers.map((player, index) => {
            return {
                ...player,
                role: rolesToAssign[index] ? rolesToAssign[index].id : 'citizen'
            };
        });
        // Save to localStorage for the game page
        localStorage.setItem('gameState', JSON.stringify({
            players: playersWithRoles,
            currentRound: 0,
            gamePhase: 'setup',
            eliminatedPlayers: []
        }));
        // Redirect to game page
        window.location.href = 'game.html';
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

// Show current roles that will be assigned
function displayCurrentRoles() {
    let rolesList = (typeof getEnabledRoles === 'function' ? getEnabledRoles() : []);
    const rolesContainer = document.getElementById('current-roles-list');
    if (!rolesList || !Array.isArray(rolesList) || rolesList.length === 0) {
        if (rolesContainer) {
            rolesContainer.innerHTML = "<div style='color:#888;padding:1rem;'>No roles available. Please check your roles configuration.</div>";
        }
        console.warn("No roles available for assignment. Check if roles.js is loaded and getEnabledRoles is defined.");
        return;
    }
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
    // Render roles
    if (rolesContainer) {
        rolesContainer.innerHTML = tempRoles.map(role => 
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
    localStorage.setItem('selectedPlayers', JSON.stringify(selectedPlayers));
} 