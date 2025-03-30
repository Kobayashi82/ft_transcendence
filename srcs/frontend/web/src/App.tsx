import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import ServerStatusPage from "./pages/ServerStatusPage";
import APIDocumentation from "./pages/APIDocumentation";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard/Dashboard";
import Header from "./components/layout/Header";
import NotFound from "./pages/PageNotFound";
import Game from "./pages/Game";
import GameResults from "./pages/GameResults";
import TermsOfService from "./pages/TermsOfService";
import Contact from "./pages/Contact";
import About from "./pages/About";
import FAQ from "./pages/FAQ";
import Leaderboard from "./pages/Leaderboard";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import { GlobalUIProvider } from "./contexts/GlobalUIProvider";

const App: React.FC = () => {
  return (
    <GlobalUIProvider>
      <Router>
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/status" element={<ServerStatusPage />} />
              <Route path="/api-docs/:service" element={<APIDocumentation />} />

              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/about" element={<About />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              {/* Dashboard routes */}
              <Route path="/dashboard/*" element={<Dashboard />} />

              {/* Game routes */}
              <Route path="/game/results" element={<GameResults />} />
              <Route path="/game" element={<Game />} />

              {/* Página 404 en lugar de redirección */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </Router>
    </GlobalUIProvider>
  );
};

export default App;
