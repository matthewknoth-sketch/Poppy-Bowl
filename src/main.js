// Poppy Bowl - Confidence Pool Application
// Global state
let participants = [];
let results = [];
let currentWeek = 1;
let gameSchedule = [];
let picks = {}; // Store picks by week and game ID

// Load data and initialize app
document.addEventListener('DOMContentLoaded', async function() {
  console.log('Poppy Bowl application loaded');
  await loadData();
  // Call populateUserSelectorDropDown again after loadData resolves
  // to ensure population even if selector was opened early
  populateUserSelectorDropDown();
  initializeEventListeners();
  loadSavedPicks();
  // Compute scores after loading saved picks
  computeScoresFromResults();
  // Initialize leaderboard tab as default
  switchTab('leaderboard');
});

// Populate user selector dropdown with participants
function populateUserSelectorDropDown() {
  const userDropdown = document.getElementById('userDropdown');
  if (!userDropdown || participants.length === 0) return;
  
  // Clear existing options except the default
  userDropdown.innerHTML = '<option value="">Select Participant</option>';
  
  // Add participants as options
  participants.forEach(participant => {
    const option = document.createElement('option');
    option.value = participant.name;
    option.textContent = participant.name;
    userDropdown.appendChild(option);
  });
}

// Show user selector (called when needed)
function showUserSelector() {
  const userSelector = document.getElementById('userSelector');
  if (userSelector) {
    userSelector.style.display = 'block';
  }
  // Populate dropdown when showing selector
  populateUserSelectorDropDown();
}

// Load participants, results, and schedule JSON
async function loadData() {
  try {
    // Load participants data
    const participantsResponse = await fetch('./data/participants-2025.json');
    if (participantsResponse.ok) {
      participants = await participantsResponse.json();
      // Handle nested participants structure
      if (participants.participants) {
        participants = participants.participants;
      }
      // Ensure each participant has totalScore default 0
      participants.forEach(participant => {
        if (participant.totalScore === undefined) {
          participant.totalScore = 0;
        }
      });
      
      // Call populateUserSelectorDropDown after participants are parsed
      populateUserSelectorDropDown();
    } else {
      console.error('Failed to load participants data');
    }
    
    // Load results data
    const resultsResponse = await fetch('./data/results-2025.json');
    if (resultsResponse.ok) {
      results = await resultsResponse.json();
    } else {
      console.error('Failed to load results data');
    }
    
    // Load schedule data
    const scheduleResponse = await fetch('./data/schedule-2025.json');
    if (scheduleResponse.ok) {
      const sched = await scheduleResponse.json();
      // Handle nested weeks structure
      if (sched.weeks) {
        gameSchedule = sched.weeks.flatMap(w => 
          w.games.map(g => ({...g, week: w.week}))
        );
      } else {
        gameSchedule = sched;
      }
    } else {
      console.error('Failed to load schedule data');
    }
    
    console.log('Data loaded successfully');
    // Compute scores after loading data
    computeScoresFromResults();
    updateLeaderboard();
    
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// Compute scores from results
function computeScoresFromResults() {
  // Build winners map from results.winners (default {})
  const winners = (results && results.winners) ? results.winners : {};
  
  // Zero out participants totalScore
  participants.forEach(participant => {
    participant.totalScore = 0;
  });
  
  // Iterate through all picks stored in localStorage per participant, per week
  participants.forEach(participant => {
    let participantScore = 0;
    
    // Check each week's picks for this participant
    Object.keys(picks).forEach(week => {
      const weekPicks = picks[week];
      if (weekPicks) {
        Object.keys(weekPicks).forEach(gameId => {
          const pick = weekPicks[gameId];
          // If pick matches winner, add confidence to score
          if (winners[gameId] && pick.team === winners[gameId]) {
            participantScore += pick.confidence || 0;
          }
        });
      }
    });
    
    participant.totalScore = participantScore;
  });
  
  // Update leaderboard with new totals
  updateLeaderboard();
}

// Initialize event listeners
function initializeEventListeners() {
  // Week navigation
  const prevWeekBtn = document.getElementById('prevWeek');
  const nextWeekBtn = document.getElementById('nextWeek');
  
  if (prevWeekBtn) {
    prevWeekBtn.addEventListener('click', () => {
      if (currentWeek > 1) {
        currentWeek--;
        renderWeeklyPicks();
        updateWeekDisplay();
      }
    });
  }
  
  if (nextWeekBtn) {
    nextWeekBtn.addEventListener('click', () => {
      currentWeek++;
      renderWeeklyPicks();
      updateWeekDisplay();
    });
  }
  
  // Tab switching
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', (e) => {
      const targetTab = e.target.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });
}

