// Traitor Night Phase Controller
let gameState = null;
let selectedTarget = null;
let currentAction = null; // 'murder' or 'recruit'

document.addEventListener('DOMContentLoaded', function() {
    console.log("Traitor Night Phase page loaded");
    loadGameState();
    setupListeners();
});

function loadGameState() {
    try {
        const stored = localStorage.getItem('gameState');
        if (!stored) { showError("No game state found."); return; }
        gameState = JSON.parse(stored);
        if (gameState.scenario !== 'traitor') { showError("Not a Traitor scenario."); return; }

        gameState.gamePhase = 'night';
        document.getElementById('night-subtitle').textContent = `Night ${gameState.currentRound}`;

        // Reset night state for new night
        gameState.nightState.traitorAction = null;
        gameState.nightState.murderTarget = null;
        gameState.nightState.recruitTarget = null;
        gameState.nightState.recruitAccepted = null;
        gameState.nightState.murderResult = null;
        saveGameState();

        showInstructions();
    } catch (error) {
        console.error("Error:", error);
        showError("Error: " + error.message);
    }
}

function showError(msg) {
    document.getElementById('step-instructions').innerHTML = `<div style="padding:20px;color:#e74c3c;"><h3>Error</h3><p>${msg}</p></div>`;
}

function setupListeners() {
    document.getElementById('go-action-btn').addEventListener('click', goToAction);
    document.getElementById('confirm-target-btn').addEventListener('click', confirmTarget);
    document.getElementById('go-day-btn').addEventListener('click', goToDay);
    document.getElementById('reset-btn').addEventListener('click', () => {
        document.getElementById('confirm-leave-modal').style.display = 'block';
    });
    document.getElementById('confirm-leave-yes').addEventListener('click', () => {
        localStorage.removeItem('gameState');
        window.location.href = 'index.html';
    });
    document.getElementById('confirm-leave-no').addEventListener('click', () => {
        document.getElementById('confirm-leave-modal').style.display = 'none';
    });
}

function getAlivePlayers() {
    if (!gameState || !gameState.players) return [];
    const eliminated = gameState.eliminatedPlayers || [];
    return gameState.players.filter(p => !eliminated.some(e => e.id === p.id));
}

function getAliveTraitors() {
    return getAlivePlayers().filter(p => p.role === 'traitor');
}

function getAliveFaithful() {
    return getAlivePlayers().filter(p => p.role === 'faithful');
}

function switchToStep(stepId) {
    document.querySelectorAll('.phase-step').forEach(s => s.classList.remove('active'));
    document.getElementById(stepId).classList.add('active');
}

function saveGameState() {
    localStorage.setItem('gameState', JSON.stringify(gameState));
}

