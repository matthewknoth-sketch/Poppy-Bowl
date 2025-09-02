// Poppy Bowl Main Application
// Global variables
let currentUser = null;
let currentWeek = 1;
let schedule = null;
let participants = [];

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
  try {
    await initializeApp();
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
});

// Initialize the application
async function initializeApp() {
  console.log('Initializing Poppy Bowl application...');
  
  // Load schedule data
  await loadScheduleData();
  
  // Initialize participants list
  initializeParticipants();
  
  // Setup event handlers
  setupEventHandlers();
  
  // Initialize UI state
  initializeUserSelection();
  
  // Setup tab switching
  setupTabSwitching();
  
  console.log('Application initialized successfully');
}

// Load schedule data
async function loadScheduleData() {
  try {
    const response = await fetch('./data/schedule-2025.json');
    if (!response.ok) {
      throw new Error(`Failed to load schedule: ${response.status}`);
    }
    const data = await response.json();
    schedule = data.weeks;
    console.log('Schedule loaded:', schedule?.length, 'weeks');
  } catch (error) {
    console.error('Error loading schedule:', error);
    schedule = [];
  }
}

// Initialize participants list
function initializeParticipants() {
  participants = [
    'Poppy', 'Moppy', 'Shaner', 'Leslie', 'Robert', 'Tasha',
    'Wesley', 'Alex', 'Jasmine', 'Nick', 'Lilly', 'Knoth',
    'Amber', 'Charlotte', 'Matt', 'Brittany', 'Aunt Pam', 'Uncle Carl'
  ];
  
  // Populate dropdown
  const dropdown = document.getElementById('userDropdown');
  if (dropdown) {
    dropdown.innerHTML = '<option value="">Select participant...</option>';
    participants.forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      dropdown.appendChild(option);
    });
  }
}

// Setup event handlers
function setupEventHandlers() {
  // User selection
  const userSelectBtn = document.getElementById('userSelectBtn');
  const userDropdown = document.getElementById('userDropdown');
  const userCustom = document.getElementById('userCustom');
  
  if (userSelectBtn) {
    userSelectBtn.addEventListener('click', handleUserSelection);
  }
  
  if (userDropdown) {
    userDropdown.addEventListener('change', (e) => {
      if (e.target.value) {
        userCustom.value = '';
      }
    });
  }
  
  if (userCustom) {
    userCustom.addEventListener('input', (e) => {
      if (e.target.value) {
        userDropdown.value = '';
      }
    });
  }
}

// Handle user selection
function handleUserSelection() {
  const dropdown = document.getElementById('userDropdown');
  const customInput = document.getElementById('userCustom');
  
  let selectedUser = dropdown?.value?.trim() || customInput?.value?.trim();
  
  if (!selectedUser) {
    alert('Please select or enter a participant name.');
    return;
  }
  
  // Ensure currentUser is set exactly to dropdown value without whitespace
  currentUser = selectedUser;
  console.log('User selected:', currentUser);
  
  // Hide user selector and show main interface
  document.getElementById('userSelector').style.display = 'none';
  updateCurrentUserBanner();
  
  // Load picks for current user and week
  loadAndRenderPicks();
}

// Update current user banner
function updateCurrentUserBanner() {
  const banner = document.getElementById('currentUserBanner');
  if (banner && currentUser) {
    banner.innerHTML = `Current User: ${currentUser} <button onclick="showUserSelector()">Switch User</button>`;
    banner.style.display = 'block';
  }
}

// Switch user function - exported as showUserSelector
function showUserSelector() {
  currentUser = null;
  document.getElementById('userSelector').style.display = 'block';
  document.getElementById('currentUserBanner').style.display = 'none';
  document.getElementById('userDropdown').value = '';
  document.getElementById('userCustom').value = '';
}

// Initialize user selection state
function initializeUserSelection() {
  if (!currentUser) {
    document.getElementById('userSelector').style.display = 'block';
  } else {
    updateCurrentUserBanner();
  }
}

// Setup tab switching
function setupTabSwitching() {
  const tabButtons = document.querySelectorAll('.tab-button');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const targetTab = e.target.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });
}

// Switch tabs
function switchTab(tabName) {
  // Update button states
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  
  // Update content visibility
  document.querySelectorAll('.tab-content').forEach(content => {
    content.style.display = 'none';
  });
  document.getElementById(tabName).style.display = 'block';
  
  // Load content for specific tabs
  if (tabName === 'picks' && currentUser) {
    loadAndRenderPicks();
  }
}

// Load and render picks for current user and week
async function loadAndRenderPicks() {
  if (!currentUser || !schedule || !schedule[currentWeek - 1]) {
    console.error('Cannot render picks: missing user, schedule, or week data');
    return;
  }
  
  const weekData = schedule[currentWeek - 1];
  const games = weekData.games || [];
  
  // Load existing picks
  const existingPicks = window.loadUserPicks ? window.loadUserPicks(currentUser, currentWeek) : {};
  
  await renderPicks(games, existingPicks);
}

