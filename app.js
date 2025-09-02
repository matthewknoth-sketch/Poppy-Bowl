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

// Initialize on page load with UI event wiring
document.addEventListener('DOMContentLoaded', function() {
  console.log('Poppy Bowl app.js initialized');
  
  // Wire up user selection
  const userSelectBtn = document.getElementById('userSelectBtn');
  const userDropdown = document.getElementById('userDropdown');
  const userCustom = document.getElementById('userCustom');
  const userSelector = document.getElementById('userSelector');
  const currentUserBanner = document.getElementById('currentUserBanner');
  
  // Populate user dropdown with existing participants
  function populateUserDropdown() {
    const participants = getParticipants();
    userDropdown.innerHTML = '<option value="">Select participant...</option>';
    participants.forEach(participant => {
      const option = document.createElement('option');
      option.value = participant;
      option.textContent = participant;
      userDropdown.appendChild(option);
    });
  }
  
  // Set user and hide selector
  function selectUser(username) {
    if (!username || username.trim() === '') return;
    
    setCurrentUser(username.trim());
    addParticipant(username.trim());
    
    if (userSelector) userSelector.style.display = 'none';
    if (currentUserBanner) {
      currentUserBanner.textContent = `Picks for: ${username.trim()}`;
      currentUserBanner.style.display = 'block';
    }
    
    // Load and populate picks for current week
    loadPicksForCurrentWeek();
  }
  
  // User selection button handler
  if (userSelectBtn) {
    userSelectBtn.addEventListener('click', function() {
      const selectedUser = userDropdown.value || userCustom.value;
      if (selectedUser) {
        selectUser(selectedUser);
      }
    });
  }
  
  // Auto-select if user already set
  const currentUser = getCurrentUser();
  if (currentUser && currentUser !== 'default-user') {
    selectUser(currentUser);
  } else {
    populateUserDropdown();
  }
  
  // Wire up tab switching
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      const tabName = this.getAttribute('data-tab');
      
      // Update active tab button
      tabButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      
      // Show/hide tab content
      tabContents.forEach(content => {
        content.style.display = content.id === tabName ? 'block' : 'none';
      });
    });
  });
  
  // Wire up picks UI elements for saving
  function wirePicksUI() {
    // Add event listeners to all radio buttons and confidence inputs
    document.addEventListener('change', function(e) {
      if (e.target.type === 'radio' || (e.target.type === 'number' && e.target.classList.contains('confidence'))) {
        saveCurrentPicks();
      }
    });
  }
  
  // Save picks from current UI state
  function saveCurrentPicks() {
    const currentWeek = getCurrentWeek();
    const picks = {};
    
    // Collect all game picks from radio buttons and confidence inputs
    document.querySelectorAll('input[type="radio"]:checked').forEach(radio => {
      const gameId = radio.name; // Assuming radio name is the game ID
      const selectedTeam = radio.value;
      const confidenceInput = document.querySelector(`input[data-game-id="${gameId}"].confidence`);
      const confidence = confidenceInput ? parseInt(confidenceInput.value) : null;
      
      if (selectedTeam && confidence) {
        picks[gameId] = {
          selectedTeam: selectedTeam,
          confidence: confidence,
          gameId: gameId
        };
      }
    });
    
    if (Object.keys(picks).length > 0) {
      savePicks(currentWeek, picks);
    }
  }
  
  // Load picks for current week and populate UI
  function loadPicksForCurrentWeek() {
    const currentWeek = getCurrentWeek();
    const picks = loadPicks(currentWeek);
    
    if (picks) {
      console.log(`Loading picks for week ${currentWeek}:`, picks);
      
      // Populate radio buttons and confidence inputs
      Object.entries(picks).forEach(([gameId, pick]) => {
        // Set radio button
        const radio = document.querySelector(`input[name="${gameId}"][value="${pick.selectedTeam}"]`);
        if (radio) radio.checked = true;
        
        // Set confidence input
        const confidenceInput = document.querySelector(`input[data-game-id="${gameId}"].confidence`);
        if (confidenceInput) confidenceInput.value = pick.confidence;
      });
    }
  }
  
  // Get current week number (default to 1)
  function getCurrentWeek() {
    const weekDisplay = document.getElementById('currentWeekDisplay');
    if (weekDisplay) {
      const match = weekDisplay.textContent.match(/Week (\d+)/);
      return match ? parseInt(match[1]) : 1;
    }
    return 1;
  }
  
  // Initialize picks UI wiring
  wirePicksUI();
  
  console.log('UI event wiring complete');
});

// Make functions globally available for inline event handlers
window.savePicks = savePicks;
window.loadPicks = loadPicks;
window.clearPicks = clearPicks;
window.saveGamePick = saveGamePick;
window.loadGamePick = loadGamePick;
