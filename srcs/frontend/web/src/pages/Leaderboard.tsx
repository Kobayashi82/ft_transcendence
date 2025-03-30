import React, { useState } from "react";
import { Trophy, Star, Clock, Target, Flame, Medal } from "lucide-react";

// Define types for leaderboard entries
interface LeaderboardEntry {
  rank: number;
  username: string;
  value: number | string;
  country?: string;
  avatar?: string;
}

const Leaderboard: React.FC = () => {
  // Different leaderboard categories
  const [activeCategory, setActiveCategory] = useState<string>("tournaments");

  // Mock leaderboard data (would be replaced with actual API data)
  const leaderboardCategories = {
    tournaments: {
      title: "Tournament Champions",
      icon: <Trophy size={24} className="text-indigo-400" />,
      columns: ["Rank", "Player", "Tournaments Won"],
      data: [
        { rank: 1, username: "DragonSlayer42", value: 37, country: "🇺🇸" },
        { rank: 2, username: "NightWolf", value: 29, country: "🇧🇷" },
        { rank: 3, username: "SilentAssassin", value: 25, country: "🇰🇷" },
        { rank: 4, username: "PhoenixRise", value: 22, country: "🇫🇷" },
        { rank: 5, username: "StarKnight", value: 18, country: "🇨🇦" },
      ],
    },
    matches: {
      title: "Most Matches Won",
      icon: <Star size={24} className="text-indigo-400" />,
      columns: ["Rank", "Player", "Total Wins"],
      data: [
        { rank: 1, username: "GameMaster99", value: 542, country: "🇩🇪" },
        { rank: 2, username: "QuantumPlayer", value: 489, country: "🇯🇵" },
        { rank: 3, username: "EliteGamer", value: 436, country: "🇬🇧" },
        { rank: 4, username: "CyberNinja", value: 412, country: "🇷🇺" },
        { rank: 5, username: "ShadowStriker", value: 387, country: "🇦🇺" },
      ],
    },
    speed: {
      title: "Fastest Win Streak",
      icon: <Clock size={24} className="text-indigo-400" />,
      columns: ["Rank", "Player", "Average Win Time"],
      data: [
        { rank: 1, username: "LightningFast", value: "2m 13s", country: "🇸🇪" },
        { rank: 2, username: "QuickSilver", value: "2m 27s", country: "🇳🇱" },
        { rank: 3, username: "SpeedDemon", value: "2m 41s", country: "🇮🇹" },
        { rank: 4, username: "RapidResponse", value: "2m 55s", country: "🇦🇷" },
        { rank: 5, username: "SwiftStrike", value: "3m 02s", country: "🇨🇱" },
      ],
    },
    accuracy: {
      title: "Highest Accuracy",
      icon: <Target size={24} className="text-indigo-400" />,
      columns: ["Rank", "Player", "Accuracy %"],
      data: [
        { rank: 1, username: "PrecisionSniper", value: "98.7%", country: "🇨🇳" },
        { rank: 2, username: "MathGeek", value: "97.5%", country: "🇮🇳" },
        { rank: 3, username: "CalculatedRisk", value: "96.2%", country: "🇪🇸" },
        { rank: 4, username: "TacticalGenius", value: "95.8%", country: "🇵🇱" },
        { rank: 5, username: "SharpShooter", value: "95.3%", country: "🇲🇽" },
      ],
    },
    killstreak: {
      title: "Longest Kill Streak",
      icon: <Flame size={24} className="text-indigo-400" />,
      columns: ["Rank", "Player", "Kill Streak"],
      data: [
        { rank: 1, username: "Unstoppable", value: 42, country: "🇰🇿" },
        { rank: 2, username: "DeathDealer", value: 38, country: "🇵🇰" },
        { rank: 3, username: "SilentKiller", value: 35, country: "🇹🇷" },
        { rank: 4, username: "Dominator", value: 32, country: "🇲🇦" },
        { rank: 5, username: "FearFactor", value: 29, country: "🇮🇱" },
      ],
    },
  };

  // Get current category data
  const currentCategory =
    leaderboardCategories[activeCategory as keyof typeof leaderboardCategories];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 text-gray-100 py-12">
      <div className="container-custom max-w-6xl mx-auto px-4">
        {/* Header */}
        <header className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4 text-white">
            Transcendence{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-500">
              Leaderboards
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Celebrate the top players who have proven their skills and dominated
            the Transcendence arena.
          </p>
        </header>

        {/* Category Selector */}
        <div className="flex justify-center mb-8 space-x-4 flex-wrap">
          {Object.keys(leaderboardCategories).map((category) => {
            const categoryData =
              leaderboardCategories[
                category as keyof typeof leaderboardCategories
              ];
            return (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300
                  ${
                    activeCategory === category
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }
                `}
              >
                {categoryData.icon}
                <span>{categoryData.title}</span>
              </button>
            );
          })}
        </div>

        {/* Leaderboard Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-lg">
          {/* Table Header */}
          <div className="grid grid-cols-3 bg-gray-800 text-gray-400 font-semibold p-4">
            {currentCategory.columns.map((col, index) => (
              <div
                key={col}
                className={`
                  text-center
                  ${index === 0 ? "text-left pl-6" : ""}
                  ${
                    index === currentCategory.columns.length - 1
                      ? "text-right pr-6"
                      : ""
                  }
                `}
              >
                {col}
              </div>
            ))}
          </div>

          {/* Table Rows */}
          {currentCategory.data.map((entry, index) => (
            <div
              key={entry.username}
              className={`
                grid grid-cols-3 items-center p-4 border-b border-gray-800 last:border-b-0
                ${index % 2 === 1 ? "bg-gray-800/30" : ""}
                hover:bg-gray-800/50 transition-colors
              `}
            >
              {/* Rank */}
              <div className="flex items-center space-x-4">
                <span
                  className={`
                    w-8 h-8 flex items-center justify-center rounded-full font-bold
                    ${
                      entry.rank === 1
                        ? "bg-yellow-500 text-black"
                        : entry.rank === 2
                        ? "bg-gray-400 text-black"
                        : entry.rank === 3
                        ? "bg-yellow-800 text-white"
                        : "bg-gray-800 text-gray-400"
                    }
                  `}
                >
                  {entry.rank}
                </span>
                <span>{entry.country}</span>
              </div>

              {/* Username */}
              <div className="text-center font-medium text-white">
                {entry.username}
              </div>

              {/* Value */}
              <div className="text-right pr-6 font-semibold text-indigo-400">
                {entry.value}
              </div>
            </div>
          ))}
        </div>

        {/* Global Ranking Info */}
        <div className="mt-8 bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
          <div className="flex justify-center items-center mb-4">
            <Medal size={32} className="text-indigo-400 mr-3" />
            <h3 className="text-2xl font-bold text-white">Global Rankings</h3>
          </div>
          <p className="text-gray-300 max-w-3xl mx-auto">
            Rankings are updated in real-time based on your performance across
            all game modes. Climb the ranks, prove your skills, and become a
            Transcendence legend!
          </p>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
