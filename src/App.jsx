import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import ChampionTracker from "./ChampionTracker.jsx";
import ChampionSelect from "./ChampionSelect.jsx";

function App() {
  const [completedChamps, setCompleted] = useState({})
  
    // Load saved progress
    useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.loadMissions().then(data => {
        setCompleted(data);
      });
    } else {
      console.error("window.electronAPI is undefined. Preload script not loaded?");
    }
  }, []);

  return (
    <Router>
      <div className="header-bar" style={{ display: "flex", justifyContent: "flex-end", padding: "10px" }}>
        <button onClick={() => window.electronAPI.minimize()}>_</button>
        <button onClick={() => window.electronAPI.maximize()}>⬜</button>
        <button onClick={() => window.electronAPI.close()}>X</button>
      </div>
      <div style={{ backgroundColor: "#1e1e2f", height: "100vh", color: "#f0f0f0" }}>
        <nav style={{ display: "flex", justifyContent: "center", gap: "30px", padding: "20px" }}>
          <Link to="/">Tracker</Link>
          <Link to="/champ-select">Champ Select</Link>
        </nav>

        <Routes>
          <Route path="/" element={<ChampionTracker completedChamps={completedChamps} setCompleted={setCompleted} />} />
          <Route path="/champ-select" element={<ChampionSelect completedChamps={completedChamps} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
