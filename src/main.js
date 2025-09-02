// Poppy Bowl - Main Application Code
// Global state
let currentUser = null;
let participants = [];
let schedule = [];
let results = {};
let currentWeek = 1;
let maxWeek = 1;

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Initializing Poppy Bowl app...');
  
  try {
    // Load data files
    await loadData();
    
    // Initialize UI
    initializeUI();
    
    // Show user selector initially
    showUserSelector();
    
  } catch (error) {
    console.error('Failed to initialize app:', error);
    alert('Failed to load application data. Please check the console for details.');
  }
});

// Load data from JSON files
async function loadData() {
  try {
    // Load participants
    const participantsResponse = await fetch('./data/participants-2025.json');
    if (!participantsResponse.ok) throw new Error('Failed to load participants');
    const participantsData = await participantsResponse.json();
    participants = participantsData.participants || [];
    
    // Load schedule
    const scheduleResponse = await fetch('./data/schedule-2025.json');
    if (!scheduleResponse.ok) throw new Error('Failed to load schedule');
    const scheduleData = await scheduleResponse.json();
    schedule = scheduleData.weeks || [];
    maxWeek = schedule.length;
    
    // Load results
    try {
      const resultsResponse = await fetch('./data/results-2025.json');
      if (resultsResponse.ok) {
        results = await resultsResponse.json();
      } else {
        results = { winners: {} };
      }
    } catch {
      results = { winners: {} };
    }
    
    console.log('Data loaded successfully:', {
      participants: participants.length,
      weeks: schedule.length,
      results: Object.keys(results.winners || {}).length
    });
    
  } catch (error) {
    console.error('Error loading data:', error);
    throw error;
  }
}

// Initialize UI components
function initializeUI() {
  // Populate user dropdown
  const userDropdown = document.getElementById('userDropdown');
  if (userDropdown && participants.length > 0) {
    userDropdown.innerHTML = '<option value="">Select participant...</option>';
    participants.forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      userDropdown.appendChild(option);
    });
  }
  
  // Initialize tab functionality
  initializeTabs();
  
  // Initialize week controls
  initializeWeekControls();
  
  // Initialize user selection
  initializeUserSelection();
}

// Initialize tab switching
function initializeTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.getAttribute('data-tab');
      
      // Update active tab button
      tabButtons.forEach(b => b.classList.remove('active'));
      button.classList.add('active');
      
      // Update visible tab content
      tabContents.forEach(content => {
        content.style.display = 'none';
      });
      
      const targetContent = document.getElementById(tabId);
      if (targetContent) {
        targetContent.style.display = 'block';
        
        // Refresh content when tab is shown
        if (tabId === 'leaderboard') {
          renderLeaderboard();
        } else if (tabId === 'picks') {
          renderPicks();
        } else if (tabId === 'scoreboard') {
          renderScoreboard();
        }
      }
    });
  });
}

// Initialize week controls
function initializeWeekControls() {
  // Picks week controls
  const prevWeek = document.getElementById('prevWeek');
  const nextWeek = document.getElementById('nextWeek');
  const currentWeekDisplay = document.getElementById('currentWeekDisplay');
  
  if (prevWeek) {
    prevWeek.addEventListener('click', () => {
      if (currentWeek > 1) {
        currentWeek--;
        updateWeekDisplay();
        renderPicks();
      }
    });
  }
  
  if (nextWeek) {
    nextWeek.addEventListener('click', () => {
      if (currentWeek < maxWeek) {
        currentWeek++;
        updateWeekDisplay();
        renderPicks();
      }
    });
  }
  
  // Scoreboard week controls
  const scorePrevWeek = document.getElementById('scorePrevWeek');
  const scoreNextWeek = document.getElementById('scoreNextWeek');
  
  if (scorePrevWeek) {
    scorePrevWeek.addEventListener('click', () => {
      if (currentWeek > 1) {
        currentWeek--;
        updateWeekDisplay();
        renderScoreboard();
      }
    });
  }
  
  if (scoreNextWeek) {
    scoreNextWeek.addEventListener('click', () => {
      if (currentWeek < maxWeek) {
        currentWeek++;
        updateWeekDisplay();
        renderScoreboard();
      }
    });
  }
  
  updateWeekDisplay();
}

// Update week display
function updateWeekDisplay() {
  const currentWeekDisplay = document.getElementById('currentWeekDisplay');
  const scoreWeekDisplay = document.getElementById('scoreWeekDisplay');
  
  if (currentWeekDisplay) {
    currentWeekDisplay.textContent = `Week ${currentWeek}`;
  }
  if (scoreWeekDisplay) {
    scoreWeekDisplay.textContent = `Week ${currentWeek}`;
  }
}

