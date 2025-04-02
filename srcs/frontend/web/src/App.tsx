import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Status from "./pages/Status";
import Header from "./components/layout/Header";

// Route placeholders for new pages
const UnderConstruction = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-900">
    <div className="text-center">
      <h1 className="text-3xl font-bold text-white mb-4">Coming Soon</h1>
      <p className="text-xl text-gray-400">This page is under construction</p>
    </div>
  </div>
);

function App() {
  return (
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
  );
}

export default App;