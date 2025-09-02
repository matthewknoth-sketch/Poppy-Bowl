// app.js - Robust persistence system for .game-card markup with autosave
// Global state management
let currentUser = null;
let currentWeek = 1;
let autoSaveTimeout = null;

// Storage configuration
const STORAGE_KEY = 'poppy-bowl-picks';
const AUTOSAVE_DELAY = 500; // ms

// Utility functions for localStorage with comprehensive error handling
function safeGetStorage(key) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return null;
  }
}

function safeSetStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('Error writing to localStorage:', error);
    return false;
  }
}

// Enhanced game ID extraction with validation
function extractGameId(radioName) {
  if (!radioName || typeof radioName !== 'string') return null;
  
  if (radioName.startsWith('game-')) {
    return radioName.substring(5); // Remove 'game-' prefix
  }
  return radioName;
}

// Robust pick collection from all .game-card elements
function collectAllPicks() {
  const picks = {};
  const gameCards = document.querySelectorAll('.game-card');
  
  gameCards.forEach(card => {
    try {
      // Find checked radio button for team selection
      const checkedRadio = card.querySelector('input[type="radio"]:checked');
      if (!checkedRadio) return;
      
      const gameId = extractGameId(checkedRadio.name);
      if (!gameId) return;
      
      const teamPick = checkedRadio.value;
      
      // Find confidence input with robust selector
      let confidenceInput = document.getElementById(`confidence-${gameId}`);
      if (!confidenceInput) {
        // Fallback: search within the card
        confidenceInput = card.querySelector(`input[id*="confidence"], input[name*="confidence"]`);
      }
      
      const confidence = confidenceInput ? (parseInt(confidenceInput.value) || 0) : 0;
      
      if (gameId && teamPick) {
        picks[gameId] = {
          team: teamPick,
          confidence: confidence,
          timestamp: Date.now()
        };
      }
    } catch (error) {
      console.warn('Error processing game card:', error, card);
    }
  });
  
  return picks;
}

// Comprehensive save function with user/week isolation
function saveAllPicks() {
  if (!currentUser) {
    console.warn('No current user set, cannot save picks');
    return false;
  }
  
  try {
    let allData = safeGetStorage(STORAGE_KEY) || {};
    
    // Initialize user data structure
    if (!allData[currentUser]) {
      allData[currentUser] = {};
    }
    
    // Collect and store current picks
    const picks = collectAllPicks();
    const weekKey = `week${currentWeek}`;
    
    allData[currentUser][weekKey] = {
      picks: picks,
      timestamp: Date.now(),
      lastModified: new Date().toISOString(),
      pickCount: Object.keys(picks).length
    };
    
    const success = safeSetStorage(STORAGE_KEY, allData);
    
    if (success) {
      console.log(`Saved ${Object.keys(picks).length} picks for ${currentUser}, week ${currentWeek}`);
      // Dispatch custom event for UI feedback
      document.dispatchEvent(new CustomEvent('picks-saved', { 
        detail: { user: currentUser, week: currentWeek, count: Object.keys(picks).length }
      }));
    }
    
    return success;
  } catch (error) {
    console.error('Error saving picks:', error);
    return false;
  }
}

// Robust pick loading with fallback mechanisms
function loadPicks() {
  if (!currentUser) {
    console.warn('No current user set, cannot load picks');
    return {};
  }
  
  try {
    const allData = safeGetStorage(STORAGE_KEY) || {};
    const userData = allData[currentUser];
    const weekKey = `week${currentWeek}`;
    const weekData = userData && userData[weekKey];
    
    if (weekData && weekData.picks) {
      console.log(`Loaded ${Object.keys(weekData.picks).length} picks for ${currentUser}, week ${currentWeek}`);
      return weekData.picks;
    }
    
    return {};
  } catch (error) {
    console.error('Error loading picks:', error);
    return {};
  }
}

