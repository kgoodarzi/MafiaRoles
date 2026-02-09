// Traitor Setup Page Controller
let selectedPlayers = [];
let totalPlayers = 0;
let gameState = null;
let currentViewIndex = 0; // For role viewing
let roleViewState = 'blank'; // 'blank' or 'role'

document.addEventListener('DOMContentLoaded', async function() {
    console.log("Traitor setup page loaded");

    // Wait for database manager
    await waitForDatabaseInit();

    // Load selected players
    loadSelectedPlayers();

    // Setup event listeners
    document.getElementById('assign-roles-btn').addEventListener('click', assignRolesAndStartViewing);
    document.getElementById('shield-method').addEventListener('change', updateShieldMethodDesc);
    document.getElementById('voting-mode').addEventListener('change', updateVotingModeDesc);
});

async function waitForDatabaseInit() {
    const maxAttempts = 10;
    let attempts = 0;
    while (attempts < maxAttempts) {
        if (window.dbManager && window.dbManager.initialized) return true;
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
    }
    return false;
}

function loadSelectedPlayers() {
    try {
        const storedPlayers = localStorage.getItem('selectedPlayers');
        if (storedPlayers) {
            selectedPlayers = JSON.parse(storedPlayers);
            selectedPlayers.sort((a, b) => {
                const seqA = a.sequence !== undefined ? a.sequence : 9999;
                const seqB = b.sequence !== undefined ? b.sequence : 9999;
                return seqA - seqB;
            });
            totalPlayers = selectedPlayers.length;
            document.getElementById('total-players').textContent = totalPlayers;
            displayRoleSummary();
            displayPlayersGrid();

            // Validate player count
            if (totalPlayers < 7 || totalPlayers > 16) {
                document.getElementById('assign-roles-btn').disabled = true;
                document.getElementById('role-summary').innerHTML =
                    '<p style="color:#e74c3c;">Traitor scenario requires 7-16 players.</p>';
            }
        } else {
            document.getElementById('setup-subtitle').textContent = "No players selected.";
            document.getElementById('assign-roles-btn').disabled = true;
        }
    } catch (error) {
        console.error("Error loading selected players:", error);
    }
}

function getTraitorCount(playerCount) {
    if (playerCount >= 14) return 4;
    if (playerCount >= 10) return 3;
    if (playerCount >= 7) return 2;
    return 1;
}

function getShieldCount(playerCount) {
    if (playerCount >= 14) return 3;
    if (playerCount >= 10) return 2;
    if (playerCount >= 7) return 1;
    return 0;
}

function displayRoleSummary() {
    const traitorCount = getTraitorCount(totalPlayers);
    const faithfulCount = totalPlayers - traitorCount;
    const shieldCount = getShieldCount(totalPlayers);

    document.getElementById('role-summary').innerHTML = `
        <div class="role-count-card traitor-card">
            <div class="count">${traitorCount}</div>
            <div class="label">Traitors</div>
        </div>
        <div class="role-count-card faithful-card">
            <div class="count">${faithfulCount}</div>
            <div class="label">Faithful</div>
        </div>
        <div class="role-count-card" style="background-color:rgba(52,152,219,0.2);border:2px solid #3498db;color:#3498db;">
            <div class="count">${shieldCount}</div>
            <div class="label">Shields/Night</div>
        </div>
    `;
}

function displayPlayersGrid() {
    const grid = document.getElementById('players-grid');
    grid.innerHTML = '';
    selectedPlayers.forEach(player => {
        const name = player.full_name || player.name || 'Unknown';
        const photo = player.photo_url || player.photo || 'images/default-avatar.svg';
        grid.innerHTML += `
            <div class="player-mini-card">
                <img src="${photo}" alt="${name}" onerror="this.src='images/default-avatar.svg'">
                <div class="name">${name}</div>
            </div>
        `;
    });
}

function updateShieldMethodDesc() {
    const method = document.getElementById('shield-method').value;
    const desc = document.getElementById('shield-method-desc');
    if (method === 'A') {
        desc.textContent = 'Narrator visits each player one by one and shows them a Shield or Dud card on the device (like role viewing). Each player privately learns their shield status.';
    } else {
        desc.textContent = 'The app selects shielded players and shows the list to the narrator. Narrator tells everyone to hold out their hands and touches the hands of shielded players.';
    }
}

function updateVotingModeDesc() {
    const mode = document.getElementById('voting-mode').value;
    const desc = document.getElementById('voting-mode-desc');
    if (mode === '1') {
        desc.textContent = 'Players can raise hands for multiple candidates. Highest vote count gets banished.';
    } else {
        desc.textContent = 'Each player names exactly one other player. Highest vote count gets banished.';
    }
}