// ========== STEP 1: INSTRUCTIONS ==========
function showInstructions() {
    // Show shield info
    const shieldInfo = document.getElementById('shield-assignment-info');
    const shields = gameState.nightState.shields || [];
    if (shields.length > 0) {
        const shieldPlayers = shields.map(id => gameState.players.find(p => p.id === id)).filter(Boolean);
        if (gameState.settings.shieldMethod === 'B') {
            shieldInfo.innerHTML = `
                <div class="shield-info-card">
                    <p style="color:#3498db;font-weight:bold;">Tell everyone to hold out their hands, then touch these players':</p>
                    ${shieldPlayers.map(p => `
                        <div class="shield-player">
                            <img src="${p.photo_url || 'images/default-avatar.svg'}" alt="${p.name}" onerror="this.src='images/default-avatar.svg'">
                            <span>${p.name}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            shieldInfo.innerHTML = `
                <div class="shield-info-card">
                    <p style="color:#3498db;font-weight:bold;">Shields were already shown to players via cards. Shielded tonight:</p>
                    ${shieldPlayers.map(p => `
                        <div class="shield-player">
                            <img src="${p.photo_url || 'images/default-avatar.svg'}" alt="${p.name}" onerror="this.src='images/default-avatar.svg'">
                            <span>${p.name}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    }

    // Show traitors
    const traitors = getAliveTraitors();
    const traitorList = document.getElementById('traitor-list');
    traitorList.innerHTML = traitors.map(p => `
        <div class="traitor-item">
            <img src="${p.photo_url || 'images/default-avatar.svg'}" alt="${p.name}" onerror="this.src='images/default-avatar.svg'">
            <span style="font-weight:bold;color:#9b59b6;">${p.name}</span>
            ${p.isConvertedTraitor ? '<span style="font-size:0.75rem;margin-left:8px;color:#e67e22;">(Recruited)</span>' : ''}
        </div>
    `).join('');
}

// ========== STEP 2: ACTION CHOICE ==========
function goToAction() {
    switchToStep('step-action');

    const canRecruit = gameState.recruitmentAvailableTonight === true;
    const actionInfo = document.getElementById('action-info');
    const choiceDiv = document.getElementById('action-choice');

    if (canRecruit) {
        actionInfo.textContent = 'A Traitor was banished last day. Traitors may choose to Murder OR Recruit (but not both).';
        choiceDiv.innerHTML = `
            <button class="choice-btn murder-btn" onclick="selectAction('murder')">Murder a Player</button>
            <button class="choice-btn recruit-btn" onclick="selectAction('recruit')">Recruit a Faithful</button>
        `;
    } else {
        actionInfo.textContent = 'Traitors will attempt to murder a Faithful player.';
        // Auto-select murder
        selectAction('murder');
    }
}

function selectAction(action) {
    currentAction = action;
    gameState.nightState.traitorAction = action;
    saveGameState();

    // Go to target selection
    showTargetSelection();
}
window.selectAction = selectAction;

// ========== STEP 3: TARGET SELECTION ==========
function showTargetSelection() {
    switchToStep('step-target');
    selectedTarget = null;
    document.getElementById('confirm-target-btn').disabled = true;

    const titleEl = document.getElementById('target-title');
    const infoEl = document.getElementById('target-info');
    const listEl = document.getElementById('target-list');
    const confirmBtn = document.getElementById('confirm-target-btn');

    if (currentAction === 'murder') {
        titleEl.textContent = 'Select Murder Target';
        infoEl.textContent = 'Traitors point to the player they want to murder. Only non-Traitor players can be targeted.';
        confirmBtn.style.backgroundColor = '#e74c3c';
        confirmBtn.textContent = 'Confirm Murder Target';

        // Show only faithful targets
        const targets = getAliveFaithful();
        renderTargetList(targets, listEl);
    } else {
        titleEl.textContent = 'Select Recruitment Target';
        infoEl.textContent = 'Choose a Faithful player to attempt recruitment. They will be asked if they accept.';
        confirmBtn.style.backgroundColor = '#9b59b6';
        confirmBtn.textContent = 'Confirm Recruitment Target';

        const targets = getAliveFaithful();
        renderTargetList(targets, listEl);
    }
}

function renderTargetList(targets, container) {
    container.innerHTML = targets.map(p => `
        <div class="target-card" data-id="${p.id}" onclick="selectTarget('${p.id}')">
            <img src="${p.photo_url || 'images/default-avatar.svg'}" alt="${p.name}" onerror="this.src='images/default-avatar.svg'">
            <span class="target-name">${p.name}</span>
        </div>
    `).join('');
}

function selectTarget(playerId) {
    selectedTarget = playerId;
    // Update UI
    document.querySelectorAll('.target-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.id === playerId);
    });
    document.getElementById('confirm-target-btn').disabled = false;
}
window.selectTarget = selectTarget;

// ========== STEP 4: CONFIRM TARGET ==========
function confirmTarget() {
    if (!selectedTarget) return;

    if (currentAction === 'murder') {
        gameState.nightState.murderTarget = selectedTarget;
        saveGameState();
        // Run recruitment script physically regardless (to hide intent)
        // Then resolve murder
        resolveMurder();
    } else {
        gameState.nightState.recruitTarget = selectedTarget;
        saveGameState();
        showRecruitmentResponse();
    }
}

// ========== RECRUITMENT FLOW ==========
function showRecruitmentResponse() {
    switchToStep('step-recruit-response');
    const target = gameState.players.find(p => p.id === selectedTarget);
    const content = document.getElementById('recruit-response-content');

    content.innerHTML = `
        <div style="text-align:center;margin:15px 0;">
            <img src="${target.photo_url || 'images/default-avatar.svg'}"
                 alt="${target.name}"
                 style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid #9b59b6;"
                 onerror="this.src='images/default-avatar.svg'">
            <h3 style="margin-top:10px;">${target.name}</h3>
        </div>
        <p style="text-align:center;margin:15px 0;">Narrator: Touch this player's hand, whisper the recruitment offer, and record their response.</p>
        <p style="text-align:center;font-style:italic;color:var(--text-secondary);">"You are being offered to join the Traitors. Do you accept?"</p>
        <div class="recruit-response-btns">
            <button onclick="recordRecruitResponse(true)" style="background-color:#2ecc71;color:white;">Accepted</button>
            <button onclick="recordRecruitResponse(false)" style="background-color:#e74c3c;color:white;">Rejected</button>
        </div>
        <p style="text-align:center;font-size:0.85rem;color:var(--text-secondary);margin-top:15px;">
            After recording, wake original Traitors to show thumbs up/down.
        </p>
    `;
}

function recordRecruitResponse(accepted) {
    gameState.nightState.recruitAccepted = accepted;

    if (accepted) {
        // Convert the player to a Traitor starting next night
        const targetPlayer = gameState.players.find(p => p.id === gameState.nightState.recruitTarget);
        if (targetPlayer) {
            targetPlayer.role = 'traitor';
            targetPlayer.isConvertedTraitor = true;
        }
    }

    // Mark recruitment as permanently used (one-time only) and clear availability
    gameState.recruitmentUsed = true;
    gameState.recruitmentAvailableTonight = false;
    saveGameState();
    resolveRecruitment();
}
window.recordRecruitResponse = recordRecruitResponse;

