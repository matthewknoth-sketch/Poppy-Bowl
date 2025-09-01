// SaveWinners.js - Handles saving winners data to GitHub API or downloading as JSON

/**
 * Saves winners data either to GitHub repository or as downloadable JSON
 * Checks localStorage for GitHub API credentials
 * Falls back to JSON download if no credentials available
 */

/**
 * Main function to save winners data
 * @param {Object} winnersDraft - Object mapping game IDs to winner team names
 * @param {number} year - The year for the results
 * @param {number} week - The week number for the results
 */
async function saveWinners(winnersDraft, year, week) {
  try {
    console.log('Saving winners:', { winnersDraft, year, week });
    
    // Check if we have GitHub API credentials
    const ghToken = localStorage.getItem('gh_token');
    const ghOwner = localStorage.getItem('gh_owner');
    const ghRepo = localStorage.getItem('gh_repo');
    
    if (ghToken && ghOwner && ghRepo) {
      // Try to save to GitHub
      console.log('GitHub credentials found, attempting API save...');
      await saveToGitHub(winnersDraft, year, week, ghToken, ghOwner, ghRepo);
    } else {
      // Fall back to JSON download
      console.log('No GitHub credentials found, downloading JSON...');
      downloadAsJSON(winnersDraft, year, week);
    }
  } catch (error) {
    console.error('Error in saveWinners:', error);
    // If GitHub save fails, fall back to download
    console.log('GitHub save failed, falling back to JSON download...');
    downloadAsJSON(winnersDraft, year, week);
  }
}

/**
 * Saves winners data to GitHub repository via API
 * @param {Object} winnersDraft - Winners data
 * @param {number} year - Year
 * @param {number} week - Week
 * @param {string} token - GitHub token
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 */
async function saveToGitHub(winnersDraft, year, week, token, owner, repo) {
  const path = `data/results/${year}/week-${week}.json`;
  const content = JSON.stringify(winnersDraft, null, 2);
  const base64Content = btoa(unescape(encodeURIComponent(content)));
  
  // First, try to get the current file to get its SHA (required for updates)
  let sha = null;
  try {
    const getResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (getResponse.ok) {
      const fileData = await getResponse.json();
      sha = fileData.sha;
      console.log('Found existing file, SHA:', sha);
    }
  } catch (error) {
    console.log('File does not exist yet, will create new file');
  }
  
  // Prepare the API request
  const apiBody = {
    message: `Update results for ${year} Week ${week}`,
    content: base64Content,
    branch: 'feature/admin-mark-winners'
  };
  
  if (sha) {
    apiBody.sha = sha; // Include SHA for updates
  }
  
  // Make the API request to create/update the file
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(apiBody)
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`GitHub API error: ${response.status} - ${errorData.message}`);
  }
  
  const result = await response.json();
  console.log('Successfully saved to GitHub:', result);
  
  // Show success message
  alert(`Winners successfully saved to GitHub at ${path}`);
}

/**
 * Downloads winners data as JSON file
 * @param {Object} winnersDraft - Winners data
 * @param {number} year - Year
 * @param {number} week - Week
 */
function downloadAsJSON(winnersDraft, year, week) {
  const filename = `week-${week}.json`;
  const content = JSON.stringify(winnersDraft, null, 2);
  
  // Create downloadable blob
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  // Create temporary download link
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  
  // Trigger download
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  // Cleanup
  URL.revokeObjectURL(url);
  
  console.log(`Downloaded winners as ${filename}`);
  alert(`Winners downloaded as ${filename}. Please manually upload to data/results/${year}/`);
}

/**
 * Sets GitHub API credentials in localStorage
 * @param {string} token - GitHub personal access token
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 */
function setGitHubCredentials(token, owner, repo) {
  localStorage.setItem('gh_token', token);
  localStorage.setItem('gh_owner', owner);
  localStorage.setItem('gh_repo', repo);
  console.log('GitHub credentials saved to localStorage');
}

/**
 * Clears GitHub API credentials from localStorage
 */
function clearGitHubCredentials() {
  localStorage.removeItem('gh_token');
  localStorage.removeItem('gh_owner');
  localStorage.removeItem('gh_repo');
  console.log('GitHub credentials cleared from localStorage');
}

/**
 * Gets current GitHub credentials status
 * @returns {Object} Status of credentials
 */
function getGitHubCredentialsStatus() {
  const token = localStorage.getItem('gh_token');
  const owner = localStorage.getItem('gh_owner');
  const repo = localStorage.getItem('gh_repo');
  
  return {
    hasCredentials: !!(token && owner && repo),
    owner: owner || null,
    repo: repo || null,
    tokenSet: !!token
  };
}

/**
 * Utility function to prompt user for GitHub credentials
 */
function promptForGitHubCredentials() {
  const token = prompt('Enter GitHub Personal Access Token:');
  const owner = prompt('Enter Repository Owner:');
  const repo = prompt('Enter Repository Name:');
  
  if (token && owner && repo) {
    setGitHubCredentials(token, owner, repo);
    return true;
  }
  
  return false;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    saveWinners,
    saveToGitHub,
    downloadAsJSON,
    setGitHubCredentials,
    clearGitHubCredentials,
    getGitHubCredentialsStatus,
    promptForGitHubCredentials
  };
} else {
  // Browser global exports
  window.saveWinners = saveWinners;
  window.setGitHubCredentials = setGitHubCredentials;
  window.clearGitHubCredentials = clearGitHubCredentials;
  window.getGitHubCredentialsStatus = getGitHubCredentialsStatus;
  window.promptForGitHubCredentials = promptForGitHubCredentials;
}
