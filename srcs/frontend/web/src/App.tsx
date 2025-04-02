import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Status from "./pages/Status";
import Header from "./components/layout/Header";
import UnderConstruction from "./components/UnderConstruction";
import { LanguageProvider } from "./contexts/LanguageContext";

function App() {
  return (
    <LanguageProvider>
      <Router>
        <div className="flex flex-col min-h-screen bg-gray-900 text-white">
          <Header />
          <main className="flex-grow pt-16"> {/* Added pt-16 for fixed header */}
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/status" element={<Status />} />
              {/* New routes */}
              <Route path="/play/quick" element={<UnderConstruction />} />
              <Route path="/play/tournament" element={<UnderConstruction />} />
              <Route path="/rankings" element={<UnderConstruction />} />
              <Route path="/leaderboard" element={<UnderConstruction />} />
              <Route path="/about" element={<UnderConstruction />} />
            </Routes>
          </main>
        </div>
      </Router>
    </LanguageProvider>
  );
}

export default App;