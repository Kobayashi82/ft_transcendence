import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Gamepad2, 
  Trophy, 
  Users, 
  BarChart3, 
  ActivitySquare,
  Info,
  Menu,
  X
} from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import LanguageSelector from "./LanguageSelector";

const Header: React.FC = () => {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t } = useLanguage();
  
  // Check if a nav item is active
  const isActive = (path: string) => location.pathname === path;
  
  // Navigation items with translations
  const navItems = [
    { name: t('nav.quickMatch'), path: "/play/quick", icon: <Gamepad2 className="w-4 h-4" /> },
    { name: t('nav.tournament'), path: "/play/tournament", icon: <Trophy className="w-4 h-4" /> },
    { name: t('nav.rankings'), path: "/rankings", icon: <Users className="w-4 h-4" /> },
    { name: t('nav.leaderboard'), path: "/leaderboard", icon: <BarChart3 className="w-4 h-4" /> },
    { name: t('nav.about'), path: "/about", icon: <Info className="w-4 h-4" /> },
    { name: t('nav.status'), path: "/status", icon: <ActivitySquare className="w-4 h-4" /> }
  ];

  // Add scroll listener
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled ? 'bg-gray-900/90 backdrop-blur-lg shadow-lg' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link 
            to="/" 
            className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center"
          >
            <div className="mr-2 w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-sm">
              T
            </div>
            Transcendence
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-1 items-center">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive(item.path)
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="mr-1.5">{item.icon}</span>
                {item.name}
              </Link>
            ))}
            
            {/* Language selector in desktop view */}
            <LanguageSelector />
          </nav>

          {/* Mobile menu button */}
          <button 
            className="md:hidden text-gray-300 hover:text-white focus:outline-none"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? 
              <X className="h-6 w-6" /> : 
              <Menu className="h-6 w-6" />
            }
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div 
        className={`md:hidden bg-gray-900 shadow-lg overflow-hidden transition-all duration-300 ease-in-out ${
          isMobileMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 py-3 space-y-1">
          {/* Language selector at top of mobile menu - horizontal version */}
          <div className="mb-3 border-b border-gray-800 pb-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 px-2">{t('language')}</p>
            <LanguageSelector isMobile={true} />
          </div>
          
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium ${
                isActive(item.path)
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="mr-3">{item.icon}</span>
              {item.name}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
};

export default Header;