// Enhanced UI restoration with validation
function restorePicks() {
  const picks = loadPicks();
  let restoredCount = 0;
  
  Object.keys(picks).forEach(gameId => {
    try {
      const pick = picks[gameId];
      if (!pick) return;
      
      // Restore team selection with multiple selector strategies
      const radioSelectors = [
        `input[name="game-${gameId}"][value="${pick.team}"]`,
        `input[type="radio"][data-game-id="${gameId}"][value="${pick.team}"]`,
        `.game-card input[type="radio"][value="${pick.team}"]:has(+ *[data-game="${gameId}"])`
      ];
      
      let radio = null;
      for (const selector of radioSelectors) {
        radio = document.querySelector(selector);
        if (radio) break;
      }
      
      if (radio) {
        radio.checked = true;
        restoredCount++;
      }
      
      // Restore confidence value with multiple strategies
      let confidenceInput = document.getElementById(`confidence-${gameId}`);
      if (!confidenceInput) {
        confidenceInput = document.querySelector(`input[data-confidence-for="${gameId}"]`);
      }
      if (!confidenceInput) {
        // Find within the same game card as the radio
        const gameCard = radio?.closest('.game-card');
        if (gameCard) {
          confidenceInput = gameCard.querySelector('input[type="number"], input[id*="confidence"]');
        }
      }
      
      if (confidenceInput && pick.confidence) {
        confidenceInput.value = pick.confidence;
      }
    } catch (error) {
      console.warn(`Error restoring pick for game ${gameId}:`, error);
    }
  });
  
  console.log(`Restored ${restoredCount} picks for ${currentUser}, week ${currentWeek}`);
  
  // Dispatch restoration event
  document.dispatchEvent(new CustomEvent('picks-restored', {
    detail: { user: currentUser, week: currentWeek, count: restoredCount }
  }));
}

// Debounced autosave functionality
function triggerAutoSave() {
  clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(() => {
    const success = saveAllPicks();
    if (success) {
      console.log('Auto-saved picks successfully');
    }
  }, AUTOSAVE_DELAY);
}

// Comprehensive auto-save event binding
function setupAutoSave() {
  // Team selection changes
  document.addEventListener('change', function(e) {
    if (e.target.type === 'radio' && 
        (e.target.name?.startsWith('game-') || e.target.closest('.game-card'))) {
      triggerAutoSave();
    }
  });
  
  // Confidence input changes
  document.addEventListener('input', function(e) {
    if (e.target.type === 'number' && 
        (e.target.id?.startsWith('confidence-') || e.target.closest('.game-card'))) {
      triggerAutoSave();
    }
  });
  
  // Additional catch-all for game card changes
  document.addEventListener('change', function(e) {
    if (e.target.closest('.game-card')) {
      triggerAutoSave();
    }
  });
}

// Enhanced user management with multiple selector support
function setCurrentUser(username) {
  if (!username || username === currentUser) return;
  
  currentUser = username;
  console.log(`Switched to user: ${username}`);
  
  // Restore picks for the new user
  restorePicks();
  
  // Update UI elements
  updateParticipantUI();
}

// Enhanced week management
function setCurrentWeek(week) {
  const weekNum = parseInt(week);
  if (isNaN(weekNum) || weekNum === currentWeek) return;
  
  currentWeek = weekNum;
  console.log(`Switched to week: ${weekNum}`);
  
  // Restore picks for the new week
  if (currentUser) {
    restorePicks();
  }
  
  // Update UI elements
  updateWeekUI();
}

// UI synchronization functions
function updateParticipantUI() {
  const selectors = ['#participant-select', '#participantSelect', '[data-participant-selector]'];
  selectors.forEach(sel => {
    const element = document.querySelector(sel);
    if (element && element.value !== currentUser) {
      element.value = currentUser;
    }
  });
  
  // Update participant name displays
  const nameElements = document.querySelectorAll('#participantName, [data-participant-name]');
  nameElements.forEach(el => {
    if (el.textContent !== currentUser) {
      el.textContent = currentUser;
    }
  });
}

