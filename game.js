document.addEventListener('DOMContentLoaded', () => {
    const setupScreen = document.getElementById('setup-screen');
    const gameScreen = document.getElementById('game-screen');
    const summaryScreen = document.getElementById('summary-screen');
    const rolesContainer = document.getElementById('roles-container');
    const playerCountInput = document.getElementById('player-count');
    const startGameBtn = document.getElementById('start-game');
    const nextRoleBtn = document.getElementById('next-role');
    const newGameBtn = document.getElementById('new-game');

    let selectedRoles = ['citizen']; // Initialize with Citizen selected
    let currentRoleIndex = 0;
    let roleAssignments = [];

    // Initialize role cards
    Object.entries(roles).forEach(([key, role]) => {
        const roleCard = document.createElement('div');
        roleCard.className = 'role-card';
        if (key === 'citizen') {
            roleCard.classList.add('selected'); // Add selected class to Citizen card
        }
        roleCard.innerHTML = `
            <img src="${role.image}" alt="${role.name}">
            <div>${role.name}</div>
            <div>${role.name2}</div>
        `;
        roleCard.addEventListener('click', () => toggleRoleSelection(key, roleCard));
        rolesContainer.appendChild(roleCard);
    });

    function toggleRoleSelection(roleKey, card) {
        const role = roles[roleKey];
        const index = selectedRoles.indexOf(roleKey);
        
        if (index === -1) {
            if (!role.repeatable && selectedRoles.some(r => r === roleKey)) {
                return; // Don't allow duplicate non-repeatable roles
            }
            selectedRoles.push(roleKey);
            card.classList.add('selected');
        } else {
            selectedRoles.splice(index, 1);
            card.classList.remove('selected');
        }
    }

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

        // Randomize role assignments
        roleAssignments = [...selectedRoles];
        for (let i = roleAssignments.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [roleAssignments[i], roleAssignments[j]] = [roleAssignments[j], roleAssignments[i]];
        }

        currentRoleIndex = 0;
        setupScreen.classList.remove('active');
        gameScreen.classList.add('active');
        showNextRole();
    }

    function showNextRole() {
        const roleDisplay = gameScreen.querySelector('.role-display');
        const playerNumber = roleDisplay.querySelector('.player-number');
        const roleImage = roleDisplay.querySelector('.role-image');
        const roleName = roleDisplay.querySelector('.role-name');
        const roleName2 = roleDisplay.querySelector('.role-name2');

        if (currentRoleIndex >= roleAssignments.length) {
            showSummary();
            return;
        }

        const roleKey = roleAssignments[currentRoleIndex];
        const role = roles[roleKey];

        playerNumber.textContent = `Player ${currentRoleIndex + 1}`;
        roleImage.innerHTML = `<img src="${role.image}" alt="${role.name}">`;
        roleName.textContent = role.name;
        roleName2.textContent = role.name2;

        currentRoleIndex++;
    }

    function showSummary() {
        gameScreen.classList.remove('active');
        summaryScreen.classList.add('active');

        const summaryList = document.getElementById('summary-list');
        summaryList.innerHTML = '';

        roleAssignments.forEach((roleKey, index) => {
            const role = roles[roleKey];
            const summaryItem = document.createElement('div');
            summaryItem.className = 'summary-item';
            summaryItem.innerHTML = `
                <div>Player ${index + 1}</div>
                <div>${role.name} (${role.name2})</div>
            `;
            summaryList.appendChild(summaryItem);
        });
    }

    function resetGame() {
        selectedRoles = ['citizen'];
        currentRoleIndex = 0;
        roleAssignments = [];
        
        // Reset role cards
        document.querySelectorAll('.role-card').forEach(card => {
            card.classList.remove('selected');
        });

        summaryScreen.classList.remove('active');
        setupScreen.classList.add('active');
    }

    // Event listeners
    startGameBtn.addEventListener('click', startGame);
    nextRoleBtn.addEventListener('click', showNextRole);
    newGameBtn.addEventListener('click', resetGame);
}); 