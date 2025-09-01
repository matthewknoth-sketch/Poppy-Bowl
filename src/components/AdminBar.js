// AdminBar.js - Admin interface for marking winners and managing results mode

/**
 * Creates and manages the admin bar interface
 * Provides functionality for:
 * - Toggling results mode
 * - Setting year and week for results
 * - Saving winners data
 */
class AdminBar {
  constructor() {
    this.currentYear = 2025;
    this.currentWeek = 1;
    this.resultsMode = false;
    this.winnersDraft = this.loadWinnersDraft();
    
    this.init();
  }

  init() {
    this.createAdminBar();
    this.bindEvents();
    this.checkUrlParams();
  }

  // Check URL parameters for admin mode
  checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === '1') {
      this.showAdminBar();
    }
  }

  // Create the admin bar HTML structure
  createAdminBar() {
    const adminBar = document.createElement('div');
    adminBar.id = 'adminBar';
    adminBar.className = 'admin-bar';
    adminBar.style.cssText = `
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #2c3e50;
      color: white;
      padding: 10px 20px;
      z-index: 1000;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      font-family: Arial, sans-serif;
      font-size: 14px;
    `;

    adminBar.innerHTML = `
      <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <label style="font-weight: bold;">Admin Mode:</label>
          <label style="display: flex; align-items: center; gap: 5px;">
            <input type="checkbox" id="resultsMode" ${this.resultsMode ? 'checked' : ''}>
            Results Mode
          </label>
        </div>
        
        <div style="display: flex; align-items: center; gap: 10px;">
          <label>Year:</label>
          <select id="yearSelect" style="padding: 4px;">
            <option value="2025" selected>2025</option>
            <option value="2026">2026</option>
          </select>
        </div>
        
        <div style="display: flex; align-items: center; gap: 10px;">
          <label>Week:</label>
          <select id="weekSelect" style="padding: 4px;">
            ${this.generateWeekOptions()}
          </select>
        </div>
        
        <div style="display: flex; gap: 10px;">
          <button id="saveWinnersBtn" style="
            padding: 6px 12px;
            background: #27ae60;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
          ">Save Winners</button>
          
          <button id="clearWinnersBtn" style="
            padding: 6px 12px;
            background: #e74c3c;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
          ">Clear Winners</button>
        </div>
        
        <div style="margin-left: auto;">
          <button id="hideAdminBtn" style="
            padding: 4px 8px;
            background: #7f8c8d;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
          ">Hide Admin</button>
        </div>
      </div>
    `;

    document.body.insertBefore(adminBar, document.body.firstChild);
    
    // Adjust body margin to account for admin bar
    const originalMarginTop = document.body.style.marginTop || '0px';
    document.body.style.marginTop = `calc(${originalMarginTop} + 60px)`;
  }

  // Generate week options for the dropdown
  generateWeekOptions() {
    let options = '';
    for (let i = 1; i <= 17; i++) {
      const selected = i === this.currentWeek ? 'selected' : '';
      options += `<option value="${i}" ${selected}>Week ${i}</option>`;
    }
    return options;
  }

  // Bind event listeners
  bindEvents() {
    document.addEventListener('click', (e) => {
      if (e.target.id === 'saveWinnersBtn') {
        this.handleSaveWinners();
      } else if (e.target.id === 'clearWinnersBtn') {
        this.handleClearWinners();
      } else if (e.target.id === 'hideAdminBtn') {
        this.hideAdminBar();
      }
    });

    document.addEventListener('change', (e) => {
      if (e.target.id === 'resultsMode') {
        this.toggleResultsMode(e.target.checked);
      } else if (e.target.id === 'yearSelect') {
        this.currentYear = parseInt(e.target.value);
      } else if (e.target.id === 'weekSelect') {
        this.currentWeek = parseInt(e.target.value);
      }
    });
  }

  // Show the admin bar
  showAdminBar() {
    const adminBar = document.getElementById('adminBar');
    if (adminBar) {
      adminBar.style.display = 'block';
    }
  }

  // Hide the admin bar
  hideAdminBar() {
    const adminBar = document.getElementById('adminBar');
    if (adminBar) {
      adminBar.style.display = 'none';
      document.body.style.marginTop = '0px';
    }
  }

  // Toggle results mode
  toggleResultsMode(enabled) {
    this.resultsMode = enabled;
    
    // Trigger event for other components to respond
    const event = new CustomEvent('resultsModeChanged', {
      detail: { enabled, year: this.currentYear, week: this.currentWeek }
    });
    document.dispatchEvent(event);

    // Save state to localStorage
    localStorage.setItem('adminResultsMode', enabled ? 'true' : 'false');
  }

  // Handle save winners button click
  async handleSaveWinners() {
    try {
      // Import and use the saveWinners function
      if (window.saveWinners) {
        await window.saveWinners(this.winnersDraft, this.currentYear, this.currentWeek);
        alert('Winners saved successfully!');
      } else {
        console.error('saveWinners function not available');
        alert('Error: saveWinners function not loaded');
      }
    } catch (error) {
      console.error('Failed to save winners:', error);
      alert('Failed to save winners: ' + error.message);
    }
  }

  // Handle clear winners button click
  handleClearWinners() {
    if (confirm('Are you sure you want to clear all winners for this week?')) {
      this.winnersDraft = {};
      this.saveWinnersDraft();
      
      // Trigger refresh of current view
      const event = new CustomEvent('winnersCleared', {
        detail: { year: this.currentYear, week: this.currentWeek }
      });
      document.dispatchEvent(event);
      
      alert('Winners cleared!');
    }
  }

  // Update winners draft data
  updateWinnersDraft(gameId, winner) {
    this.winnersDraft[gameId] = winner;
    this.saveWinnersDraft();
  }

  // Load winners draft from localStorage
  loadWinnersDraft() {
    try {
      const saved = localStorage.getItem('winnersDraft');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  }

  // Save winners draft to localStorage
  saveWinnersDraft() {
    try {
      localStorage.setItem('winnersDraft', JSON.stringify(this.winnersDraft));
    } catch (error) {
      console.error('Failed to save winners draft:', error);
    }
  }

  // Get current admin state
  getState() {
    return {
      resultsMode: this.resultsMode,
      currentYear: this.currentYear,
      currentWeek: this.currentWeek,
      winnersDraft: this.winnersDraft
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdminBar;
} else {
  window.AdminBar = AdminBar;
}
