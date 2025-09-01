// Poppy Bowl - Confidence Pool Application
// Global state
let participants = [];
let results = [];
let currentWeek = 1;
let gameSchedule = [];

// Load data and initialize app
document.addEventListener('DOMContentLoaded', function() {
  console.log('Poppy Bowl application loaded');
  loadData();
  initializeEventListeners();
  // Initialize leaderboard tab as default
  switchTab('leaderboard');
});

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
    updateLeaderboard();
    
  } catch (error) {
    console.error('Error loading data:', error);
  }
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

// Render weekly picks with correct field names
function renderWeeklyPicks() {
  const picksContainer = document.getElementById('weeklyPicks');
  if (!picksContainer) return;
  
  const weekGames = gameSchedule.filter(game => game.week === currentWeek);
  
  picksContainer.innerHTML = '';
  
  if (weekGames.length === 0) {
    picksContainer.innerHTML = 'No games scheduled for this week.';
    return;
  }
  
  weekGames.forEach(game => {
    const gameDiv = document.createElement('div');
    gameDiv.className = 'game-card';
    gameDiv.innerHTML = `
      <div class="matchup">${game.away} @ ${game.home}</div>
      <div class="game-date">Date: ${game.date}</div>
    `;
    picksContainer.appendChild(gameDiv);
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
    updateLeaderboard
  };
}