// Cryptographically secure shuffle
function cryptoRandomInt(max) {
    const randomValues = new Uint32Array(1);
    crypto.getRandomValues(randomValues);
    const maxValid = Math.floor(0xFFFFFFFF / max) * max;
    if (randomValues[0] > maxValid) return cryptoRandomInt(max);
    return randomValues[0] % max;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = cryptoRandomInt(i + 1);
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function assignRolesAndStartViewing() {
    const traitorCount = getTraitorCount(totalPlayers);
    const faithfulCount = totalPlayers - traitorCount;

    // Build role array
    const roles = [];
    for (let i = 0; i < traitorCount; i++) roles.push('traitor');
    for (let i = 0; i < faithfulCount; i++) roles.push('faithful');

    // Shuffle roles multiple times
    shuffleArray(roles);
    shuffleArray(roles);
    shuffleArray(roles);

    // Assign roles to players
    const playersWithRoles = selectedPlayers.map((player, index) => ({
        ...player,
        id: player.username || player.id,
        name: player.full_name || player.name || 'Unknown',
        photo_url: player.photo_url || player.photo || 'images/default-avatar.svg',
        role: roles[index],
        originalRole: roles[index],
        isConvertedTraitor: false,
        sequence: player.sequence !== undefined ? player.sequence : index + 1
    }));

    // Build initial game state
    const fixedShields = document.getElementById('fixed-shields').checked;
    const settings = {
        shieldMethod: document.getElementById('shield-method').value,
        votingMode: parseInt(document.getElementById('voting-mode').value),
        mainSpeakingTime: parseInt(document.getElementById('main-speaking-time').value) || 30,
        challengeSpeakingTime: parseInt(document.getElementById('challenge-speaking-time').value) || 15,
        fixedShields: fixedShields,
        initialShieldCount: getShieldCount(totalPlayers)
    };

    gameState = {
        scenario: 'traitor',
        players: playersWithRoles,
        currentRound: 1,
        gamePhase: 'day',
        eliminatedPlayers: [],
        settings: settings,
        nightState: {
            shields: [],
            traitorAction: null,
            murderTarget: null,
            recruitTarget: null,
            recruitAccepted: null,
            murderResult: null
        },
        dayState: {
            challengesTaken: {},
            hasSpoken: {},
            isBlindDay: true,
            murderedLastNight: null,
            speakingOrder: playersWithRoles.map(p => p.id)
        },
        recruitmentAvailableTonight: false,
        recruitmentUsed: false,
        lastBanishedWasTraitor: false,
        traitorsBanished: 0,
        isFireOfTruth: false,
        gameOver: false,
        winner: null,
        winReason: ''
    };

    localStorage.setItem('gameState', JSON.stringify(gameState));

    // Switch to role viewing
    startRoleViewing();
}

function startRoleViewing() {
    document.getElementById('setup-screen').style.display = 'none';
    const roleViewScreen = document.getElementById('role-view-screen');
    roleViewScreen.classList.add('active');
    roleViewScreen.style.display = 'block';

    currentViewIndex = 0;
    showBlankScreen();
}

function showBlankScreen() {
    const content = document.getElementById('role-view-content');
    const controls = document.getElementById('role-view-controls');
    const player = gameState.players[currentViewIndex];

    content.innerHTML = `
        <div class="blank-screen">
            <h2>Player ${currentViewIndex + 1} of ${gameState.players.length}</h2>
            <div style="margin:20px 0;">
                <img src="${player.photo_url || 'images/default-avatar.svg'}"
                     alt="${player.name}"
                     style="width:100px;height:100px;border-radius:50%;object-fit:cover;"
                     onerror="this.src='images/default-avatar.svg'">
            </div>
            <h3>${player.name}</h3>
            <p style="color:var(--text-secondary);margin-top:10px;">Hand the device to this player, then tap "View Role".</p>
        </div>
    `;

    controls.innerHTML = `
        <button id="view-role-btn" class="btn btn-primary" style="width:100%;margin-bottom:10px;background-color:#9b59b6;">View Your Role</button>
        <button id="skip-all-btn" class="btn" style="width:100%;">Skip to Game</button>
    `;

    document.getElementById('view-role-btn').addEventListener('click', showRoleScreen);
    document.getElementById('skip-all-btn').addEventListener('click', finishRoleViewing);
}

function showRoleScreen() {
    const content = document.getElementById('role-view-content');
    const controls = document.getElementById('role-view-controls');
    const player = gameState.players[currentViewIndex];

    const isTraitor = player.role === 'traitor';
    const roleName = isTraitor ? 'Traitor' : 'Faithful';
    const roleClass = isTraitor ? 'traitor' : 'faithful';
    const roleDesc = isTraitor
        ? 'You are a Traitor. Work with fellow Traitors during the night to eliminate the Faithful. Keep your identity hidden during the day.'
        : 'You are Faithful. Work with others during the day to identify and banish the Traitors from your group.';
    const roleColor = isTraitor ? '#9b59b6' : '#2ecc71';

    content.innerHTML = `
        <div class="role-reveal-card">
            <div style="margin:20px 0;">
                <img src="${player.photo_url || 'images/default-avatar.svg'}"
                     alt="${player.name}"
                     style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid ${roleColor};"
                     onerror="this.src='images/default-avatar.svg'">
            </div>
            <h3>${player.name}</h3>
            <div class="role-name ${roleClass}" style="color:${roleColor};">${roleName}</div>
            <p class="role-desc">${roleDesc}</p>
        </div>
    `;

    const isLast = currentViewIndex >= gameState.players.length - 1;
    controls.innerHTML = `
        <button id="next-player-btn" class="btn btn-success" style="width:100%;margin-bottom:10px;">${isLast ? 'Start Game' : 'Next Player'}</button>
    `;

    document.getElementById('next-player-btn').addEventListener('click', function() {
        if (isLast) {
            finishRoleViewing();
        } else {
            currentViewIndex++;
            showBlankScreen();
        }
    });
}

function finishRoleViewing() {
    // Game is ready to start - go to first day (Blind Day)
    gameState.gamePhase = 'day';
    gameState.currentRound = 1;
    gameState.dayState.isBlindDay = true;
    gameState.dayState.murderedLastNight = null;
    gameState.dayState.challengesTaken = {};
    gameState.dayState.hasSpoken = {};

    localStorage.setItem('gameState', JSON.stringify(gameState));
    window.location.href = 'traitor-day.html';
}
