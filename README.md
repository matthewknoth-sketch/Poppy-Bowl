# Poppy Bowl

A confidence pool application for fantasy football bowl games. Select your confidence levels for each matchup and track your score throughout the season.

## Usage

### Getting Started
1. Open `index.html` in a web browser
2. Ensure the `data/schedule-2025.json` file contains valid game data
3. The application will load with Week 1 selected by default

### Making Picks
1. **Select Teams**: Click the radio button next to your predicted winner for each game
2. **Assign Confidence**: Enter a confidence value (1-16) for each game
   - Higher numbers represent higher confidence in your pick
   - Each confidence value must be unique within the week
   - Duplicate values will show a warning and prevent saving

### Scoring System
- **Projected Total**: Sum of all assigned confidence values
- **Official Total**: Sum of confidence values for games where your pick matches the actual winner
- Your picks and confidence values are automatically saved to browser localStorage

### Controls
- **Save Picks**: Manually save your current selections (auto-saves on changes)
- **Clear All**: Remove all picks and confidence values for the current week
- **Week Selector**: Currently supports Week 1 (other weeks disabled for now)

### Data Format
The `data/schedule-2025.json` file should contain:
```json
{
  "weeks": [
    {
      "games": [
        {
          "id": "unique-game-id",
          "home": "Team Name",
          "away": "Team Name", 
          "date": "2025-01-01T12:00:00Z",
          "winner": "Team Name" // Optional, set after game completion
        }
      ]
    }
  ]
}
```

## Notes
- All data is stored locally in your browser
- Refresh the page to reload from saved state
- Confidence validation ensures fair play in pool competitions
