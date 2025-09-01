//
// Poppy Bowl - Confidence Pool Application
//

// Global state
let participants = [];
let results = {}; // expect { winners: { [gameId]: "Team Name" } }
let currentWeek = 1;
let gameSchedule = [];
let picks = {}; // picks[participantName][week][gameId] = { team, confidence }
let currentUser = null;
let scoreboardWeek = 1;

// Init
document.addEventListener('DOMContentLoaded', async () => {
await loadData();
loadSavedPicks();
ensureCurrentUser();
renderCurrentUserBanner();
populateUserSelectorDropDown(); // safety
initializeEventListeners();
switchTab('leaderboard'); // default
});

// Load participants, results, schedule
async function loadData() {
try {
// Participants
const participantsResponse = await fetch('./data/participants-2025.json');
if (participantsResponse.ok) {
participants = await participantsResponse.json();
if (participants.participants) {
participants = participants.participants;
}
participants.forEach(p => {
if (p.totalScore === undefined) p.totalScore = 0;
});
populateUserSelectorDropDown();
} else {
console.error('Failed to load participants data');
}

text
// Results
const resultsResponse = await fetch('./data/results-2025.json');
if (resultsResponse.ok) {
  results = await resultsResponse.json();
} else {
  results = {};
  console.error('Failed to load results data');
}

// Schedule
const scheduleResponse = await fetch('./data/schedule-2025.json');
if (scheduleResponse.ok) {
  const sched = await scheduleResponse.json();
  if (sched.weeks) {
    gameSchedule = sched.weeks.flatMap(w =>
      (w.games || []).map(g => ({ ...g, week: w.week }))
    );
  } else {
    gameSchedule = sched;
  }
} else {
  console.error('Failed to load schedule data');
}

// Compute totals initially
computeParticipantTotalsFromResults();
// Initial renders
updateLeaderboard();
} catch (err) {
console.error('Error loading data:', err);
}
}

// Events
function initializeEventListeners() {
// Tabs
document.querySelectorAll('.tab-button').forEach(button => {
button.addEventListener('click', e => {
const targetTab = e.target.getAttribute('data-tab');
switchTab(targetTab);
});
});

// Picks week nav
const prevWeekBtn = document.getElementById('prevWeek');
const nextWeekBtn = document.getElementById('nextWeek');
if (prevWeekBtn) prevWeekBtn.onclick = () => {
if (currentWeek > 1) {
currentWeek--;
renderWeeklyPicks();
updateWeekDisplay();
}
};
if (nextWeekBtn) nextWeekBtn.onclick = () => {
currentWeek++;
renderWeeklyPicks();
updateWeekDisplay();
};

// Scoreboard week nav
const sp = document.getElementById('scorePrevWeek');
const sn = document.getElementById('scoreNextWeek');
if (sp) sp.onclick = () => {
if (scoreboardWeek > 1) {
scoreboardWeek--;
renderScoreboard();
updateScoreboardWeekDisplay();
}
};
if (sn) sn.onclick = () => {
scoreboardWeek++;
renderScoreboard();
updateScoreboardWeekDisplay();
};
}

// Tabs
function switchTab(tabName) {
document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));

const selectedTab = document.getElementById(tabName);
if (selectedTab) selectedTab.style.display = 'block';
const selectedButton = document.querySelector([data-tab="${tabName}"]);
if (selectedButton) selectedButton.classList.add('active');

if (tabName === 'leaderboard') {
renderLeaderboard();
} else if (tabName === 'picks') {
renderWeeklyPicks();
updateWeekDisplay();
} else if (tabName === 'scoreboard') {
renderScoreboard();
updateScoreboardWeekDisplay();
}
}

// Leaderboard
function updateLeaderboard() {
renderLeaderboard();
}

function renderLeaderboard() {
computeParticipantTotalsFromResults();
const tbody = document.getElementById('leaderboardBody');
if (!tbody) return;

const sorted = [...participants].sort((a, b) => b.totalScore - a.totalScore);
tbody.innerHTML = '';

sorted.forEach((p, i) => {
const tr = document.createElement('tr');
tr.innerHTML = <td>${i + 1}</td><td>${p.name}</td><td>${p.totalScore || 0}</td>;
if (p.name === currentUser) {
tr.style.backgroundColor = '#fffbe6';
tr.style.fontWeight = '600';
}
tbody.appendChild(tr);
});
}

// Picks persistence
function loadSavedPicks() {
try {
const saved = localStorage.getItem('poppyBowlPicks');
picks = saved ? JSON.parse(saved) : {};
} catch (e) {
picks = {};
}
}

function saveAllPicks() {
localStorage.setItem('poppyBowlPicks', JSON.stringify(picks));
}

