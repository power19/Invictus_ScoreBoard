import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket';

export default function BracketEditor({ state }) {
  const navigate = useNavigate();
  const { bracket } = state;
  const [newDivision, setNewDivision] = useState('');
  const [newCompetitor, setNewCompetitor] = useState({});   // divId -> { name, team }
  const [expandedDiv, setExpandedDiv] = useState(null);

  function addDivision() {
    if (!newDivision.trim()) return;
    socket.emit('addDivision', { name: newDivision.trim() });
    setNewDivision('');
  }

  function removeDivision(divisionId) {
    socket.emit('removeDivision', { divisionId });
  }

  function addCompetitor(divisionId) {
    const entry = newCompetitor[divisionId] || { name: '', team: '' };
    if (!entry.name.trim()) return;
    socket.emit('addCompetitor', { divisionId, name: entry.name.trim(), team: (entry.team || '').trim() });
    setNewCompetitor((prev) => ({ ...prev, [divisionId]: { name: '', team: '' } }));
  }

  function removeCompetitor(divisionId, competitorId) {
    socket.emit('removeCompetitor', { divisionId, competitorId });
  }

  function generateBracket(divisionId) {
    socket.emit('generateBracket', { divisionId });
  }

  function updateComp(divId, field, value) {
    setNewCompetitor((prev) => ({
      ...prev,
      [divId]: { ...(prev[divId] || { name: '', team: '' }), [field]: value },
    }));
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Bracket Editor</h1>
            <p className="text-gray-500 text-sm mt-0.5">{state.tournament.name}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => window.open('/bracket', 'bracket_display', 'width=1280,height=720')}
              className="bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold text-sm"
            >
              Open Bracket Display ↗
            </button>
            <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white text-sm border border-gray-700 hover:border-gray-500 px-3 py-2 rounded-lg">
              ← Dashboard
            </button>
          </div>
        </div>

        {/* Add Division */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 mb-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Add Division / Category</h2>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-600 outline-none focus:border-blue-500"
              placeholder="e.g. Adult Male Blue Belt -70kg"
              value={newDivision}
              onChange={(e) => setNewDivision(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addDivision()}
            />
            <button
              onClick={addDivision}
              className="bg-blue-700 hover:bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold"
            >
              Add
            </button>
          </div>
        </div>

        {/* Divisions */}
        {bracket.divisions.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <p className="text-lg">No divisions yet.</p>
            <p className="text-sm mt-1">Add a division above to get started.</p>
          </div>
        ) : (
          bracket.divisions.map((div) => (
            <DivisionCard
              key={div.id}
              div={div}
              expanded={expandedDiv === div.id}
              onToggle={() => setExpandedDiv(expandedDiv === div.id ? null : div.id)}
              newComp={newCompetitor[div.id] || { name: '', team: '' }}
              onUpdateComp={(field, value) => updateComp(div.id, field, value)}
              onAddCompetitor={() => addCompetitor(div.id)}
              onRemoveCompetitor={(cId) => removeCompetitor(div.id, cId)}
              onGenerate={() => generateBracket(div.id)}
              onRemoveDivision={() => removeDivision(div.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function DivisionCard({ div, expanded, onToggle, newComp, onUpdateComp, onAddCompetitor, onRemoveCompetitor, onGenerate, onRemoveDivision }) {
  const hasEnough = div.competitors.length >= 2;
  const hasRounds = div.rounds && div.rounds.length > 0;

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 mb-3 overflow-hidden">
      {/* Division header */}
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-800/50" onClick={onToggle}>
        <div>
          <h3 className="text-white font-bold">{div.name}</h3>
          <p className="text-gray-500 text-sm">
            {div.competitors.length} competitor{div.competitors.length !== 1 ? 's' : ''}
            {hasRounds ? ' · Bracket generated' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasRounds && (
            <span className="bg-green-900 text-green-400 text-xs px-2 py-0.5 rounded-full font-semibold">Ready</span>
          )}
          <span className="text-gray-500 text-lg">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-800 p-4">
          {/* Competitor list */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Competitors</h4>
            {div.competitors.length === 0 ? (
              <p className="text-gray-600 text-sm">No competitors added yet.</p>
            ) : (
              <div className="space-y-1.5">
                {div.competitors.map((comp, i) => (
                  <div key={comp.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                    <div>
                      <span className="text-white font-semibold text-sm">{i + 1}. {comp.name}</span>
                      {comp.team && <span className="text-gray-400 text-sm ml-2">({comp.team})</span>}
                    </div>
                    <button
                      onClick={() => onRemoveCompetitor(comp.id)}
                      className="text-gray-600 hover:text-red-400 text-lg leading-none"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add competitor */}
          <div className="flex gap-2 mb-4">
            <input
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500"
              placeholder="Competitor name"
              value={newComp.name}
              onChange={(e) => onUpdateComp('name', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onAddCompetitor()}
            />
            <input
              className="w-32 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500"
              placeholder="Team"
              value={newComp.team}
              onChange={(e) => onUpdateComp('team', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onAddCompetitor()}
            />
            <button
              onClick={onAddCompetitor}
              className="bg-blue-700 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"
            >
              Add
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onGenerate}
              disabled={!hasEnough}
              className="flex-1 bg-green-700 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2.5 rounded-xl font-semibold text-sm"
            >
              {hasRounds ? '↺ Regenerate Bracket' : 'Generate Bracket'}
            </button>
            <button
              onClick={onRemoveDivision}
              className="bg-gray-800 hover:bg-red-900 border border-gray-700 hover:border-red-700 text-gray-500 hover:text-red-400 px-4 py-2 rounded-xl text-sm"
            >
              Delete
            </button>
          </div>

          {!hasEnough && (
            <p className="text-yellow-600 text-xs mt-2">Add at least 2 competitors to generate a bracket.</p>
          )}
        </div>
      )}
    </div>
  );
}
