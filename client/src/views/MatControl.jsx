import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../socket';

const BTN_COLORS = ['blue', 'indigo', 'violet', 'emerald', 'amber'];

const COLOR = {
  blue:    { btn: 'bg-blue-700 hover:bg-blue-600 active:bg-blue-800 border-blue-600',    badge: 'bg-blue-900 text-blue-300' },
  indigo:  { btn: 'bg-indigo-700 hover:bg-indigo-600 active:bg-indigo-800 border-indigo-600',  badge: 'bg-indigo-900 text-indigo-300' },
  violet:  { btn: 'bg-violet-700 hover:bg-violet-600 active:bg-violet-800 border-violet-600',  badge: 'bg-violet-900 text-violet-300' },
  emerald: { btn: 'bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 border-emerald-600', badge: 'bg-emerald-900 text-emerald-300' },
  amber:   { btn: 'bg-amber-700 hover:bg-amber-600 active:bg-amber-800 border-amber-600',   badge: 'bg-amber-900 text-amber-300' },
};

// ── Keyboard shortcuts ─────────────────────────────────────────────────────

const ACTIONS = [
  { id: 'timerToggle', label: 'Start / Stop Timer' },
  { id: 'timerReset',  label: 'Reset Timer' },
  { id: 'undoLast',    label: 'Undo Last Score' },
];

const DEFAULT_BINDINGS = {
  timerToggle: { code: 'Space', label: 'Space' },
  timerReset:  { code: 'KeyR',  label: 'R' },
  undoLast:    { code: 'KeyZ',  label: 'Z' },
};

const KB_STORAGE_KEY    = 'invictus_kb_bindings';
const SCORE_BTN_STORAGE = 'invictus_score_buttons';

const DEFAULT_SCORE_BUTTONS = [
  { id: 1, label: 'Takedown',   sub: 'Sweep / Knee on Belly', points: 2 },
  { id: 2, label: 'Guard Pass', sub: '',                       points: 3 },
  { id: 3, label: 'Mount',      sub: 'Back Control',           points: 4 },
];

function loadBindings() {
  try {
    const saved = JSON.parse(localStorage.getItem(KB_STORAGE_KEY));
    if (saved) return { ...DEFAULT_BINDINGS, ...saved };
  } catch {}
  return { ...DEFAULT_BINDINGS };
}

function loadScoreButtons() {
  try {
    const saved = JSON.parse(localStorage.getItem(SCORE_BTN_STORAGE));
    if (Array.isArray(saved)) return saved;
  } catch {}
  return DEFAULT_SCORE_BUTTONS;
}

// ── Main component ─────────────────────────────────────────────────────────

