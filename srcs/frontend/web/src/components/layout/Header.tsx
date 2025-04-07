import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Gamepad2, Trophy, Users, BarChart3, ActivitySquare, Info, Menu, X } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import LanguageSelector from "./LanguageSelector";

const Header: React.FC = () => {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(true); // Start with mobile view by default
  const [isLayoutReady, setIsLayoutReady] = useState(false); // New state to control rendering
  const { t, language } = useLanguage();
  const isActive = (path: string) => location.pathname === path;
  const breakpointRef = useRef<number | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  
  // Add buffer space to switch EARLIER to hamburger menu (preventing visual collision)
  const EARLY_SWITCH_BUFFER = 40; // 40px buffer to switch earlier
  
  const navItems = [
    { name: t('nav.quickMatch'), path: "/quick", icon: <Gamepad2 className="w-4 h-4" /> },
    { name: t('nav.tournament'), path: "/tournament", icon: <Trophy className="w-4 h-4" /> },
    { name: t('nav.stats'), path: "/stats", icon: <Users className="w-4 h-4" /> },
    { name: t('nav.leaderboard'), path: "/leaderboard", icon: <BarChart3 className="w-4 h-4" /> },
    { name: t('nav.about'), path: "/about", icon: <Info className="w-4 h-4" /> },
    { name: t('nav.status'), path: "/status", icon: <ActivitySquare className="w-4 h-4" /> }
  ];

  // Handle scroll events
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

  // Initialize component with correct view based on available space
  useEffect(() => {
    // Initial check for mobile view
    const hiddenNav = document.createElement('div');
    hiddenNav.style.position = 'absolute';
    hiddenNav.style.visibility = 'hidden';
    hiddenNav.style.display = 'flex';
    hiddenNav.innerHTML = navRef.current?.innerHTML || '';
    document.body.appendChild(hiddenNav);
    
    setTimeout(() => {
      const navWidth = hiddenNav.scrollWidth + EARLY_SWITCH_BUFFER;
      const headerWidth = window.innerWidth;
      const logoElement = document.querySelector('.logo-container');
      const logoWidth = logoElement?.clientWidth || 200;
      const availableSpace = headerWidth - logoWidth - 50;
      
      // Determine if we should be in mobile view
      const shouldBeMobile = navWidth > availableSpace;
      
      breakpointRef.current = shouldBeMobile ? headerWidth + EARLY_SWITCH_BUFFER : null;
      setIsMobileView(shouldBeMobile);
      
      // Now that we've determined the layout, we can show it
      setIsLayoutReady(true);
      
      // Clean up
      document.body.removeChild(hiddenNav);
    }, 0);
  }, []);

  // Handle responsive behavior
  useEffect(() => {
    if (!isLayoutReady) return;
    
    // Function to check window size and set mobile/desktop view
    const checkWindowSize = () => {
      // If we already determined the breakpoint, use it for consistency
      if (breakpointRef.current !== null) {
        setIsMobileView(window.innerWidth <= breakpointRef.current);
        return;
      }

      // Check if navigation fits in current window
      if (navRef.current) {
        // Add buffer to nav width to trigger earlier switch
        const navWidth = navRef.current.scrollWidth + EARLY_SWITCH_BUFFER;
        const headerWidth = window.innerWidth;
        const logoWidth = document.querySelector('.logo-container')?.clientWidth || 200;
        const availableSpace = headerWidth - logoWidth - 50; // Standard padding

        // Switch to mobile view earlier by adding buffer to needed width
        if (!isMobileView && navWidth > availableSpace) {
          // Store a higher breakpoint to maintain the early switch when resizing
          breakpointRef.current = headerWidth + EARLY_SWITCH_BUFFER;
          setIsMobileView(true);
        }
      }
    };

    // Check size initially and on resize
    checkWindowSize();
    window.addEventListener('resize', checkWindowSize);
    
    return () => {
      window.removeEventListener('resize', checkWindowSize);
    };
  }, [isMobileView, isLayoutReady]);

  // Reset breakpoint when language changes (might need different width)
  useEffect(() => {
    if (!isLayoutReady) return;
    
    breakpointRef.current = null;
    setIsMobileView(true); // Start with mobile view on language change
    setIsLayoutReady(false); // Hide layout during calculation
    
    // Allow time for new translations to render before checking
    setTimeout(() => {
      if (navRef.current) {
        const navWidth = navRef.current.scrollWidth + EARLY_SWITCH_BUFFER;
        const headerWidth = window.innerWidth;
        const logoWidth = document.querySelector('.logo-container')?.clientWidth || 200;
        const availableSpace = headerWidth - logoWidth - 50;
        
        if (navWidth > availableSpace) {
          breakpointRef.current = headerWidth + EARLY_SWITCH_BUFFER;
          setIsMobileView(true);
        } else {
          setIsMobileView(false);
        }
        
        setIsLayoutReady(true); // Show layout again
      }
    }, 100);
  }, [language]); // Only trigger when language changes

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-gray-900/90 backdrop-blur-lg shadow-lg' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link 
            to="/" 
            className="logo-container text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center"
          >
            <div className="mr-2 w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-sm">
              T
            </div>
            Transcendence
          </Link>

          {/* Desktop Navigation - Hidden until layout is ready and if mobile view is false */}
          <nav 
            ref={navRef} 
            className={`${!isLayoutReady || isMobileView ? 'hidden' : 'flex'} space-x-1 items-center`}
          >
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  isActive(item.path)
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="mr-1.5">{item.icon}</span>
                {item.name}
              </Link>
            ))}
            
            {/* Language selector is included in the nav measurement */}
            <LanguageSelector />
          </nav>

          {/* Mobile Menu Button - Only shown when layout is ready and mobile view is true */}
          <button 
            className={`${!isLayoutReady || !isMobileView ? 'hidden' : 'block'} text-gray-300 hover:text-white focus:outline-none`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
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
        className={`${!isLayoutReady || !isMobileView ? 'hidden' : 'block'} bg-gray-900 shadow-lg overflow-hidden transition-all duration-300 ease-in-out ${
          isMobileMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 py-3 space-y-1">
          {/* Language selector */}
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