// Initialize user selection functionality
function initializeUserSelection() {
  const userSelectBtn = document.getElementById('userSelectBtn');
  const userDropdown = document.getElementById('userDropdown');
  const userCustom = document.getElementById('userCustom');
  
  if (userSelectBtn) {
    userSelectBtn.addEventListener('click', () => {
      const selectedUser = userDropdown?.value || userCustom?.value?.trim();
      if (selectedUser) {
        currentUser = selectedUser;
        hideUserSelector();
        updateCurrentUserBanner();
        // Refresh all UI components for the selected user
        renderPicks();
        renderLeaderboard();
        renderScoreboard();
      } else {
        alert('Please select or enter a participant name.');
      }
    });
  }
}

// Show user selector
function showUserSelector() {
  const selector = document.getElementById('userSelector');
  if (selector) {
    selector.style.display = 'block';
  }
}

// Hide user selector
function hideUserSelector() {
  const selector = document.getElementById('userSelector');
  if (selector) {
    selector.style.display = 'none';
  }
}

// Update current user banner
function updateCurrentUserBanner() {
  const banner = document.getElementById('currentUserBanner');
  if (banner && currentUser) {
    banner.innerHTML = `Current User: ${currentUser} <button onclick="showUserSelector()" style="margin-left:10px; padding:2px 6px; font-size:12px;">Switch User</button>`;
    banner.style.display = 'block';
  }
}

