import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAppState } from './hooks/useAppState';
import Dashboard from './views/Dashboard';
import MatControl from './views/MatControl';
import MatDisplay from './views/MatDisplay';
import Bracket from './views/Bracket';
import BracketEditor from './views/BracketEditor';

export default function App() {
  const { state, connected } = useAppState();

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="text-4xl mb-4">🥋</div>
          <p className="text-gray-400 text-lg">
            {connected ? 'Loading...' : 'Connecting to server...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard state={state} />} />
      <Route path="/mat/:id" element={<MatControl state={state} />} />
      <Route path="/mat/:id/display" element={<MatDisplay state={state} />} />
      <Route path="/bracket" element={<Bracket state={state} />} />
      <Route path="/bracket/edit" element={<BracketEditor state={state} />} />
    </Routes>
  );
}
