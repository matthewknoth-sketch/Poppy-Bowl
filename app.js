// app.js - Complete picks management system with localStorage

// Global state
let currentUser = null;
let currentWeek = 1;
let gameData = null;
let allParticipants = [];

// Storage keys
const STORAGE_KEYS = {
  picks: 'poppy-bowl-picks',
  currentUser: 'poppy-bowl-current-user',
  participants: 'poppy-bowl-participants'
};

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

function safeRemoveStorage(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Error removing from localStorage:', error);
    return false;
  }
}

// User Management Functions
function loadParticipants() {
  try {
    const stored = safeGetStorage(STORAGE_KEYS.participants);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error parsing participants:', error);
    return [];
  }
}

function saveParticipants(participants) {
  try {
    return safeSetStorage(STORAGE_KEYS.participants, JSON.stringify(participants));
  } catch (error) {
    console.error('Error saving participants:', error);
    return false;
  }
}

function setCurrentUser(username) {
  if (!username) return false;
  
  currentUser = username;
  safeSetStorage(STORAGE_KEYS.currentUser, username);
  
  // Add to participants list if not already there
  const participants = loadParticipants();
  if (!participants.includes(username)) {
    participants.push(username);
    saveParticipants(participants);
  }
  
  updateUserDisplay();
  loadAndDisplayPicks();
  return true;
}

function getCurrentUser() {
  if (!currentUser) {
    currentUser = safeGetStorage(STORAGE_KEYS.currentUser);
  }
  return currentUser;
}

function updateUserDisplay() {
  const banner = document.getElementById('currentUserBanner');
  if (banner && currentUser) {
    banner.textContent = `Current User: ${currentUser}`;
    banner.style.display = 'block';
  }
}

// Picks Management Functions
function getStoredPicks() {
  try {
    const stored = safeGetStorage(STORAGE_KEYS.picks);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error parsing picks:', error);
    return {};
  }
}

function savePicksToStorage(weekNumber, picks) {
  if (!currentUser) return false;
  
  try {
    const allPicks = getStoredPicks();
    
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
    
    return safeSetStorage(STORAGE_KEYS.picks, JSON.stringify(allPicks));
  } catch (error) {
    console.error('Error saving picks:', error);
    return false;
  }
}

function loadPicksForUser(username, weekNumber) {
  try {
    const allPicks = getStoredPicks();
    return allPicks[username] && allPicks[username][weekNumber] 
      ? allPicks[username][weekNumber].picks 
      : {};
  } catch (error) {
    console.error('Error loading picks:', error);
    return {};
  }
}

function clearPicksForWeek(weekNumber) {
  if (!currentUser) return false;
  
  try {
    const allPicks = getStoredPicks();
    if (allPicks[currentUser] && allPicks[currentUser][weekNumber]) {
      delete allPicks[currentUser][weekNumber];
      safeSetStorage(STORAGE_KEYS.picks, JSON.stringify(allPicks));
    }
    
    // Clear UI
    clearPicksUI();
    return true;
  } catch (error) {
    console.error('Error clearing picks:', error);
    return false;
  }
}

function clearPicksUI() {
  // Clear all radio buttons
  const radioButtons = document.querySelectorAll('.team-radio');
  radioButtons.forEach(radio => radio.checked = false);
  
  // Clear all confidence inputs
  const confidenceInputs = document.querySelectorAll('.confidence-input');
  confidenceInputs.forEach(input => input.value = '');
}

function collectCurrentPicks() {
  const picks = {};
  
  // Get all games in current week
  const gameElements = document.querySelectorAll('[data-game-id]');
  
  gameElements.forEach(gameEl => {
    const gameId = gameEl.dataset.gameId;
    const selectedTeam = gameEl.querySelector('.team-radio:checked');
    const confidenceInput = gameEl.querySelector('.confidence-input');
    
    if (selectedTeam && confidenceInput && confidenceInput.value) {
      picks[gameId] = {
        team: selectedTeam.value,
        confidence: parseInt(confidenceInput.value) || 0
      };
    }
  });
  
  return picks;
}

