// Traitor Day Phase Controller
let gameState = null;
let timerInterval = null;
let timerSeconds = 0;
let playerVotes = {};

document.addEventListener('DOMContentLoaded', function() {
    console.log("Traitor Day Phase page loaded");
    loadGameState();
    setupGlobalListeners();
});

function loadGameState() {
    try {
        const stored = localStorage.getItem('gameState');
        if (!stored) {
            showError("No game state found. Please start a new game.");
            return;
        }
        gameState = JSON.parse(stored);
        if (gameState.scenario !== 'traitor') {
            showError("This is not a Traitor scenario game.");
            return;
        }
        // Update subtitle
        const isBlind = gameState.dayState && gameState.dayState.isBlindDay;
        document.getElementById('day-subtitle').textContent =
            isBlind ? `Day ${gameState.currentRound} - Blind Day (No Challenges)` : `Day ${gameState.currentRound}`;
        // Initialize morning
        showMorning();
    } catch (error) {
        console.error("Error loading game state:", error);
        showError("Error loading game: " + error.message);
    }
}

function showError(msg) {
    document.getElementById('step-morning').innerHTML = `<div style="padding:20px;color:#e74c3c;"><h3>Error</h3><p>${msg}</p></div>`;
}

function setupGlobalListeners() {
    document.getElementById('go-speaking-btn').addEventListener('click', goToSpeaking);
    document.getElementById('go-shields-btn').addEventListener('click', goToShields);
    document.getElementById('go-voting-btn').addEventListener('click', goToVoting);
    document.getElementById('apply-banishment-btn').addEventListener('click', applyBanishment);
    document.getElementById('go-night-btn').addEventListener('click', goToNight);
    document.getElementById('show-narrator-info-btn').addEventListener('click', showNarratorInfo);
    document.getElementById('close-narrator-btn').addEventListener('click', () => {
        document.getElementById('narrator-modal').style.display = 'none';
    });
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
    // Timer buttons
    document.getElementById('start-timer-btn').addEventListener('click', () => startTimer(gameState.settings.mainSpeakingTime));
    document.getElementById('stop-timer-btn').addEventListener('click', stopTimer);
}

// ========== HELPERS ==========
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

function getShieldCount() {
    // If fixed shields is enabled, use the initial count from game start
    if (gameState.settings && gameState.settings.fixedShields && gameState.settings.initialShieldCount != null) {
        return gameState.settings.initialShieldCount;
    }
    // Otherwise, dynamically adjust based on alive player count
    const alive = getAlivePlayers().length;
    if (alive >= 14) return 3;
    if (alive >= 10) return 2;
    if (alive >= 7) return 1;
    return 0;
}

function renderAlivePlayersGrid(containerId) {
    const alive = getAlivePlayers();
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    alive.forEach(p => {
        container.innerHTML += `
            <div class="alive-player-card">
                <img src="${p.photo_url || 'images/default-avatar.svg'}" alt="${p.name}" onerror="this.src='images/default-avatar.svg'">
                <div class="name">${p.name}</div>
            </div>
        `;
    });
}

function switchToStep(stepId) {
    document.querySelectorAll('.phase-step').forEach(s => s.classList.remove('active'));
    document.getElementById(stepId).classList.add('active');
}

function saveGameState() {
    localStorage.setItem('gameState', JSON.stringify(gameState));
}

// ========== STEP 1: MORNING ==========
function showMorning() {
    const content = document.getElementById('morning-content');
    const murdered = gameState.dayState ? gameState.dayState.murderedLastNight : null;

    if (gameState.currentRound === 1 && gameState.dayState.isBlindDay) {
        content.innerHTML = `
            <div class="murder-result safe">
                <h3>First Day - Introductions</h3>
                <p>This is the first day of the game. No night has occurred yet.</p>
                <p>Players should introduce themselves. <strong>No challenges are allowed today.</strong></p>
                <p>Traitors do NOT know each other yet.</p>
            </div>
        `;
    } else if (murdered) {
        const murderPlayer = gameState.players.find(p => p.id === murdered);
        const name = murderPlayer ? murderPlayer.name : 'Unknown';
        content.innerHTML = `
            <div class="murder-result killed">
                <h3>${name} was found murdered during the night.</h3>
                <p>${name} has been removed from the game.</p>
                <p style="font-size:0.85rem;color:var(--text-secondary);">No role is revealed for murdered players.</p>
            </div>
        `;
    } else {
        content.innerHTML = `
            <div class="murder-result safe">
                <h3>No one was murdered during the night.</h3>
                <p>The night passed peacefully (or the murder was blocked by a Shield).</p>
            </div>
        `;
    }

    const alive = getAlivePlayers();
    document.getElementById('alive-count-morning').textContent = alive.length;
    renderAlivePlayersGrid('alive-players-morning');
}

