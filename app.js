// app.js - Game card pick/save/restore with autosave for provided structure
// Global state
let currentUser = null;
let currentWeek = 1;

// Storage key
const STORAGE_KEY = 'poppy-bowl-picks';

// Utility functions for localStorage with error handling
function safeGetStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return null;
  }
}

function safeSetStorage(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error('Error writing to localStorage:', error);
    return false;
  }
}

// Extract gameId from radio button name (e.g., game-W1G1 -> W1G1)
function extractGameId(radioName) {
  if (radioName && radioName.startsWith('game-')) {
    return radioName.substring(5); // Remove 'game-' prefix
  }
  return radioName;
}

// Collect all current picks from game cards
function collectAllPicks() {
  const picks = {};
  const gameCards = document.querySelectorAll('.game-card');
  
  gameCards.forEach(card => {
    // Find checked radio button for team pick
    const checkedRadio = card.querySelector('input[type="radio"]:checked');
    if (!checkedRadio) return;
    
    const gameId = extractGameId(checkedRadio.name);
    const teamPick = checkedRadio.value;
    
    // Find confidence input
    const confidenceInput = document.getElementById(`confidence-${gameId}`);
    const confidence = confidenceInput ? parseInt(confidenceInput.value) || 0 : 0;
    
    if (gameId && teamPick) {
      picks[gameId] = {
        team: teamPick,
        confidence: confidence
      };
    }
  });
  
  return picks;
}

// Save all picks for current user and week
function saveAllPicks() {
  if (!currentUser) return false;
  
  try {
    const allData = JSON.parse(safeGetStorage(STORAGE_KEY) || '{}');
    
    // Initialize user data if doesn't exist
    if (!allData[currentUser]) {
      allData[currentUser] = {};
    }
    
    // Collect and save current picks
    const picks = collectAllPicks();
    allData[currentUser][`week${currentWeek}`] = {
      picks: picks,
      timestamp: Date.now(),
      lastModified: new Date().toISOString()
    };
    
    return safeSetStorage(STORAGE_KEY, JSON.stringify(allData));
  } catch (error) {
    console.error('Error saving picks:', error);
    return false;
  }
}

// Load picks for current user and week
function loadPicks() {
  if (!currentUser) return {};
  
  try {
    const allData = JSON.parse(safeGetStorage(STORAGE_KEY) || '{}');
    const userData = allData[currentUser];
    const weekData = userData && userData[`week${currentWeek}`];
    
    return weekData ? weekData.picks : {};
  } catch (error) {
    console.error('Error loading picks:', error);
    return {};
  }
}

// Restore picks to the UI
function restorePicks() {
  const picks = loadPicks();
  
  Object.keys(picks).forEach(gameId => {
    const pick = picks[gameId];
    
    // Restore team selection
    const radioSelector = `input[name="game-${gameId}"][value="${pick.team}"]`;
    const radio = document.querySelector(radioSelector);
    if (radio) {
      radio.checked = true;
    }
    
    // Restore confidence value
    const confidenceInput = document.getElementById(`confidence-${gameId}`);
    if (confidenceInput && pick.confidence) {
      confidenceInput.value = pick.confidence;
    }
  });
}

// Auto-save on any change
function setupAutoSave() {
  // Listen for radio button changes (team selection)
  document.addEventListener('change', function(e) {
    if (e.target.type === 'radio' && e.target.name.startsWith('game-')) {
      saveAllPicks();
      console.log('Auto-saved picks after team selection');
    }
  });
  
  // Listen for confidence input changes
  document.addEventListener('input', function(e) {
    if (e.target.id && e.target.id.startsWith('confidence-')) {
      // Debounce the save for input events
      clearTimeout(e.target.saveTimeout);
      e.target.saveTimeout = setTimeout(() => {
        saveAllPicks();
        console.log('Auto-saved picks after confidence change');
      }, 500);
    }
  });
}

// Set current user
function setCurrentUser(username) {
  currentUser = username;
  restorePicks();
}

// Set current week and reload picks
function setCurrentWeek(week) {
  currentWeek = week;
  if (currentUser) {
    restorePicks();
  }
}

// Bind participant switching to reload picks
function bindParticipantSwitching() {
  // Look for participant selector elements and bind change events
  const participantSelect = document.getElementById('participant-select');
  if (participantSelect) {
    participantSelect.addEventListener('change', function() {
      setCurrentUser(this.value);
    });
  }
  
  // Also check for any other participant selection mechanism
  const participantInputs = document.querySelectorAll('[data-participant-selector]');
  participantInputs.forEach(input => {
    input.addEventListener('change', function() {
      setCurrentUser(this.value);
    });
  });
}

// Bind week switching to reload picks
function bindWeekSwitching() {
  // Look for week selector elements and bind change events
  const weekSelect = document.getElementById('week-select');
  if (weekSelect) {
    weekSelect.addEventListener('change', function() {
      setCurrentWeek(parseInt(this.value) || 1);
    });
  }
  
  // Also check for any other week selection mechanism
  const weekInputs = document.querySelectorAll('[data-week-selector]');
  weekInputs.forEach(input => {
    input.addEventListener('change', function() {
      setCurrentWeek(parseInt(this.value) || 1);
    });
  });
}

// Initialize the application
function initializeApp() {
  console.log('Initializing Poppy Bowl App with game-card structure...');
  
  // Set up auto-save functionality
  setupAutoSave();
  
  // Bind user and week switching
  bindParticipantSwitching();
  bindWeekSwitching();
  
  // Try to restore picks if user is already selected
  if (currentUser) {
    restorePicks();
  }
  
  console.log('App initialized successfully');
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
});

// Export functions for global access
window.setCurrentUser = setCurrentUser;
window.setCurrentWeek = setCurrentWeek;
window.saveAllPicks = saveAllPicks;
window.restorePicks = restorePicks;
window.collectAllPicks = collectAllPicks;

console.log('app.js loaded successfully with game-card pick/save/restore logic');
