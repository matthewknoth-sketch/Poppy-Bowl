// app.js - localStorage save/load logic for picks

// Initialize localStorage keys
const STORAGE_KEYS = {
  picks: 'poppy-bowl-picks',
  currentUser: 'poppy-bowl-current-user',
  participants: 'poppy-bowl-participants'
};

// Get current user or prompt for selection
function getCurrentUser() {
  return localStorage.getItem(STORAGE_KEYS.currentUser) || 'default-user';
}

// Set current user
function setCurrentUser(username) {
  localStorage.setItem(STORAGE_KEYS.currentUser, username);
}

// Save picks for current user and week
function savePicks(weekNumber, picks) {
  const currentUser = getCurrentUser();
  const allPicks = getStoredPicks() || {};
  
  // Initialize user data if doesn't exist
  if (!allPicks[currentUser]) {
    allPicks[currentUser] = {};
  }
  
  // Save picks for specific week
  allPicks[currentUser][weekNumber] = {
    picks: picks,
    timestamp: Date.now(),
    lastModified: new Date().toISOString()
  };
  
  localStorage.setItem(STORAGE_KEYS.picks, JSON.stringify(allPicks));
  console.log(`Picks saved for ${currentUser}, Week ${weekNumber}`);
}

// Load picks for current user and week
function loadPicks(weekNumber) {
  const currentUser = getCurrentUser();
  const allPicks = getStoredPicks();
  
  if (allPicks && allPicks[currentUser] && allPicks[currentUser][weekNumber]) {
    return allPicks[currentUser][weekNumber].picks;
  }
  
  return null; // No picks found
}

// Get all stored picks from localStorage
function getStoredPicks() {
  const stored = localStorage.getItem(STORAGE_KEYS.picks);
  return stored ? JSON.parse(stored) : {};
}

// Clear picks for current user and week
function clearPicks(weekNumber) {
  const currentUser = getCurrentUser();
  const allPicks = getStoredPicks() || {};
  
  if (allPicks[currentUser] && allPicks[currentUser][weekNumber]) {
    delete allPicks[currentUser][weekNumber];
    localStorage.setItem(STORAGE_KEYS.picks, JSON.stringify(allPicks));
    console.log(`Picks cleared for ${currentUser}, Week ${weekNumber}`);
  }
}

// Get list of all participants
function getParticipants() {
  const stored = localStorage.getItem(STORAGE_KEYS.participants);
  const participants = stored ? JSON.parse(stored) : [];
  
  // Also get participants from picks data
  const allPicks = getStoredPicks();
  const pickUsers = Object.keys(allPicks || {});
  
  // Merge and deduplicate
  const allUsers = [...new Set([...participants, ...pickUsers])];
  return allUsers.filter(user => user && user !== 'default-user');
}

// Add participant
function addParticipant(username) {
  if (!username || username.trim() === '') return;
  
  const participants = getParticipants();
  const cleanName = username.trim();
  
  if (!participants.includes(cleanName)) {
    participants.push(cleanName);
    localStorage.setItem(STORAGE_KEYS.participants, JSON.stringify(participants));
    console.log(`Participant added: ${cleanName}`);
  }
}

// Save game pick (for individual game selections)
function saveGamePick(weekNumber, gameId, teamName, confidence) {
  const currentPicks = loadPicks(weekNumber) || {};
  
  currentPicks[gameId] = {
    selectedTeam: teamName,
    confidence: confidence,
    gameId: gameId
  };
  
  savePicks(weekNumber, currentPicks);
}

// Load game pick
function loadGamePick(weekNumber, gameId) {
  const picks = loadPicks(weekNumber);
  return picks ? picks[gameId] : null;
}

// Check if picks exist for user and week
function hasPicksForWeek(weekNumber, username = null) {
  const user = username || getCurrentUser();
  const allPicks = getStoredPicks();
  return !!(allPicks && allPicks[user] && allPicks[user][weekNumber]);
}

// Get picks statistics
function getPicksStats() {
  const allPicks = getStoredPicks();
  const stats = {
    totalParticipants: 0,
    totalWeeks: 0,
    picksPerUser: {}
  };
  
  if (allPicks) {
    stats.totalParticipants = Object.keys(allPicks).length;
    
    for (const [user, userPicks] of Object.entries(allPicks)) {
      stats.picksPerUser[user] = Object.keys(userPicks).length;
      stats.totalWeeks = Math.max(stats.totalWeeks, Object.keys(userPicks).length);
    }
  }
  
  return stats;
}

// Export functions for use in other scripts
if (typeof window !== 'undefined') {
  // Browser environment - attach to window
  window.PoppyBowlStorage = {
    getCurrentUser,
    setCurrentUser,
    savePicks,
    loadPicks,
    clearPicks,
    getParticipants,
    addParticipant,
    saveGamePick,
    loadGamePick,
    hasPicksForWeek,
    getPicksStats,
    STORAGE_KEYS
  };
  
  console.log('Poppy Bowl localStorage module loaded');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  console.log('Poppy Bowl app.js initialized');
  
  // Auto-load picks if participant elements exist
  const currentWeek = 1; // Default to week 1
  const picks = loadPicks(currentWeek);
  
  if (picks) {
    console.log(`Loaded picks for week ${currentWeek}:`, picks);
    // You can add code here to populate UI elements with saved picks
  }
});
