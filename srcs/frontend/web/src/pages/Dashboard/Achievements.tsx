import React from "react";

interface Achievement {
  id: number;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

interface AchievementsSectionProps {
  achievements: Achievement[];
}

const AchievementsSection: React.FC<AchievementsSectionProps> = ({
  achievements,
}) => {
  return (
    <div className="p-6 pt-0">
      <div className="border-t border-gray-800 pt-6">
        <h3 className="text-xl font-semibold text-white mb-4">Achievements</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`p-4 rounded-lg border ${
                achievement.unlocked
                  ? "bg-indigo-900/20 border-indigo-700"
                  : "bg-gray-800/50 border-gray-700"
              }`}
            >
              <div className="flex">
                <div className="text-2xl mr-3">{achievement.icon}</div>
                <div>
                  <h4
                    className={`font-medium ${
                      achievement.unlocked ? "text-indigo-300" : "text-gray-400"
                    }`}
                  >
                    {achievement.name}
                  </h4>
                  <p className="text-sm text-gray-400">
                    {achievement.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AchievementsSection;
