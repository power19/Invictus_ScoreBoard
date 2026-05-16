import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket';

export default function Dashboard({ state }) {
  const navigate = useNavigate();
  const { tournament, mats } = state;
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(tournament.name);
  const [updateState, setUpdateState] = useState('idle'); // idle | busy | done | error
  const [updateMsg, setUpdateMsg] = useState('');

  async function doUpdate() {
    setUpdateState('busy');
    setUpdateMsg('');
    try {
      if (window.electronAPI) {
        // Running as .exe — use electron-updater via IPC
        const msg = await window.electronAPI.checkForUpdates();
        setUpdateState('done');
        setUpdateMsg(msg);
      } else {
        // Running in browser (dev mode) — git pull via server
        const res = await fetch('/api/update', { method: 'POST' });
        const data = await res.json();
        setUpdateState(data.success ? 'done' : 'error');
        setUpdateMsg(data.message);
        if (data.success) setTimeout(() => window.location.reload(), 1500);
      }
    } catch (e) {
      setUpdateState('error');
      setUpdateMsg(e.message);
    }
  }

  function saveName() {
    socket.emit('setTournament', { name: nameInput });
    setEditingName(false);
  }

  function setMatCount(count) {
    socket.emit('setTournament', { matCount: count });
  }

  function openDisplay(matId) {
    window.open(`/mat/${matId}/display`, `mat${matId}_display`, 'width=1280,height=720');
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      {/* Header */}
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            {editingName ? (
              <div className="flex items-center gap-3">
                <input
                  autoFocus
                  className="text-2xl font-bold bg-gray-800 border border-gray-600 rounded px-3 py-1 text-white outline-none focus:border-blue-500"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                />
                <button onClick={saveName} className="bg-blue-600 hover:bg-blue-500 px-4 py-1 rounded text-sm font-semibold">Save</button>
                <button onClick={() => setEditingName(false)} className="bg-gray-700 hover:bg-gray-600 px-4 py-1 rounded text-sm">Cancel</button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-white">{tournament.name}</h1>
                <button
                  onClick={() => { setNameInput(tournament.name); setEditingName(true); }}
                  className="text-gray-500 hover:text-gray-300 text-sm border border-gray-700 hover:border-gray-500 px-2 py-0.5 rounded"
                >
                  Edit
                </button>
              </div>
            )}
            <p className="text-gray-500 mt-1">Tournament Dashboard</p>
          </div>

          <div className="flex gap-3 items-center">
            <button
              onClick={() => navigate('/bracket/edit')}
              className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded-lg font-semibold"
            >
              Edit Bracket
            </button>
            <button
              onClick={() => window.open('/bracket', 'bracket_display', 'width=1280,height=720')}
              className="bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold"
            >
              Open Bracket Display
            </button>
            <button
              onClick={doUpdate}
              disabled={updateState === 'busy'}
              className={`px-4 py-2 rounded-lg font-semibold text-white transition-colors ${
                updateState === 'busy'  ? 'bg-gray-600 cursor-wait' :
                updateState === 'done'  ? 'bg-green-700 hover:bg-green-600' :
                updateState === 'error' ? 'bg-red-700 hover:bg-red-600' :
                'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {updateState === 'busy' ? '⟳ Updating…' :
               updateState === 'done' ? '✓ Updated' :
               updateState === 'error' ? '✗ Failed' :
               '⟳ Update'}
            </button>
          </div>
          {updateMsg && (
            <p className={`text-xs mt-2 font-mono ${updateState === 'error' ? 'text-red-400' : 'text-green-400'}`}>
              {updateMsg}
            </p>
          )}
        </div>

        {/* Mat count selector */}
        <div className="bg-gray-900 rounded-xl p-5 mb-6 border border-gray-800">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Number of Mats</h2>
          <div className="flex gap-3">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setMatCount(n)}
                className={`w-14 h-14 rounded-xl text-xl font-bold border-2 transition-all ${
                  tournament.matCount === n
                    ? 'bg-blue-600 border-blue-400 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Mat cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.values(mats).map((mat) => {
            const { match } = mat;
            const isActive = match.running || match.winner;

            return (
              <div
                key={mat.id}
                className={`bg-gray-900 rounded-xl border-2 p-5 transition-all ${
                  isActive ? 'border-blue-700' : 'border-gray-800'
                }`}
              >
                {/* Mat header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">{mat.name}</h3>
                    {match.division && (
                      <p className="text-sm text-gray-400">{match.division}{match.round ? ` · ${match.round}` : ''}</p>
                    )}
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    match.winner ? 'bg-green-900 text-green-400' :
                    match.running ? 'bg-blue-900 text-blue-400 animate-pulse' :
                    'bg-gray-800 text-gray-500'
                  }`}>
                    {match.winner ? 'FINISHED' : match.running ? 'LIVE' : 'READY'}
                  </span>
                </div>

                {/* Score preview */}
                <div className="flex items-center justify-between mb-4">
                  <div className="text-center flex-1">
                    <p className="text-xs text-gray-500 truncate">{match.competitor1.name}</p>
                    <p className={`text-4xl font-black ${match.winner === 'competitor1' ? 'text-green-400' : 'text-white'}`}>
                      {match.competitor1.points}
                    </p>
                    <p className="text-xs text-gray-600">Adv {match.competitor1.advantages} · Pen {match.competitor1.penalties}</p>
                  </div>
                  <div className="text-gray-600 text-2xl font-light px-4">vs</div>
                  <div className="text-center flex-1">
                    <p className="text-xs text-gray-500 truncate">{match.competitor2.name}</p>
                    <p className={`text-4xl font-black ${match.winner === 'competitor2' ? 'text-green-400' : 'text-white'}`}>
                      {match.competitor2.points}
                    </p>
                    <p className="text-xs text-gray-600">Adv {match.competitor2.advantages} · Pen {match.competitor2.penalties}</p>
                  </div>
                </div>

                {/* Timer */}
                <div className="text-center mb-4">
                  <span className="text-2xl font-mono text-gray-300">{formatTime(match.timeLeft)}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/mat/${mat.id}`)}
                    className="flex-1 bg-blue-700 hover:bg-blue-600 text-white py-2.5 rounded-lg font-semibold text-sm"
                  >
                    Control Panel
                  </button>
                  <button
                    onClick={() => openDisplay(mat.id)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-lg font-semibold text-sm"
                  >
                    Open Display
                  </button>
                </div>
              </div>
            );
          })}
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
