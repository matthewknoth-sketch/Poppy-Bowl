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
  renderLeaderboard(); // Initialize leaderboard on load
});

// Load participants and results JSON
async function loadData() {
  try {
    // Load participants data
    const participantsResponse = await fetch('/data/participants.json');
    if (participantsResponse.ok) {
      participants = await participantsResponse.json();
    } else {
      console.warn('Participants data not found, using mock data');
      participants = [
        { id: 1, name: 'Alice Johnson', totalScore: 85 },
        { id: 2, name: 'Bob Smith', totalScore: 92 },
        { id: 3, name: 'Charlie Davis', totalScore: 78 },
        { id: 4, name: 'Diana Wilson', totalScore: 88 },
        { id: 5, name: 'Eve Martinez', totalScore: 91 },
        { id: 6, name: 'Frank Lee', totalScore: 83 }
      ];
    }
    
    // Load results data  
    const resultsResponse = await fetch('/data/results.json');
    if (resultsResponse.ok) {
      results = await resultsResponse.json();
    } else {
      console.warn('Results data not found, using mock data');
      results = {
        week1: { winner: 2, scores: { 1: 15, 2: 23, 3: 12, 4: 18, 5: 20, 6: 16 } },
        week2: { winner: 4, scores: { 1: 20, 2: 15, 3: 22, 4: 25, 5: 18, 6: 19 } },
        week3: { winner: 1, scores: { 1: 28, 2: 16, 3: 14, 4: 19, 5: 24, 6: 21 } }
      };
    }
    
    // Load game schedule
    const scheduleResponse = await fetch('/data/schedule.json');
    if (scheduleResponse.ok) {
      gameSchedule = await scheduleResponse.json();
    } else {
      console.warn('Schedule data not found, using mock data');
      gameSchedule = [
        {
          week: 1,
          games: [
            { id: 1, away: 'Team A', home: 'Team B', time: '1:00 PM' },
            { id: 2, away: 'Team C', home: 'Team D', time: '4:30 PM' }
          ]
        }
      ];
    }
    
    // Render UI components after data loads
    renderParticipants();
    renderLeaderboard();
    renderGames();
    
  } catch (error) {
    console.error('Error loading data:', error);
    showError('Failed to load application data. Please refresh the page.');
  }
}

// Initialize event listeners
function initializeEventListeners() {
  const submitBtn = document.getElementById('submitPicksBtn');
  if (submitBtn) {
    submitBtn.addEventListener('click', handleSubmitPicks);
  }
}

// Compute leaderboard standings from localStorage picks and participant data
function computeStandings() {
  const standings = [];
  
  // Get saved picks from localStorage if they exist
  const savedPicks = loadSavedPicks();
  
  participants.forEach(participant => {
    let score = 0;
    
    // For now, use placeholder scores of 0 since picks are local-only per browser
    // In a real implementation, this would compute scores based on actual picks and game results
    if (savedPicks && savedPicks[participant.id]) {
      // This would calculate actual scores based on picks and game outcomes
      // For now, just use 0 as placeholder
      score = 0;
    }
    
    standings.push({
      id: participant.id,
      name: participant.name,
      score: score,
      picks: savedPicks && savedPicks[participant.id] ? Object.keys(savedPicks[participant.id]).length : 0
    });
  });
  
  // Sort by score (descending), then by name (ascending)
  standings.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.name.localeCompare(b.name);
  });
  
  return standings;
}

// Render leaderboard section
function renderLeaderboard() {
  const leaderboardElement = document.getElementById('leaderboard');
  if (!leaderboardElement) {
    console.warn('Leaderboard element not found');
    return;
  }
  
  const standings = computeStandings();
  
  if (standings.length === 0) {
    leaderboardElement.innerHTML = `
      <h2>Leaderboard</h2>
      <p>No participants found.</p>
    `;
    return;
  }
  
  let html = '<h2>Leaderboard</h2>';
  
  standings.forEach((participant, index) => {
    const rank = index + 1;
    html += `
      <div class="leaderboard-item">
        <span class="leaderboard-rank">#${rank}</span>
        <span class="leaderboard-name">${participant.name}</span>
        <span class="leaderboard-score">${participant.score}</span>
      </div>
    `;
  });
  
  leaderboardElement.innerHTML = html;
}

// Get the participant with the crown (highest score)
function getCrownedParticipant() {
  const standings = computeStandings();
  return standings.length > 0 ? standings[0] : null;
}

