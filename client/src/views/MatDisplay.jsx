import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';

export default function MatDisplay({ state }) {
  const { id } = useParams();
  const matId = Number(id);
  const mat = state?.mats?.[matId];

  // Force fullscreen on load when opened as popup
  useEffect(() => {
    document.title = mat ? `${mat.name} – Display` : 'Display';
  }, [mat]);

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
    <div className="min-h-screen bg-black flex flex-col select-none overflow-hidden">
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
                <div className="mt-3 flex gap-1.5">
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

      {/* Name */}
      <p className={`text-3xl font-black uppercase tracking-wide text-center px-6 ${nameColor}`}>
        {competitor.name || (side === 'left' ? 'Competitor 1' : 'Competitor 2')}
      </p>
      {competitor.team && (
        <p className="text-gray-400 text-lg mt-1">{competitor.team}</p>
      )}

      {/* Points */}
      <div className={`text-[160px] font-black leading-none mt-4 tabular-nums ${isWinner ? 'text-yellow-400' : 'text-white'}`}>
        {competitor.points}
      </div>

      {/* Advantages & Penalties */}
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

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
