import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket';

export default function Bracket({ state }) {
  const navigate = useNavigate();
  const { bracket, tournament } = state;
  const [selectedDiv, setSelectedDiv] = useState(0);

  const divisions = bracket.divisions;
  const div = divisions[selectedDiv];

  // Find competitor by id
  function getComp(id) {
    if (!div || !id) return null;
    return div.competitors.find((c) => c.id === id) || null;
  }

  function setWinner(roundIndex, matchIndex, winnerId) {
    socket.emit('setBracketWinner', {
      divisionId: div.id,
      roundIndex,
      matchIndex,
      winnerId,
    });
  }

  const roundLabels = (rounds) => {
    const n = rounds.length;
    return rounds.map((_, i) => {
      const remaining = n - i;
      if (remaining === 1) return 'Final';
      if (remaining === 2) return 'Semifinal';
      if (remaining === 3) return 'Quarterfinal';
      return `Round ${i + 1}`;
    });
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800">
        <div>
          <h1 className="text-xl font-bold text-white">{tournament.name}</h1>
          <p className="text-gray-500 text-sm">Tournament Bracket</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/bracket/edit')}
            className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded-lg font-semibold text-sm"
          >
            Edit Bracket
          </button>
          <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white text-sm border border-gray-700 px-3 py-2 rounded-lg">
            ← Dashboard
          </button>
        </div>
      </div>

      {/* Division tabs */}
      {divisions.length > 0 && (
        <div className="flex gap-1 px-6 pt-4 overflow-x-auto">
          {divisions.map((d, i) => (
            <button
              key={d.id}
              onClick={() => setSelectedDiv(i)}
              className={`px-4 py-2 rounded-t-lg text-sm font-semibold whitespace-nowrap transition-all ${
                selectedDiv === i
                  ? 'bg-gray-800 text-white border-t border-l border-r border-gray-700'
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              {d.name}
            </button>
          ))}
        </div>
      )}

      {/* Bracket content */}
      <div className="px-6 pb-6">
        {divisions.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-xl">No divisions set up yet.</p>
            <button
              onClick={() => navigate('/bracket/edit')}
              className="mt-4 bg-blue-700 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold"
            >
              Set Up Bracket →
            </button>
          </div>
        ) : !div ? null : !div.rounds || div.rounds.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">{div.competitors.length} competitors added.</p>
            <p className="text-gray-600 text-sm mt-1">Generate the bracket in the Bracket Editor.</p>
            <button
              onClick={() => navigate('/bracket/edit')}
              className="mt-4 bg-green-700 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-semibold"
            >
              Generate Bracket →
            </button>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-b-xl rounded-tr-xl border border-gray-800 p-6 overflow-x-auto">
            <div className="flex gap-8 items-start min-w-max">
              {div.rounds.map((round, rIdx) => {
                const labels = roundLabels(div.rounds);
                return (
                  <div key={rIdx} className="flex flex-col gap-4">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest text-center mb-2">
                      {labels[rIdx]}
                    </h3>
                    <div className={`flex flex-col gap-${Math.pow(2, rIdx + 1) * 2} justify-around`}
                         style={{ gap: `${Math.pow(2, rIdx) * 24}px` }}>
                      {round.map((match, mIdx) => {
                        const comp1 = getComp(match.competitor1Id);
                        const comp2 = getComp(match.competitor2Id);
                        const winner = getComp(match.winnerId);

                        return (
                          <MatchCard
                            key={match.id}
                            comp1={comp1}
                            comp2={comp2}
                            winner={winner}
                            onSelectWinner={(winnerId) => setWinner(rIdx, mIdx, winnerId)}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Champion */}
              {div.rounds.length > 0 && (() => {
                const finalMatch = div.rounds[div.rounds.length - 1][0];
                const champion = div.competitors.find(c => c.id === finalMatch?.winnerId);
                if (!champion) return null;
                return (
                  <div className="flex flex-col items-center justify-center">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Champion</h3>
                    <div className="bg-yellow-900/40 border-2 border-yellow-500 rounded-xl px-6 py-4 text-center">
                      <div className="text-3xl mb-1">🏆</div>
                      <p className="text-yellow-300 font-black text-lg">{champion.name}</p>
                      {champion.team && <p className="text-yellow-600 text-sm">{champion.team}</p>}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MatchCard({ comp1, comp2, winner, onSelectWinner }) {
  const [showPicker, setShowPicker] = useState(false);

  const isBye = !comp1 || !comp2;
  const byeWinner = !comp1 ? comp2 : !comp2 ? comp1 : null;

  return (
    <div className="relative">
      <div
        className={`bg-gray-800 rounded-xl border-2 w-52 overflow-hidden cursor-pointer transition-all ${
          winner ? 'border-green-700' : 'border-gray-700 hover:border-gray-500'
        }`}
        onClick={() => !winner && !isBye && setShowPicker(!showPicker)}
        title={!winner && !isBye ? 'Click to set winner' : ''}
      >
        <CompetitorRow comp={comp1} isWinner={winner?.id === comp1?.id} />
        <div className="h-px bg-gray-700" />
        <CompetitorRow comp={comp2} isWinner={winner?.id === comp2?.id} />
      </div>

      {/* Winner picker */}
      {showPicker && !winner && (
        <div className="absolute left-0 top-full mt-1 bg-gray-800 border border-gray-600 rounded-xl overflow-hidden shadow-2xl z-10 w-52">
          <p className="text-xs text-gray-500 px-3 py-2 border-b border-gray-700">Select winner</p>
          {[comp1, comp2].filter(Boolean).map((comp) => (
            <button
              key={comp.id}
              onClick={() => { onSelectWinner(comp.id); setShowPicker(false); }}
              className="w-full text-left px-3 py-2 text-white hover:bg-blue-700 text-sm font-semibold"
            >
              🏆 {comp.name}
            </button>
          ))}
          <button
            onClick={() => setShowPicker(false)}
            className="w-full text-left px-3 py-2 text-gray-500 hover:bg-gray-700 text-xs border-t border-gray-700"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

function CompetitorRow({ comp, isWinner }) {
  if (!comp) {
    return <div className="px-3 py-2.5 text-gray-600 text-sm italic">BYE</div>;
  }
  return (
    <div className={`px-3 py-2.5 flex items-center gap-2 ${isWinner ? 'bg-green-900/40' : ''}`}>
      {isWinner && <span className="text-yellow-400 text-sm">🏆</span>}
      <div className="min-w-0">
        <p className={`text-sm font-bold truncate ${isWinner ? 'text-green-300' : 'text-white'}`}>{comp.name}</p>
        {comp.team && <p className="text-gray-500 text-xs truncate">{comp.team}</p>}
      </div>
    </div>
  );
}