// Render participants section
function renderParticipants() {
  const participantsElement = document.getElementById('participants');
  if (!participantsElement) {
    console.warn('Participants element not found');
    return;
  }
  
  const crownedParticipant = getCrownedParticipant();
  
  let html = '<h3>Participants</h3>';
  html += '<div class="participants-list">';
  
  participants.forEach(participant => {
    const isCrowned = crownedParticipant && participant.id === crownedParticipant.id;
    const crownIcon = isCrowned ? ' 👑' : '';
    
    html += `
      <div class="participant-item">
        <span class="participant-name">${participant.name}${crownIcon}</span>
        <span class="participant-score">Score: 0</span>
      </div>
    `;
  });
  
  html += '</div>';
  participantsElement.innerHTML = html;
}

// Render games (placeholder function)
function renderGames() {
  const gamesListElement = document.getElementById('gamesList');
  if (!gamesListElement) {
    console.warn('Games list element not found');
    return;
  }
  
  if (gameSchedule.length === 0) {
    gamesListElement.innerHTML = '<p>No games scheduled.</p>';
    return;
  }
  
  let html = '<h3>Games</h3>';
  gameSchedule.forEach(week => {
    html += `<h4>Week ${week.week}</h4>`;
    week.games.forEach(game => {
      html += `
        <div class="game-item">
          ${game.away} @ ${game.home} - ${game.time}
        </div>
      `;
    });
  });
  
  gamesListElement.innerHTML = html;
}

// Handle submit picks
function handleSubmitPicks() {
  try {
    const picks = collectPicks();
    
    if (!validatePicks(picks)) {
      showError('Please check your picks and try again.');
      return;
    }
    
    savePicks(picks);
    showSuccess('Picks saved successfully!');
    
    // Re-render leaderboard after saving picks
    renderLeaderboard();
    renderParticipants();
    
  } catch (error) {
    console.error('Error submitting picks:', error);
    showError('Failed to save picks. Please try again.');
  }
}

// Collect picks from form (placeholder function)
function collectPicks() {
  // This would collect picks from the form elements
  // For now, return empty object
  return {};
}

// Validate picks (placeholder function)
function validatePicks(picks) {
  // This would validate the picks
  // For now, return true
  return true;
}

// Save picks to localStorage
function savePicks(picks) {
  try {
    const allPicks = loadSavedPicks() || {};
    // For demo purposes, save under a default participant ID
    allPicks[1] = picks;
    localStorage.setItem('poppyBowlPicks', JSON.stringify(allPicks));
    console.log('Picks saved to localStorage:', picks);
  } catch (error) {
    console.error('Error saving picks to localStorage:', error);
    throw error;
  }
}

// Load saved picks from localStorage
function loadSavedPicks() {
  try {
    const saved = localStorage.getItem('poppyBowlPicks');
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('Error loading picks from localStorage:', error);
    return null;
  }
}

// Show error message
function showError(message) {
  const errorBanner = document.getElementById('error-banner');
  if (errorBanner) {
    errorBanner.textContent = message;
    errorBanner.style.cssText = `
      background: #f8d7da;
      color: #721c24;
      padding: 12px;
      border-radius: 4px;
      margin: 16px 0;
      border: 1px solid #f5c6cb;
      display: block;
    `;
    
    // Hide after 5 seconds
    setTimeout(() => {
      errorBanner.style.display = 'none';
    }, 5000);
  }
  
  console.error('Error:', message);
}

// Show success message
function showSuccess(message) {
  // Create success banner if it doesn't exist
  let successBanner = document.getElementById('success-banner');
  if (!successBanner) {
    successBanner = document.createElement('div');
    successBanner.id = 'success-banner';
    successBanner.style.cssText = `
      background: #d4edda;
      color: #155724;
      padding: 12px;
      border-radius: 4px;
      margin: 16px 0;
      border: 1px solid #c3e6cb;
      display: none;
    `;
    
    const errorBanner = document.getElementById('error-banner');
    if (errorBanner) {
      errorBanner.parentNode.insertBefore(successBanner, errorBanner.nextSibling);
    }
  }
  
  if (successBanner) {
    successBanner.textContent = message;
    successBanner.style.display = 'block';
    
    // Hide after 3 seconds
    setTimeout(() => {
      successBanner.style.display = 'none';
    }, 3000);
  }
  
  console.log('Success:', message);
}

// Export functions for testing (if in module environment)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadData,
    getCrownedParticipant,
    renderParticipants,
    renderLeaderboard,
    computeStandings,
    collectPicks,
    validatePicks,
    savePicks,
    loadSavedPicks
  };
}
