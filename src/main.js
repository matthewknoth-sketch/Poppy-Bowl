// Validate confidence values for duplicates - only check non-empty values
function validateConfidenceValues() {
  const weekData = schedule[currentWeek - 1];
  if (!weekData) return;
  
  const games = weekData.games || [];
  const values = [];
  
  games.forEach(game => {
    const input = document.getElementById(`confidence-${game.id}`);
    const value = parseInt(input?.value);
    // Only check non-empty values (greater than 0)
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