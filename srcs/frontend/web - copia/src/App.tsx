import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import ServerStatusPage from "./pages/ServerStatusPage";
import APIDocumentation from "./pages/APIDocumentation";
import Dashboard from "./pages/Dashboard/Dashboard";
import Header from "./components/layout/Header";
import NotFound from "./pages/PageNotFound";
import Game from "./pages/Game";
import GameResults from "./pages/GameResults";
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