// Render leaderboard
function renderLeaderboard() {
  const tbody = document.getElementById('leaderboardBody');
  if (!tbody) return;
  
  // Calculate scores for all participants
  const scores = participants.map(name => {
    let total = 0;
    
    // Sum up scores from all weeks
    for (let week = 1; week <= maxWeek; week++) {
      const weekScore = calculateWeekScore(name, week);
      total += weekScore;
    }
    
    return { name, total };
  });
  
  // Sort by total score descending
  scores.sort((a, b) => b.total - a.total);
  
  // Render table
  tbody.innerHTML = scores.map((score, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${score.name}</td>
      <td>${score.total}</td>
    </tr>
  `).join('');
}

// Render picks for current week
async function renderPicks() {
  const container = document.getElementById('weeklyPicks');
  if (!container || !schedule[currentWeek - 1]) return;

  // Clear the container first
  container.innerHTML = '';

  const weekData = schedule[currentWeek - 1];
  const games = weekData.games || [];

  if (games.length === 0) {
    container.innerHTML = 'No games available for this week.';
    return;
  }

  // Await remote/local picks here
  const picks = await loadUserPicks(currentUser, currentWeek);

  // ...continue your existing rendering logic, using "picks"
}
  
  // Clear the container to avoid stale inputs
  container.innerHTML = '';
  
  const weekData = schedule[currentWeek - 1];
  const games = weekData.games || [];
  
  if (games.length === 0) {
    container.innerHTML = 'No games available for this week.';
    return;
  }
  
  // Load existing picks for current user and current week only
  const picks = loadUserPicks(currentUser, currentWeek);
  
  container.innerHTML = `
    <div class="warn" id="duplicateWarning" style="display:none;">Warning: You have duplicate confidence values. Each value must be unique.</div>
    ${games.map(game => `
      <div class="game-card">
        <div class="game-title">${game.away} @ ${game.home}</div>
        <div style="margin:8px 0;">
          <label>
            <input type="radio" name="game-${game.id}" value="${game.away}" ${picks[game.id]?.team === game.away ? 'checked' : ''}/>
            ${game.away}
          </label>
          <label style="margin-left:20px;">
            <input type="radio" name="game-${game.id}" value="${game.home}" ${picks[game.id]?.team === game.home ? 'checked' : ''}/>
            ${game.home}
          </label>
        </div>
        <div style="margin:8px 0;">
          <label>
            Confidence (1-${games.length}):
            <input type="number" min="1" max="${games.length}" 
                   id="confidence-${game.id}" 
                   value="${picks[game.id]?.confidence || ''}" 
                   style="margin-left:8px; width:60px;">
          </label>
        </div>
      </div>
    `).join('')}
    <div class="controls">
      <button class="save-btn" onclick="savePicks()">Save Picks</button>
      <button onclick="clearPicks()" style="margin-left:8px; padding:8px 16px; border:1px solid #ccc; background:#f4f4f4; border-radius:4px; cursor:pointer;">Clear All</button>
    </div>
  `;
  
  // Add event listeners for validation
  games.forEach(game => {
    const confidenceInput = document.getElementById(`confidence-${game.id}`);
    if (confidenceInput) {
      confidenceInput.addEventListener('input', validateConfidenceValues);
    }
  });
}

// Save picks for current user and week
function savePicks() {
  if (!currentUser) {
    alert('Please select a user first.');
    return;
  }
  
  const weekData = schedule[currentWeek - 1];
  if (!weekData) return;
  
  const picks = {};
  const games = weekData.games || [];
  
  games.forEach(game => {
    const teamRadios = document.querySelectorAll(`input[name="game-${game.id}"]`);
    const confidenceInput = document.getElementById(`confidence-${game.id}`);
    
    const selectedTeam = Array.from(teamRadios).find(radio => radio.checked)?.value;
    const confidence = parseInt(confidenceInput?.value) || 0;
    
    if (selectedTeam && confidence > 0) {
      picks[game.id] = {
        team: selectedTeam,
        confidence: confidence
      };
    }
  });
  
  // Validate confidence values
  const confidenceValues = Object.values(picks).map(pick => pick.confidence);
  const uniqueValues = [...new Set(confidenceValues)];
  
  if (confidenceValues.length !== uniqueValues.length) {
    alert('Each confidence value must be unique. Please fix duplicate values.');
    return;
  }
  
 // Save picks for current user and week
function savePicks() {
  if (!currentUser) {
    alert('Please select a user first.');
    return;
  }
  const weekData = schedule[currentWeek - 1];
  if (!weekData) return;
  const picks = {};
  const games = weekData.games || [];
  games.forEach(game => {
    const teamRadios = document.querySelectorAll(`input[name="game-${game.id}"]`);
    const confidenceInput = document.getElementById(`confidence-${game.id}`);
    const selectedTeam = Array.from(teamRadios).find(radio => radio.checked)?.value;
    const confidence = parseInt(confidenceInput?.value) || 0;
    if (selectedTeam && confidence > 0) {
      picks[game.id] = {
        team: selectedTeam,
        confidence: confidence
      };
    }
  });

  // Save to localStorage first
  saveUserPicks(currentUser, currentWeek, picks);

  // Then save to GitHub
  if (window.picksStorage) {
    window.picksStorage.save(currentUser, 2025, currentWeek, {
      picks,
      savedAt: new Date().toISOString()
    }).then(() => {
      console.log('Saved picks to GitHub for', currentUser);
    }).catch(e => {
      console.warn('GitHub save failed (using local):', e);
    });
  }

  alert('Picks saved successfully!');
}

// Clear picks for current week
function clearPicks() {
  if (!currentUser) return;
  
  if (confirm('Are you sure you want to clear all picks for this week?')) {
    saveUserPicks(currentUser, currentWeek, {});
    renderPicks();
  }
}

// Validate confidence values for duplicates
function validateConfidenceValues() {
  const weekData = schedule[currentWeek - 1];
  if (!weekData) return;
  
  const games = weekData.games || [];
  const values = [];
  
  games.forEach(game => {
    const input = document.getElementById(`confidence-${game.id}`);
    const value = parseInt(input?.value);
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

// Render scoreboard
function renderScoreboard() {
  const tbody = document.getElementById('scoreboardBody');
  if (!tbody) return;
  
  // Calculate scores for all participants
  const scores = participants.map(name => {
    const weekScore = calculateWeekScore(name, currentWeek);
    let cumulativeScore = 0;
    
    // Sum up scores from all weeks up to current
    for (let week = 1; week <= currentWeek; week++) {
      cumulativeScore += calculateWeekScore(name, week);
    }
    
    return {
      name,
      weekScore,
      cumulativeScore
    };
  });
  
  // Sort by cumulative score descending
  scores.sort((a, b) => b.cumulativeScore - a.cumulativeScore);
  
  // Render table
  tbody.innerHTML = scores.map(score => `
    <tr>
      <td>${score.name}</td>
      <td>${score.weekScore}</td>
      <td>${score.cumulativeScore}</td>
    </tr>
  `).join('');
  
  // Update timestamp
  const timestamp = document.getElementById('scoresTimestamp');
  if (timestamp) {
    timestamp.textContent = `Scores updated: ${new Date().toLocaleString()}`;
  }
}

// Calculate score for a user in a specific week
function calculateWeekScore(userName, week) {
  const picks = loadUserPicks(userName, week);
  if (!picks || Object.keys(picks).length === 0) return 0;
  
  let score = 0;
  const weekData = schedule[week - 1];
  if (!weekData) return 0;
  
  weekData.games.forEach(game => {
    const pick = picks[game.id];
    if (!pick) return;
    
    const winner = results.winners?.[game.id];
    if (winner && pick.team === winner) {
      score += pick.confidence;
    }
  });
  
  return score;
}

// Load user picks from localStorage
async function loadUserPicks(userName, week) {
  try {
    // Try GitHub first
    if (window.picksStorage && userName) {
      const remote = await window.picksStorage.load(userName, 2025, week);
      if (remote && remote.picks) {
        // Cache to localStorage for offline access
        const key = `poppy-bowl-picks-${userName}-week-${week}`;
        localStorage.setItem(key, JSON.stringify(remote.picks));
        return remote.picks;
      }
    }
    // Fallback to local
    const key = `poppy-bowl-picks-${userName}-week-${week}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

// Save user picks to localStorage
function saveUserPicks(userName, week, picks) {
  try {
    const key = `poppy-bowl-picks-${userName}-week-${week}`;
    localStorage.setItem(key, JSON.stringify(picks));
  } catch (error) {
    console.error('Failed to save picks:', error);
  }
}

// Export functions for global access
window.savePicks = savePicks;
window.clearPicks = clearPicks;
window.showUserSelector = showUserSelector;
