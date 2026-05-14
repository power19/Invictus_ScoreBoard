const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// ── Helpers ────────────────────────────────────────────────────────────────

function createCompetitor(label) {
  return { name: label, team: '', points: 0, advantages: 0, penalties: 0 };
}

function createMatch() {
  return {
    competitor1: createCompetitor('Competitor 1'),
    competitor2: createCompetitor('Competitor 2'),
    duration: 300,
    timeLeft: 300,
    running: false,
    winner: null,       // null | 'competitor1' | 'competitor2'
    winMethod: null,    // null | 'points' | 'submission' | 'walkover' | 'dq'
    division: '',
    round: '',
    lastAction: null,   // { side, field, amount } — single undo
  };
}

function createMat(id) {
  return { id, name: `Mat ${id}`, match: createMatch() };
}

// ── Initial state ──────────────────────────────────────────────────────────

const MAX_MATS = 4;

let state = {
  tournament: { name: 'Invictus BJJ', matCount: 2 },
  mats: { 1: createMat(1), 2: createMat(2) },
  bracket: { divisions: [] },
};

// ── Timer management ───────────────────────────────────────────────────────

const timers = {};

function startTimer(matId) {
  if (timers[matId]) return;
  timers[matId] = setInterval(() => {
    const mat = state.mats[matId];
    if (!mat || !mat.match.running) {
      clearInterval(timers[matId]);
      delete timers[matId];
      return;
    }
    if (mat.match.timeLeft <= 0) {
      mat.match.timeLeft = 0;
      mat.match.running = false;
      clearInterval(timers[matId]);
      delete timers[matId];
      broadcast();
      return;
    }
    mat.match.timeLeft -= 1;
    broadcast();
  }, 1000);
}

function stopTimer(matId) {
  if (timers[matId]) {
    clearInterval(timers[matId]);
    delete timers[matId];
  }
}

function broadcast() {
  io.emit('state', state);
}