export default function MatControl({ state }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const matId = Number(id);
  const mat = state?.mats?.[matId];

  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmWinner, setConfirmWinner] = useState(null);
  const [editingDuration, setEditingDuration] = useState(false);
  const [durationInput, setDurationInput] = useState('');
  const [showControls, setShowControls] = useState(false);
  const [showScoreSetup, setShowScoreSetup] = useState(false);
  const [bindings, setBindings] = useState(loadBindings);
  const [scoreButtons, setScoreButtons] = useState(loadScoreButtons);

  const shortcutHandlerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => shortcutHandlerRef.current?.(e);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!mat) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <p className="text-gray-400 text-xl">Mat {id} not found.</p>
          <button onClick={() => navigate('/')} className="mt-4 text-blue-400 hover:underline">← Back to Dashboard</button>
        </div>
      </div>
    );
  }

  const { match } = mat;
  const finished = !!match.winner;

  function emit(event, data) {
    socket.emit(event, { matId, ...data });
  }

  shortcutHandlerRef.current = (e) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
    if (confirmReset || confirmWinner || showControls || showScoreSetup || editingDuration) return;
    if (finished) return;

    const found = Object.entries(bindings).find(([, b]) => b.code === e.code);
    if (!found) return;
    e.preventDefault();
    const [action] = found;

    if (action === 'timerToggle') {
      if (match.running) emit('timerStop', {});
      else if (match.timeLeft > 0) emit('timerStart', {});
    } else if (action === 'timerReset') {
      emit('timerReset', {});
    } else if (action === 'undoLast' && match.lastAction) {
      emit('undoLast', {});
    }
  };

  function openDisplay() {
    window.open(`/mat/${matId}/display`, `mat${matId}_display`, 'width=1280,height=720');
  }

  function saveDuration() {
    const mins = parseFloat(durationInput);
    if (!isNaN(mins) && mins > 0) {
      emit('setMatchMeta', { field: 'duration', value: Math.round(mins * 60) });
    }
    setEditingDuration(false);
  }

  function doReset() {
    emit('resetMatch', {});
    setConfirmReset(false);
  }

  function doWinner() {
    emit('declareWinner', confirmWinner);
    setConfirmWinner(null);
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col no-select">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
        <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white text-sm">← Dashboard</button>
        <div className="text-center">
          <h1 className="text-xl font-bold text-white">{mat.name}</h1>
          {(match.division || match.round) && (
            <p className="text-sm text-gray-400">{[match.division, match.round].filter(Boolean).join(' · ')}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowScoreSetup(true)}
            className="bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-sm px-3 py-1.5 rounded-lg border border-gray-700"
          >
            ⚙ Scoring
          </button>
          <button
            onClick={() => setShowControls(true)}
            className="bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-sm px-3 py-1.5 rounded-lg border border-gray-700"
          >
            ⌨ Controls
          </button>
          <button onClick={openDisplay} className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-3 py-1.5 rounded-lg">
            Open Display ↗
          </button>
        </div>
      </div>

      {/* Division / Round quick edit */}
      <div className="flex gap-2 px-4 py-2 bg-gray-900 border-b border-gray-800">
        <input
          className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500"
          placeholder="Division (e.g. Adult Blue Belt -70kg)"
          value={match.division}
          onChange={(e) => emit('setMatchMeta', { field: 'division', value: e.target.value })}
        />
        <input
          className="w-40 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500"
          placeholder="Round (e.g. Final)"
          value={match.round}
          onChange={(e) => emit('setMatchMeta', { field: 'round', value: e.target.value })}
        />
      </div>

      {/* Winner banner */}
      {finished && (
        <div className="bg-green-900 border-b border-green-700 px-4 py-3 text-center">
          <p className="text-green-300 font-bold text-lg">
            🏆 Winner: {match[match.winner].name}
            {match.winMethod === 'submission' ? ' by Submission' :
             match.winMethod === 'dq' ? ' by DQ' :
             match.winMethod === 'walkover' ? ' by Walkover' : ' by Points'}
          </p>
          <button
            onClick={() => setConfirmReset(true)}
            className="mt-1 text-green-400 hover:text-white text-sm underline"
          >
            Reset for next match
          </button>
        </div>
      )}

      {/* Main scoring area */}
      <div className="flex flex-1 overflow-hidden">
        <CompetitorPanel
          side="competitor1"
          competitor={match.competitor1}
          isWinner={match.winner === 'competitor1'}
          finished={finished}
          colorClass="border-blue-800"
          nameColor="text-blue-300"
          scoreButtons={scoreButtons}
          emit={emit}
        />

        {/* Center divider with timer */}
        <div className="flex flex-col items-center justify-between py-4 px-3 bg-gray-900 border-l border-r border-gray-800 min-w-[180px]">
          {/* Timer display */}
          <div className="flex flex-col items-center">
            <p className="text-sm text-gray-500 uppercase tracking-widest mb-1">Time</p>
            <div className={`text-6xl font-mono font-black ${match.running ? 'text-white' : match.timeLeft === 0 ? 'text-red-400' : 'text-gray-300'}`}>
              {formatTime(match.timeLeft)}
            </div>
            {editingDuration ? (
              <div className="flex items-center gap-1 mt-2">
                <input
                  autoFocus
                  className="w-16 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white outline-none text-center"
                  placeholder="min"
                  value={durationInput}
                  onChange={(e) => setDurationInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveDuration(); if (e.key === 'Escape') setEditingDuration(false); }}
                />
                <button onClick={saveDuration} className="text-xs bg-blue-700 hover:bg-blue-600 px-2 py-1 rounded">Set</button>
              </div>
            ) : (
              <button
                onClick={() => { setDurationInput((match.duration / 60).toString()); setEditingDuration(true); }}
                className="text-sm text-gray-600 hover:text-gray-400 mt-1"
              >
                {Math.floor(match.duration / 60)}min
              </button>
            )}
          </div>

          {/* Timer controls */}
          <div className="flex flex-col gap-2 w-full mt-4">
            {!finished && (
              <>
                {match.running ? (
                  <button
                    onClick={() => emit('timerStop', {})}
                    className="w-full bg-yellow-600 hover:bg-yellow-500 active:bg-yellow-700 text-white py-4 rounded-xl font-bold text-xl"
                  >
                    <span>⏸ Pause</span>
                    <KeyHint label={bindings.timerToggle.label} />
                  </button>
                ) : (
                  <button
                    onClick={() => emit('timerStart', {})}
                    disabled={match.timeLeft === 0}
                    className="w-full bg-green-700 hover:bg-green-600 active:bg-green-800 disabled:opacity-40 text-white py-4 rounded-xl font-bold text-xl"
                  >
                    <span>▶ Start</span>
                    <KeyHint label={bindings.timerToggle.label} />
                  </button>
                )}
                <button
                  onClick={() => emit('timerReset', {})}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-xl font-semibold text-base"
                >
                  Reset Timer
                  <KeyHint label={bindings.timerReset.label} />
                </button>
              </>
            )}
          </div>

          {/* Undo */}
          {!finished && match.lastAction && (
            <button
              onClick={() => emit('undoLast', {})}
              className="w-full mt-3 bg-orange-900 hover:bg-orange-800 border border-orange-700 text-orange-300 py-2 rounded-xl text-sm font-semibold"
            >
              ↩ Undo
              <KeyHint label={bindings.undoLast.label} />
            </button>
          )}

          {/* Submission & reset */}
          {!finished && (
            <div className="flex flex-col gap-2 w-full mt-3">
              <p className="text-sm text-gray-500 text-center uppercase tracking-wider">Submission</p>
              <button
                onClick={() => setConfirmWinner({ winner: 'competitor1', winMethod: 'submission' })}
                className="w-full bg-red-900 hover:bg-red-800 border border-red-700 text-red-300 py-2 rounded-xl text-sm font-bold"
              >
                Sub → P1
              </button>
              <button
                onClick={() => setConfirmWinner({ winner: 'competitor2', winMethod: 'submission' })}
                className="w-full bg-red-900 hover:bg-red-800 border border-red-700 text-red-300 py-2 rounded-xl text-sm font-bold"
              >
                Sub → P2
              </button>
            </div>
          )}

          {!finished && (
            <button
              onClick={() => setConfirmReset(true)}
              className="w-full mt-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-500 hover:text-gray-300 py-2 rounded-xl text-sm"
            >
              Reset Match
            </button>
          )}
        </div>

        <CompetitorPanel
          side="competitor2"
          competitor={match.competitor2}
          isWinner={match.winner === 'competitor2'}
          finished={finished}
          colorClass="border-red-900"
          nameColor="text-red-300"
          scoreButtons={scoreButtons}
          emit={emit}
        />
      </div>

      {/* Confirm reset dialog */}
      {confirmReset && (
        <Modal
          title="Reset Match?"
          message="This will clear all scores, timer, and competitor info."
          onConfirm={doReset}
          onCancel={() => setConfirmReset(false)}
          confirmLabel="Yes, Reset"
          confirmColor="bg-red-700 hover:bg-red-600"
        />
      )}

      {/* Confirm winner dialog */}
      {confirmWinner && (
        <Modal
          title="Confirm Submission"
          message={`Declare ${match[confirmWinner.winner].name} the winner by submission?`}
          onConfirm={doWinner}
          onCancel={() => setConfirmWinner(null)}
          confirmLabel="Confirm"
          confirmColor="bg-red-700 hover:bg-red-600"
        />
      )}

      {/* Keyboard controls settings */}
      {showControls && (
        <ControlsModal
          bindings={bindings}
          onSave={(updated) => { setBindings(updated); setShowControls(false); }}
          onClose={() => setShowControls(false)}
        />
      )}

      {/* Score button settings */}
      {showScoreSetup && (
        <ScoreButtonsModal
          scoreButtons={scoreButtons}
          onSave={(updated) => { setScoreButtons(updated); setShowScoreSetup(false); }}
          onClose={() => setShowScoreSetup(false)}
        />
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function KeyHint({ label }) {
  return <span className="ml-2 text-xs opacity-50 font-mono font-normal">[{label}]</span>;
}

function CompetitorPanel({ side, competitor, isWinner, finished, colorClass, nameColor, scoreButtons, emit }) {
  const matId = Number(useParams().id);

  function add(type, amount) {
    const events = { points: 'addPoints', advantages: 'addAdvantage', penalties: 'addPenalty' };
    socket.emit(events[type], { matId, side, amount });
  }

  return (
    <div className={`flex-1 flex flex-col p-4 border-t-4 ${colorClass}`}>
      {/* Name & team */}
      <div className="mb-4">
        <input
          className="w-full bg-transparent border-b border-gray-700 focus:border-blue-500 outline-none text-2xl font-bold text-white pb-1 placeholder-gray-600"
          placeholder={side === 'competitor1' ? 'Competitor 1' : 'Competitor 2'}
          value={competitor.name}
          onChange={(e) => socket.emit('setCompetitor', { matId, side, field: 'name', value: e.target.value })}
        />
        <input
          className="w-full bg-transparent border-b border-gray-800 focus:border-gray-600 outline-none text-base text-gray-500 mt-1 pb-1 placeholder-gray-700"
          placeholder="Team / Club"
          value={competitor.team}
          onChange={(e) => socket.emit('setCompetitor', { matId, side, field: 'team', value: e.target.value })}
        />
      </div>

      {/* Points display + +/- buttons */}
      <div className={`text-center mb-4 ${isWinner ? 'text-green-400' : 'text-white'}`}>
        <div className="text-8xl font-black leading-none">{competitor.points}</div>
        <div className="text-base text-gray-400 mt-1">points</div>
        {!finished && (
          <div className="flex gap-3 mt-3 justify-center">
            <button
              onClick={() => add('points', -1)}
              disabled={competitor.points === 0}
              className="w-16 h-16 bg-gray-700 hover:bg-gray-600 active:bg-gray-800 disabled:opacity-30 text-white rounded-2xl text-3xl font-bold transition-all active:scale-95"
            >
              −
            </button>
            <button
              onClick={() => add('points', 1)}
              className="w-16 h-16 bg-gray-700 hover:bg-gray-600 active:bg-gray-800 text-white rounded-2xl text-3xl font-bold transition-all active:scale-95"
            >
              +
            </button>
          </div>
        )}
      </div>

      {/* Configurable score quick-buttons */}
      {!finished && scoreButtons.length > 0 && (
        <div className="flex flex-col gap-3 mb-4">
          {scoreButtons.map((btn, i) => {
            const color = BTN_COLORS[i % BTN_COLORS.length];
            return (
              <button
                key={btn.id}
                onClick={() => add('points', btn.points)}
                className={`w-full py-4 rounded-2xl border-2 text-white font-bold text-xl transition-all active:scale-95 ${COLOR[color].btn}`}
              >
                <span className="block text-lg leading-tight">{btn.label}</span>
                {btn.sub && <span className="block text-sm font-normal opacity-75 leading-tight">{btn.sub}</span>}
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-sm font-black ${COLOR[color].badge}`}>
                  +{btn.points}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Advantage & Penalty */}
      {!finished && (
        <div className="flex gap-3 mt-auto">
          <CounterButton
            label="Advantage"
            value={competitor.advantages}
            color="text-yellow-400"
            onAdd={() => add('advantages', 1)}
            onRemove={() => add('advantages', -1)}
          />
          <CounterButton
            label="Penalty"
            value={competitor.penalties}
            color="text-red-400"
            onAdd={() => add('penalties', 1)}
            onRemove={() => add('penalties', -1)}
          />
        </div>
      )}

      {/* Show adv/pen when finished */}
      {finished && (
        <div className="flex gap-4 justify-center text-base text-gray-400">
          <span>Adv: <strong className="text-yellow-400">{competitor.advantages}</strong></span>
          <span>Pen: <strong className="text-red-400">{competitor.penalties}</strong></span>
        </div>
      )}
    </div>
  );
}

function CounterButton({ label, value, color, onAdd, onRemove }) {
  return (
    <div className="flex-1 bg-gray-800 rounded-xl p-3 text-center border border-gray-700">
      <p className="text-sm text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <div className={`text-4xl font-black ${color} mb-2`}>{value}</div>
      <div className="flex gap-2">
        <button
          onClick={onRemove}
          disabled={value === 0}
          className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-white rounded-lg py-2 text-xl font-bold"
        >
          −
        </button>
        <button
          onClick={onAdd}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white rounded-lg py-2 text-xl font-bold"
        >
          +
        </button>
      </div>
    </div>
  );
}

function ScoreButtonsModal({ scoreButtons, onSave, onClose }) {
  const [local, setLocal] = useState(() => scoreButtons.map((b) => ({ ...b })));

  function update(id, field, value) {
    setLocal((prev) => prev.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
  }

  function remove(id) {
    setLocal((prev) => prev.filter((b) => b.id !== id));
  }

  function add() {
    setLocal((prev) => [...prev, { id: Date.now(), label: '', sub: '', points: 1 }]);
  }

  function save() {
    const valid = local.filter((b) => b.label.trim() && Number(b.points) > 0);
    localStorage.setItem(SCORE_BTN_STORAGE, JSON.stringify(valid));
    onSave(valid);
  }

  function resetDefaults() {
    setLocal(DEFAULT_SCORE_BUTTONS.map((b) => ({ ...b })));
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-1">Score Buttons</h3>
        <p className="text-gray-500 text-sm mb-4">Preset scoring shortcuts. Leave empty to use only the +/− counters.</p>

        <div className="flex flex-col gap-2 mb-4 max-h-72 overflow-y-auto pr-1">
          {local.map((btn) => (
            <div key={btn.id} className="flex items-center gap-2 bg-gray-800 rounded-xl p-3">
              <input
                className="flex-1 min-w-0 bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white outline-none focus:border-blue-500 placeholder-gray-500"
                placeholder="Label"
                value={btn.label}
                onChange={(e) => update(btn.id, 'label', e.target.value)}
              />
              <input
                className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-gray-400 outline-none focus:border-blue-500 placeholder-gray-600"
                placeholder="Sub (opt)"
                value={btn.sub}
                onChange={(e) => update(btn.id, 'sub', e.target.value)}
              />
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-gray-500 text-sm font-bold">+</span>
                <input
                  type="number"
                  min="1"
                  className="w-12 bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white outline-none focus:border-blue-500 text-center"
                  value={btn.points}
                  onChange={(e) => update(btn.id, 'points', parseInt(e.target.value) || 1)}
                />
              </div>
              <button
                onClick={() => remove(btn.id)}
                className="text-gray-600 hover:text-red-400 text-lg font-bold w-6 flex-shrink-0 text-center"
              >
                ✕
              </button>
            </div>
          ))}
          {local.length === 0 && (
            <p className="text-gray-600 text-sm text-center py-4">No buttons — only +/− counters will show.</p>
          )}
        </div>

        <button
          onClick={add}
          className="w-full py-2 mb-4 bg-gray-800 hover:bg-gray-700 border border-dashed border-gray-600 text-gray-400 hover:text-white rounded-xl text-sm transition-colors"
        >
          + Add Button
        </button>

        <div className="flex gap-3">
          <button onClick={resetDefaults} className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 hover:text-white py-2.5 rounded-xl text-sm">
            Reset Defaults
          </button>
          <button onClick={onClose} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-xl text-sm font-semibold">
            Cancel
          </button>
          <button onClick={save} className="flex-1 bg-blue-700 hover:bg-blue-600 text-white py-2.5 rounded-xl text-sm font-bold">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function ControlsModal({ bindings, onSave, onClose }) {
  const [local, setLocal] = useState(() => ({ ...bindings }));
  const [capturing, setCapturing] = useState(null);

  useEffect(() => {
    if (!capturing) return;
    function onKeyDown(e) {
      e.preventDefault();
      if (e.code === 'Escape') { setCapturing(null); return; }
      const label =
        e.code === 'Space' ? 'Space' :
        e.key.length === 1 ? e.key.toUpperCase() :
        e.key;
      setLocal((prev) => ({ ...prev, [capturing]: { code: e.code, label } }));
      setCapturing(null);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [capturing]);

  function save() {
    localStorage.setItem(KB_STORAGE_KEY, JSON.stringify(local));
    onSave(local);
  }

  function resetDefaults() {
    setLocal({ ...DEFAULT_BINDINGS });
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-1">Keyboard Controls</h3>
        <p className="text-gray-500 text-sm mb-5">Click a binding, then press the new key.</p>

        <div className="flex flex-col gap-4 mb-6">
          {ACTIONS.map((action) => (
            <div key={action.id} className="flex items-center justify-between gap-4">
              <span className="text-gray-300 text-sm">{action.label}</span>
              <button
                onClick={() => setCapturing(action.id)}
                className={`min-w-[90px] px-3 py-1.5 rounded-lg text-sm font-mono font-bold border transition-colors ${
                  capturing === action.id
                    ? 'bg-blue-600 border-blue-400 text-white animate-pulse'
                    : 'bg-gray-800 border-gray-600 text-gray-200 hover:border-blue-500 hover:text-white'
                }`}
              >
                {capturing === action.id ? 'Press key…' : local[action.id]?.label ?? '—'}
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={resetDefaults} className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 hover:text-white py-2.5 rounded-xl text-sm">
            Reset Defaults
          </button>
          <button onClick={onClose} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-xl text-sm font-semibold">
            Cancel
          </button>
          <button onClick={save} className="flex-1 bg-blue-700 hover:bg-blue-600 text-white py-2.5 rounded-xl text-sm font-bold">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function Modal({ title, message, onConfirm, onCancel, confirmLabel, confirmColor }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-400 mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-semibold">
            Cancel
          </button>
          <button onClick={onConfirm} className={`flex-1 ${confirmColor} text-white py-3 rounded-xl font-bold`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
