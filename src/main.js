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
        { id: 4, name: 'Diana Wilson', totalScore: 88 }
      ];
    }

    // Load results data  
    const resultsResponse = await fetch('/data/results.json');
    if (resultsResponse.ok) {
      results = await resultsResponse.json();
    } else {
      console.warn('Results data not found, using mock data');
      results = {
        week1: { winner: 2, scores: { 1: 15, 2: 23, 3: 12, 4: 18 } },
        week2: { winner: 4, scores: { 1: 20, 2: 15, 3: 22, 4: 25 } },
        week3: { winner: 1, scores: { 1: 28, 2: 16, 3: 14, 4: 19 } }
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
            { id: 1, home: 'Chiefs', away: 'Bills', time: 'Thu 8:20 PM' },
            { id: 2, home: 'Cowboys', away: 'Giants', time: 'Sun 1:00 PM' },
            { id: 3, home: 'Packers', away: 'Bears', time: 'Sun 4:25 PM' }
          ]
        }
      ];
    }

    renderParticipants();
    renderGamesList();
  } catch (error) {
    console.error('Error loading data:', error);
    showError('Failed to load application data');
  }
}

// Compute crowned name by week
function getCrownedParticipant(week) {
  const weekKey = `week${week}`;
  if (results[weekKey] && results[weekKey].winner) {
    const winnerId = results[weekKey].winner;
    return participants.find(p => p.id === winnerId);
  }
  return null;
}

// Render participant list with crown emoji
function renderParticipants() {
  const participantsContainer = document.getElementById('participants');
  if (!participantsContainer) return;

  const crownedParticipant = getCrownedParticipant(currentWeek);
  
  let html = '<h2>Participants</h2>';
  html += '<div class="participants-list">';
  
  participants.forEach(participant => {
    const isCrowned = crownedParticipant && crownedParticipant.id === participant.id;
    const crownEmoji = isCrowned ? ' 👑' : '';
    html += `
      <div class="participant-item">
        <span class="participant-name">${participant.name}${crownEmoji}</span>
        <span class="participant-score">Score: ${participant.totalScore || 0}</span>
      </div>
    `;
  });
  
  html += '</div>';
  participantsContainer.innerHTML = html;
}

// Render games list
function renderGamesList() {
  const gamesContainer = document.getElementById('gamesList');
  if (!gamesContainer) return;

  const weekData = gameSchedule.find(w => w.week === currentWeek);
  if (!weekData) {
    gamesContainer.innerHTML = '<p>No games scheduled for this week.</p>';
    return;
  }

  let html = `<h2>Week ${currentWeek} Games</h2>`;
  weekData.games.forEach(game => {
    html += `
      <div class="game">
        <div class="game-header">
          <div class="teams">${game.away} @ ${game.home}</div>
          <div class="game-info">${game.time}</div>
        </div>
        <div class="confidence-section">
          <label>Confidence Points (1-${weekData.games.length}):</label>
          <input type="number" class="confidence-input" 
                 data-game-id="${game.id}"
                 min="1" max="${weekData.games.length}" 
                 placeholder="1-${weekData.games.length}">
        </div>
      </div>
    `;
  });
  
  gamesContainer.innerHTML = html;
}

// Initialize event listeners
function initializeEventListeners() {
  // Submit picks button
  const submitBtn = document.getElementById('submitPicksBtn');
  if (submitBtn) {
    submitBtn.addEventListener('click', handleSubmitPicks);
  }

  // Week selection change (if week selector exists)
  const weekSelector = document.getElementById('weekSelector');
  if (weekSelector) {
    weekSelector.addEventListener('change', function(e) {
      currentWeek = parseInt(e.target.value);
      renderParticipants();
      renderGamesList();
    });
  }
}

// Handle submit picks
function handleSubmitPicks() {
  console.log('Submit picks clicked');
  
  const picks = collectPicks();
  if (!validatePicks(picks)) {
    return;
  }
  
  savePicks(picks);
  showSuccess('Picks submitted successfully!');
}

// Collect picks from form
function collectPicks() {
  const picks = {};
  const confidenceInputs = document.querySelectorAll('.confidence-input');
  
  confidenceInputs.forEach(input => {
    const gameId = input.dataset.gameId;
    const confidence = parseInt(input.value);
    
    if (confidence && gameId) {
      picks[gameId] = {
        gameId: gameId,
        confidence: confidence,
        week: currentWeek
      };
    }
  });
  
  return picks;
}

// Validate picks
function validatePicks(picks) {
  const weekData = gameSchedule.find(w => w.week === currentWeek);
  if (!weekData) {
    showError('No games found for current week');
    return false;
  }

  const expectedGames = weekData.games.length;
  const submittedGames = Object.keys(picks).length;
  
  if (submittedGames !== expectedGames) {
    showError(`Please submit picks for all ${expectedGames} games`);
    return false;
  }
  
  const confidenceValues = Object.values(picks).map(p => p.confidence);
  const uniqueValues = [...new Set(confidenceValues)];
  
  if (uniqueValues.length !== confidenceValues.length) {
    showError('Each game must have a unique confidence value');
    return false;
  }
  
  const invalidValues = confidenceValues.filter(v => v < 1 || v > expectedGames);
  if (invalidValues.length > 0) {
    showError(`Confidence values must be between 1 and ${expectedGames}`);
    return false;
  }
  
  return true;
}

// Save picks to localStorage
function savePicks(picks) {
  try {
    const existingPicks = JSON.parse(localStorage.getItem('poppyBowlPicks') || '{}');
    existingPicks[`week${currentWeek}`] = {
      picks: picks,
      timestamp: new Date().toISOString(),
      week: currentWeek
    };
    
    localStorage.setItem('poppyBowlPicks', JSON.stringify(existingPicks));
    console.log('Picks saved to localStorage:', picks);
  } catch (error) {
    console.error('Error saving picks:', error);
    showError('Failed to save picks');
  }
}

// Load saved picks from localStorage
function loadSavedPicks() {
  try {
    const savedData = localStorage.getItem('poppyBowlPicks');
    if (savedData) {
      const allPicks = JSON.parse(savedData);
      const weekPicks = allPicks[`week${currentWeek}`];
      
      if (weekPicks && weekPicks.picks) {
        // Populate the form with saved picks
        Object.values(weekPicks.picks).forEach(pick => {
          const input = document.querySelector(`[data-game-id="${pick.gameId}"]`);
          if (input) {
            input.value = pick.confidence;
          }
        });
        
        console.log('Loaded saved picks for week', currentWeek);
      }
    }
  } catch (error) {
    console.error('Error loading saved picks:', error);
  }
}

// Show error message
function showError(message) {
  const errorBanner = document.getElementById('error-banner');
  if (errorBanner) {
    errorBanner.textContent = message;
    errorBanner.style.display = 'block';
    
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
    collectPicks,
    validatePicks,
    savePicks,
    loadSavedPicks
  };
}
