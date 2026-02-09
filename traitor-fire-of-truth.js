// Traitor Fire of Truth Controller
let gameState = null;
let fotVotes = {}; // { playerId: 'yes' | 'no' | null }
let fotBanishVotes = {}; // { playerId: voteCount }

document.addEventListener('DOMContentLoaded', function() {
    console.log("Fire of Truth page loaded");
    loadGameState();
    setupListeners();
});

function loadGameState() {
    try {
        const stored = localStorage.getItem('gameState');
        if (!stored) { showError("No game state found."); return; }
        gameState = JSON.parse(stored);
        if (gameState.scenario !== 'traitor') { showError("Not a Traitor scenario."); return; }

        document.getElementById('fot-subtitle').textContent =
            `${getAlivePlayers().length} players remaining`;

        showFotVote();
    } catch (error) {
        console.error("Error:", error);
        showError("Error: " + error.message);
    }
}

function showError(msg) {
    document.getElementById('step-fot-vote').innerHTML = `<div style="padding:20px;color:#e74c3c;"><h3>Error</h3><p>${msg}</p></div>`;
}

function setupListeners() {
    document.getElementById('tally-fot-btn').addEventListener('click', tallyFotVotes);
    document.getElementById('apply-fot-banishment-btn').addEventListener('click', applyFotBanishment);
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

function switchToStep(stepId) {
    document.querySelectorAll('.phase-step').forEach(s => s.classList.remove('active'));
    document.getElementById(stepId).classList.add('active');
}

function saveGameState() {
    localStorage.setItem('gameState', JSON.stringify(gameState));
}

// ========== STEP 1: FOT VOTE ==========
function showFotVote() {
    const alive = getAlivePlayers();
    fotVotes = {};
    alive.forEach(p => { fotVotes[p.id] = null; });

    const container = document.getElementById('fot-voters');
    container.innerHTML = alive.map(p => `
        <div class="voter-card" data-id="${p.id}">
            <img src="${p.photo_url || 'images/default-avatar.svg'}" alt="${p.name}" onerror="this.src='images/default-avatar.svg'">
            <span class="voter-name">${p.name}</span>
            <div class="vote-toggle">
                <button id="yes-${p.id}" onclick="setFotVote('${p.id}','yes')">Traitors Here</button>
                <button id="no-${p.id}" onclick="setFotVote('${p.id}','no')">All Faithful</button>
            </div>
        </div>
    `).join('');
}

function setFotVote(playerId, vote) {
    fotVotes[playerId] = vote;

    // Update button styles
    const yesBtn = document.getElementById('yes-' + playerId);
    const noBtn = document.getElementById('no-' + playerId);

    yesBtn.className = vote === 'yes' ? 'selected-yes' : '';
    noBtn.className = vote === 'no' ? 'selected-no' : '';
}
window.setFotVote = setFotVote;

function tallyFotVotes() {
    const alive = getAlivePlayers();

    // Check all have voted
    const unvoted = alive.filter(p => fotVotes[p.id] === null);
    if (unvoted.length > 0) {
        alert(`${unvoted.length} player(s) have not voted yet.`);
        return;
    }

    // Check if unanimous "no" (all Faithful)
    const allNo = alive.every(p => fotVotes[p.id] === 'no');

    if (allNo) {
        // Unanimous - game ends
        handleUnanimousFaithful();
    } else {
        // Not unanimous - continue with banishment
        handleNotUnanimous();
    }
}

function handleUnanimousFaithful() {
    switchToStep('step-fot-result');

    const alive = getAlivePlayers();
    const hasTraitor = alive.some(p => p.role === 'traitor');

    gameState.gameOver = true;

    if (hasTraitor) {
        gameState.winner = 'traitors';
        gameState.winReason = 'All players voted "We are all Faithful", but a Traitor remains among them. Traitors win!';
    } else {
        gameState.winner = 'faithful';
        gameState.winReason = 'All players voted "We are all Faithful" and they were correct! No Traitors remain. Faithful win!';
    }
    saveGameState();

    const content = document.getElementById('fot-result-content');
    const cssClass = hasTraitor ? 'traitors-win' : 'faithful-win';
    const icon = hasTraitor ? '' : '';

    content.innerHTML = `
        <div class="result-banner ${cssClass}">
            <h2 style="font-size:2rem;margin-bottom:10px;">${icon} ${gameState.winner === 'traitors' ? 'Traitors Win!' : 'Faithful Win!'}</h2>
            <p style="font-size:1.1rem;">${gameState.winReason}</p>
        </div>
        <div class="fire-card" style="margin-top:15px;">
            <h3>Revealed Roles</h3>
            ${alive.map(p => {
                const color = p.role === 'traitor' ? '#9b59b6' : '#2ecc71';
                const label = p.role === 'traitor' ? 'TRAITOR' : 'FAITHFUL';
                return `
                    <div style="display:flex;align-items:center;padding:8px;margin:5px 0;border-radius:6px;background-color:rgba(${p.role === 'traitor' ? '155,89,182' : '46,204,113'},0.15);">
                        <img src="${p.photo_url || 'images/default-avatar.svg'}" alt="${p.name}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;margin-right:10px;" onerror="this.src='images/default-avatar.svg'">
                        <span style="flex-grow:1;font-weight:bold;">${p.name}</span>
                        <span style="color:${color};font-weight:bold;">${label}</span>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    const actionBtn = document.getElementById('fot-action-btn');
    actionBtn.textContent = 'View Game Results';
    actionBtn.onclick = () => { window.location.href = 'traitor-game-over.html'; };
}

function handleNotUnanimous() {
    switchToStep('step-fot-result');
    const content = document.getElementById('fot-result-content');
    content.innerHTML = `
        <div class="fire-announcement" style="border-color:#e74c3c;background-color:rgba(231,76,60,0.15);">
            <h2 style="color:#e74c3c;">Not Unanimous</h2>
            <p>At least one player voted "There are Traitors among us."</p>
            <p style="margin-top:10px;">The game continues with a banishment cycle.</p>
        </div>
    `;

    const actionBtn = document.getElementById('fot-action-btn');
    actionBtn.textContent = 'Proceed to Banishment';
    actionBtn.onclick = () => showFotBanishment();
}

// ========== BANISHMENT IN FOT ==========
function showFotBanishment() {
    switchToStep('step-fot-banishment');
    const alive = getAlivePlayers();
    fotBanishVotes = {};
    alive.forEach(p => { fotBanishVotes[p.id] = 0; });

    const container = document.getElementById('fot-banishment-candidates');
    container.innerHTML = alive.map(p => `
        <div class="vote-candidate-fot" data-id="${p.id}">
            <img src="${p.photo_url || 'images/default-avatar.svg'}" alt="${p.name}" onerror="this.src='images/default-avatar.svg'">
            <span class="name">${p.name}</span>
            <span class="fot-vote-count" id="fot-vc-${p.id}">0</span>
            <div class="fot-vote-btn-group">
                <button class="fot-vote-btn plus" onclick="changeFotVote('${p.id}',1)">+</button>
                <button class="fot-vote-btn minus" onclick="changeFotVote('${p.id}',-1)">-</button>
            </div>
        </div>
    `).join('');
}

function changeFotVote(playerId, delta) {
    if (!fotBanishVotes.hasOwnProperty(playerId)) return;
    const newVal = fotBanishVotes[playerId] + delta;
    if (newVal < 0) return;
    fotBanishVotes[playerId] = newVal;
    const el = document.getElementById('fot-vc-' + playerId);
    if (el) el.textContent = newVal;
}
window.changeFotVote = changeFotVote;

function applyFotBanishment() {
    // Find highest
    let maxVotes = 0;
    let candidates = [];
    for (const [id, votes] of Object.entries(fotBanishVotes)) {
        if (votes > maxVotes) {
            maxVotes = votes;
            candidates = [id];
        } else if (votes === maxVotes && votes > 0) {
            candidates.push(id);
        }
    }

    if (maxVotes === 0) {
        alert("No votes recorded. Please vote for at least one player.");
        return;
    }

    if (candidates.length > 1) {
        // Tie
        const names = candidates.map(id => {
            const p = gameState.players.find(pl => pl.id === id);
            return p ? p.name : id;
        }).join(', ');

        switchToStep('step-fot-banish-result');
        const content = document.getElementById('fot-banish-result-content');
        content.innerHTML = `
            <div class="banish-result-fot" style="background-color:rgba(241,196,15,0.2);border:2px solid #f1c40f;">
                <h3>Tie! Select who to banish:</h3>
                <p>${names}</p>
                <div style="margin-top:15px;">
                    ${candidates.map(id => {
                        const p = gameState.players.find(pl => pl.id === id);
                        return `<button class="btn" style="margin:5px;background-color:#e67e22;color:white;" onclick="fotBanishPlayer('${id}')">${p ? p.name : id}</button>`;
                    }).join('')}
                </div>
            </div>
        `;
        return;
    }

    fotBanishPlayer(candidates[0]);
}

function fotBanishPlayer(playerId) {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return;

    // Add to eliminated
    if (!gameState.eliminatedPlayers) gameState.eliminatedPlayers = [];
    gameState.eliminatedPlayers.push({
        id: player.id,
        name: player.name,
        role: player.role,
        eliminatedInRound: gameState.currentRound,
        eliminatedInPhase: 'fire-of-truth-banishment',
        roleRevealed: true
    });

    const wasTraitor = player.role === 'traitor';
    if (wasTraitor) {
        gameState.traitorsBanished = (gameState.traitorsBanished || 0) + 1;
    }
    saveGameState();

    switchToStep('step-fot-banish-result');
    const content = document.getElementById('fot-banish-result-content');
    const roleColor = wasTraitor ? '#9b59b6' : '#2ecc71';
    const roleName = wasTraitor ? 'TRAITOR' : 'FAITHFUL';

    content.innerHTML = `
        <div class="banish-result-fot" style="background-color:rgba(${wasTraitor ? '155,89,182' : '46,204,113'},0.2);border:2px solid ${roleColor};">
            <div style="margin-bottom:10px;">
                <img src="${player.photo_url || 'images/default-avatar.svg'}"
                     alt="${player.name}"
                     style="width:70px;height:70px;border-radius:50%;object-fit:cover;border:3px solid ${roleColor};"
                     onerror="this.src='images/default-avatar.svg'">
            </div>
            <h3>${player.name} banished!</h3>
            <p style="font-size:1.2rem;font-weight:bold;color:${roleColor};">${roleName}</p>
        </div>
    `;

    // Check post-banishment
    const alive = getAlivePlayers();
    const continueBtn = document.getElementById('fot-continue-btn');

    if (alive.length <= 2) {
        // Final two - game ends
        const hasTraitor = alive.some(p => p.role === 'traitor');
        gameState.gameOver = true;
        gameState.winner = hasTraitor ? 'traitors' : 'faithful';
        gameState.winReason = alive.length === 2
            ? (hasTraitor ? 'Only 2 players remain. A Traitor survives. Traitors win!' : 'Only 2 Faithful remain. Faithful win!')
            : (alive.length === 1 ? 'Only 1 player remains.' : 'No players remain.');
        saveGameState();

        content.innerHTML += `
            <div class="result-banner ${hasTraitor ? 'traitors-win' : 'faithful-win'}" style="margin-top:15px;">
                <h2>${gameState.winner === 'traitors' ? 'Traitors Win!' : 'Faithful Win!'}</h2>
                <p>${gameState.winReason}</p>
            </div>
        `;

        continueBtn.textContent = 'View Game Results';
        continueBtn.onclick = () => { window.location.href = 'traitor-game-over.html'; };
    } else {
        // More than 2 players - return to Fire of Truth
        continueBtn.textContent = 'Return to Fire of Truth Vote';
        continueBtn.onclick = () => {
            switchToStep('step-fot-vote');
            showFotVote();
            document.getElementById('fot-subtitle').textContent = `${alive.length} players remaining`;
        };
    }
}
window.fotBanishPlayer = fotBanishPlayer;
