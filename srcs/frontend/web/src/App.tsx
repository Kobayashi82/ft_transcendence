import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { LanguageProvider, useLanguage } from "./contexts/LanguageContext";
import Header from "./components/layout/Header";
import ScrollToTop from "./components/ScrollToTop";
import Home from "./pages/Home";
import QuickMatch from "./pages/QuickMatch";
import UnderConstruction from "./components/UnderConstruction";
import StatsPage from "./pages/Stats";
import LeaderboardPage from "./pages/Leaderboard";
import AboutPage from "./pages/About";
import Status from "./pages/Status";
import NotFound from "./pages/NotFound";

// Componente simple para controlar la visibilidad durante carga de traducciones
const AppContent = () => {
  const { isLoaded } = useLanguage();
  
  if (!isLoaded) {
    // Pantalla de carga minimalista mientras se cargan las traducciones
    return (
      <div className="flex flex-col min-h-screen bg-gray-900"></div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      <Header />
      <main className="flex-grow pt-16">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/quick" element={<QuickMatch />} />
          <Route path="/tournament" element={<UnderConstruction />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/status" element={<Status />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
};

function App() {
  return (
    <LanguageProvider>
      <Router>
        <ScrollToTop />
        <AppContent />
      </Router>
    </LanguageProvider>
  );
}

export default App;