// Render picks interface
async function renderPicks(games = [], existingPicks = {}) {
  const container = document.getElementById('weeklyPicks');
  if (!container) return;
  
  let html = '<div class="warn" id="duplicateWarning">Warning: Duplicate confidence values detected!</div>';
  
  games.forEach(game => {
    const pick = existingPicks[game.id] || {};
    const homeChecked = pick.team === game.home ? 'checked' : '';
    const awayChecked = pick.team === game.away ? 'checked' : '';
    const confidence = pick.confidence || '';
    
    html += `
      <div class="game-card">
        ${game.away} @ ${game.home}
        <div style="margin: 8px 0;">
          <label><input name="game-${game.id}" type="radio" value="${game.away}" ${awayChecked}/> ${game.away}</label>
          <label style="margin-left: 16px;"><input name="game-${game.id}" type="radio" value="${game.home}" ${homeChecked}/> ${game.home}</label>
        </div>
        <div>
          <label>Confidence (1-16): 
            <input id="confidence-${game.id}" max="16" min="1" type="number" value="${confidence}" style="width: 60px; margin-left: 8px;"/>
          </label>
        </div>
      </div>
    `;
  });
  
  html += `
    <div style="margin-top: 16px;">
      <button class="save-btn" onclick="savePicks()">Save Picks</button>
      <button class="save-btn" onclick="clearPicks()" style="background: #888; margin-left: 8px;">Clear All</button>
    </div>
  `;
  
  container.innerHTML = html;
  
  // Add change event listeners for validation
  games.forEach(game => {
    const confidenceInput = document.getElementById(`confidence-${game.id}`);
    if (confidenceInput) {
      confidenceInput.addEventListener('input', validateConfidenceValues);
    }
  });
  
  // Initial validation
  validateConfidenceValues();
}

// Save picks function - exported to window for onclick access
window.savePicks = async function savePicks() {
  if (!currentUser) {
    alert('No user selected!');
    return;
  }
  
  const weekData = schedule[currentWeek - 1];
  if (!weekData) {
    alert('No schedule data available!');
    return;
  }
  
  const games = weekData.games || [];
  const picks = {};
  
  // Collect picks from form
  games.forEach(game => {
    const teamRadios = document.querySelectorAll(`input[name="game-${game.id}"]:checked`);
    const confidenceInput = document.getElementById(`confidence-${game.id}`);
    
    if (teamRadios.length > 0 && confidenceInput && confidenceInput.value) {
      picks[game.id] = {
        team: teamRadios[0].value,
        confidence: parseInt(confidenceInput.value)
      };
    }
  });
  
  // Validate picks
  const confidenceValues = Object.values(picks).map(p => p.confidence).filter(v => v > 0);
  const duplicates = confidenceValues.filter((value, index) => confidenceValues.indexOf(value) !== index);
  
  if (duplicates.length > 0) {
    alert('Please fix duplicate confidence values before saving.');
    return;
  }
  
  // Save picks using our new function
  try {
    if (window.saveUserPicks) {
      const success = await window.saveUserPicks(currentUser, currentWeek, picks);
      if (success) {
        alert('Picks saved successfully!');
        // Re-render to show updated state
        await renderPicks(games, picks);
      } else {
        alert('Failed to save picks. Please try again.');
      }
    } else {
      console.error('saveUserPicks function not available');
      alert('Save function not available. Please reload the page.');
    }
  } catch (error) {
    console.error('Error saving picks:', error);
    alert('Error saving picks: ' + error.message);
  }
};

// Clear all picks function - exported to window for onclick access
window.clearPicks = function clearPicks() {
  if (!confirm('Are you sure you want to clear all picks for this week?')) {
    return;
  }
  
  const weekData = schedule[currentWeek - 1];
  if (!weekData) return;
  
  const games = weekData.games || [];
  
  // Clear form inputs
  games.forEach(game => {
    const radios = document.querySelectorAll(`input[name="game-${game.id}"]`);
    radios.forEach(radio => radio.checked = false);
    
    const confidenceInput = document.getElementById(`confidence-${game.id}`);
    if (confidenceInput) {
      confidenceInput.value = '';
    }
  });
  
  validateConfidenceValues();
};

// Validate confidence values for duplicates - only check non-empty values
function validateConfidenceValues() {
  const weekData = schedule && schedule[currentWeek - 1];
  if (!weekData) return;
  
  const games = weekData.games || [];
  const values = [];
  
  games.forEach(game => {
    const input = document.getElementById(`confidence-${game.id}`);
    const value = parseInt(input?.value);
    // Only check non-empty values (greater than 0)
    if (value && value > 0) {
      values.push(value);
    }
  });
  
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
  const warning = document.getElementById('duplicateWarning');
  
  if (warning) {
    if (duplicates.length > 0) {
      warning.style.display = 'block';
    } else {
      warning.style.display = 'none';
    }
  }
}

// Export functions for global access
window.showUserSelector = showUserSelector;
window.currentUser = () => currentUser;
window.currentWeek = () => currentWeek;
window.renderPicks = renderPicks;

console.log('Main.js loaded successfully');
