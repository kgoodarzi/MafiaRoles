document.addEventListener('DOMContentLoaded', () => {
    try {
        // Get completed assignments from localStorage
        const assignmentsJSON = localStorage.getItem('completedAssignments');
        if (!assignmentsJSON) {
            alert('No completed game found! Please play a game first.');
            window.location.href = 'index.html';
            return;
        }
        
        const assignments = JSON.parse(assignmentsJSON);
        if (!assignments || assignments.length === 0) {
            alert('Invalid game data! Please play a game first.');
            window.location.href = 'index.html';
            return;
        }
        
        // Group assignments by team
        const teamGroups = {
            mafia: assignments.filter(a => a.role.team === 'mafia'),
            citizen: assignments.filter(a => a.role.team === 'citizen'),
            independent: assignments.filter(a => a.role.team === 'independent')
        };
        
        // Display each team
        displayTeam('mafia-list', teamGroups.mafia);
        displayTeam('citizen-list', teamGroups.citizen);
        displayTeam('independent-list', teamGroups.independent);
        
        // Hide any empty team sections
        Object.entries(teamGroups).forEach(([team, members]) => {
            if (members.length === 0) {
                const section = document.querySelector(`.${team}-team`);
                if (section) {
                    section.style.display = 'none';
                }
            }
        });
        
    } catch (error) {
        console.error('Error displaying summary:', error);
        alert('An error occurred while loading the game summary. Please try again.');
    }
});

// Function to display a team's role assignments
function displayTeam(containerId, assignments) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Clear container
    container.innerHTML = '';
    
    if (assignments.length === 0) {
        container.innerHTML = '<p>No players in this team</p>';
        return;
    }
    
    // Create list items for each assignment
    assignments.forEach(assignment => {
        const assignmentItem = document.createElement('div');
        assignmentItem.className = 'summary-item';
        assignmentItem.setAttribute('data-team', assignment.role.team);
        
        // Create avatar
        const avatar = document.createElement('div');
        avatar.className = 'summary-avatar';
        
        const avatarImg = document.createElement('img');
        avatarImg.src = assignment.player.photo_url || 'images/default-avatar.svg';
        avatarImg.alt = assignment.player.full_name;
        avatarImg.onerror = () => { avatarImg.src = 'images/default-avatar.svg'; };
        
        avatar.appendChild(avatarImg);
        assignmentItem.appendChild(avatar);
        
        // Create info container
        const info = document.createElement('div');
        info.className = 'summary-info';
        
        // Add player name
        const playerName = document.createElement('h3');
        playerName.textContent = assignment.player.full_name;
        info.appendChild(playerName);
        
        // Add role name
        const roleName = document.createElement('p');
        roleName.className = 'summary-role';
        roleName.textContent = assignment.role.name;
        info.appendChild(roleName);
        
        assignmentItem.appendChild(info);
        
        // Create role icon
        const roleIcon = document.createElement('div');
        roleIcon.className = 'summary-role-icon';
        
        const roleImg = document.createElement('img');
        roleImg.src = assignment.role.image;
        roleImg.alt = assignment.role.name;
        roleImg.onerror = () => { roleImg.src = 'images/default-avatar.svg'; };
        
        roleIcon.appendChild(roleImg);
        assignmentItem.appendChild(roleIcon);
        
        container.appendChild(assignmentItem);
    });
} 