// ========== STEP 2: SPEAKING ==========
let currentSpeakerIndex = 0;
let speakingPlayerList = [];

function goToSpeaking() {
    switchToStep('step-speaking');

    const isBlind = gameState.dayState && gameState.dayState.isBlindDay;
    const info = document.getElementById('speaking-info');
    info.textContent = isBlind
        ? 'Blind Day: Players speak in order. No challenges allowed.'
        : 'Players speak in turn. The current speaker may offer a challenge. Select a challenger from eligible players (alive and have not taken a challenge today).';

    // Reset challenges for new day
    if (!gameState.dayState.challengesTaken) {
        gameState.dayState.challengesTaken = {};
    }
    // Track who has spoken
    if (!gameState.dayState.hasSpoken) {
        gameState.dayState.hasSpoken = {};
    }

    speakingPlayerList = getAlivePlayers();
    currentSpeakerIndex = 0;

    // Setup next speaker button (remove old listener first to avoid duplicates)
    const nextBtn = document.getElementById('next-speaker-btn');
    nextBtn.replaceWith(nextBtn.cloneNode(true));
    document.getElementById('next-speaker-btn').addEventListener('click', nextSpeaker);

    showCurrentSpeaker();
}

function showCurrentSpeaker() {
    stopTimer();

    const panel = document.getElementById('current-speaker-panel');
    const donePanel = document.getElementById('speaking-done-panel');
    const shieldsBtn = document.getElementById('go-shields-btn');

    if (currentSpeakerIndex >= speakingPlayerList.length) {
        // All players have spoken
        panel.style.display = 'none';
        donePanel.style.display = 'block';
        shieldsBtn.style.display = 'block';
        renderSpeakingProgress();
        return;
    }

    panel.style.display = 'block';
    donePanel.style.display = 'none';
    shieldsBtn.style.display = 'none';

    const player = speakingPlayerList[currentSpeakerIndex];
    const isBlind = gameState.dayState && gameState.dayState.isBlindDay;

    // Current speaker display
    const speakerDisplay = document.getElementById('current-speaker-display');
    speakerDisplay.innerHTML = `
        <p style="color:var(--text-secondary);font-size:0.85rem;">Speaker ${currentSpeakerIndex + 1} of ${speakingPlayerList.length}</p>
        <div style="margin:12px 0;">
            <img src="${player.photo_url || 'images/default-avatar.svg'}" alt="${player.name}"
                 style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid #9b59b6;"
                 onerror="this.src='images/default-avatar.svg'">
        </div>
        <h2 style="color:#9b59b6;margin:5px 0;">${player.name}</h2>
        <p style="font-size:0.85rem;color:var(--text-secondary);">Sequence #${player.sequence || (currentSpeakerIndex + 1)}</p>
    `;

    // Reset timer display
    const mainTime = gameState.settings.mainSpeakingTime || 30;
    timerSeconds = mainTime;
    updateTimerDisplay();
    document.getElementById('timer-display').classList.remove('expired', 'running');

    // Update timer button label
    document.getElementById('start-timer-btn').textContent = `Start Main Timer (${mainTime}s)`;

    // Challenge section
    const challengeSection = document.getElementById('challenge-section');
    const challengeControls = document.getElementById('challenge-controls');

    if (isBlind) {
        challengeSection.style.display = 'none';
    } else {
        challengeSection.style.display = 'block';
        renderChallengeControls(player, challengeControls);
    }

    // Next speaker button text
    const nextBtn = document.getElementById('next-speaker-btn');
    nextBtn.textContent = currentSpeakerIndex >= speakingPlayerList.length - 1
        ? 'Finish Speaking Phase' : 'Next Speaker';

    // Render progress
    renderSpeakingProgress();
}