// Auto-save functionality
function enableAutoSave() {
  // Auto-save on team selection
  document.addEventListener('change', function(e) {
    if (e.target.classList.contains('team-radio') || 
        e.target.classList.contains('confidence-input')) {
      
      if (currentUser) {
        const picks = collectCurrentPicks();
        savePicksToStorage(currentWeek, picks);
        console.log('Auto-saved picks for', currentUser, 'week', currentWeek);
      }
    }
  });
  
  // Also auto-save on input events for confidence
  document.addEventListener('input', function(e) {
    if (e.target.classList.contains('confidence-input')) {
      // Debounce the save
      clearTimeout(e.target.saveTimeout);
      e.target.saveTimeout = setTimeout(() => {
        if (currentUser) {
          const picks = collectCurrentPicks();
          savePicksToStorage(currentWeek, picks);
          console.log('Auto-saved picks for', currentUser, 'week', currentWeek);
        }
      }, 500);
    }
  });
}

// Load and display picks for current user and week
function loadAndDisplayPicks() {
  if (!currentUser) return;
  
  const picks = loadPicksForUser(currentUser, currentWeek);
  
  // Apply picks to UI
  Object.keys(picks).forEach(gameId => {
    const pick = picks[gameId];
    const gameElement = document.querySelector(`[data-game-id="${gameId}"]`);
    
    if (gameElement) {
      // Set team selection
      const teamRadio = gameElement.querySelector(`input[value="${pick.team}"]`);
      if (teamRadio) teamRadio.checked = true;
      
      // Set confidence value
      const confidenceInput = gameElement.querySelector('.confidence-input');
      if (confidenceInput) confidenceInput.value = pick.confidence;
    }
  });
}

// Week management
function setCurrentWeek(weekNum) {
  currentWeek = weekNum;
  
  // Update UI
  const weekDisplay = document.getElementById('currentWeekDisplay');
  if (weekDisplay) weekDisplay.textContent = `Week ${weekNum}`;
  
  const weekNumInput = document.getElementById('currentWeekNum');
  if (weekNumInput) weekNumInput.value = weekNum;
  
  // Reload picks for new week
  loadAndDisplayPicks();
}