// ── Socket events ──────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  // Send full state on connect
  socket.emit('state', state);

  socket.on('setTournament', ({ name, matCount }) => {
    if (name !== undefined) state.tournament.name = name;
    if (matCount !== undefined) {
      const count = Math.min(Math.max(1, matCount), MAX_MATS);
      state.tournament.matCount = count;
      for (let i = 1; i <= count; i++) {
        if (!state.mats[i]) state.mats[i] = createMat(i);
      }
      for (let i = count + 1; i <= MAX_MATS; i++) {
        if (state.mats[i]) {
          stopTimer(i);
          delete state.mats[i];
        }
      }
    }
    broadcast();
  });

  socket.on('setMatName', ({ matId, name }) => {
    if (state.mats[matId]) state.mats[matId].name = name;
    broadcast();
  });

  socket.on('setCompetitor', ({ matId, side, field, value }) => {
    const mat = state.mats[matId];
    if (mat && mat.match[side]) mat.match[side][field] = value;
    broadcast();
  });

  socket.on('setMatchMeta', ({ matId, field, value }) => {
    const mat = state.mats[matId];
    if (!mat) return;
    mat.match[field] = value;
    if (field === 'duration') {
      mat.match.timeLeft = value;
      mat.match.running = false;
      stopTimer(matId);
    }
    broadcast();
  });

  function recordAndBroadcast(mat, side, field, amount) {
    if (!mat || mat.match.winner) return;
    mat.match[side][field] = Math.max(0, mat.match[side][field] + amount);
    mat.match.lastAction = { side, field, amount };
    broadcast();
  }

  socket.on('addPoints', ({ matId, side, amount }) =>
    recordAndBroadcast(state.mats[matId], side, 'points', amount));

  socket.on('addAdvantage', ({ matId, side, amount }) =>
    recordAndBroadcast(state.mats[matId], side, 'advantages', amount));

  socket.on('addPenalty', ({ matId, side, amount }) =>
    recordAndBroadcast(state.mats[matId], side, 'penalties', amount));

  socket.on('undoLast', ({ matId }) => {
    const mat = state.mats[matId];
    if (!mat || !mat.match.lastAction) return;
    const { side, field, amount } = mat.match.lastAction;
    mat.match[side][field] = Math.max(0, mat.match[side][field] - amount);
    mat.match.lastAction = null;
    broadcast();
  });

  socket.on('timerStart', ({ matId }) => {
    const mat = state.mats[matId];
    if (mat && !mat.match.winner && mat.match.timeLeft > 0) {
      mat.match.running = true;
      startTimer(matId);
      broadcast();
    }
  });

  socket.on('timerStop', ({ matId }) => {
    const mat = state.mats[matId];
    if (mat) {
      mat.match.running = false;
      stopTimer(matId);
      broadcast();
    }
  });

  socket.on('timerReset', ({ matId }) => {
    const mat = state.mats[matId];
    if (mat) {
      mat.match.running = false;
      mat.match.timeLeft = mat.match.duration;
      stopTimer(matId);
      broadcast();
    }
  });

  socket.on('declareWinner', ({ matId, winner, winMethod }) => {
    const mat = state.mats[matId];
    if (mat) {
      mat.match.winner = winner;
      mat.match.winMethod = winMethod;
      mat.match.running = false;
      stopTimer(matId);
      broadcast();
    }
  });

  socket.on('resetMatch', ({ matId }) => {
    const mat = state.mats[matId];
    if (mat) {
      stopTimer(matId);
      mat.match = createMatch();
      broadcast();
    }
  });

  // ── Bracket ──────────────────────────────────────────────────────────────

  socket.on('setBracket', (bracket) => {
    state.bracket = bracket;
    broadcast();
  });

  socket.on('addDivision', ({ name }) => {
    const id = `div_${Date.now()}`;
    state.bracket.divisions.push({ id, name, competitors: [], rounds: [] });
    broadcast();
  });

  socket.on('removeDivision', ({ divisionId }) => {
    state.bracket.divisions = state.bracket.divisions.filter(d => d.id !== divisionId);
    broadcast();
  });

  socket.on('addCompetitor', ({ divisionId, name, team }) => {
    const div = state.bracket.divisions.find(d => d.id === divisionId);
    if (div) {
      div.competitors.push({ id: `comp_${Date.now()}_${Math.random().toString(36).slice(2)}`, name, team });
      div.rounds = [];
    }
    broadcast();
  });

  socket.on('removeCompetitor', ({ divisionId, competitorId }) => {
    const div = state.bracket.divisions.find(d => d.id === divisionId);
    if (div) {
      div.competitors = div.competitors.filter(c => c.id !== competitorId);
      div.rounds = [];
    }
    broadcast();
  });

  socket.on('generateBracket', ({ divisionId }) => {
    const div = state.bracket.divisions.find(d => d.id === divisionId);
    if (!div || div.competitors.length < 2) return;
    div.rounds = buildSingleElim(div.competitors);
    broadcast();
  });

  socket.on('setBracketWinner', ({ divisionId, roundIndex, matchIndex, winnerId }) => {
    const div = state.bracket.divisions.find(d => d.id === divisionId);
    if (!div) return;
    const match = div.rounds[roundIndex]?.[matchIndex];
    if (!match) return;
    match.winnerId = winnerId;
    // Advance winner to next round
    if (roundIndex + 1 < div.rounds.length) {
      const nextMatchIndex = Math.floor(matchIndex / 2);
      const slot = matchIndex % 2 === 0 ? 'competitor1Id' : 'competitor2Id';
      div.rounds[roundIndex + 1][nextMatchIndex][slot] = winnerId;
    }
    broadcast();
  });
});

// Build a single-elimination bracket from a list of competitors
function buildSingleElim(competitors) {
  const n = competitors.length;
  const slots = nextPow2(n);
  const padded = [...competitors];
  while (padded.length < slots) padded.push(null); // null = bye

  const rounds = [];
  let currentRound = [];

  for (let i = 0; i < slots; i += 2) {
    const c1 = padded[i];
    const c2 = padded[i + 1];
    // Auto-advance if bye
    currentRound.push({
      id: `m_${Date.now()}_${i}`,
      competitor1Id: c1 ? c1.id : null,
      competitor2Id: c2 ? c2.id : null,
      winnerId: c1 && !c2 ? c1.id : (!c1 && c2 ? c2.id : null),
    });
  }
  rounds.push(currentRound);

  // Build subsequent empty rounds
  let prevCount = currentRound.length;
  while (prevCount > 1) {
    const nextCount = Math.ceil(prevCount / 2);
    const nextRound = Array.from({ length: nextCount }, (_, i) => ({
      id: `m_${Date.now()}_r${rounds.length}_${i}`,
      competitor1Id: null,
      competitor2Id: null,
      winnerId: null,
    }));
    // Auto-advance bye winners from previous round
    for (let i = 0; i < currentRound.length; i++) {
      if (currentRound[i].winnerId) {
        const slot = i % 2 === 0 ? 'competitor1Id' : 'competitor2Id';
        nextRound[Math.floor(i / 2)][slot] = currentRound[i].winnerId;
      }
    }
    rounds.push(nextRound);
    currentRound = nextRound;
    prevCount = nextCount;
  }

  return rounds;
}

function nextPow2(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🥋  Invictus Scoreboard server → http://localhost:${PORT}\n`);
});