function renderChallengeControls(currentPlayer, container) {
    const challengesTaken = gameState.dayState.challengesTaken || {};
    const alive = getAlivePlayers();

    // Eligible challengers: alive, not the current speaker, haven't taken a challenge today
    const eligible = alive.filter(p =>
        p.id !== currentPlayer.id && challengesTaken[p.id] !== true
    );

    if (eligible.length === 0) {
        container.innerHTML = `
            <p style="color:var(--text-secondary);font-style:italic;">No eligible challengers remaining today.</p>
        `;
        return;
    }

    container.innerHTML = `
        <p style="margin-bottom:8px;">The speaker may offer a challenge. Select the challenger:</p>
        <select id="challenge-select" class="challenge-dropdown">
            <option value="">-- Select Challenger --</option>
            ${eligible.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
        </select>
        <button id="give-challenge-btn" class="btn" style="width:100%;margin-top:8px;background-color:#e67e22;color:white;" disabled>
            Start Challenge Timer
        </button>
        <div id="challenge-status" style="margin-top:10px;"></div>
    `;

    // Enable button when a challenger is selected
    document.getElementById('challenge-select').addEventListener('change', function() {
        document.getElementById('give-challenge-btn').disabled = !this.value;
    });

    document.getElementById('give-challenge-btn').addEventListener('click', startChallenge);
}

function startChallenge() {
    const select = document.getElementById('challenge-select');
    const challengerId = select.value;
    if (!challengerId) return;

    const challenger = gameState.players.find(p => p.id === challengerId);
    if (!challenger) return;

    // Mark this player as having taken a challenge today
    if (!gameState.dayState.challengesTaken) gameState.dayState.challengesTaken = {};
    gameState.dayState.challengesTaken[challengerId] = true;
    saveGameState();

    // Show challenge status
    const statusEl = document.getElementById('challenge-status');
    statusEl.innerHTML = `
        <div style="padding:10px;border-radius:6px;background-color:rgba(230,126,34,0.15);border-left:3px solid #e67e22;">
            <div style="display:flex;align-items:center;margin-bottom:8px;">
                <img src="${challenger.photo_url || 'images/default-avatar.svg'}" alt="${challenger.name}"
                     style="width:35px;height:35px;border-radius:50%;object-fit:cover;margin-right:10px;"
                     onerror="this.src='images/default-avatar.svg'">
                <strong style="color:#e67e22;">${challenger.name}</strong>
                <span style="margin-left:8px;font-size:0.85rem;color:var(--text-secondary);">is challenging</span>
            </div>
        </div>
    `;

    // Disable the dropdown and button
    select.disabled = true;
    document.getElementById('give-challenge-btn').disabled = true;
    document.getElementById('give-challenge-btn').textContent = `Challenge Given to ${challenger.name}`;

    // Start challenge timer
    const challengeTime = gameState.settings.challengeSpeakingTime || 15;
    startTimer(challengeTime);

    // Refresh progress
    renderSpeakingProgress();
}

function nextSpeaker() {
    // Mark current speaker as having spoken
    if (currentSpeakerIndex < speakingPlayerList.length) {
        const player = speakingPlayerList[currentSpeakerIndex];
        if (!gameState.dayState.hasSpoken) gameState.dayState.hasSpoken = {};
        gameState.dayState.hasSpoken[player.id] = true;
        saveGameState();
    }

    stopTimer();
    currentSpeakerIndex++;
    showCurrentSpeaker();
}

