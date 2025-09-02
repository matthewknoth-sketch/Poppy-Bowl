// scoring.js - Enhanced scoring system that reads winners JSON and computes points
/**
 * Enhanced scoring system for the Poppy Bowl application
 * Reads official results from data/results/{year}/week-{n}.json files
 * Computes points based on user picks vs actual winners
 */
/**
 * Calculates score for a specific week using official results
 * @param {string} userName - The name of the user to calculate scores for
 * @param {number} week - The week number
 * @param {number} year - The year (defaults to 2025)
 * @param {Object} schedule - The schedule data
 * @returns {Promise<object>} Object containing various score metrics
 */
async function scoreWeek(userName, week, year = 2025, schedule = null) {
  try {
    console.log(`Calculating score for ${userName}, Week ${week}, ${year}`);
    
    // Load user picks from localStorage
    const picks = loadUserPicks(userName, week);
    if (!picks || Object.keys(picks).length === 0) {
      return {
        userName,
        week,
        year,
        totalPossible: 0,
        actualScore: 0,
        correctPicks: 0,
        totalPicks: 0,
        accuracy: 0,
        details: [],
        message: 'No picks found for this week'
      };
    }
    
    // Load official winners for this week
    const winners = await loadWeekWinners(year, week);
    
    // Get schedule data for this week
    const weekSchedule = schedule ? schedule[week - 1] : await loadScheduleData(year, week);
    if (!weekSchedule || !weekSchedule.games) {
      throw new Error(`No schedule data found for Week ${week}`);
    }
    
    const games = weekSchedule.games;
    
    // Calculate scores
    let totalPossible = 0;
    let actualScore = 0;
    let correctPicks = 0;
    let totalPicks = 0;
    const details = [];
    
    games.forEach(game => {
      const userPick = picks[game.id];
      const officialWinner = winners[game.id];
      
      if (userPick) {
        totalPicks++;
        totalPossible += userPick.confidence || 0;
        
        const gameDetail = {
          gameId: game.id,
          matchup: `${game.away} @ ${game.home}`,
          userPick: userPick.team,
          userConfidence: userPick.confidence || 0,
          officialWinner: officialWinner || 'TBD',
          points: 0,
          correct: false
        };
        
        if (officialWinner && userPick.team === officialWinner) {
          actualScore += userPick.confidence || 0;
          correctPicks++;
          gameDetail.points = userPick.confidence || 0;
          gameDetail.correct = true;
        }
        
        details.push(gameDetail);
      }
    });
    
    const accuracy = totalPicks > 0 ? (correctPicks / totalPicks) * 100 : 0;
    
    const result = {
      userName,
      week,
      year,
      totalPossible,
      actualScore,
      correctPicks,
      totalPicks,
      accuracy: Math.round(accuracy * 100) / 100,
      details,
      message: `Scored ${actualScore} out of ${totalPossible} possible points`
    };
    
    console.log('Score calculation result:', result);
    return result;
    
  } catch (error) {
    console.error('Error calculating week score:', error);
    return {
      userName,
      week,
      year,
      totalPossible: 0,
      actualScore: 0,
      correctPicks: 0,
      totalPicks: 0,
      accuracy: 0,
      details: [],
      error: error.message,
      message: `Error calculating scores: ${error.message}`
    };
  }
}
/**
 * Loads official winners for a specific week
 * @param {number} year - The year
 * @param {number} week - The week number
 * @returns {Promise<object>} Winners data object
 */
async function loadWeekWinners(year, week) {
  try {
    const response = await fetch(`./data/results/${year}/week-${week}.json`);
    if (!response.ok) {
      console.log(`No official results found for ${year} Week ${week}`);
      return {};
    }
    
    const data = await response.json();
    console.log(`Loaded winners for ${year} Week ${week}:`, data);
    return data;
  } catch (error) {
    console.log(`Could not load winners for ${year} Week ${week}:`, error.message);
    return {};
  }
}
/**
 * Loads schedule data for a specific week
 * @param {number} year - The year
 * @param {number} week - The week number
 * @returns {Promise<object>} Schedule data for the week
 */
async function loadScheduleData(year, week) {
  try {
    const response = await fetch(`./data/schedule-${year}.json`);
    if (!response.ok) {
      throw new Error(`Could not load schedule for ${year}`);
    }
    
    const data = await response.json();
    if (!data.weeks || !data.weeks[week - 1]) {
      throw new Error(`Week ${week} not found in schedule`);
    }
    
    return data.weeks[week - 1];
  } catch (error) {
    console.error('Error loading schedule data:', error);
    throw error;
  }
}
/**
 * Calculates cumulative score across multiple weeks
 * @param {string} userName - The user name
 * @param {number} throughWeek - Calculate through this week (inclusive)
 * @param {number} year - The year
 * @param {Object} fullSchedule - Complete schedule data
 * @returns {Promise<object>} Cumulative score data
 */
