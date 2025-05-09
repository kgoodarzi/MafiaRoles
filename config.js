// Game Configuration Settings

// Timer durations (in seconds)
const TIMER_CONFIG = {
    // Default player introduction timer
    playerIntroduction: 60,
    
    // Role identification phase timers
    roleIdentification: 30,
    
    // Day phase timers
    dayDiscussion: 180,
    
    // Voting phase timers
    votingTime: 30,
    
    // Night phase timers
    nightActions: 60
};

// Game phases and their order
const GAME_PHASES = [
    'role-selection',
    'view-roles',
    'role-assignments',
    'role-identification',
    'intro-day',
    'day-phase',
    'voting-phase',
    'night-phase'
];

// Export configuration for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TIMER_CONFIG,
        GAME_PHASES
    };
} 