function renderSpeakingProgress() {
    const progressEl = document.getElementById('speaking-progress');
    const challengesTaken = gameState.dayState.challengesTaken || {};
    const hasSpoken = gameState.dayState.hasSpoken || {};
    const isBlind = gameState.dayState && gameState.dayState.isBlindDay;

    progressEl.innerHTML = speakingPlayerList.map((p, index) => {
        const isCurrent = index === currentSpeakerIndex;
        const isDone = hasSpoken[p.id] === true;
        const isWaiting = index > currentSpeakerIndex;
        const hasChallenged = challengesTaken[p.id] === true;

        let statusClass = '';
        if (isCurrent) statusClass = 'current-speaker';
        else if (isDone) statusClass = 'done';
        else if (isWaiting) statusClass = 'waiting';

        return `
            <div class="speaking-player ${statusClass} ${hasChallenged ? 'challenge-taken' : ''}">
                <img src="${p.photo_url || 'images/default-avatar.svg'}" alt="${p.name}" onerror="this.src='images/default-avatar.svg'">
                <span class="player-name">${p.name}</span>
                ${isDone ? '<span style="color:#2ecc71;font-size:0.75rem;margin-left:auto;">Done</span>' : ''}
                ${isCurrent ? '<span style="color:#9b59b6;font-size:0.75rem;font-weight:bold;margin-left:auto;">Speaking</span>' : ''}
                ${isWaiting ? '<span style="color:var(--text-secondary);font-size:0.75rem;margin-left:auto;">Waiting</span>' : ''}
                ${!isBlind && hasChallenged ? '<span class="challenge-badge" style="margin-left:8px;">Challenged</span>' : ''}
                <span style="color:var(--text-secondary);font-size:0.8rem;margin-left:8px;">#${index + 1}</span>
            </div>
        `;
    }).join('');
}

