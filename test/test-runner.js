document.addEventListener('DOMContentLoaded', async () => {
    // Fetch N from config file
    const N = await fetch('test.config')
        .then(response => response.text())
        .then(text => parseInt(text.split('=')[1], 10))
        .catch(() => 100); // Default to 100 if config fails

    // Use a fixed set of players and roles for consistent testing
    const players = [
        { id: 1, name: 'Player 1', sequence: 1 },
        { id: 2, name: 'Player 2', sequence: 2 },
        { id: 3, name: 'Player 3', sequence: 3 },
        { id: 4, name: 'Player 4', sequence: 4 },
        { id: 5, name: 'Player 5', sequence: 5 },
        { id: 6, name: 'Player 6', sequence: 6 },
        { id: 7, name: 'Player 7', sequence: 7 },
        { id: 8, name: 'Player 8', sequence: 8 },
        { id: 9, name: 'Player 9', sequence: 9 },
        { id: 10, name: 'Player 10', sequence: 10 },
    ];

    const roles = getEnabledRoles().slice(0, players.length);
    const roleNames = roles.map(r => r.name);

    console.log(`Starting test with ${N} runs...`);
    console.log('Players:', players.map(p => p.name));
    console.log('Roles:', roleNames);

    const results = {}; // To store role distribution
    players.forEach(player => {
        results[player.name] = {};
        roleNames.forEach(roleName => {
            results[player.name][roleName] = 0;
        });
    });

    for (let i = 0; i < N; i++) {
        // A single Fisher-Yates shuffle is sufficient for a uniform random permutation.
        // Shuffling three times as requested.
        let shuffledRoles = [...roles];
        for (let j = 0; j < 3; j++) {
            shuffleArray(shuffledRoles);
        }

        const assignments = players.map((player, index) => ({
            player: player.name,
            role: shuffledRoles[index].name
        }));

        // Record results
        assignments.forEach(assignment => {
            results[assignment.player][assignment.role]++;
        });
        
        const assignmentOrder = assignments.map(a => a.role);
        console.log(`Run ${i + 1}: (${assignmentOrder.join(', ')})`);
    }

    console.log('Test finished.');
    console.log('Role distribution results:', results);

    calculateAndDisplayRandomness(results, players, roleNames, N);
    renderChart(results, players, roleNames);
});

function calculateAndDisplayRandomness(results, players, roleNames, N) {
    const numPlayers = players.length;
    const numRoles = roleNames.length;

    // Expected frequency for a perfectly random distribution
    const expected = N / numPlayers;

    let chi2 = 0;
    for (const player of players) {
        for (const roleName of roleNames) {
            const observed = results[player.name][roleName];
            chi2 += Math.pow(observed - expected, 2) / expected;
        }
    }

    // Degrees of freedom = (rows - 1) * (cols - 1)
    const df = (numPlayers - 1) * (numRoles - 1);

    // p-value is the probability of observing a result this extreme by chance.
    // It's 1 - the cumulative distribution function (CDF) of the chi2 value.
    const pValue = 1 - jStat.chisquare.cdf(chi2, df);

    const randomnessIndex = pValue * 100;

    console.log(`Chi-squared statistic: ${chi2.toFixed(2)}`);
    console.log(`P-value: ${pValue.toFixed(4)}`);
    console.log(`Randomness Index: ${randomnessIndex.toFixed(2)}%`);

    const indexElement = document.getElementById('randomness-index');
    indexElement.textContent = `${randomnessIndex.toFixed(2)}%`;
}

/**
 * Returns a cryptographically secure random integer between 0 (inclusive) and max (exclusive).
 * Uses rejection sampling to avoid modulo bias.
 * @param {number} max The upper bound for the random number (exclusive).
 * @returns {number} A random integer.
 */
function cryptoRandomInt(max) {
    // Create a typed array to hold the random value.
    const randomValues = new Uint32Array(1);
    
    // Generate a random 32-bit integer.
    crypto.getRandomValues(randomValues);

    // To avoid bias, we use rejection sampling. We find the largest multiple of `max`
    // that fits in the 32-bit range. If the generated number is larger than this,
    // we discard it and try again.
    const maxValid = Math.floor(0xFFFFFFFF / max) * max;
    
    if (randomValues[0] > maxValid) {
        return cryptoRandomInt(max); // Re-roll
    }
    
    return randomValues[0] % max;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        // The range of j is [0, i], so we need a random number up to (but not including) i + 1.
        const j = cryptoRandomInt(i + 1);
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function renderChart(results, players, roleNames) {
    const ctx = document.getElementById('results-chart').getContext('2d');
    
    const datasets = roleNames.map(roleName => {
        return {
            label: roleName,
            data: players.map(player => results[player.name][roleName]),
            borderWidth: 1
        };
    });

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: players.map(p => p.name),
            datasets: datasets
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    stacked: true
                },
                x: {
                    stacked: true
                }
            },
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Role Assignment Distribution'
                }
            }
        }
    });
}

function getEnabledRoles() {
    // This function is expected to be in roles.js
    if (typeof ROLES !== 'undefined') {
        return ROLES.filter(role => role.isEnabled);
    }
    return [];
} 