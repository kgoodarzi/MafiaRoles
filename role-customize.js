// Global variables
let totalPlayers = 0;
let selectedRoles = [];
let allRoles = [];

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("Role customization page loaded");
    
    // Load data from localStorage
    loadDataFromStorage();
    
    // Display all available roles
    displayRoles();
    
    // Set up event listeners
    setupEventListeners();
});

// Load data from localStorage
function loadDataFromStorage() {
    // Get the total number of players
    const selectedPlayers = JSON.parse(localStorage.getItem('selectedPlayers') || '[]');
    totalPlayers = selectedPlayers.length;
    document.getElementById('total-players').textContent = totalPlayers;
    document.getElementById('required-roles').textContent = totalPlayers;
    
    // Load any previously customized roles if they exist
    const storedRoles = localStorage.getItem('customizedRoles');
    if (storedRoles) {
        try {
            const parsedRoles = JSON.parse(storedRoles);
            // Verify it's an array of role objects with IDs
            if (Array.isArray(parsedRoles) && parsedRoles.length > 0 && parsedRoles[0].id) {
                selectedRoles = parsedRoles;
                console.log("Loaded customized roles:", selectedRoles);
            }
        } catch (error) {
            console.error("Error parsing saved roles:", error);
            // Fall back to default roles
            selectedRoles = [];
        }
    }
    
    // If no customized roles, load the default selected roles
    if (selectedRoles.length === 0) {
        selectedRoles = getEnabledRoles().slice(0, totalPlayers);
        console.log("Using default roles:", selectedRoles);
    }
    
    // Update the selected roles count
    updateSelectedRolesCount();
}

// Display all available roles grouped by team
function displayRoles() {
    // Get all roles
    allRoles = ROLES || [];
    
    if (!allRoles || allRoles.length === 0) {
        console.error("No roles found!");
        return;
    }
    
    // Group roles by team
    const mafiaRoles = allRoles.filter(role => role.team === 'mafia');
    const townRoles = allRoles.filter(role => role.team === 'citizen');
    const independentRoles = allRoles.filter(role => role.team === 'independent');
    
    // Display roles by team
    displayTeamRoles('mafia-roles', mafiaRoles);
    displayTeamRoles('town-roles', townRoles);
    displayTeamRoles('independent-roles', independentRoles);
}

// Display roles for a specific team
function displayTeamRoles(containerId, roles) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    roles.forEach(role => {
        // Check if this role is currently selected
        const isSelected = selectedRoles.some(r => r.id === role.id);
        
        const roleCard = document.createElement('div');
        roleCard.className = `role-card ${isSelected ? 'selected' : ''}`;
        roleCard.dataset.roleId = role.id;
        roleCard.dataset.team = role.team;
        
        roleCard.innerHTML = `
            <div class="role-image-container">
                <img src="${role.image}" alt="${role.name}">
            </div>
            <h4>${role.name}</h4>
            <p class="role-description">${role.description}</p>
            <div class="role-select">
                <input type="checkbox" id="select-${role.id}" class="role-checkbox" ${isSelected ? 'checked' : ''}>
                <label for="select-${role.id}">Include in game</label>
            </div>
        `;
        
        container.appendChild(roleCard);
    });
}

// Set up event listeners
function setupEventListeners() {
    // Role selection
    document.querySelectorAll('.role-card').forEach(card => {
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
    document.querySelectorAll('.role-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const roleId = this.closest('.role-card').dataset.roleId;
            const isSelected = this.checked;
            
            if (isSelected) {
                // Add role to selection if not already there
                if (!selectedRoles.some(r => r.id === roleId)) {
                    const role = allRoles.find(r => r.id === roleId);
                    if (role) {
                        selectedRoles.push(role);
                    }
                }
            } else {
                // Remove role from selection
                selectedRoles = selectedRoles.filter(r => r.id !== roleId);
            }
            
            // Update card selected state
            this.closest('.role-card').classList.toggle('selected', isSelected);
            
            // Update the count display
            updateSelectedRolesCount();
            
            // Validate role selection
            validateRoleSelection();
        });
    });
    
    // Save button
    document.getElementById('save-roles-btn').addEventListener('click', function() {
        if (validateRoleSelection()) {
            saveRolesAndReturn();
        }
    });
    
    // Cancel button
    document.getElementById('cancel-btn').addEventListener('click', function(e) {
        // If there are unsaved changes, ask for confirmation
        if (selectedRoles.length > 0) {
            if (!confirm('Any unsaved changes will be lost. Continue?')) {
                e.preventDefault();
                return false;
            }
        }
        // No need to set window.location as we're using an anchor element now
    });
}

// Update the count of selected roles
function updateSelectedRolesCount() {
    const count = selectedRoles.length;
    document.getElementById('selected-roles-count').textContent = count;
}

// Validate the role selection
function validateRoleSelection() {
    const validationMsg = document.getElementById('validation-message');
    const saveButton = document.getElementById('save-roles-btn');
    
    // Check if at least one role is selected
    if (selectedRoles.length === 0) {
        validationMsg.textContent = "You must select at least one role.";
        validationMsg.className = "error";
        saveButton.disabled = true;
        return false;
    }
    
    // It's okay to have fewer roles than players (citizens will be added automatically)
    if (selectedRoles.length > totalPlayers) {
        validationMsg.textContent = `You cannot select more than ${totalPlayers} roles. Please deselect some roles.`;
        validationMsg.className = "error";
        saveButton.disabled = true;
        return false;
    }
    
    // Check team balance (at least one mafia)
    const mafiaCount = selectedRoles.filter(role => role.team === 'mafia').length;
    if (mafiaCount < 1) {
        validationMsg.textContent = "You must include at least one Mafia role.";
        validationMsg.className = "error";
        saveButton.disabled = true;
        return false;
    }
    
    // Ensure mafia isn't too large (typically less than half)
    if (mafiaCount > Math.floor(totalPlayers / 2)) {
        validationMsg.textContent = `Selected ${selectedRoles.length} roles (${mafiaCount} Mafia). Remaining roles will be Citizens.`;
        validationMsg.className = "warning";
        // Allow save despite warning
        saveButton.disabled = false;
    } else {
        validationMsg.textContent = `Selected ${selectedRoles.length} roles. Remaining ${totalPlayers - selectedRoles.length} roles will be Citizens.`;
        validationMsg.className = "success";
        saveButton.disabled = false;
    }
    
    return true;
}

// Save selected roles and return to role selection page
function saveRolesAndReturn() {
    // If fewer roles than players, add citizen roles to fill the gap
    const remainingSlots = totalPlayers - selectedRoles.length;
    if (remainingSlots > 0) {
        // Find the citizen role
        const citizenRole = allRoles.find(role => role.id === 'citizen');
        
        if (citizenRole) {
            // Add citizen roles to fill the remaining slots
            for (let i = 0; i < remainingSlots; i++) {
                selectedRoles.push(citizenRole);
            }
            console.log(`Added ${remainingSlots} citizen roles to complete the selection.`);
        } else {
            console.error("Could not find citizen role to fill remaining slots");
        }
    }
    
    // Save selected roles to localStorage
    localStorage.setItem('customizedRoles', JSON.stringify(selectedRoles));
    
    // Return to role selection page
    window.location.href = 'role-selection.html';
} 