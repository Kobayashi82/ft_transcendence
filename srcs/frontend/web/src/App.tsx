import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Status from "./pages/Status";
import Header from "./components/layout/Header";

function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-gray-900 text-white">
        <Header />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
			<Route path="/status" element={<Status />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