// Current user identity
function ensureCurrentUser() {
currentUser = localStorage.getItem('poppyBowlUserName');
if (!currentUser) {
showUserSelector();
} else {
populateUserSelectorDropDown();
}
}

function setCurrentUser(name) {
const trimmed = (name || '').trim();
if (!trimmed) return;
currentUser = trimmed;
localStorage.setItem('poppyBowlUserName', currentUser);
renderCurrentUserBanner();
const selector = document.getElementById('userSelector');
if (selector) selector.style.display = 'none';
if (document.getElementById('picks')?.style.display !== 'none') {
renderWeeklyPicks();
}
updateLeaderboard();
}

function clearCurrentUser() {
localStorage.removeItem('poppyBowlUserName');
currentUser = null;
renderCurrentUserBanner();
showUserSelector();
}

function renderCurrentUserBanner() {
const banner = document.getElementById('currentUserBanner');
if (!banner) return;
if (currentUser) {
banner.innerHTML = Logged in as: <strong>${currentUser}</strong> <button id="changeUserBtn" style="margin-left:8px;">Change User</button>;
const btn = document.getElementById('changeUserBtn');
if (btn) btn.onclick = clearCurrentUser;
} else {
banner.innerHTML = '';
}
}

// User selector UI + dropdown
function showUserSelector() {
populateUserSelectorDropDown();
const sel = document.getElementById('userSelector');
const btn = document.getElementById('userSelectBtn');
const dd = document.getElementById('userDropdown');
const custom = document.getElementById('userCustom');

if (!sel || !btn || !dd || !custom) return;
sel.style.display = 'block';

btn.onclick = () => {
const chosen = custom.value.trim() || dd.value;
if (chosen) setCurrentUser(chosen);
};
}

function populateUserSelectorDropDown() {
const dd = document.getElementById('userDropdown');
if (!dd) return;
if (!Array.isArray(participants) || participants.length === 0) return;

const prev = dd.value;
dd.innerHTML = '';
const def = document.createElement('option');
def.value = '';
def.textContent = '-- Select Participant --';
dd.appendChild(def);

participants.forEach(p => {
const opt = document.createElement('option');
opt.value = p.name;
opt.textContent = p.name;
dd.appendChild(opt);
});

if (prev) {
const exists = [...dd.options].some(o => o.value === prev);
if (exists) dd.value = prev;
}
}

// Picks rendering
function renderWeeklyPicks() {
const container = document.getElementById('weeklyPicks');
if (!container) return;

container.innerHTML = '';

if (!currentUser) {
container.innerHTML = '<div>Please select your name to make picks.</div>';
showUserSelector();
return;
}

const weekGames = gameSchedule.filter(g => g.week === currentWeek);
if (weekGames.length === 0) {
container.textContent = 'No games scheduled for this week.';
return;
}

// Validation message
const warningDiv = document.createElement('div');
warningDiv.id = 'validationWarning';
warningDiv.className = 'warn';
container.appendChild(warningDiv);

const userWeekPicks = (picks[currentUser] && picks[currentUser][currentWeek]) || {};

weekGames.forEach(game => {
const pick = userWeekPicks[game.id] || {};
const block = document.createElement('div');
block.className = 'game-card';

text
block.innerHTML = `
  <div style="font-weight:600; margin-bottom:6px;">
    ${game.away} @ ${game.home}
  </div>
  <div class="small" style="margin-bottom:8px;">Date: ${game.date}</div>

  <label style="margin-right:12px;">
    <input type="radio" name="game_${game.id}" value="${game.away}" ${pick.team === game.away ? 'checked' : ''}> ${game.away}
  </label>
  <label style="margin-right:12px;">
    <input type="radio" name="game_${game.id}" value="${game.home}" ${pick.team === game.home ? 'checked' : ''}> ${game.home}
  </label>

  <label style="margin-left:12px;">
    Confidence:
    <input type="number" min="1" max="${weekGames.length}" value="${pick.confidence || ''}" data-game-id="${game.id}" class="confidence-input-field" style="width:60px; margin-left:6px;">
  </label>
`;

container.appendChild(block);
});

const saveBtn = document.createElement('button');
saveBtn.textContent = 'Save Picks';
saveBtn.className = 'save-btn';
saveBtn.onclick = () => { saveAllPicks(); alert('Picks saved!'); };
container.appendChild(saveBtn);

addPickEventListeners();
validateConfidenceValues();
}