function updateWeekUI() {
  const selectors = ['#week-select', '#weekSelect', '[data-week-selector]'];
  selectors.forEach(sel => {
    const element = document.querySelector(sel);
    if (element && parseInt(element.value) !== currentWeek) {
      element.value = currentWeek;
    }
  });
  
  // Update current week displays
  const weekElements = document.querySelectorAll('#currentWeekNum, [data-current-week]');
  weekElements.forEach(el => {
    if (parseInt(el.textContent) !== currentWeek) {
      el.textContent = currentWeek;
    }
  });
}

// Comprehensive participant switching binding
function bindParticipantSwitching() {
  const selectors = [
    '#participant-select',
    '#participantSelect', 
    '[data-participant-selector]',
    'select[name*="participant"]',
    'input[name*="participant"]'
  ];
  
  selectors.forEach(sel => {
    const elements = document.querySelectorAll(sel);
    elements.forEach(element => {
      element.addEventListener('change', function() {
        if (this.value && this.value !== currentUser) {
          setCurrentUser(this.value);
        }
      });
    });
  });
}

// Comprehensive week switching binding
function bindWeekSwitching() {
  const selectors = [
    '#week-select',
    '#weekSelect',
    '[data-week-selector]',
    'select[name*="week"]',
    'input[name*="week"]'
  ];
  
  selectors.forEach(sel => {
    const elements = document.querySelectorAll(sel);
    elements.forEach(element => {
      element.addEventListener('change', function() {
        const weekVal = parseInt(this.value);
        if (!isNaN(weekVal) && weekVal !== currentWeek) {
          setCurrentWeek(weekVal);
        }
      });
    });
  });
}

// Manual save function for UI buttons
function manualSave() {
  const success = saveAllPicks();
  if (success) {
    // Visual feedback
    const saveButton = document.querySelector('[data-save-picks], #save-picks, button:contains("Save")');
    if (saveButton) {
      const originalText = saveButton.textContent;
      saveButton.textContent = 'Saved!';
      setTimeout(() => {
        saveButton.textContent = originalText;
      }, 2000);
    }
  }
  return success;
}

// Initialize the robust persistence system
function initializeApp() {
  console.log('Initializing Poppy Bowl with robust .game-card persistence...');
  
  // Setup auto-save with comprehensive event binding
  setupAutoSave();
  
  // Bind user and week switching with multiple selector support
  bindParticipantSwitching();
  bindWeekSwitching();
  
  // Auto-detect current user from UI
  const userSelectors = ['#participant-select', '#participantSelect', '[data-participant-selector]'];
  for (const sel of userSelectors) {
    const element = document.querySelector(sel);
    if (element && element.value) {
      currentUser = element.value;
      break;
    }
  }
  
  // Auto-detect current week from UI
  const weekSelectors = ['#week-select', '#weekSelect', '[data-week-selector]'];
  for (const sel of weekSelectors) {
    const element = document.querySelector(sel);
    if (element && element.value) {
      currentWeek = parseInt(element.value) || 1;
      break;
    }
  }
  
  // Restore picks if user is selected
  if (currentUser) {
    restorePicks();
  }
  
  // Setup manual save button if exists
  const saveButtons = document.querySelectorAll('[data-save-picks], #save-picks, button[onclick*="save"]');
  saveButtons.forEach(btn => {
    btn.addEventListener('click', manualSave);
  });
  
  console.log(`App initialized - User: ${currentUser}, Week: ${currentWeek}`);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Export functions for global access and manual control
window.setCurrentUser = setCurrentUser;
window.setCurrentWeek = setCurrentWeek;
window.saveAllPicks = saveAllPicks;
window.manualSave = manualSave;
window.restorePicks = restorePicks;
window.collectAllPicks = collectAllPicks;
window.loadPicks = loadPicks;

// Debug helpers
window.debugPicks = function() {
  console.log('Current User:', currentUser);
  console.log('Current Week:', currentWeek);
  console.log('Current Picks:', collectAllPicks());
  console.log('Stored Data:', safeGetStorage(STORAGE_KEY));
};

console.log('Robust .game-card persistence system loaded successfully');
