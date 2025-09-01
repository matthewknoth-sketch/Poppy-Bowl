/**
 * GitHub-backed picks storage for cross-device synchronization
 * Stores picks data as JSON files in the repository's data/picks directory
 */

class PicksStorage {
  constructor() {
    // Get GitHub configuration from localStorage
    this.token = localStorage.getItem('gh_token');
    this.owner = localStorage.getItem('gh_owner');
    this.repo = localStorage.getItem('gh_repo');
    
    // GitHub API base URL
    this.apiBase = 'https://api.github.com';
  }

  /**
   * Check if GitHub configuration is available
   */
  isConfigured() {
    return this.token && this.owner && this.repo;
  }

  /**
   * Save picks to GitHub repository
   * @param {string} user - Username
   * @param {number} year - Year (e.g., 2025)
   * @param {number} week - Week number
   * @param {Object} data - Picks data with savedAt timestamp
   */
  async savePicksToGitHub(user, year, week, data) {
    if (!this.isConfigured()) {
      console.warn('GitHub configuration not found. Cannot save to GitHub.');
      return false;
    }

    try {
      const filePath = `data/picks/${year}/week-${week}/${user}.json`;
      const content = JSON.stringify(data, null, 2);
      const encodedContent = btoa(unescape(encodeURIComponent(content)));

      // First, try to get the existing file to obtain its SHA (if it exists)
      let sha = null;
      try {
        const existingResponse = await fetch(
          `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${filePath}`,
          {
            headers: {
              'Authorization': `token ${this.token}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );
        
        if (existingResponse.ok) {
          const existingData = await existingResponse.json();
          sha = existingData.sha;
        }
      } catch (error) {
        // File doesn't exist, which is fine for new files
        console.log('File does not exist yet, creating new file');
      }

      // Create or update the file
      const payload = {
        message: `Save picks for ${user} - Week ${week} ${year}`,
        content: encodedContent,
        branch: 'main'
      };

      if (sha) {
        payload.sha = sha;
      }

      const response = await fetch(
        `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${filePath}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      console.log(`Successfully saved picks for ${user} to GitHub`);
      return true;
    } catch (error) {
      console.error('Failed to save picks to GitHub:', error);
      return false;
    }
  }

  /**
   * Load picks from GitHub repository
   * @param {string} user - Username
   * @param {number} year - Year (e.g., 2025)
   * @param {number} week - Week number
   * @returns {Object|null} Picks data or null if not found
   */
  async loadPicksFromGitHub(user, year, week) {
    if (!this.isConfigured()) {
      console.warn('GitHub configuration not found. Cannot load from GitHub.');
      return null;
    }

    try {
      const filePath = `data/picks/${year}/week-${week}/${user}.json`;
      
      const response = await fetch(
        `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${filePath}`,
        {
          headers: {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`No remote picks found for ${user} - Week ${week}`);
          return null;
        }
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = atob(data.content);
      const picks = JSON.parse(content);
      
      console.log(`Successfully loaded picks for ${user} from GitHub`);
      return picks;
    } catch (error) {
      console.error('Failed to load picks from GitHub:', error);
      return null;
    }
  }

  /**
   * Merge local and remote picks, preferring the most recently saved
   * @param {Object} local - Local picks data
   * @param {Object} remote - Remote picks data
   * @returns {Object} Merged picks data
   */
  mergeLocalAndRemote(local, remote) {
    // If either is missing, return the other
    if (!local) return remote;
    if (!remote) return local;

    // If both have savedAt timestamps, prefer the most recent
    if (local.savedAt && remote.savedAt) {
      const localTime = new Date(local.savedAt).getTime();
      const remoteTime = new Date(remote.savedAt).getTime();
      
      if (remoteTime > localTime) {
        console.log('Remote picks are newer, using remote version');
        return remote;
      } else {
        console.log('Local picks are newer or same age, using local version');
        return local;
      }
    }

    // If only one has a timestamp, prefer that one
    if (local.savedAt && !remote.savedAt) return local;
    if (!local.savedAt && remote.savedAt) return remote;

    // If neither has a timestamp, prefer local (fallback)
    console.log('No timestamps found, preferring local picks');
    return local;
  }
}

// Create and expose the picks storage instance
const picksStorage = new PicksStorage();

// Expose to global scope
window.picksStorage = picksStorage;

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PicksStorage;
}
