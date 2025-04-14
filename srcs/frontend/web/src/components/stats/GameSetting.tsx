import React from "react";
import { Gauge, Zap, Target } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

interface GameSettingProps {
  type: 'ballSpeed' | 'paddleSize' | 'speedIncrement' | 'pointsToWin';
  value: string | number | boolean;
}

const GameSetting: React.FC<GameSettingProps> = ({ type, value }) => {
  const { t } = useLanguage();

  const renderBallSpeed = () => {
    let speedColor = "";
    let speedSize = 16;
    
    if (typeof value === 'string') {
      switch (value.toLowerCase()) {
        case 'slow':
          speedColor = "text-green-500";
          speedSize = 14;
          break;
        case 'medium':
          speedColor = "text-yellow-500";
          speedSize = 16;
          break;
        case 'fast':
          speedColor = "text-blue-500";
          speedSize = 18;
          break;
        default:
          speedColor = "text-gray-500";
          speedSize = 16;
      }
    }

    return (
      <div title={`${t('stats.ballSpeed')}: ${t(`stats.${value.toString().toLowerCase()}`)}`}>
        <Gauge 
          size={speedSize} 
          className={`${speedColor} transition-all duration-300`}
        />
      </div>
    );
  }

  const renderPaddleSize = () => {
    let sizeClass = "";
    let sizeHeight = "10px";
    
    if (typeof value === 'string') {
      switch (value.toLowerCase()) {
        case 'short':
          sizeClass = "bg-blue-500";
          sizeHeight = "12px";
          break;
        case 'medium':
          sizeClass = "bg-yellow-500";
          sizeHeight = "20px";
          break;
        case 'long':
          sizeClass = "bg-green-500";
          sizeHeight = "32px";
          break;
        default:
          sizeClass = "bg-gray-500";
          sizeHeight = "16px";
      }
    }

    return (
      <div 
        className={`w-2 rounded-full ${sizeClass}`}
        style={{ height: sizeHeight }}
        title={`${t('stats.paddleSize')}: ${t(`stats.${value.toString().toLowerCase()}`)}`}
      />
    );
  }

  const renderSpeedIncrement = () => {
    const isEnabled = value === true || value === 'true' || value === 1;
    
    return (
      <div title={`${t('stats.speedIncrement')}: ${isEnabled ? t('stats.yes') : t('stats.no')}`}>
        <Zap 
          size={16} 
          className={isEnabled ? "text-yellow-500" : "text-gray-500"}
        />
      </div>
    );
  }

  const renderPointsToWin = () => {
    const points = typeof value === 'number' ? value : parseInt(value.toString());
    
    return (
      <div 
        className="inline-flex items-center" 
        title={`${t('stats.pointsToWin')}: ${points}`}
      >
        <Target size={16} className="text-purple-500 mr-1" />
        <span className="text-gray-300 text-sm">{points}</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center space-x-4">
      {type === 'ballSpeed' && renderBallSpeed()}
      {type === 'paddleSize' && renderPaddleSize()}
      {type === 'speedIncrement' && renderSpeedIncrement()}
      {type === 'pointsToWin' && renderPointsToWin()}
    </div>
  );
}

export default GameSetting;
