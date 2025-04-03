# Pong Tournament Management System - Database Design

## Database Tables and Relationships

### 1. Players Table
```sql
CREATE TABLE players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE NOT NULL
)
```
- Stores unique player identifiers
- `user_id` is the player's username
- Case-insensitive unique constraint

### 2. Tournaments Table
```sql
CREATE TABLE tournaments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    start_time DATETIME,
    end_time DATETIME,
    settings JSON,
    status TEXT CHECK(status IN ('pending', 'ongoing', 'completed'))
)
```
- Tracks tournament metadata
- `settings` stores tournament-specific configuration
- `status` indicates current tournament state

### 3. Tournament Players Table
```sql
CREATE TABLE tournament_players (
    tournament_id INTEGER,
    player_id INTEGER,
    final_position INTEGER,
    PRIMARY KEY (tournament_id, player_id),
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
    FOREIGN KEY (player_id) REFERENCES players(id)
)
```
- Connects players to tournaments
- `final_position` tracks player's final ranking in the tournament

### 4. Games Table
```sql
CREATE TABLE games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER,
    start_time DATETIME,
    end_time DATETIME,
    settings JSON,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
)
```
- Stores individual game information
- Can be associated with a tournament or be standalone
- `settings` stores game-specific configuration

### 5. Game Players Table
```sql
CREATE TABLE game_players (
    game_id INTEGER,
    player_id INTEGER,
    score INTEGER,
    PRIMARY KEY (game_id, player_id),
    FOREIGN KEY (game_id) REFERENCES games(id),
    FOREIGN KEY (player_id) REFERENCES players(id)
)
```
- Connects players to specific games
- Tracks individual player scores

## Relationship Workflow

### Player Creation
1. Players are created automatically when first referenced
2. Uses case-insensitive unique `user_id`
3. Can be added to tournaments and games

### Tournament Lifecycle
1. Create tournament
   - Set name, start time, settings
   - Initial status: 'pending'
2. Add players to tournament
3. Play games within tournament
4. Update tournament results
   - Set final player positions
   - Change status to 'completed'
   - Set end time

### Game Creation
1. Games can be standalone or part of a tournament
2. Each game can have multiple players
3. Players' scores are recorded individually

## Key Features
- Flexible tournament and game management
- JSON settings for customizable configurations
- Tracks detailed player and game statistics
- Supports various tournament and game formats

## Data Retrieval Examples

### Get Player Statistics
- Total games played
- Win rate
- Tournament participation
- Tournament wins

### Get Tournament Details
- Participants
- Games played
- Final rankings

### Get Game Information
- Players
- Scores
- Game settings