function addPickEventListeners() {
document.querySelectorAll('input[type="radio"]').forEach(radio => {
radio.addEventListener('change', e => {
const gameId = e.target.name.replace('game_', '');
const team = e.target.value;
const confEl = document.querySelector(input[data-game-id="${gameId}"]);
const confidence = confEl ? confEl.value : 0;
savePick(gameId, team, confidence);
});
});

document.querySelectorAll('.confidence-input-field').forEach(input => {
input.addEventListener('input', e => {
const gameId = e.target.dataset.gameId;
const confidence = e.target.value;
const selected = document.querySelector(input[name="game_${gameId}"]:checked);
const team = selected ? selected.value : '';
if (team) savePick(gameId, team, confidence);
});
});
}

function savePick(gameId, team, confidence) {
if (!currentUser) {
showUserSelector();
return;
}
if (!picks[currentUser]) picks[currentUser] = {};
if (!picks[currentUser][currentWeek]) picks[currentUser][currentWeek] = {};

picks[currentUser][currentWeek][gameId] = {
team,
confidence: parseInt(confidence) || 0
};

saveAllPicks();
validateConfidenceValues();
}

// Validation
function validateConfidenceValues() {
if (!currentUser) return;
const weekGames = gameSchedule.filter(g => g.week === currentWeek);
const numGamesThisWeek = weekGames.length;
const currentPicks = (picks[currentUser] && picks[currentUser][currentWeek]) || {};

const confidenceValues = Object.values(currentPicks)
.map(p => p.confidence)
.filter(c => c > 0);

const duplicates = confidenceValues.filter((v, i, arr) => arr.indexOf(v) !== i);
const outOfRange = confidenceValues.filter(v => v < 1 || v > numGamesThisWeek);

const warningEl = document.getElementById('validationWarning');
if (!warningEl) return;

if (duplicates.length > 0 || outOfRange.length > 0) {
let msg = '';
if (duplicates.length > 0) msg += Duplicate confidence values: ${[...new Set(duplicates)].join(', ')}. ;
if (outOfRange.length > 0) msg += Confidence values must be between 1 and ${numGamesThisWeek}. ;
warningEl.textContent = msg.trim();
warningEl.style.display = 'block';
} else {
warningEl.style.display = 'none';
}
}

// Scoring
function computeParticipantTotalsFromResults() {
const winners = (results && results.winners) ? results.winners : {};
// Zero totals
participants.forEach(p => { p.totalScore = 0; });
// Sum across all saved picks in localStorage for every participant
for (const participantName in picks) {
const participant = participants.find(p => p.name === participantName);
if (!participant) continue;
let cumulative = 0;
const weeks = picks[participantName] || {};
for (const weekStr in weeks) {
const games = weeks[weekStr] || {};
for (const gameId in games) {
const pick = games[gameId];
if (winners[gameId] && pick && pick.team === winners[gameId]) {
cumulative += pick.confidence || 0;
}
}
}
participant.totalScore = cumulative;
}
}

// Scoreboard
function renderScoreboard() {
const tbody = document.getElementById('scoreboardBody');
if (!tbody) return;
// Recompute totals before display
computeParticipantTotalsFromResults();

const winners = (results && results.winners) ? results.winners : {};
const thisWeek = scoreboardWeek;

const rows = participants.map(p => {
let weekPoints = 0;
const byWeek = picks[p.name] || {};
const weekPicks = byWeek[thisWeek] || {};
for (const gid in weekPicks) {
const pick = weekPicks[gid];
if (winners[gid] && pick.team === winners[gid]) {
weekPoints += pick.confidence || 0;
}
}
return { name: p.name, thisWeek: weekPoints, total: p.totalScore || 0 };
});

// Sort by this week's points descending
rows.sort((a, b) => b.thisWeek - a.thisWeek);

tbody.innerHTML = '';
rows.forEach(r => {
const tr = document.createElement('tr');
tr.innerHTML = <td>${r.name}</td><td>${r.thisWeek}</td><td>${r.total}</td>;
tbody.appendChild(tr);
});

const ts = document.getElementById('scoresTimestamp');
if (ts) ts.textContent = 'Totals last updated: ' + new Date().toLocaleString();
}

function updateScoreboardWeekDisplay() {
const el = document.getElementById('scoreWeekDisplay');
if (el) el.textContent = Week ${scoreboardWeek};
}

// Week label for Picks tab
function updateWeekDisplay() {
const el = document.getElementById('currentWeekDisplay');
if (el) el.textContent = Week ${currentWeek};
}

// Exports (optional for tests)
if (typeof module !== 'undefined' && module.exports) {
module.exports = {
loadData,
renderLeaderboard,
renderWeeklyPicks,
updateLeaderboard,
savePick,
loadSavedPicks,
validateConfidenceValues,
computeParticipantTotalsFromResults,
renderScoreboard
};
}

Final step: results and schedule tweaks

Normalize results to winners map (data/results-2025.json):

{
"winners": {
"W1G1": "Fly Eagles Fly",
"W1G2": "Kansas City Chiefs"
}
}