// Export/Import functionality
function exportUserData() {
  if (!currentUser) {
    alert('Please select a user first');
    return;
  }
  
  try {
    const allPicks = getStoredPicks();
    const userData = {
      user: currentUser,
      data: allPicks[currentUser] || {},
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    
    const dataStr = JSON.stringify(userData, null, 2);
    const blob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `poppy-bowl-${currentUser}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    console.log('Exported data for user:', currentUser);
  } catch (error) {
    console.error('Error exporting data:', error);
    alert('Error exporting data: ' + error.message);
  }
}

function importUserData(file) {
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const importedData = JSON.parse(e.target.result);
      
      if (!importedData.user || !importedData.data) {
        alert('Invalid file format');
        return;
      }
      
      // Set the imported user as current
      setCurrentUser(importedData.user);
      
      // Merge imported data
      const allPicks = getStoredPicks();
      allPicks[importedData.user] = importedData.data;
      
      if (safeSetStorage(STORAGE_KEYS.picks, JSON.stringify(allPicks))) {
        alert(`Successfully imported data for ${importedData.user}`);
        loadAndDisplayPicks();
      } else {
        alert('Error saving imported data');
      }
      
    } catch (error) {
      console.error('Error importing data:', error);
      alert('Error importing file: ' + error.message);
    }
  };
  
  reader.readAsText(file);
}

// UI Event Handlers
function setupEventHandlers() {
  // User selection handlers
  const userSelectBtn = document.getElementById('userSelectBtn');
  if (userSelectBtn) {
    userSelectBtn.addEventListener('click', function() {
      const dropdown = document.getElementById('userDropdown');
      const customInput = document.getElementById('userCustom');
      
      let selectedUser = null;
      
      if (dropdown && dropdown.value && dropdown.value !== '') {
        selectedUser = dropdown.value;
      } else if (customInput && customInput.value.trim()) {
        selectedUser = customInput.value.trim();
      }
      
      if (selectedUser) {
        setCurrentUser(selectedUser);
        // Hide user selector
        const userSelector = document.getElementById('userSelector');
        if (userSelector) userSelector.style.display = 'none';
      } else {
        alert('Please select or enter a participant name');
      }
    });
  }
  
  // Manual save button
  const saveBtn = document.getElementById('savePicksBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', function() {
      if (!currentUser) {
        alert('Please select a user first');
        return;
      }
      
      const picks = collectCurrentPicks();
      if (savePicksToStorage(currentWeek, picks)) {
        alert('Picks saved successfully!');
      } else {
        alert('Error saving picks');
      }
    });
  }
  
  // Clear picks button
  const clearBtn = document.getElementById('clearPicksBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', function() {
      if (!currentUser) {
        alert('Please select a user first');
        return;
      }
      
      if (confirm('Are you sure you want to clear all picks for this week?')) {
        if (clearPicksForWeek(currentWeek)) {
          alert('Picks cleared successfully!');
        } else {
          alert('Error clearing picks');
        }
      }
    });
  }
  
  // Export button
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportUserData);
  }
  
  // Import button and file input
  const importBtn = document.getElementById('importBtn');
  const importFile = document.getElementById('importFile');
  
  if (importBtn && importFile) {
    importBtn.addEventListener('click', function() {
      importFile.click();
    });
    
    importFile.addEventListener('change', function(e) {
      if (e.target.files.length > 0) {
        importUserData(e.target.files[0]);
      }
    });
  }
  
  // Week navigation
  const prevWeekBtn = document.getElementById('prevWeek');
  const nextWeekBtn = document.getElementById('nextWeek');
  
  if (prevWeekBtn) {
    prevWeekBtn.addEventListener('click', function() {
      if (currentWeek > 1) {
        setCurrentWeek(currentWeek - 1);
      }
    });
  }
  
  if (nextWeekBtn) {
    nextWeekBtn.addEventListener('click', function() {
      setCurrentWeek(currentWeek + 1);
    });
  }
}

// Initialize user dropdown
function initializeUserDropdown() {
  const dropdown = document.getElementById('userDropdown');
  if (dropdown) {
    const participants = loadParticipants();
    
    // Clear existing options
    dropdown.innerHTML = '<option value="">Select existing participant...</option>';
    
    // Add participants
    participants.forEach(participant => {
      const option = document.createElement('option');
      option.value = participant;
      option.textContent = participant;
      dropdown.appendChild(option);
    });
  }
}

// Main initialization function
function initializeApp() {
  console.log('Initializing Poppy Bowl App...');
  
  // Setup event handlers
  setupEventHandlers();
  
  // Enable auto-save
  enableAutoSave();
  
  // Initialize user dropdown
  initializeUserDropdown();
  
  // Load current user if exists
  const savedUser = getCurrentUser();
  if (savedUser) {
    currentUser = savedUser;
    updateUserDisplay();
    
    // Hide user selector if we have a user
    const userSelector = document.getElementById('userSelector');
    if (userSelector) userSelector.style.display = 'none';
    
    // Load picks for current user
    loadAndDisplayPicks();
  } else {
    // Show user selector
    const userSelector = document.getElementById('userSelector');
    if (userSelector) userSelector.style.display = 'block';
  }
  
  // Initialize current week
  setCurrentWeek(currentWeek);
  
  console.log('App initialized successfully');
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Export functions for global access
window.savePicks = function() {
  if (!currentUser) {
    alert('Please select a user first');
    return;
  }
  const picks = collectCurrentPicks();
  return savePicksToStorage(currentWeek, picks);
};

window.clearPicks = function() {
  return clearPicksForWeek(currentWeek);
};

window.setUser = setCurrentUser;
window.getCurrentUser = getCurrentUser;
window.exportData = exportUserData;

console.log('app.js loaded successfully');
