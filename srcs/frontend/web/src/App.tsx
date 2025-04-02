import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Status from "./pages/Status";
import AboutPage from "./pages/About"; // Import the new About page
import Header from "./components/layout/Header";
import UnderConstruction from "./components/UnderConstruction";
import ScrollToTop from "./components/ScrollToTop";
import { LanguageProvider } from "./contexts/LanguageContext";

function App() {
  return (
    <LanguageProvider>
      <Router>
	  	<ScrollToTop />
        <div className="flex flex-col min-h-screen bg-gray-900 text-white">
          <Header />
          <main className="flex-grow pt-16"> {/* Added pt-16 for fixed header */}
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/status" element={<Status />} />
              <Route path="/about" element={<AboutPage />} /> {/* Add our new About route */}
              {/* Other routes */}
              <Route path="/quick" element={<UnderConstruction />} />
              <Route path="/tournament" element={<UnderConstruction />} />
              <Route path="/rankings" element={<UnderConstruction />} />
              <Route path="/leaderboard" element={<UnderConstruction />} />
            </Routes>
          </main>
        </div>
      </Router>
    </LanguageProvider>
  );
}

export default App;