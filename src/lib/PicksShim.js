(function(){
const YEAR = 2025;
const LOCAL_PREFIX = 'poppy:picks:2025:';
function localKey(user, week) { return ${LOCAL_PREFIX}${week}:${user}; }

async function saveUserPicks(user, week, picksObj) {
if (!user || !week) return false;
const payload = { picks: picksObj, savedAt: new Date().toISOString() };
try { localStorage.setItem(localKey(user, week), JSON.stringify(payload)); } catch {}
try {
if (window.picksStorage && window.picksStorage.isConfigured()) {
return await window.picksStorage.savePicksToGitHub(user, YEAR, week, payload);
}
} catch (e) {
console.warn('GitHub save failed; local-only this time:', e);
}
return true;
}

async function loadUserPicks(user, week) {
if (!user || !week) return {};
let local = null, remote = null;
try {
const raw = localStorage.getItem(localKey(user, week));
local = raw ? JSON.parse(raw) : null;
} catch {}
try {
if (window.picksStorage && window.picksStorage.isConfigured()) {
remote = await window.picksStorage.loadPicksFromGitHub(user, YEAR, week);
}
} catch (e) {
console.warn('GitHub load failed:', e);
}
const merged = (window.picksStorage && typeof window.picksStorage.mergeLocalAndRemote === 'function')
? window.picksStorage.mergeLocalAndRemote(local, remote)
: (remote || local);
return merged?.picks || {};
}

window.saveUserPicks = saveUserPicks;
window.loadUserPicks = loadUserPicks;
})();
