document.addEventListener('DOMContentLoaded', () => {
    // Screen elements
    const setupScreen = document.getElementById('setup-screen');
    const playerSelectionScreen = document.getElementById('player-selection-screen');
    const gameScreen = document.getElementById('game-screen');
    const summaryScreen = document.getElementById('summary-screen');
    
    // Setup screen elements
    const rolesContainer = document.getElementById('roles-container');
    const playerCountInput = document.getElementById('player-count');
    const startGameBtn = document.getElementById('start-game');
    
    // Player selection screen elements
    const playersContainer = document.getElementById('players-container');
    const selectedPlayersList = document.getElementById('selected-players-list');
    const startAssignmentBtn = document.getElementById('start-assignment');
    
    // Game screen elements
    const proceedBtn = document.getElementById('proceed-button');
    const nextBtn = document.getElementById('next-button');
    const playerNumber = gameScreen.querySelector('.player-number');
    const playerName = gameScreen.querySelector('.player-name');
    const roleImage = gameScreen.querySelector('.role-image');
    const roleName = gameScreen.querySelector('.role-name');
    const roleName2 = gameScreen.querySelector('.role-name2');
    
    // Summary screen elements
    const summaryList = document.getElementById('summary-list');
    const newGameBtn = document.getElementById('new-game');
    
    // Game state
    let selectedRoles = Object.keys(roles);
    let currentRoleIndex = 0;
    let roleAssignments = [];
    let isShowingBlankPage = false;
    let selectedPlayers = [];

    // Set player count to 12
    playerCountInput.value = 12;

    // Initialize role cards
    initializeRoleCards();

    // Function to initialize role cards
    function initializeRoleCards() {
        rolesContainer.innerHTML = '';
        Object.entries(roles).forEach(([key, role]) => {
            const roleCard = document.createElement('div');
            roleCard.className = 'role-card selected';
            roleCard.dataset.role = key;
            roleCard.innerHTML = `
                <img src="${role.image}" alt="${role.name}">
                <div>${role.name}</div>
                <div>${role.name2}</div>
            `;
            roleCard.addEventListener('click', () => toggleRoleSelection(key, roleCard));
            rolesContainer.appendChild(roleCard);
        });
    }

    // Function to toggle role selection
    function toggleRoleSelection(roleKey, card) {
        const role = roles[roleKey];
        const index = selectedRoles.indexOf(roleKey);
        
        if (index === -1) {
            if (!role.repeatable && selectedRoles.some(r => r === roleKey)) {
                return;
            }
            selectedRoles.push(roleKey);
            card.classList.add('selected');
        } else {
            selectedRoles.splice(index, 1);
            card.classList.remove('selected');
        }
    }

    // Function to initialize player selection
    async function initializePlayerSelection() {
        playersContainer.innerHTML = '';
        
        // Load players from database (now returns users)
        const players = await dbManager.loadUsers();
        
        // Create a card for each player
        players.forEach(player => {
            const playerCard = document.createElement('div');
            playerCard.className = 'player-card';
            playerCard.dataset.id = player.id;
            
            // Use player image if available, otherwise show initials
            let imageHtml;
            if (player.image_url) {
                imageHtml = `<img src="${player.image_url}" alt="${player.name}">`;
            } else {
                const initials = player.name.charAt(0).toUpperCase();
                imageHtml = `<div class="player-initials">${initials}</div>`;
            }
            
            playerCard.innerHTML = `
                ${imageHtml}
                <div class="player-name">${player.name}</div>
                <div class="player-email">${player.email || ''}</div>
            `;
            
            playerCard.addEventListener('click', () => togglePlayerSelection(player, playerCard));
            playersContainer.appendChild(playerCard);
        });
    }

    // Function to toggle player selection
    function togglePlayerSelection(player, card) {
        const playerCount = parseInt(playerCountInput.value);
        const isSelected = card.classList.contains('selected');
        
        if (isSelected) {
            // Remove from selection
            selectedPlayers = selectedPlayers.filter(p => p.id !== player.id);
            card.classList.remove('selected');
            updateSelectedPlayersList();
        } else {
            // Add to selection if not at max players
            if (selectedPlayers.length < playerCount) {
                selectedPlayers.push(player);
                card.classList.add('selected');
                updateSelectedPlayersList();
            } else {
                alert(`Maximum ${playerCount} players can be selected`);
            }
        }
    }

    // Function to update the selected players list
    function updateSelectedPlayersList() {
        selectedPlayersList.innerHTML = '';
        
        selectedPlayers.forEach((player, index) => {
            const playerItem = document.createElement('div');
            playerItem.className = 'selected-player-item';
            
            // Use player image if available, otherwise show initials
            let imageHtml;
            if (player.image_url) {
                imageHtml = `<img src="${player.image_url}" alt="${player.name}">`;
            } else {
                const initials = player.name.charAt(0).toUpperCase();
                imageHtml = `<div class="player-initials">${initials}</div>`;
            }
            
            playerItem.innerHTML = `
                ${imageHtml}
                <div>
                    <div>${index + 1}. ${player.name}</div>
                    <div class="player-email">${player.email || ''}</div>
                </div>
            `;
            
            selectedPlayersList.appendChild(playerItem);
        });
    }

    // Function to start the game and go to player selection
    function startGame() {
        const playerCount = parseInt(playerCountInput.value);
        if (playerCount < 4 || playerCount > 20) {
            alert('Please select between 4 and 20 players');
            return;
        }

        if (selectedRoles.length === 0) {
            alert('Please select at least one role');
            return;
        }

        // Fill remaining slots with citizens if needed
        while (selectedRoles.length < playerCount) {
            selectedRoles.push('citizen');
        }

        // Go to player selection screen
        initializePlayerSelection();
        showScreen('player-selection-screen');
    }

    // Function to start role assignment
    function startRoleAssignment() {
        const playerCount = parseInt(playerCountInput.value);
        
        // Check if enough players selected
        if (selectedPlayers.length < playerCount) {
            alert(`Please select ${playerCount} players`);
            return;
        }

        // Randomize role assignments
        roleAssignments = [];
        
        const shuffledRoles = [...selectedRoles];
        for (let i = shuffledRoles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledRoles[i], shuffledRoles[j]] = [shuffledRoles[j], shuffledRoles[i]];
        }
        
        // Pair players with roles
        for (let i = 0; i < playerCount; i++) {
            roleAssignments.push({
                player: selectedPlayers[i],
                role: shuffledRoles[i]
            });
        }

        currentRoleIndex = 0;
        showScreen('game-screen');
        showBlankPage();
    }

    // Function to show blank page
    function showBlankPage() {
        playerNumber.textContent = '';
        playerName.textContent = '';
        roleImage.innerHTML = '';
        roleName.textContent = '';
        roleName2.textContent = '';
        
        proceedBtn.style.display = 'block';
        nextBtn.style.display = 'none';
        
        isShowingBlankPage = true;
    }

    // Function to show the next role
    function showRole() {
        if (currentRoleIndex >= roleAssignments.length) {
            showSummary();
            return;
        }
        
        const assignment = roleAssignments[currentRoleIndex];
        const role = roles[assignment.role];
        const player = assignment.player;

        playerNumber.textContent = `Player ${currentRoleIndex + 1}`;
        playerName.textContent = player.name;
        roleImage.innerHTML = `<img src="${role.image}" alt="${role.name}">`;
        roleName.textContent = role.name;
        roleName2.textContent = role.name2;
        
        proceedBtn.style.display = 'none';
        nextBtn.style.display = 'block';
        
        currentRoleIndex++;
        isShowingBlankPage = false;
    }

    // Function to show the summary
    function showSummary() {
        showScreen('summary-screen');

        summaryList.innerHTML = '';

        roleAssignments.forEach((assignment, index) => {
            const role = roles[assignment.role];
            const player = assignment.player;
            const summaryItem = document.createElement('div');
            summaryItem.className = 'summary-item';
            
            // Create player image element
            const playerImageHtml = player.image_url
                ? `<img src="${player.image_url}" alt="${player.name}" style="width: 30px; height: 30px; border-radius: 50%; margin-right: 10px;">`
                : `<div style="width: 30px; height: 30px; border-radius: 50%; background-color: #ddd; display: flex; align-items: center; justify-content: center; margin-right: 10px;">${player.name.charAt(0)}</div>`;
            
            summaryItem.innerHTML = `
                <div style="display: flex; align-items: center;">
                    ${playerImageHtml}
                    ${player.name}
                </div>
                <div>${role.name} (${role.name2})</div>
            `;
            summaryList.appendChild(summaryItem);
        });
    }

    // Function to reset the game
    function resetGame() {
        selectedRoles = Object.keys(roles);
        currentRoleIndex = 0;
        roleAssignments = [];
        isShowingBlankPage = false;
        selectedPlayers = [];
        
        // Reset role cards
        document.querySelectorAll('.role-card').forEach(card => {
            card.classList.add('selected');
        });

        showScreen('setup-screen');
    }

    // Helper function to show a screen
    function showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    // Event listeners
    startGameBtn.addEventListener('click', startGame);
    startAssignmentBtn.addEventListener('click', startRoleAssignment);
    proceedBtn.addEventListener('click', showRole);
    nextBtn.addEventListener('click', showBlankPage);
    newGameBtn.addEventListener('click', resetGame);
}); 