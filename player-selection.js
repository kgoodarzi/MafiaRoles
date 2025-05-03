console.log('Player selection page loaded');

// Wait for DOM content to load
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM content loaded');
    
    // Remove any existing debug tools
    const debugTools = document.getElementById('debug-tools');
    if (debugTools) {
        debugTools.remove();
    }
    
    // Check if Supabase is available
    if (typeof supabase === 'undefined') {
        console.error('Supabase client not found!');
        alert('Database connection failed. Please check your console for details.');
        return;
    }
    
    // Storage bucket will be checked by the DatabaseManager when needed
    console.log('Waiting for database initialization...');
    // Set a timeout to handle database initialization issues
    const initTimeout = setTimeout(() => {
        alert('Database initialization timeout. Please refresh the page.');
    }, 10000);
    
    // Wait for the database manager to load players
    const checkInterval = setInterval(() => {
        if (window.dbManager && window.dbManager.players.length > 0) {
            clearInterval(checkInterval);
            clearTimeout(initTimeout);
            console.log(`${window.dbManager.players.length} players loaded, displaying now`);
            displayPlayers();
            setupEventListeners();
        }
    }, 500);
});

// Display players in the grid
function displayPlayers() {
    const playersContainer = document.getElementById('players-container');
    
    // Clear loading message
    playersContainer.innerHTML = '';
    
    if (!window.dbManager) {
        playersContainer.innerHTML = '<div class="error-message">Database manager not initialized</div>';
        return;
    }
    
    // Log raw players data to help debug
    console.log('DEBUG: Raw players data:', window.dbManager.players);
    
    if (!window.dbManager.players || !window.dbManager.players.length) {
        playersContainer.innerHTML = '<div class="error-message">No players found</div>';
        return;
    }
    
    console.log(`DEBUG: Displaying ${window.dbManager.players.length} players`);
    
    // Create player cards
    window.dbManager.players.forEach(player => {
        const playerCard = createPlayerCard(player);
        
        // Check if this player is already selected in the dbManager
        const isPlayerSelected = window.dbManager.selectedPlayers.some(
            selected => selected.id === player.id
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
    
    // Handle various possible property names and deal with SQL result format
    let name, phone, photoUrl;
    
    // If player is from SQL query, it might have a different structure
    if (player.row) {
        const row = player.row;
        name = row[1] || 'Unknown Player'; // Assuming name is 2nd column
        phone = row[2] || '';              // Assuming phone is 3rd column
        photoUrl = row[3] || 'images/default-avatar.svg'; // Assuming photo is 4th column
    } else {
        name = player.name || player.full_name || player.player_name || 'Unknown Player';
        phone = player.phone || player.phone_number || '';
        photoUrl = player.photo_url || player.photoUrl || player.avatar || 'images/default-avatar.svg';
    }
    
    console.log('Player properties:', { id, name, phone, photoUrl });
    
    card.innerHTML = `
        <div class="player-photo">
            <img src="${photoUrl}" alt="${name}" onerror="this.src='images/default-avatar.svg'">
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
            
            const checkbox = this.querySelector('input[type="checkbox"]');
            checkbox.checked = !checkbox.checked;
            
            // Trigger change event on checkbox
            const event = new Event('change');
            checkbox.dispatchEvent(event);
        });
    });
    
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
            const phoneInput = document.getElementById('player-phone');
            const photoInput = document.getElementById('player-photo');
            
            const name = nameInput.value.trim();
            const phone = phoneInput.value.trim();
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
                const newPlayer = await window.dbManager.addPlayer(name, phone, photoFile);
                
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
            
            // Save selected players and redirect
            console.log('DEBUG: Saving selected players before navigating to role-selection.html');
            window.dbManager.saveSelectedPlayers();
            window.location.href = 'role-selection.html';
        });
    }
} 