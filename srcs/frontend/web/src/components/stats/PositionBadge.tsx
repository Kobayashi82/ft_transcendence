import React from 'react';
import { Trophy, Medal, Award, HelpCircle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface PositionBadgeProps {
  position: number | null;
  showText?: boolean;
}

const PositionBadge: React.FC<PositionBadgeProps> = ({ position, showText = true }) => {
  const { t } = useLanguage();
  
  if (position === null || position === undefined) {
    return (
      <div className="flex items-center" title={t('stats.unknown')}>
        <HelpCircle size={18} className="text-gray-400" />
        {showText && <span className="ml-1.5 text-gray-400">{t('stats.unknown')}</span>}
      </div>
    );
  }

  let icon;
  let bgColor;
  let textColor;
  let labelText;

  switch (position) {
    case 1:
      icon = <Trophy size={18} className="text-yellow-300" />;
      bgColor = 'bg-yellow-500/20';
      textColor = 'text-yellow-300';
      labelText = t('stats.first');
      break;
    case 2:
      icon = <Medal size={18} className="text-gray-300" />;
      bgColor = 'bg-gray-400/20';
      textColor = 'text-gray-300';
      labelText = t('stats.second');
      break;
    case 3:
      icon = <Award size={18} className="text-amber-600" />;
      bgColor = 'bg-amber-600/20';
      textColor = 'text-amber-500';
      labelText = t('stats.third');
      break;
    case 4:
      icon = <Award size={18} className="text-blue-400" />;
      bgColor = 'bg-blue-500/20';
      textColor = 'text-blue-400';
      labelText = t('stats.fourth');
      break;
    default:
      icon = <HelpCircle size={18} className="text-gray-400" />;
      bgColor = 'bg-gray-500/20';
      textColor = 'text-gray-400';
      labelText = position.toString();
  }

  return (
    <div 
      className={`flex items-center px-2 py-0.5 rounded-full ${bgColor}`}
      title={labelText}
    >
      {icon}
      {showText && <span className={`ml-1.5 ${textColor} text-sm font-medium`}>{labelText}</span>}
    </div>
  );
}

export default PositionBadge;
