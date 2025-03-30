import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import NotificationsPanel from "../notifications/NotificationsPanel";
import ProfileMenu from "../profile/ProfileMenu";
import useUserProfile from "../../hooks/useUserProfile";
import { useGlobalUIState } from "../../hooks/useGlobalUIState";

const Header = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const { user, loading } = useUserProfile();
  const { closeAllMenus } = useGlobalUIState();

  // Agregamos un useEffect para controlar cuándo mostrar los componentes
  useEffect(() => {
    if (!loading && !isReady) {
      // Pequeño retraso para asegurar que todo esté listo
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [loading, isReady]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    if (!isMenuOpen) {
      closeAllMenus();
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-gray-900 border-b border-gray-800 backdrop-blur-sm bg-opacity-90">
      <div className="container-custom py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-xl font-bold text-white">FT</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-100">
              Transcendence
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <NavLinks currentPath={location.pathname} />

            {!isReady ? (
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-800 rounded-full animate-pulse"></div>
                <div className="w-10 h-10 bg-gray-800 rounded-full animate-pulse"></div>
              </div>
            ) : (
              <>
                {user ? (
                  <div className="flex items-center space-x-4">
                    <NotificationsPanel />
                    <ProfileMenu />
                  </div>
                ) : (
                  <div className="flex items-center space-x-4">
                    <Link to="/login" className="btn-secondary">
                      Login
                    </Link>
                    <Link to="/register" className="btn-primary">
                      Register
                    </Link>
                  </div>
                )}
              </>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-gray-100 focus:outline-none"
            onClick={toggleMenu}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden py-4 space-y-4">
            <MobileNavLinks
              closeMenu={() => setIsMenuOpen(false)}
              currentPath={location.pathname}
            />

            {!isReady ? (
              <div className="pt-4 border-t border-gray-800">
                <div className="flex justify-center">
                  <div className="w-10 h-10 bg-gray-800 rounded-full animate-pulse"></div>
                </div>
              </div>
            ) : (
              <>
                {user ? (
                  <div className="pt-4 border-t border-gray-800">
                    <ProfileMenu
                      isMobile={true}
                      onClose={() => setIsMenuOpen(false)}
                    />
                    <NotificationsPanel
                      isMobile={true}
                      onClose={() => setIsMenuOpen(false)}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col space-y-3 pt-4 border-t border-gray-800">
                    <Link
                      to="/login"
                      className="btn-secondary w-full text-center"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Login
                    </Link>
                    <Link
                      to="/register"
                      className="btn-primary w-full text-center"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Register
                    </Link>
                  </div>
                )}
              </>
            )}
          </nav>
        )}
      </div>
    </header>
  );
};

interface NavLinksProps {
  currentPath: string;
}

const NavLinks = ({ currentPath }: NavLinksProps) => {
  const links = [
    { path: "/", label: "Home" },
    { path: "/game", label: "Game" },
    { path: "/leaderboard", label: "Leaderboard" },
    { path: "/about", label: "About" },
  ];

  return (
    <>
      {links.map((link) => (
        <Link
          key={link.path}
          to={link.path}
          className={`text-gray-300 hover:text-white transition-colors ${
            currentPath === link.path ? "text-white font-medium" : ""
          }`}
        >
          {link.label}
        </Link>
      ))}
    </>
  );
};

interface MobileNavLinksProps {
  closeMenu: () => void;
  currentPath: string;
}

const MobileNavLinks = ({ closeMenu, currentPath }: MobileNavLinksProps) => {
  const links = [
    { path: "/", label: "Home" },
    { path: "/game", label: "Game" },
    { path: "/leaderboard", label: "Leaderboard" },
    { path: "/about", label: "About" },
  ];

  return (
    <>
      {links.map((link) => (
        <Link
          key={link.path}
          to={link.path}
          className={`block py-2 transition-colors ${
            currentPath === link.path
              ? "text-white font-medium bg-gray-800 rounded-lg px-3"
              : "text-gray-300 hover:text-white"
          }`}
          onClick={closeMenu}
        >
          {link.label}
        </Link>
      ))}
    </>
  );
};

export default Header;
