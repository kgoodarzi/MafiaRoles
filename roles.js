// Role definitions
const ROLES = [
    {
        id: 'godfather',
        name: 'Godfather',
        nameRtl: 'رئیس مافیا',
        team: 'mafia',
        description: 'Leader of the Mafia. Cannot be detected by the Detective.',
        image: 'images/Role - Godfather.jpg',
        isEnabled: true
    },
    {
        id: 'professional',
        name: 'Professional',
        nameRtl: 'حرفه‌ای',
        team: 'citizen',
        description: 'Citizen member with the ability to eliminate a mafia during the night twice per game.',
        image: 'images/Role - Professional.jpg',
        isEnabled: true
    },
    {
        id: 'regular_mafia',
        name: 'Mafia',
        nameRtl: 'مافیا',
        team: 'mafia',
        description: 'Standard Mafia member with no special abilities.',
        image: 'images/Mafia.jpg',
        isEnabled: false
    },
    {
        id: 'doctor',
        name: 'Doctor',
        nameRtl: 'دکتر',
        team: 'citizen',
        description: 'Can protect a player from being eliminated each night.',
        image: 'images/Role - Doctor.jpg',
        isEnabled: true
    },
    {
        id: 'detective',
        name: 'Detective',
        nameRtl: 'کارآگاه',
        team: 'citizen',
        description: 'Can investigate one player each night to learn if they are Mafia.',
        image: 'images/Role - Detective.jpg',
        isEnabled: true
    },
    {
        id: 'bodyguard',
        name: 'Bodyguard',
        nameRtl: 'نگهبان',
        team: 'citizen',
        description: 'Can protect a player from being eliminated, but dies in their place.',
        image: 'images/Role - Bodyguard.jpg',
        isEnabled: true
    },
    {
        id: 'citizen',
        name: 'Citizen',
        nameRtl: 'شهروند',
        team: 'citizen',
        description: 'Regular citizen with no special abilities.',
        image: 'images/Role - Citizen.jpg',
        isEnabled: true
    },
    {
        id: 'magician',
        name: 'Magician',
        nameRtl: 'جادوگر',
        team: 'mafia',
        description: 'Can block the actions of a player once every night.',
        image: 'images/Role - Magician.jpg',
        isEnabled: true
    },
    {
        id: 'gunman',
        name: 'Gunman',
        nameRtl: 'تفنگدار',
        team: 'citizen',
        description: 'Can give a gun to a player during the night to be used during the next dayto shoot a player.',
        image: 'images/Role - Gunman.jpg',
        isEnabled: true
    },
    {
        id: 'zodiac',
        name: 'Zodiac',
        nameRtl: 'زودیاک',
        team: 'independent',
        description: 'Independent killer who wins by being one of the last two players alive.',
        image: 'images/Role - Zodiac.jpg',
        isEnabled: true
    },
    {
        id: 'bomber',
        name: 'Bomber',
        nameRtl: 'بمب‌گذار',
        team: 'mafia',
        description: 'A Mafia member who can eliminate another player by sacrificing themselves.',
        image: 'images/Role - Bomber.jpg',
        isEnabled: true
    },
    {
        id: 'ocean',
        name: 'Ocean',
        nameRtl: 'اقیانوس',
        team: 'citizen',
        description: 'A special Town role with unique abilities (customize as needed).',
        image: 'images/Role - Ocean.jpg',
        isEnabled: true
    }
];

// Get roles by team
function getRolesByTeam(team) {
    return ROLES.filter(role => role.team === team && role.isEnabled);
}

// Get all enabled roles
function getEnabledRoles() {
    return ROLES.filter(role => role.isEnabled);
}

// Get role by ID
function getRoleById(roleId) {
    return ROLES.find(role => role.id === roleId);
}

// Toggle role enabled status
function toggleRoleEnabled(roleId) {
    const role = getRoleById(roleId);
    if (role) {
        role.isEnabled = !role.isEnabled;
        return role.isEnabled;
    }
    return false;
}

// Create balanced role distribution
function createRoleDistribution(playerCount, mafiaCount, specialRolesCount) {
    // Validate inputs
    mafiaCount = Math.min(Math.max(1, mafiaCount), Math.floor(playerCount / 3));
    specialRolesCount = Math.min(Math.max(0, specialRolesCount), playerCount - mafiaCount - 1);
    
    // Get enabled roles by team
    const mafiaRoles = getRolesByTeam('mafia');
    const citizenRoles = getRolesByTeam('citizen');
    const specialRoles = [...citizenRoles.filter(role => role.id !== 'citizen'), ...getRolesByTeam('independent')];
    
    // Create selected roles array
    const selectedRoles = [];
    
    // Add Mafia roles
    if (mafiaRoles.length > 0) {
        // Ensure Godfather is included if available and enabled
        const godfather = mafiaRoles.find(role => role.id === 'godfather');
        if (godfather && mafiaCount > 0) {
            selectedRoles.push(godfather);
            mafiaCount--;
        }
        
        // Add other Mafia roles
        const regularMafia = mafiaRoles.find(role => role.id === 'regular_mafia');
        for (let i = 0; i < mafiaCount; i++) {
            if (regularMafia) {
                selectedRoles.push(regularMafia);
            } else if (mafiaRoles.length > 0) {
                // If no regular mafia, use other available mafia roles
                const randomIndex = Math.floor(Math.random() * mafiaRoles.length);
                selectedRoles.push(mafiaRoles[randomIndex]);
            }
        }
    }
    
    // Add special roles
    if (specialRoles.length > 0 && specialRolesCount > 0) {
        // Shuffle the special roles
        const shuffledSpecialRoles = [...specialRoles].sort(() => Math.random() - 0.5);
        
        // Add up to specialRolesCount special roles
        for (let i = 0; i < Math.min(specialRolesCount, shuffledSpecialRoles.length); i++) {
            selectedRoles.push(shuffledSpecialRoles[i]);
        }
    }
    
    // Fill the rest with citizens
    const citizen = citizenRoles.find(role => role.id === 'citizen');
    if (citizen) {
        const citizenCount = playerCount - selectedRoles.length;
        for (let i = 0; i < citizenCount; i++) {
            selectedRoles.push(citizen);
        }
    }
    
    // Return the final role distribution
    return selectedRoles;
}

// Assign roles to players
function assignRolesToPlayers(players, roles) {
    // Copy arrays to avoid modifying originals
    players = [...players];
    roles = [...roles];
    
    // Shuffle players and roles
    players.sort(() => Math.random() - 0.5);
    roles.sort(() => Math.random() - 0.5);
    
    // Assign roles to players
    const assignments = [];
    for (let i = 0; i < Math.min(players.length, roles.length); i++) {
        assignments.push({
            player: players[i],
            role: roles[i]
        });
    }
    
    return assignments;
} 