import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const DISPLAY_SETTINGS_KEY = 'invictus_display_settings';

const FONTS = [
  { id: 'system',   label: 'Default',      family: 'inherit',                              url: null },
  { id: 'bebas',    label: 'Bebas Neue',   family: "'Bebas Neue', sans-serif",             url: 'Bebas+Neue' },
  { id: 'oswald',   label: 'Oswald',       family: "'Oswald', sans-serif",                 url: 'Oswald:wght@700' },
  { id: 'rajdhani', label: 'Rajdhani',     family: "'Rajdhani', sans-serif",               url: 'Rajdhani:wght@700' },
  { id: 'orbitron', label: 'Orbitron',     family: "'Orbitron', monospace",                url: 'Orbitron:wght@700;900' },
  { id: 'inter',    label: 'Inter',        family: "'Inter', sans-serif",                  url: 'Inter:wght@700;900' },
];

const DEFAULT_SETTINGS = { fontId: 'system', scale: 1 };

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(DISPLAY_SETTINGS_KEY));
    if (s) return { ...DEFAULT_SETTINGS, ...s };
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

export default function MatDisplay({ state }) {
  const { id } = useParams();
  const matId = Number(id);
  const mat = state?.mats?.[matId];

  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState(loadSettings);

  const currentFont = FONTS.find((f) => f.id === settings.fontId) ?? FONTS[0];

  useEffect(() => {
    document.title = mat ? `${mat.name} – Display` : 'Display';
  }, [mat]);

  // Dynamically load Google Font when selected
  useEffect(() => {
    if (!currentFont.url) return;
    const linkId = `gfont-${currentFont.id}`;
    if (document.getElementById(linkId)) return;
    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${currentFont.url}&display=swap`;
    document.head.appendChild(link);
  }, [currentFont]);

  function updateSettings(patch) {
    const updated = { ...settings, ...patch };
    setSettings(updated);
    localStorage.setItem(DISPLAY_SETTINGS_KEY, JSON.stringify(updated));
  }

  if (!mat) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <p className="text-gray-500 text-2xl">Mat {id} not available</p>
      </div>
    );
  }

  const { match } = mat;
  const { competitor1: c1, competitor2: c2 } = match;
  const timerColor = match.running
    ? 'text-white'
    : match.timeLeft === 0
    ? 'text-red-400'
    : 'text-gray-400';

  return (
    <div
      className="min-h-screen bg-black flex flex-col select-none overflow-hidden"
      style={{ fontFamily: currentFont.family, zoom: settings.scale }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-8 py-3 bg-gray-950 border-b border-gray-800">
        <span className="text-gray-400 text-lg font-semibold">{mat.name}</span>
        <span className="text-white text-lg font-bold">{state.tournament.name}</span>
        <span className="text-gray-400 text-lg">
          {[match.division, match.round].filter(Boolean).join(' · ')}
        </span>
      </div>

      {/* Main scoreboard */}
      <div className="flex flex-1">
        {/* Competitor 1 — left, blue */}
        <ScorePanel
          competitor={c1}
          isWinner={match.winner === 'competitor1'}
          side="left"
          bg="bg-blue-950"
          accent="border-blue-500"
          nameColor="text-blue-200"
        />

        {/* Center — timer */}
        <div className="flex flex-col items-center justify-center bg-black px-8 min-w-[220px]">
          {match.winner ? (
            <div className="text-center">
              <div className="text-yellow-400 text-6xl mb-3">🏆</div>
              <p className="text-white text-3xl font-black">{match[match.winner].name}</p>
              <p className="text-gray-400 text-xl mt-1">
                {match.winMethod === 'submission' ? 'Submission' :
                 match.winMethod === 'dq' ? 'Disqualification' :
                 match.winMethod === 'walkover' ? 'Walkover' : 'Points'}
              </p>
            </div>
          ) : (
            <>
              <div className={`text-8xl font-mono font-black tabular-nums leading-none ${timerColor}`}>
                {formatTime(match.timeLeft)}
              </div>
              {match.running && (
                <div className="mt-3 flex gap-1.5 items-center">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-green-400 text-sm font-semibold tracking-widest uppercase">Live</span>
                </div>
              )}
              {match.timeLeft === 0 && !match.winner && (
                <p className="text-red-400 text-xl font-bold mt-2 animate-pulse">TIME</p>
              )}
            </>
          )}
        </div>

        {/* Competitor 2 — right, red */}
        <ScorePanel
          competitor={c2}
          isWinner={match.winner === 'competitor2'}
          side="right"
          bg="bg-red-950"
          accent="border-red-500"
          nameColor="text-red-200"
        />
      </div>

      {/* Settings gear — bottom-right corner */}
      <button
        onClick={() => setShowSettings(true)}
        className="fixed bottom-4 right-4 w-10 h-10 bg-gray-900/80 hover:bg-gray-800 border border-gray-700 rounded-full text-gray-500 hover:text-white flex items-center justify-center z-50 text-lg"
      >
        ⚙
      </button>

      {showSettings && (
        <DisplaySettingsModal
          settings={settings}
          onChange={updateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

function ScorePanel({ competitor, isWinner, side, bg, accent, nameColor }) {
  return (
    <div className={`flex-1 flex flex-col items-center justify-center ${bg} border-t-8 ${accent} relative`}>
      {isWinner && (
        <div className="absolute top-4 right-4 bg-yellow-500 text-black font-black px-4 py-1 rounded-full text-sm uppercase tracking-wider">
          Winner
        </div>
      )}

      <p className={`text-3xl font-black uppercase tracking-wide text-center px-6 ${nameColor}`}>
        {competitor.name || (side === 'left' ? 'Competitor 1' : 'Competitor 2')}
      </p>
      {competitor.team && (
        <p className="text-gray-400 text-lg mt-1">{competitor.team}</p>
      )}

      <div className={`text-[160px] font-black leading-none mt-4 tabular-nums ${isWinner ? 'text-yellow-400' : 'text-white'}`}>
        {competitor.points}
      </div>

      <div className="flex gap-8 mt-4">
        <div className="text-center">
          <p className="text-gray-500 text-sm uppercase tracking-widest">Advantages</p>
          <p className="text-yellow-400 text-4xl font-black">{competitor.advantages}</p>
        </div>
        <div className="text-center">
          <p className="text-gray-500 text-sm uppercase tracking-widest">Penalties</p>
          <p className="text-red-400 text-4xl font-black">{competitor.penalties}</p>
        </div>
      </div>
    </div>
  );
}

function DisplaySettingsModal({ settings, onChange, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-80 shadow-2xl">
        <h3 className="text-white font-bold text-lg mb-5">Display Settings</h3>

        {/* Font picker */}
        <div className="mb-6">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Font</p>
          <div className="flex flex-col gap-2">
            {FONTS.map((font) => (
              <button
                key={font.id}
                onClick={() => onChange({ fontId: font.id })}
                className={`px-3 py-2 rounded-lg text-left text-sm border transition-colors ${
                  settings.fontId === font.id
                    ? 'bg-blue-700 border-blue-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white'
                }`}
                style={{ fontFamily: font.family === 'inherit' ? 'inherit' : font.family }}
              >
                {font.label}
              </button>
            ))}
          </div>
        </div>

        {/* Size slider */}
        <div className="mb-6">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">
            Size — <span className="text-white font-bold">{Math.round(settings.scale * 100)}%</span>
          </p>
          <input
            type="range"
            min="60"
            max="150"
            step="5"
            value={Math.round(settings.scale * 100)}
            onChange={(e) => onChange({ scale: Number(e.target.value) / 100 })}
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>60%</span>
            <span>100%</span>
            <span>150%</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-xl font-semibold text-sm"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