function resolveRecruitment() {
    switchToStep('step-resolution');
    const target = gameState.players.find(p => p.id === gameState.nightState.recruitTarget);
    const accepted = gameState.nightState.recruitAccepted;
    const content = document.getElementById('resolution-content');

    if (accepted) {
        content.innerHTML = `
            <div class="result-card recruit-success">
                <h3>Recruitment Successful</h3>
                <p><strong>${target.name}</strong> has accepted and will join the Traitors.</p>
                <p style="font-size:0.85rem;color:var(--text-secondary);margin-top:10px;">Signal thumbs UP to Traitors.</p>
                <p style="font-size:0.85rem;color:var(--text-secondary);">No murder occurred tonight. No one dies.</p>
            </div>
        `;
    } else {
        content.innerHTML = `
            <div class="result-card recruit-rejected">
                <h3>Recruitment Rejected</h3>
                <p><strong>${target.name}</strong> has declined the offer.</p>
                <p style="font-size:0.85rem;color:var(--text-secondary);margin-top:10px;">Signal thumbs DOWN to Traitors.</p>
                <p style="font-size:0.85rem;color:var(--text-secondary);">No murder occurred tonight. No one dies.</p>
            </div>
        `;
    }

    // No murder this night
    gameState.dayState.murderedLastNight = null;
    saveGameState();
}

// ========== MURDER RESOLUTION ==========
function resolveMurder() {
    switchToStep('step-resolution');
    const targetId = gameState.nightState.murderTarget;
    const target = gameState.players.find(p => p.id === targetId);
    const shields = gameState.nightState.shields || [];
    const isShielded = shields.includes(targetId);
    const content = document.getElementById('resolution-content');

    if (isShielded) {
        // Murder blocked by shield
        gameState.nightState.murderResult = 'shielded';
        gameState.dayState.murderedLastNight = null;
        content.innerHTML = `
            <div class="result-card murder-blocked">
                <h3>Murder Blocked!</h3>
                <p>The target <strong>${target.name}</strong> was protected by a Shield.</p>
                <p>No one was murdered tonight.</p>
                <p style="font-size:0.85rem;color:var(--text-secondary);margin-top:10px;">
                    Do not reveal this to players yet. Tomorrow morning, announce that no one was murdered.
                </p>
            </div>
        `;
    } else {
        // Murder succeeds
        gameState.nightState.murderResult = 'killed';
        gameState.dayState.murderedLastNight = targetId;

        // Add to eliminated
        if (!gameState.eliminatedPlayers) gameState.eliminatedPlayers = [];
        gameState.eliminatedPlayers.push({
            id: target.id,
            name: target.name,
            role: target.role,
            eliminatedInRound: gameState.currentRound,
            eliminatedInPhase: 'murder',
            roleRevealed: false // No role reveal for murders
        });

        content.innerHTML = `
            <div class="result-card murder-success">
                <h3>Murder Successful</h3>
                <p><strong>${target.name}</strong> has been murdered.</p>
                <p style="font-size:0.85rem;color:var(--text-secondary);margin-top:10px;">
                    Tomorrow morning, announce that ${target.name} was found dead. Do NOT reveal their role.
                </p>
            </div>
        `;
    }

    // Clear recruitment availability
    gameState.recruitmentAvailableTonight = false;

    // Clear shields (they expire each night)
    gameState.nightState.shields = [];
    saveGameState();

    // Check if game should end
    checkGameEnd();
}

function checkGameEnd() {
    const alive = getAlivePlayers();
    const dayBtn = document.getElementById('go-day-btn');

    if (alive.length <= 2) {
        const hasTraitor = alive.some(p => p.role === 'traitor');
        gameState.gameOver = true;
        gameState.winner = hasTraitor ? 'traitors' : 'faithful';
        gameState.winReason = hasTraitor
            ? 'Only 2 players remain and at least one is a Traitor. Traitors win!'
            : 'Only 2 Faithful players remain. Faithful win!';
        saveGameState();

        const content = document.getElementById('resolution-content');
        content.innerHTML += `
            <div class="result-card" style="background-color:rgba(241,196,15,0.2);border:2px solid #f1c40f;margin-top:15px;">
                <h3>Game Over!</h3>
                <p>${gameState.winReason}</p>
            </div>
        `;
        dayBtn.textContent = 'View Game Results';
        dayBtn.onclick = () => { window.location.href = 'traitor-game-over.html'; };
    }
}

// ========== GO TO DAY ==========
function goToDay() {
    gameState.currentRound++;
    gameState.gamePhase = 'day';
    gameState.dayState.isBlindDay = false;
    gameState.dayState.challengesTaken = {};
    gameState.dayState.hasSpoken = {};
    saveGameState();
    window.location.href = 'traitor-day.html';
}
