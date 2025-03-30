import React from "react";
import { Link } from "react-router-dom";

const Game: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950">
      <div className="container-custom py-16">
        <h1 className="text-4xl font-bold text-white mb-8">Game</h1>
        <div className="bg-gray-800 rounded-lg p-8 shadow-lg">
          <p className="text-xl text-gray-300 mb-6">
            Welcome to the game interface. Here you can start a new game or see
            your recent results.
          </p>

          <div className="space-y-4">
            <button className="btn-primary w-full">Start New Game</button>
            <Link
              to="/game/results"
              className="btn-secondary block text-center"
            >
              View Game Results
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;