// ========== TIMER ==========
function startTimer(seconds) {
    stopTimer();
    timerSeconds = seconds;
    updateTimerDisplay();
    const display = document.getElementById('timer-display');
    display.classList.remove('expired');
    display.classList.add('running');

    timerInterval = setInterval(() => {
        timerSeconds--;
        updateTimerDisplay();
        if (timerSeconds <= 0) {
            stopTimer();
            display.classList.remove('running');
            display.classList.add('expired');
            display.textContent = "TIME'S UP";
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    const display = document.getElementById('timer-display');
    display.classList.remove('running');
}

function updateTimerDisplay() {
    const mins = Math.floor(timerSeconds / 60);
    const secs = timerSeconds % 60;
    document.getElementById('timer-display').textContent =
        `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ========== STEP 3: SHIELDS ==========
let shieldViewIndex = 0;
let shieldViewOrder = [];
let shieldSet = new Set();

function goToShields() {
    stopTimer();
    switchToStep('step-shields');
    assignShields();
}

function assignShields() {
    const alive = getAlivePlayers();
    const count = getShieldCount();
    const method = gameState.settings.shieldMethod;
    const infoEl = document.getElementById('shield-info');
    const listEl = document.getElementById('shield-players-list');

    // Randomly select shield recipients
    const shuffled = [...alive].sort(() => Math.random() - 0.5);
    const shielded = shuffled.slice(0, Math.min(count, alive.length));
    const shieldIds = shielded.map(p => p.id);

    // Store shields in night state for upcoming night
    gameState.nightState.shields = shieldIds;
    saveGameState();

    shieldSet = new Set(shieldIds);

    if (method === 'A') {
        // Method A: Walk to each player and show Shield or Dud card one at a time
        infoEl.textContent = `Method A: ${count} shield(s) assigned. Walk to each player and show them their card (Shield or Dud).`;
        shieldViewOrder = [...alive]; // visit every alive player
        shieldViewIndex = 0;
        showShieldCard_blank();
    } else {
        // Method B: Show list to narrator, narrator touches hands
        infoEl.textContent = `Method B: ${count} shield(s) assigned. Tell everyone to close their eyes and hold out their hands, then touch the shielded players' hands.`;
        listEl.innerHTML = `
            <p style="color:#3498db;font-weight:bold;">Narrator: Touch these players' hands:</p>
            ${shielded.map(p => `
                <div class="shield-player">
                    <img src="${p.photo_url || 'images/default-avatar.svg'}" alt="${p.name}" onerror="this.src='images/default-avatar.svg'">
                    <span>${p.name}</span>
                </div>
            `).join('')}
        `;
        // Show the voting button
        document.getElementById('go-voting-btn').style.display = 'block';
    }
}

// Method A: Show blank/handoff screen for current player
function showShieldCard_blank() {
    const listEl = document.getElementById('shield-players-list');
    const votingBtn = document.getElementById('go-voting-btn');
    votingBtn.style.display = 'none';

    if (shieldViewIndex >= shieldViewOrder.length) {
        // All players have seen their card
        listEl.innerHTML = `
            <div style="text-align:center;padding:20px;">
                <h3 style="color:#3498db;">All players have been shown their shield status.</h3>
                <p style="color:var(--text-secondary);">Proceed to banishment voting.</p>
            </div>
        `;
        votingBtn.style.display = 'block';
        return;
    }

    const player = shieldViewOrder[shieldViewIndex];
    listEl.innerHTML = `
        <div style="text-align:center;padding:30px 20px;">
            <p style="color:var(--text-secondary);margin-bottom:10px;">Player ${shieldViewIndex + 1} of ${shieldViewOrder.length}</p>
            <div style="margin:15px 0;">
                <img src="${player.photo_url || 'images/default-avatar.svg'}" alt="${player.name}"
                     style="width:80px;height:80px;border-radius:50%;object-fit:cover;"
                     onerror="this.src='images/default-avatar.svg'">
            </div>
            <h3>${player.name}</h3>
            <p style="color:var(--text-secondary);margin-top:10px;">Hand the device to this player, then tap "Show Card".</p>
            <button class="btn btn-primary" style="margin-top:15px;background-color:#3498db;" onclick="showShieldCard_reveal()">Show Card</button>
        </div>
    `;
}

// Method A: Reveal Shield or Dud to current player
function showShieldCard_reveal() {
    const listEl = document.getElementById('shield-players-list');
    const player = shieldViewOrder[shieldViewIndex];
    const hasShield = shieldSet.has(player.id);

    const cardColor = hasShield ? '#3498db' : '#7f8c8d';
    const cardBg = hasShield ? 'rgba(52,152,219,0.2)' : 'rgba(127,140,141,0.15)';
    const cardText = hasShield ? 'SHIELD' : 'DUD';
    const cardDesc = hasShield
        ? 'You are protected tonight. If the Traitors target you, the murder will fail.'
        : 'You do not have a shield tonight.';
    const cardIcon = hasShield ? '&#x1F6E1;' : '&mdash;';

    const isLast = shieldViewIndex >= shieldViewOrder.length - 1;

    listEl.innerHTML = `
        <div style="text-align:center;padding:30px 20px;">
            <div style="margin:15px 0;">
                <img src="${player.photo_url || 'images/default-avatar.svg'}" alt="${player.name}"
                     style="width:60px;height:60px;border-radius:50%;object-fit:cover;border:3px solid ${cardColor};"
                     onerror="this.src='images/default-avatar.svg'">
            </div>
            <h3>${player.name}</h3>
            <div style="margin:20px auto;padding:25px;border-radius:12px;max-width:280px;background-color:${cardBg};border:3px solid ${cardColor};">
                <div style="font-size:2.5rem;">${cardIcon}</div>
                <div style="font-size:1.8rem;font-weight:bold;color:${cardColor};margin:10px 0;">${cardText}</div>
                <p style="color:var(--text-secondary);font-size:0.9rem;">${cardDesc}</p>
            </div>
            <button class="btn" style="margin-top:15px;" onclick="shieldCard_next()">${isLast ? 'Done' : 'Next Player'}</button>
        </div>
    `;
}

function shieldCard_next() {
    shieldViewIndex++;
    showShieldCard_blank();
}

// Make functions globally accessible for onclick
window.showShieldCard_reveal = showShieldCard_reveal;
window.shieldCard_next = shieldCard_next;

// ========== STEP 4: VOTING ==========
function goToVoting() {
    switchToStep('step-voting');
    const mode = gameState.settings.votingMode;
    const infoEl = document.getElementById('voting-mode-info');
    const area = document.getElementById('voting-area');

    playerVotes = {};

    if (mode === 1) {
        infoEl.textContent = 'Mode 1: For each candidate, count raised hands. Players can vote for multiple candidates.';
        renderMode1Voting(area);
    } else {
        infoEl.textContent = 'Mode 2: Each player names exactly one other player to banish.';
        renderMode2Voting(area);
    }
}

function renderMode1Voting(container) {
    const alive = getAlivePlayers();
    alive.forEach(p => { playerVotes[p.id] = 0; });

    container.innerHTML = alive.map(p => `
        <div class="vote-candidate" data-id="${p.id}">
            <img src="${p.photo_url || 'images/default-avatar.svg'}" alt="${p.name}" onerror="this.src='images/default-avatar.svg'">
            <span class="candidate-name">${p.name}</span>
            <span class="vote-count-display" id="vote-${p.id}">0</span>
            <div class="vote-btn-group">
                <button class="vote-btn-small plus" onclick="changeVote('${p.id}',1)">+</button>
                <button class="vote-btn-small minus" onclick="changeVote('${p.id}',-1)">-</button>
            </div>
        </div>
    `).join('');
}

function renderMode2Voting(container) {
    const alive = getAlivePlayers();
    alive.forEach(p => { playerVotes[p.id] = 0; });

    container.innerHTML = '<div id="mode2-voters">';
    alive.forEach(p => {
        const otherPlayers = alive.filter(o => o.id !== p.id);
        container.innerHTML += `
            <div class="mode2-voter">
                <img src="${p.photo_url || 'images/default-avatar.svg'}" alt="${p.name}" onerror="this.src='images/default-avatar.svg'">
                <span class="voter-name">${p.name}</span>
                <select id="mode2-vote-${p.id}" data-voter="${p.id}">
                    <option value="">-- Select --</option>
                    ${otherPlayers.map(o => `<option value="${o.id}">${o.name}</option>`).join('')}
                </select>
            </div>
        `;
    });
    container.innerHTML += '</div>';
}

function changeVote(playerId, delta) {
    if (!playerVotes.hasOwnProperty(playerId)) return;
    const newVal = playerVotes[playerId] + delta;
    if (newVal < 0) return;
    playerVotes[playerId] = newVal;
    const el = document.getElementById('vote-' + playerId);
    if (el) el.textContent = newVal;
}
window.changeVote = changeVote;

// ========== STEP 5: BANISHMENT ==========
function applyBanishment() {
    const mode = gameState.settings.votingMode;

    if (mode === 2) {
        // Tally mode 2 votes
        const alive = getAlivePlayers();
        alive.forEach(p => { playerVotes[p.id] = 0; });
        alive.forEach(p => {
            const sel = document.getElementById('mode2-vote-' + p.id);
            if (sel && sel.value) {
                playerVotes[sel.value] = (playerVotes[sel.value] || 0) + 1;
            }
        });
    }

    // Find player with most votes
    let maxVotes = 0;
    let candidates = [];
    for (const [playerId, votes] of Object.entries(playerVotes)) {
        if (votes > maxVotes) {
            maxVotes = votes;
            candidates = [playerId];
        } else if (votes === maxVotes && votes > 0) {
            candidates.push(playerId);
        }
    }

    const resultArea = document.getElementById('banishment-result-area');

    if (maxVotes === 0 || candidates.length === 0) {
        resultArea.innerHTML = `
            <div class="banishment-result" style="background-color:rgba(52,152,219,0.2);border:2px solid #3498db;">
                <h3>No Banishment</h3>
                <p>No player received any votes. The day ends without a banishment.</p>
            </div>
        `;
        switchToStep('step-result');
        postBanishmentCheck();
        return;
    }

    if (candidates.length > 1) {
        // Tie - show runoff message
        const tiedNames = candidates.map(id => {
            const p = gameState.players.find(pl => pl.id === id);
            return p ? p.name : id;
        }).join(', ');
        resultArea.innerHTML = `
            <div class="banishment-result" style="background-color:rgba(241,196,15,0.2);border:2px solid #f1c40f;">
                <h3>Tie! Runoff Needed</h3>
                <p>The following players are tied with ${maxVotes} votes each: <strong>${tiedNames}</strong></p>
                <p>Conduct a runoff vote among these players, then select the banished player below.</p>
                <div style="margin-top:15px;">
                    ${candidates.map(id => {
                        const p = gameState.players.find(pl => pl.id === id);
                        return `<button class="btn" style="margin:5px;background-color:#9b59b6;color:white;" onclick="banishPlayer('${id}')">${p ? p.name : id}</button>`;
                    }).join('')}
                </div>
            </div>
        `;
        switchToStep('step-result');
        return;
    }

    // Single winner - banish them
    banishPlayer(candidates[0]);
}

function banishPlayer(playerId) {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return;

    // Add to eliminated
    if (!gameState.eliminatedPlayers) gameState.eliminatedPlayers = [];
    gameState.eliminatedPlayers.push({
        id: player.id,
        name: player.name,
        role: player.role,
        eliminatedInRound: gameState.currentRound,
        eliminatedInPhase: 'banishment',
        roleRevealed: true
    });

    // Track if traitor was banished
    const wasTraitor = player.role === 'traitor';
    gameState.lastBanishedWasTraitor = wasTraitor;
    if (wasTraitor) {
        gameState.traitorsBanished = (gameState.traitorsBanished || 0) + 1;
        // Recruitment is only available once: the night after the FIRST traitor is banished
        if (!gameState.recruitmentUsed && gameState.traitorsBanished === 1) {
            gameState.recruitmentAvailableTonight = true;
        } else {
            gameState.recruitmentAvailableTonight = false;
        }
    } else {
        gameState.recruitmentAvailableTonight = false;
    }

    saveGameState();

    // Show result
    const resultArea = document.getElementById('banishment-result-area');
    const cssClass = wasTraitor ? 'traitor-banished' : 'faithful-banished';
    const roleColor = wasTraitor ? '#9b59b6' : '#2ecc71';
    const roleName = wasTraitor ? 'TRAITOR' : 'FAITHFUL';

    resultArea.innerHTML = `
        <div class="banishment-result ${cssClass}">
            <div style="margin-bottom:15px;">
                <img src="${player.photo_url || 'images/default-avatar.svg'}"
                     alt="${player.name}"
                     style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid ${roleColor};"
                     onerror="this.src='images/default-avatar.svg'">
            </div>
            <h3>${player.name} has been banished!</h3>
            <p style="font-size:1.3rem;font-weight:bold;color:${roleColor};margin:10px 0;">${roleName}</p>
            <p>${wasTraitor ? 'A Traitor has been found!' : 'An innocent Faithful has been banished.'}</p>
            ${wasTraitor ? '<p style="font-size:0.85rem;color:var(--text-secondary);margin-top:10px;">Recruitment will be available to Traitors tonight.</p>' : ''}
        </div>
    `;

    switchToStep('step-result');
    postBanishmentCheck();
}
window.banishPlayer = banishPlayer;

function postBanishmentCheck() {
    const alive = getAlivePlayers();
    const statusDiv = document.getElementById('post-banishment-status');
    const infoDiv = document.getElementById('post-banishment-info');
    const nightBtn = document.getElementById('go-night-btn');

    statusDiv.style.display = 'block';

    // Check if exactly 2 players remain -> game ends
    if (alive.length <= 2) {
        const hasTraitor = alive.some(p => p.role === 'traitor');
        gameState.gameOver = true;
        gameState.winner = hasTraitor ? 'traitors' : 'faithful';
        gameState.winReason = alive.length === 2
            ? (hasTraitor ? 'Only 2 players remain and at least one is a Traitor. Traitors win!' : 'Only 2 Faithful remain. Faithful win!')
            : 'Only 1 player remains.';
        saveGameState();

        infoDiv.innerHTML = `<p style="color:#e74c3c;font-weight:bold;">Game Over! ${gameState.winReason}</p>`;
        nightBtn.textContent = 'View Game Results';
        nightBtn.onclick = () => { window.location.href = 'traitor-game-over.html'; };
        return;
    }

    // Check if living players < 5 -> trigger Fire of Truth
    if (alive.length < 5) {
        gameState.isFireOfTruth = true;
        saveGameState();

        infoDiv.innerHTML = `
            <p style="color:#e67e22;font-weight:bold;">Fire of Truth Triggered!</p>
            <p>Only ${alive.length} players remain. The game enters Fire of Truth mode.</p>
        `;
        nightBtn.textContent = 'Proceed to Fire of Truth';
        nightBtn.onclick = () => { window.location.href = 'traitor-fire-of-truth.html'; };
        return;
    }

    // Normal continuation
    infoDiv.innerHTML = `
        <p><strong>Players Alive:</strong> ${alive.length}</p>
        <p><strong>Next Phase:</strong> Night ${gameState.currentRound}</p>
    `;
    nightBtn.textContent = 'Proceed to Night';
    nightBtn.onclick = goToNight;
}

function goToNight() {
    gameState.gamePhase = 'night';
    // Reset day state for next day
    gameState.dayState.challengesTaken = {};
    gameState.dayState.isBlindDay = false;
    saveGameState();
    window.location.href = 'traitor-night.html';
}

// ========== NARRATOR INFO ==========
function showNarratorInfo() {
    const content = document.getElementById('narrator-info-content');
    const alive = getAlivePlayers();
    const traitors = getAliveTraitors();
    const faithful = getAliveFaithful();

    content.innerHTML = `
        <div style="margin-bottom:15px;">
            <h3>Current Traitors (${traitors.length})</h3>
            ${traitors.map(p => `
                <div style="display:flex;align-items:center;padding:8px;margin:4px 0;background-color:rgba(155,89,182,0.15);border-radius:6px;">
                    <img src="${p.photo_url || 'images/default-avatar.svg'}" alt="${p.name}" style="width:35px;height:35px;border-radius:50%;object-fit:cover;margin-right:10px;" onerror="this.src='images/default-avatar.svg'">
                    <span style="color:#9b59b6;font-weight:bold;">${p.name}</span>
                    ${p.isConvertedTraitor ? '<span style="font-size:0.75rem;margin-left:8px;color:#e67e22;">(Recruited)</span>' : ''}
                </div>
            `).join('')}
        </div>
        <div style="margin-bottom:15px;">
            <h3>Current Faithful (${faithful.length})</h3>
            ${faithful.map(p => `
                <div style="display:flex;align-items:center;padding:8px;margin:4px 0;background-color:rgba(46,204,113,0.15);border-radius:6px;">
                    <img src="${p.photo_url || 'images/default-avatar.svg'}" alt="${p.name}" style="width:35px;height:35px;border-radius:50%;object-fit:cover;margin-right:10px;" onerror="this.src='images/default-avatar.svg'">
                    <span style="color:#2ecc71;font-weight:bold;">${p.name}</span>
                </div>
            `).join('')}
        </div>
        <div style="margin-bottom:15px;">
            <h3>Game Info</h3>
            <p><strong>Round:</strong> ${gameState.currentRound}</p>
            <p><strong>Players Alive:</strong> ${alive.length}</p>
            <p><strong>Traitors Banished:</strong> ${gameState.traitorsBanished || 0}</p>
            <p><strong>Recruitment Available Tonight:</strong> ${gameState.recruitmentAvailableTonight ? 'Yes' : 'No'}</p>
            <p><strong>Recruitment Used:</strong> ${gameState.recruitmentUsed ? 'Yes (no longer available)' : 'No (still available after first Traitor banishment)'}</p>
            <p><strong>Shield Method:</strong> ${gameState.settings.shieldMethod}</p>
            <p><strong>Voting Mode:</strong> ${gameState.settings.votingMode}</p>
        </div>
        ${gameState.nightState.shields && gameState.nightState.shields.length > 0 ? `
        <div>
            <h3>Current Shields</h3>
            ${gameState.nightState.shields.map(id => {
                const p = gameState.players.find(pl => pl.id === id);
                return p ? `<p style="color:#3498db;">${p.name}</p>` : '';
            }).join('')}
        </div>
        ` : ''}
    `;

    document.getElementById('narrator-modal').style.display = 'block';
}