// Load saved picks from localStorage
function loadSavedPicks() {
  try {
    const savedPicks = localStorage.getItem('poppyBowlPicks');
    if (savedPicks) {
      picks = JSON.parse(savedPicks);
    }
  } catch (error) {
    console.error('Error loading saved picks:', error);
    picks = {};
  }
}

// Save picks to localStorage
function savePicks() {
  try {
    localStorage.setItem('poppyBowlPicks', JSON.stringify(picks));
    console.log('Picks saved successfully');
  } catch (error) {
    console.error('Error saving picks:', error);
  }
}

// Save individual pick when radio or confidence changes
function savePick(gameId, team, confidence) {
  if (!picks[currentWeek]) {
    picks[currentWeek] = {};
  }
  
  picks[currentWeek][gameId] = {
    team: team,
    confidence: parseInt(confidence) || 0
  };
  
  savePicks();
  validateConfidenceValues();
  // Recompute scores after saving pick
  computeScoresFromResults();
}

// Validate confidence values are unique and within range
function validateConfidenceValues() {
  const weekGames = gameSchedule.filter(game => game.week === currentWeek);
  const numGamesThisWeek = weekGames.length;
  const currentPicks = picks[currentWeek] || {};
  
  const confidenceValues = Object.values(currentPicks)
    .map(pick => pick.confidence)
    .filter(conf => conf > 0);
  
  const duplicates = confidenceValues.filter((value, index) => 
    confidenceValues.indexOf(value) !== index
  );
  
  const outOfRange = confidenceValues.filter(value => 
    value < 1 || value > numGamesThisWeek
  );
  
  const warningEl = document.getElementById('validationWarning');
  if (!warningEl) return;
  
  if (duplicates.length > 0 || outOfRange.length > 0) {
    let message = '';
    if (duplicates.length > 0) {
      message += `Duplicate confidence values: ${[...new Set(duplicates)].join(', ')}. `;
    }
    if (outOfRange.length > 0) {
      message += `Confidence values must be between 1 and ${numGamesThisWeek}. `;
    }
    warningEl.textContent = message;
    warningEl.style.display = 'block';
  } else {
    warningEl.style.display = 'none';
  }
}

// Update leaderboard display
function updateLeaderboard() {
  renderLeaderboard();
}

