console.log('Player selection page loaded');

// Wait for DOM content to load
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM content loaded in player-selection.js');
    
    // Initialize refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            console.log('Refresh button clicked');
            location.reload();
        });
    }

    // Initialize back button if needed
    const backBtn = document.querySelector('a[href="index.html"]');
    if (backBtn) {
        console.log('Back to Home button found');
    } else {
        console.log('Back to Home button not found, will be added by the displayPlayers function');
    }

    // Show loading indicator
    const playersContainer = document.getElementById('players-container');
    if (playersContainer) {
        playersContainer.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>Loading players...</p>
            </div>
        `;
    }

    try {
        // Listen for the supabaseInitialized event
        document.addEventListener('supabaseInitialized', function() {
            console.log('Supabase initialized event received in player-selection.js');
        });
        
        // Listen for custom event when dbManager is ready
        document.addEventListener('dbManagerReady', function(event) {
            console.log('dbManagerReady event received:', event.detail || {});
            clearTimeout(initTimeout); // Clear timeout since database manager is ready
            displayPlayers();
            setupEventListeners();
        });

        // Set a timeout to handle database initialization issues
        const initTimeout = setTimeout(() => {
            console.error('Database initialization timeout');
            
            // Check if dbManager already exists in some form
            if (window.dbManager) {
                console.log('Database manager exists but may not be fully initialized');
                
                if (!window.dbManager.players || window.dbManager.players.length === 0) {
                    console.log('No players found in database manager, loading default players');
                    loadDefaultPlayers();
                } else {
                    console.log(`Found ${window.dbManager.players.length} players in database manager`);
                    displayPlayers();
                    setupEventListeners();
                }
            } else {
                console.log('Database manager does not exist, creating fallback');
                loadDefaultPlayers();
            }
        }, 10000); // 10 seconds timeout
        
        // Check if dbManager already exists and has players
        if (window.dbManager && window.dbManager.players && window.dbManager.players.length > 0) {
            clearTimeout(initTimeout);
            console.log(`Database manager already exists with ${window.dbManager.players.length} players`);
            displayPlayers();
            setupEventListeners();
            return;
        }
        
        // If dbManager exists but doesn't have players, try initializing it
        if (window.dbManager && (!window.dbManager.players || window.dbManager.players.length === 0)) {
            console.log('Database manager exists but has no players. Trying to initialize...');
            
            if (typeof window.dbManager.initialize === 'function' && !window.dbManager.initializationInProgress) {
                try {
                    console.log('Calling database manager initialize()');
                    await window.dbManager.initialize();
                    
                    // Check if players were loaded
                    if (window.dbManager.players && window.dbManager.players.length > 0) {
                        clearTimeout(initTimeout);
                        console.log(`${window.dbManager.players.length} players loaded from initialize()`);
                        displayPlayers();
                        setupEventListeners();
                        return;
                    } else {
                        console.log('No players were loaded from initialize()');
                    }
                } catch (initError) {
                    console.error('Error initializing database manager:', initError);
                }
            } else {
                console.log('Cannot initialize database manager: method not available or initialization in progress');
            }
        }
        
        // Wait for the database manager to load players if it's not already loaded
        const checkInterval = setInterval(() => {
            if (window.dbManager) {
                if (window.dbManager.players && window.dbManager.players.length > 0) {
                    clearInterval(checkInterval);
                    clearTimeout(initTimeout);
                    console.log(`${window.dbManager.players.length} players loaded, displaying now`);
                    displayPlayers();
                    setupEventListeners();
                } else if (window.dbManager.initialized) {
                    // If dbManager is initialized but no players were found, load defaults
                    clearInterval(checkInterval);
                    clearTimeout(initTimeout);
                    console.log('Database manager initialized but no players found');
                    
                    // Try one more time to explicitly load players
                    if (typeof window.dbManager.loadPlayers === 'function') {
                        window.dbManager.loadPlayers().then(players => {
                            if (players && players.length > 0) {
                                console.log(`${players.length} players loaded from explicit call`);
                                displayPlayers();
                                setupEventListeners();
                            } else {
                                loadDefaultPlayers();
                            }
                        }).catch(err => {
                            console.error('Error loading players:', err);
                            loadDefaultPlayers();
                        });
                    } else {
                        loadDefaultPlayers();
                    }
                }
            }
        }, 500);
    } catch (error) {
        console.error('Error in player selection initialization:', error);
        showError('Error initializing: ' + error.message);
        loadDefaultPlayers();
    }
});

// Show error message in players container
function showError(message) {
    const playersContainer = document.getElementById('players-container');
    if (playersContainer) {
        playersContainer.innerHTML = `<div class="error-message">${message}</div>`;
    }
}

// Load default players when database fails
function loadDefaultPlayers() {
    console.log('Loading default players');
    const defaultPlayers = [
        { id: '1', name: 'Alice', photo_url: 'images/default-avatar.svg' },
        { id: '2', name: 'Bob', photo_url: 'images/default-avatar.svg' },
        { id: '3', name: 'Charlie', photo_url: 'images/default-avatar.svg' },
        { id: '4', name: 'David', photo_url: 'images/default-avatar.svg' },
        { id: '5', name: 'Emily', photo_url: 'images/default-avatar.svg' },
        { id: '6', name: 'Frank', photo_url: 'images/default-avatar.svg' }
    ];
    
    // Create a simple dbManager if it doesn't exist
    if (!window.dbManager) {
        window.dbManager = {
            players: defaultPlayers,
            selectedPlayers: [],
            getSelectedPlayers: function() {
                return this.selectedPlayers;
            },
            togglePlayerSelection: function(playerId) {
                const playerIndex = this.selectedPlayers.findIndex(p => p.id === playerId);
                const player = this.players.find(p => p.id === playerId);
                
                if (playerIndex === -1 && player) {
                    this.selectedPlayers.push(player);
                } else if (playerIndex !== -1) {
                    this.selectedPlayers.splice(playerIndex, 1);
                }
                
                return this.selectedPlayers.length;
            },
            saveSelectedPlayers: function() {
                localStorage.setItem('selectedPlayers', JSON.stringify(this.selectedPlayers));
                return this.selectedPlayers;
            }
        };
    } else {
        // If dbManager exists but has no players, add the default ones
        window.dbManager.players = defaultPlayers;
    }
    
    displayPlayers();
    setupEventListeners();
}

// Display players in the grid
function displayPlayers() {
    const playersContainer = document.getElementById('players-container');
    
    // Clear loading message
    playersContainer.innerHTML = '';
    
    if (!window.dbManager) {
        showError('Database manager not initialized');
        return;
    }
    
    // Log raw players data to help debug
    console.log('DEBUG: Raw players data:', window.dbManager.players);
    console.log('DEBUG: Selected players:', window.dbManager.selectedPlayers);
    
    if (!window.dbManager.players || !window.dbManager.players.length) {
        showError('No players found');
        return;
    }
    
    console.log(`DEBUG: Displaying ${window.dbManager.players.length} players`);
    
    // First sort players by sequence before creating cards
    const sortedPlayers = [...window.dbManager.players].sort((a, b) => {
        const seqA = a.sequence !== undefined ? a.sequence : 9999;
        const seqB = b.sequence !== undefined ? b.sequence : 9999;
        return seqA - seqB;
    });
    
    // Create player cards
    sortedPlayers.forEach(player => {
        const playerCard = createPlayerCard(player);
        
        // Check if this player is already selected in the dbManager
        const isPlayerSelected = window.dbManager.selectedPlayers.some(
            selected => selected.username === player.username
        );
        
        // Pre-select the player if they're in the selected players list
        if (isPlayerSelected) {
            const checkbox = playerCard.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.checked = true;
                playerCard.classList.add('selected');
            }
        }
        
        playersContainer.appendChild(playerCard);
    });
    
    // Initial sort by sequence
    sortPlayerCardsBySequence();
    
    // Update selected count
    const selectedPlayers = window.dbManager.getSelectedPlayers();
    console.log('DEBUG: Current selected players in dbManager:', selectedPlayers);
    document.getElementById('selected-count').textContent = selectedPlayers.length;
    
    // Enable continue button if enough players are selected
    const continueBtn = document.getElementById('continue-btn');
    if (continueBtn) {
        continueBtn.disabled = selectedPlayers.length < 4;
    }
}

// Create a player card element
function createPlayerCard(player) {
    console.log('Creating card for player:', player);
    
    const card = document.createElement('div');
    card.className = 'player-card';
    
    // Handle player id which might be in different formats
    const id = player.id || player.player_id || player.playerid || 
              (typeof player === 'object' ? Object.values(player)[0] : 'unknown');
    card.dataset.id = id;
    
    // Set sequence attribute if it exists, default to 9999 if not set
    card.dataset.sequence = player.sequence !== undefined ? player.sequence : 9999;
    
    // Handle various possible property names and deal with SQL result format
    let name, phone, photoUrl, username;
    
    // If player is from SQL query, it might have a different structure
    if (player.row) {
        const row = player.row;
        name = row[1] || 'Unknown Player'; // Assuming name is 2nd column
        phone = row[2] || '';              // Assuming phone is 3rd column
        photoUrl = row[3] || 'images/default-avatar.svg'; // Assuming photo is 4th column
        username = row[4] || id;           // Assuming username is 5th column, fall back to id
    } else {
        name = player.name || player.full_name || player.player_name || 'Unknown Player';
        phone = player.phone || player.phone_number || '';
        photoUrl = player.photo_url || player.photoUrl || player.avatar || player.photo || 'images/default-avatar.svg';
        username = player.username || id;  // Fall back to id if username is not defined
    }
    
    console.log('Player properties:', { id, name, phone, photoUrl, username });
    
    // Add edit button styles to card header
    card.innerHTML = `
        <div class="player-photo" style="position: relative;">
            <img src="${photoUrl}" alt="${name}" onerror="this.src='images/default-avatar.svg'">
            <a href="edit-player.html?username=${username}" class="edit-player-btn">✎</a>
            <div class="reorder-controls">
                <button class="reorder-btn move-up" title="Move Up">▲</button>
                <button class="reorder-btn move-down" title="Move Down">▼</button>
            </div>
        </div>
        <div class="player-info">
            <h3 class="player-name">${name}</h3>
            ${phone ? `<p>${phone}</p>` : ''}
            <div class="player-select">
                <input type="checkbox" id="select-${id}" class="player-checkbox">
                <label for="select-${id}">Select player</label>
            </div>
        </div>
    `;
    
    return card;
}

// Set up event listeners
function setupEventListeners() {
    // Player selection
    document.querySelectorAll('.player-card').forEach(card => {
        card.addEventListener('click', function(e) {
            // Ignore clicks on the checkbox itself (it will handle its own changes)
            if (e.target.type === 'checkbox') return;
            // Ignore clicks on reorder buttons
            if (e.target.classList.contains('reorder-btn')) return;
            
            const checkbox = this.querySelector('input[type="checkbox"]');
            checkbox.checked = !checkbox.checked;
            
            // Trigger change event on checkbox
            const event = new Event('change');
            checkbox.dispatchEvent(event);
        });
    });
    
    // Reorder buttons
    setupReorderButtons();
    
    // Checkbox change event
    document.querySelectorAll('.player-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const playerId = this.closest('.player-card').dataset.id;
            const isSelected = this.checked;
            
            console.log(`DEBUG: Checkbox change for player ID ${playerId}, selected: ${isSelected}`);
            
            // Toggle selection in the data model
            const selectedCount = window.dbManager.togglePlayerSelection(playerId);
            
            // Update UI
            document.getElementById('selected-count').textContent = selectedCount;
            
            // Toggle selected class on the card
            this.closest('.player-card').classList.toggle('selected', isSelected);
            
            // Update continue button state
            const continueBtn = document.getElementById('continue-btn');
            if (continueBtn) {
                continueBtn.disabled = selectedCount < 4;
            }
        });
    });
    
    // Save Selections button
    const saveSelectionsBtn = document.getElementById('save-selections-btn');
    if (saveSelectionsBtn) {
        saveSelectionsBtn.addEventListener('click', async function() {
            this.disabled = true;
            this.textContent = 'Saving...';
            
            try {
                if (window.dbManager) {
                    console.log('DEBUG: Manual save of player selections triggered');
                    
                    // Force update the selection status in the database
                    await window.dbManager.updatePreviouslySelectedFlag();
                    
                    // Verify the update worked
                    await window.dbManager.verifyPreviouslySelectedStatus();
                    
                    alert('Player selections saved to database successfully!');
                } else {
                    alert('Database manager not available!');
                }
            } catch (error) {
                console.error('DEBUG: Error saving selections:', error);
                alert(`Error saving selections: ${error.message}`);
            } finally {
                this.disabled = false;
                this.textContent = 'Save Selections';
            }
        });
    }
    
    // Add player form
    const addPlayerForm = document.getElementById('add-player-form');
    if (addPlayerForm) {
        addPlayerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const nameInput = document.getElementById('player-name');
            const usernameInput = document.getElementById('player-username');
            const emailInput = document.getElementById('player-email');
            const photoInput = document.getElementById('player-avatar');
            
            const name = nameInput.value.trim();
            const username = usernameInput.value.trim();
            const email = emailInput.value.trim();
            const photoFile = photoInput.files.length > 0 ? photoInput.files[0] : null;
            
            if (!name) {
                alert('Please enter a player name');
                return;
            }
            
            try {
                // Show loading state
                const submitBtn = this.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;
                submitBtn.textContent = 'Adding...';
                submitBtn.disabled = true;
                
                // Add player to database
                const newPlayer = await window.dbManager.addPlayer(name, username, email, photoFile);
                
                if (newPlayer) {
                    // Reset form
                    this.reset();
                    
                    // Refresh player display
                    displayPlayers();
                    setupEventListeners();
                    
                    // Show success message
                    alert(`Player ${name} added successfully!`);
                } else {
                    throw new Error('Failed to add player');
                }
            } catch (error) {
                console.error('Error adding player:', error);
                alert(`Failed to add player: ${error.message || 'Unknown error'}`);
            } finally {
                // Reset button state
                const submitBtn = this.querySelector('button[type="submit"]');
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
    
    // Continue button
    const continueBtn = document.getElementById('continue-btn');
    if (continueBtn) {
        continueBtn.addEventListener('click', function() {
            const selectedPlayers = window.dbManager.getSelectedPlayers();
            console.log('DEBUG: Continue button clicked, selected players:', selectedPlayers);
            
            if (selectedPlayers.length < 4) {
                alert('Please select at least 4 players to continue');
                return;
            }
            
            // Get the current order of player cards in the UI
            const playersContainer = document.getElementById('players-container');
            const orderedCards = Array.from(playersContainer.querySelectorAll('.player-card.selected'));
            
            // Update sequence numbers based on UI order
            orderedCards.forEach((card, index) => {
                const playerId = card.dataset.id;
                const newSequence = index + 1; // Start from 1
                
                console.log(`Setting sequence ${newSequence} for player ${playerId}`);
                
                // Update sequence in the database
                updatePlayerSequence(playerId, newSequence);
                
                // Also update the sequence in selected players
                const playerIndex = selectedPlayers.findIndex(p => 
                    p.id === playerId || p.username === playerId
                );
                
                if (playerIndex !== -1) {
                    selectedPlayers[playerIndex].sequence = newSequence;
                    console.log(`Updated sequence for selected player at index ${playerIndex} to ${newSequence}`);
                } else {
                    console.warn(`Player ${playerId} not found in selected players array`);
                }
            });
            
            // Ensure all selected players have a sequence value
            selectedPlayers.forEach((player, idx) => {
                if (player.sequence === undefined) {
                    player.sequence = idx + 1;
                    console.log(`Assigned default sequence ${player.sequence} to player ${player.username || player.id}`);
                }
            });
            
            // Sort selected players by sequence
            selectedPlayers.sort((a, b) => {
                const seqA = a.sequence !== undefined ? a.sequence : 9999;
                const seqB = b.sequence !== undefined ? b.sequence : 9999;
                return seqA - seqB;
            });
            
            // Save selected players with updated sequence and redirect
            console.log('DEBUG: Saving selected players with sequence before navigating to role-selection.html');
            
            try {
                // Force an update to the database for the selected players
                if (window.supabase) {
                    // Update each player's previously_selected flag
                    const updatePromises = selectedPlayers.map(player => {
                        return window.supabase
                            .from('profiles')
                            .update({ 
                                previously_selected: true,
                                sequence: player.sequence || 9999
                            })
                            .eq('username', player.username);
                    });
                    
                    // Wait for all updates to complete
                    Promise.all(updatePromises)
                        .then(() => {
                            console.log('All player updates complete, continuing to role selection');
                            // Save to localStorage and redirect
                            window.dbManager.saveSelectedPlayers();
                            window.location.href = 'role-selection.html';
                        })
                        .catch(error => {
                            console.error('Error updating players:', error);
                            // Try direct localStorage save and redirect anyway
                            localStorage.setItem('selectedPlayers', JSON.stringify(selectedPlayers));
                            window.location.href = 'role-selection.html';
                        });
                } else {
                    // No Supabase, just save to localStorage and redirect
                    window.dbManager.saveSelectedPlayers();
                    window.location.href = 'role-selection.html';
                }
            } catch (error) {
                console.error('Error saving selected players:', error);
                
                // Try to save to localStorage directly as fallback
                localStorage.setItem('selectedPlayers', JSON.stringify(selectedPlayers));
                window.location.href = 'role-selection.html';
            }
        });
    }
}

// Setup reorder buttons
function setupReorderButtons() {
    // Handle player reordering with up/down buttons
    document.querySelectorAll('.move-up').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const card = this.closest('.player-card');
            movePlayerUp(card);
        });
    });

    document.querySelectorAll('.move-down').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const card = this.closest('.player-card');
            movePlayerDown(card);
        });
    });
    
    // Initially sort cards by sequence
    sortPlayerCardsBySequence();
    
    // Update button states
    updateReorderButtonStates();
}

// Sort player cards by sequence
function sortPlayerCardsBySequence() {
    const playersContainer = document.getElementById('players-container');
    const cards = Array.from(playersContainer.querySelectorAll('.player-card'));
    
    // Sort the cards by sequence
    cards.sort((a, b) => {
        const seqA = parseInt(a.dataset.sequence) || 9999;
        const seqB = parseInt(b.dataset.sequence) || 9999;
        return seqA - seqB;
    });
    
    // Remove all cards
    cards.forEach(card => card.remove());
    
    // Add them back in the sorted order
    cards.forEach(card => playersContainer.appendChild(card));
    
    // Update button states
    updateReorderButtonStates();
}

// Move a player card up in the order
function movePlayerUp(card) {
    const playersContainer = document.getElementById('players-container');
    const cards = Array.from(playersContainer.querySelectorAll('.player-card'));
    const index = cards.indexOf(card);
    
    if (index <= 0) return; // Already at the top
    
    // Swap sequence values with the card above
    const prevCard = cards[index - 1];
    const currentSeq = parseInt(card.dataset.sequence) || 9999;
    const prevSeq = parseInt(prevCard.dataset.sequence) || 9999;
    
    card.dataset.sequence = prevSeq;
    prevCard.dataset.sequence = currentSeq;
    
    // Update the database with new sequence values
    updatePlayerSequence(card.dataset.id, prevSeq);
    updatePlayerSequence(prevCard.dataset.id, currentSeq);
    
    // Move the card in the DOM
    playersContainer.insertBefore(card, prevCard);
    
    // Update button states
    updateReorderButtonStates();
}

// Move a player card down in the order
function movePlayerDown(card) {
    const playersContainer = document.getElementById('players-container');
    const cards = Array.from(playersContainer.querySelectorAll('.player-card'));
    const index = cards.indexOf(card);
    
    if (index === -1 || index >= cards.length - 1) return; // Already at the bottom
    
    // Swap sequence values with the card below
    const nextCard = cards[index + 1];
    const currentSeq = parseInt(card.dataset.sequence) || 9999;
    const nextSeq = parseInt(nextCard.dataset.sequence) || 9999;
    
    card.dataset.sequence = nextSeq;
    nextCard.dataset.sequence = currentSeq;
    
    // Update the database with new sequence values
    updatePlayerSequence(card.dataset.id, nextSeq);
    updatePlayerSequence(nextCard.dataset.id, currentSeq);
    
    // Move the card in the DOM
    playersContainer.insertBefore(nextCard, card);
    
    // Update button states
    updateReorderButtonStates();
}

// Update button enabled states based on position
function updateReorderButtonStates() {
    const playersContainer = document.getElementById('players-container');
    const cards = Array.from(playersContainer.querySelectorAll('.player-card'));
    
    cards.forEach((card, index) => {
        const upButton = card.querySelector('.move-up');
        const downButton = card.querySelector('.move-down');
        
        if (upButton) upButton.disabled = index === 0;
        if (downButton) downButton.disabled = index === cards.length - 1;
    });
}

// Update player sequence in the database
function updatePlayerSequence(playerId, sequence) {
    if (!window.dbManager) return;
    
    // Find the player in the players array
    const player = window.dbManager.players.find(p => p.username === playerId || p.id === playerId);
    if (!player) {
        console.error(`Player with ID ${playerId} not found`);
        return;
    }
    
    console.log(`Updating sequence for player ${playerId} from ${player.sequence} to ${sequence}`);
    
    // Update sequence in the local player object
    player.sequence = sequence;
    
    // Also update in selected players if present
    const selectedPlayer = window.dbManager.selectedPlayers.find(p => p.username === playerId || p.id === playerId);
    if (selectedPlayer) {
        selectedPlayer.sequence = sequence;
    }
    
    // If supabase is available, update the database
    if (window.supabase) {
        console.log(`Updating sequence for player ${playerId} to ${sequence} in database`);
        let username = player.username; // Use username as the primary key
        
        window.supabase
            .from('profiles')
            .update({ sequence: sequence })
            .eq('username', username)
            .then(({ data, error }) => {
                if (error) {
                    console.error('Error updating player sequence:', error);
                } else {
                    console.log(`Player ${playerId} sequence updated to ${sequence} in database`);
                }
            });
    } else {
        console.log('Supabase not available, sequence will only be saved locally');
    }
    
    // Also save to localStorage so we don't lose the change
    try {
        localStorage.setItem('players', JSON.stringify(window.dbManager.players));
        localStorage.setItem('selectedPlayers', JSON.stringify(window.dbManager.selectedPlayers));
    } catch (e) {
        console.error('Error saving to localStorage:', e);
    }
} 