async function calculateCumulativeScore(userName, throughWeek, year = 2025, fullSchedule = null) {
  try {
    let totalScore = 0;
    let totalPossible = 0;
    let totalCorrect = 0;
    let totalPicks = 0;
    const weeklyResults = [];
    
    for (let week = 1; week <= throughWeek; week++) {
      const weekResult = await scoreWeek(userName, week, year, fullSchedule?.weeks);
      
      totalScore += weekResult.actualScore;
      totalPossible += weekResult.totalPossible;
      totalCorrect += weekResult.correctPicks;
      totalPicks += weekResult.totalPicks;
      
      weeklyResults.push(weekResult);
    }
    
    const overallAccuracy = totalPicks > 0 ? (totalCorrect / totalPicks) * 100 : 0;
    
    return {
      userName,
      throughWeek,
      year,
      totalScore,
      totalPossible,
      totalCorrect,
      totalPicks,
      overallAccuracy: Math.round(overallAccuracy * 100) / 100,
      weeklyResults
    };
  } catch (error) {
    console.error('Error calculating cumulative score:', error);
    return {
      userName,
      throughWeek,
      year,
      error: error.message,
      totalScore: 0,
      totalPossible: 0,
      totalCorrect: 0,
      totalPicks: 0,
      overallAccuracy: 0,
      weeklyResults: []
    };
  }
}
/**
 * Legacy function - enhanced version of the original calculateWeekScore
 * @param {string} userName - The user name
 * @param {number} week - The week number
 * @returns {Promise<number>} The calculated score
 */
async function calculateWeekScore(userName, week) {
  const result = await scoreWeek(userName, week);
  return result.actualScore;
}
/**
 * Loads user picks from localStorage (utility function)
 * @param {string} userName - The user name
 * @param {number} week - The week number
 * @returns {Object} User picks data
 */
function loadUserPicks(userName, week) {
  try {
    // Ensure userName is trimmed to avoid whitespace issues
    const cleanUserName = userName?.toString().trim();
    if (!cleanUserName) {
      console.warn('Invalid userName provided to loadUserPicks');
      return {};
    }
    
    const key = `poppy-bowl-picks-${cleanUserName}-week-${week}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

/**
 * Saves user picks to localStorage
 * @param {string} userName - The user name
 * @param {number} week - The week number
 * @param {Object} picksData - The picks data to save
 * @returns {Promise<boolean>} Success status
 */
async function saveUserPicks(userName, week, picksData) {
  try {
    // Ensure userName is trimmed to avoid whitespace issues
    const cleanUserName = userName?.toString().trim();
    if (!cleanUserName) {
      console.error('Invalid userName provided to saveUserPicks');
      return false;
    }
    
    // Add timestamp for tracking
    const dataToSave = {
      ...picksData,
      savedAt: new Date().toISOString(),
      userName: cleanUserName,
      week: week
    };
    
    const key = `poppy-bowl-picks-${cleanUserName}-week-${week}`;
    localStorage.setItem(key, JSON.stringify(dataToSave));
    
    console.log(`Successfully saved picks for ${cleanUserName}, Week ${week}`);
    
    // Trigger re-render if renderPicks function exists
    if (typeof renderPicks === 'function') {
      await renderPicks();
    }
    
    return true;
  } catch (error) {
    console.error('Error saving user picks:', error);
    return false;
  }
}

/**
 * Gets leaderboard data for all users
 * @param {Array} participants - List of participant names
 * @param {number} throughWeek - Calculate through this week
 * @param {number} year - The year
 * @returns {Promise<array>} Sorted leaderboard data
 */
async function getLeaderboard(participants, throughWeek, year = 2025) {
  try {
    const leaderboard = [];
    
    for (const participant of participants) {
      const cumulativeScore = await calculateCumulativeScore(participant, throughWeek, year);
      leaderboard.push({
        userName: participant,
        ...cumulativeScore
      });
    }
    
    // Sort by total score descending
    leaderboard.sort((a, b) => b.totalScore - a.totalScore);
    
    return leaderboard;
  } catch (error) {
    console.error('Error generating leaderboard:', error);
    return [];
  }
}
// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    scoreWeek,
    loadWeekWinners,
    loadScheduleData,
    calculateCumulativeScore,
    calculateWeekScore,
    loadUserPicks,
    saveUserPicks,
    getLeaderboard
  };
} else {
  // Browser global exports
  window.scoreWeek = scoreWeek;
  window.loadWeekWinners = loadWeekWinners;
  window.calculateCumulativeScore = calculateCumulativeScore;
  window.calculateWeekScore = calculateWeekScore;
  window.loadUserPicks = loadUserPicks;
  window.saveUserPicks = saveUserPicks;
  window.getLeaderboard = getLeaderboard;
}
