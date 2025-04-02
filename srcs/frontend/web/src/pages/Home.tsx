import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Trophy, 
  Gamepad2, 
  Swords, 
  ChevronRight, 
  BarChart3,
  Info,
  ActivitySquare
} from "lucide-react";
import PingPongGame from "../components/PingPongHome";
import { useLanguage } from "../contexts/LanguageContext";

const Home: React.FC = () => {
  const { t } = useLanguage();
  
  // State for animation effects
  const [isLoaded, setIsLoaded] = useState(false);
  const [hoverItem, setHoverItem] = useState<string | null>(null);
  
  // Animated background elements
  const [particles, setParticles] = useState<Array<{id: number, x: number, y: number, size: number, speed: number}>>([]);

  useEffect(() => {
    // Set loaded state for entrance animations
    setIsLoaded(true);
    
    // Create background particles
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 1,
      speed: Math.random() * 0.5 + 0.1
    }));
    setParticles(newParticles);
    
    // Animate particles
    const interval = setInterval(() => {
      setParticles(prevParticles => 
        prevParticles.map(particle => ({
          ...particle,
          y: particle.y - particle.speed < 0 ? 100 : particle.y - particle.speed
        }))
      );
    }, 50);
    
    return () => clearInterval(interval);
  }, []);

  // Game mode cards data - using translations
  const gameModes = [
    {
      id: "quickmatch",
      title: t('gameMode.quickMatch.title'),
      description: t('gameMode.quickMatch.description'),
      icon: <Swords className="w-8 h-8" />,
      color: "from-blue-600 to-indigo-700",
      link: "/play/quick"
    },
    {
      id: "tournament",
      title: t('gameMode.tournament.title'),
      description: t('gameMode.tournament.description'),
      icon: <Trophy className="w-8 h-8" />,
      color: "from-purple-600 to-pink-700",
      link: "/play/tournament"
    },
    {
      id: "rankings",
      title: t('gameMode.rankings.title'),
      description: t('gameMode.rankings.description'),
      icon: <BarChart3 className="w-8 h-8" />,
      color: "from-amber-500 to-orange-700",
      link: "/rankings"
    },
    {
      id: "leaderboard",
      title: t('gameMode.leaderboard.title'),
      description: t('gameMode.leaderboard.description'),
      icon: <BarChart3 className="w-8 h-8" />,
      color: "from-amber-500 to-orange-700",
      link: "/leaderboard"
    },
    {
      id: "about",
      title: t('gameMode.about.title'),
      description: t('gameMode.about.description'),
      icon: <Info className="w-8 h-8" />,
      color: "from-green-500 to-teal-700",
      link: "/about"
    },
    {
      id: "status",
      title: t('gameMode.status.title'),
      description: t('gameMode.status.description'),
      icon: <ActivitySquare className="w-8 h-8" />,
      color: "from-amber-500 to-orange-700",
      link: "/status"
    }
  ];

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-indigo-950 text-white overflow-hidden">
      {/* Animated particles */}
      {particles.map(particle => (
        <div 
          key={particle.id}
          className="absolute rounded-full bg-blue-500 opacity-20"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            transition: 'top 0.5s linear'
          }}
        />
      ))}
      
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-10 sm:pb-16 relative z-10">
        <div 
          className={`grid lg:grid-cols-2 gap-8 sm:gap-12 items-center transform transition-all duration-1000 ${
            isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          {/* Main Content */}
          <div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-2 sm:mb-4 leading-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500">
              {t('home.title')}
            </h1>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-8 leading-tight">
              {t('home.subtitle')}
            </h2>
            <p className="text-md sm:text-l text-gray-400 mb-6 sm:mb-12">
              {t('home.disclaimer')}
            </p>
            <p className="text-lg sm:text-xl text-blue-200 mb-6 sm:mb-12">
              {t('home.description')}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/play/quick"
                className="group bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg hover:from-blue-700 hover:to-indigo-800 transition-all duration-300 flex items-center space-x-2 shadow-lg shadow-blue-900/50 transform hover:scale-105"
              >
                <Gamepad2 className="w-5 h-5" />
                <span className="font-bold">{t('home.playNow')}</span>
                <ChevronRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/leaderboard"
                className="group bg-gray-800/50 backdrop-blur-sm border border-gray-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg hover:bg-gray-700/50 transition-all duration-300 flex items-center space-x-2 transform hover:scale-105"
              >
                <Trophy className="w-5 h-5" />
                <span className="font-bold">{t('gameMode.leaderboard.title')}</span>
              </Link>
            </div>
          </div>

          {/* Hero Image - Now visible on mobile at smaller size */}
          <div className="mt-8 lg:mt-0">
            <div className="relative w-full h-64 sm:h-80 md:h-96 lg:h-[400px]">
              <PingPongGame className="w-full h-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Game Modes Section */}
      <div className="relative z-10 py-10 sm:py-16 bg-gray-900/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">{t('home.choiceTitle')}</h2>
            <p className="text-lg sm:text-xl text-blue-300 max-w-3xl mx-auto">
              {t('home.choiceDescription')}
            </p>
          </div>
          
          <div 
            className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 transform transition-all duration-1000 delay-300"
          >
            {gameModes.map((mode, index) => (
              <Link
                key={mode.id}
                to={mode.link}
                className={`bg-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-${mode.color.split(' ')[0]}/20 transform hover:-translate-y-2 ${
                  isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
                }`}
                style={{ transitionDelay: `${index * 100 + 300}ms` }}
                onMouseEnter={() => setHoverItem(mode.id)}
                onMouseLeave={() => setHoverItem(null)}
              >
                <div className={`h-2 bg-gradient-to-r ${mode.color}`}></div>
                <div className="p-6 sm:p-8">
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-r ${mode.color} flex items-center justify-center mb-4 sm:mb-6 transform transition-transform duration-500 ${
                    hoverItem === mode.id ? 'scale-110 rotate-6' : ''
                  }`}>
                    {mode.icon}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">{mode.title}</h3>
                  <p className="text-gray-300 mb-4 sm:mb-6">{mode.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Custom animations */}
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        .animate-pulse-glow {
          animation: pulse-glow 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Home;