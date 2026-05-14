# Invictus BJJ Scoreboard

Real-time BJJ competition scoreboard with live public display and tournament bracket.

## Quick Start

```bash
# 1. Install all dependencies
npm run install:all

# 2. Start both server and client
npm run dev
```

Then open **http://localhost:3000** in your browser.

## Setup at the Event

1. Open **http://localhost:3000** on the laptop — this is the control panel.
2. On the Dashboard, click **"Open Display"** next to each mat.
3. Drag the display window to the second screen (projector/TV) and press **F11** for fullscreen.
4. Click **"Control Panel"** on the Dashboard to start scoring.

## Scoring (BJJ rules)

| Button | Points | Notes |
|--------|--------|-------|
| Takedown / Sweep / Knee on Belly | +2 | |
| Guard Pass | +3 | |
| Mount / Back Control | +4 | |
| Advantage | +Adv | |
| Penalty | +Pen | |
| Submission | Win | Ends match immediately (with confirmation) |

- Use **Undo** to reverse the last action if you misclick.
- **Reset Timer** resets to the configured duration without clearing scores.
- **Reset Match** clears everything for the next match.

## Tournament Bracket

1. Go to **Edit Bracket** on the Dashboard.
2. Add divisions (e.g. "Adult Male Blue Belt -70kg").
3. Add competitors to each division.
4. Click **Generate Bracket** — single elimination, byes handled automatically.
5. Click **Open Bracket Display** to show the bracket on a screen.
6. During the tournament, click on any match in the bracket to select the winner.

## Ports

| Service | Port |
|---------|------|
| Frontend | 3000 |
| Backend  | 3001 |