// Render leaderboard with proper table structure
function renderLeaderboard() {
  const leaderboardBody = document.getElementById('leaderboardBody');
  if (!leaderboardBody) return;
  
  // Sort participants by total score (descending)
  const sortedParticipants = [...participants].sort((a, b) => b.totalScore - a.totalScore);
  
  leaderboardBody.innerHTML = '';
  
  sortedParticipants.forEach((participant, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${participant.name}</td>
      <td>${participant.totalScore || 0}</td>
    `;
    leaderboardBody.appendChild(row);
  });
}

// Render weekly picks with radio buttons and confidence inputs
function renderWeeklyPicks() {
  const picksContainer = document.getElementById('weeklyPicks');
  if (!picksContainer) return;
  
  const weekGames = gameSchedule.filter(game => game.week === currentWeek);
  const numGamesThisWeek = weekGames.length;
  
  picksContainer.innerHTML = '';
  
  if (weekGames.length === 0) {
    picksContainer.innerHTML = 'No games scheduled for this week.';
    return;
  }
  
  // Add validation warning element
  const warningDiv = document.createElement('div');
  warningDiv.id = 'validationWarning';
  warningDiv.className = 'validation-warning';
  warningDiv.style.display = 'none';
  warningDiv.style.color = 'red';
  warningDiv.style.marginBottom = '20px';
  warningDiv.style.padding = '10px';
  warningDiv.style.border = '1px solid red';
  warningDiv.style.borderRadius = '4px';
  warningDiv.style.backgroundColor = '#ffe6e6';
  picksContainer.appendChild(warningDiv);
  
  weekGames.forEach(game => {
    const gameDiv = document.createElement('div');
    gameDiv.className = 'game-card';
    gameDiv.style.border = '1px solid #ddd';
    gameDiv.style.padding = '15px';
    gameDiv.style.margin = '10px 0';
    gameDiv.style.borderRadius = '8px';
    gameDiv.style.backgroundColor = '#f9f9f9';
    
    const currentPick = picks[currentWeek]?.[game.id];
    
    gameDiv.innerHTML = `
      <div class="matchup" style="font-weight: bold; margin-bottom: 10px;">
        ${game.away} @ ${game.home}
      </div>
      <div class="game-date" style="color: #666; margin-bottom: 15px;">
        Date: ${game.date}
      </div>
      <div class="pick-controls" style="display: flex; align-items: center; gap: 20px;">
        <div class="team-selection">
          <label style="margin-right: 15px;">
            <input type="radio" name="game_${game.id}" value="${game.away}" ${currentPick?.team === game.away ? 'checked' : ''}>
            ${game.away}
          </label>
          <label>
            <input type="radio" name="game_${game.id}" value="${game.home}" ${currentPick?.team === game.home ? 'checked' : ''}>
            ${game.home}
          </label>
        </div>
        <div class="confidence-input">
          <label>Confidence: 
            <input type="number" min="1" max="${numGamesThisWeek}" 
                   data-game-id="${game.id}" class="confidence-input-field"
                   value="${currentPick?.confidence || ''}"
                   style="width: 60px; margin-left: 5px;">
          </label>
        </div>
      </div>
    `;
    
    picksContainer.appendChild(gameDiv);
  });
  
  // Add Save Picks button
  const saveButton = document.createElement('button');
  saveButton.textContent = 'Save Picks';
  saveButton.id = 'savePicksBtn';
  saveButton.style.marginTop = '20px';
  saveButton.style.padding = '10px 20px';
  saveButton.style.backgroundColor = '#007cba';
  saveButton.style.color = 'white';
  saveButton.style.border = 'none';
  saveButton.style.borderRadius = '4px';
  saveButton.style.cursor = 'pointer';
  saveButton.addEventListener('click', () => {
    savePicks();
    alert('Picks saved successfully!');
  });
  picksContainer.appendChild(saveButton);
  
  // Add event listeners for radio buttons and confidence inputs
  addPickEventListeners();
  
  // Validate after rendering
  validateConfidenceValues();
}

// Add event listeners for pick inputs
function addPickEventListeners() {
  // Radio button change listeners
  document.querySelectorAll('input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const gameId = e.target.name.replace('game_', '');
      const team = e.target.value;
      const confidenceInput = document.querySelector(`input[data-game-id="${gameId}"]`);
      const confidence = confidenceInput ? confidenceInput.value : 0;
      
      savePick(gameId, team, confidence);
    });
  });
  
  // Confidence input change listeners
  document.querySelectorAll('.confidence-input-field').forEach(input => {
    input.addEventListener('input', (e) => {
      const gameId = e.target.dataset.gameId;
      const confidence = e.target.value;
      const checkedRadio = document.querySelector(`input[name="game_${gameId}"]:checked`);
      const team = checkedRadio ? checkedRadio.value : '';
      
      if (team) {
        savePick(gameId, team, confidence);
      }
    });
  });
}

// Update week display
function updateWeekDisplay() {
  const weekDisplay = document.getElementById('currentWeekDisplay');
  if (weekDisplay) {
    weekDisplay.textContent = `Week ${currentWeek}`;
  }
}

// Switch between tabs
function switchTab(tabName) {
  // Hide all tab contents
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.style.display = 'none';
  });
  
  // Remove active class from all tab buttons
  document.querySelectorAll('.tab-button').forEach(button => {
    button.classList.remove('active');
  });
  
  // Show selected tab content
  const selectedTab = document.getElementById(tabName);
  if (selectedTab) {
    selectedTab.style.display = 'block';
  }
  
  // Add active class to selected tab button
  const selectedButton = document.querySelector(`[data-tab="${tabName}"]`);
  if (selectedButton) {
    selectedButton.classList.add('active');
  }
  
  // Refresh content based on tab
  if (tabName === 'leaderboard') {
    renderLeaderboard();
  } else if (tabName === 'picks') {
    renderWeeklyPicks();
    updateWeekDisplay();
  }
}

// Export functions for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadData,
    renderLeaderboard,
    renderWeeklyPicks,
    updateLeaderboard,
    savePick,
    loadSavedPicks,
    validateConfidenceValues,
    populateUserSelectorDropDown,
    computeScoresFromResults,
    showUserSelector
  };
}
