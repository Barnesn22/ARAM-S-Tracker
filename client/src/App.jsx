import { HashRouter as Router, Routes, Route, Link } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import ChampionTracker from "./pages/ChampionTracker.jsx";
import ChampionSelect from "./pages/ChampionSelect.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";

function App() {
  const [completedChamps, setCompleted] = useState({});
  const [champions, setChampions] = useState([]);
  const [idToNameMap, setIdToNameMap] = useState({});
  const [version, setVersion] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fetchChampions = async () => {
      try {
        const versionRes = await fetch(
          "https://ddragon.leagueoflegends.com/api/versions.json"
        );
        const versions = await versionRes.json();
        const latestVersion = versions[0];
        setVersion(latestVersion)

        const champRes = await fetch(
          `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion.json`
        );
        const champData = await champRes.json();

        const champArray = Object.values(champData.data).map((champ) => ({
          name: champ.name,
          id: champ.id,
          image: `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/champion/${champ.image.full}`,
          key: champ.key
        }));

        champArray.sort((a, b) => a.name.localeCompare(b.name));
        setChampions(champArray);
      } catch (error) {
        console.error("Error fetching champions:", error);
      }
    };

    fetchChampions();
  }, []);

  useEffect(() => {
    const map = {};

    champions.forEach((champ) => {
      map[champ.id] = champ.name;
    });

    setIdToNameMap(map);
  }, [champions]);

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

const champByKey = useMemo(() => {
  const map = {};
  champions.forEach((champ) => {
    map[champ.key] = champ;
  });
  return map;
}, [champions]);

  return (
    <Router>
      <div style={{ height: "100vh", backgroundColor: "#1e1e2f", color: "#f0f0f0" }}>
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <div className="header-bar">
            <button
              className="menu-button"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              ☰
            </button>

            <div className="window-controls">
              <button onClick={() => window.electronAPI.minimize()}>_</button>
              <button onClick={() => window.electronAPI.maximize()}>⬜</button>
              <button onClick={() => window.electronAPI.close()}>X</button>
            </div>
          </div>

          {/* Sidebar */}
          {/* Sidebar Overlay */}
          {menuOpen && (
            <div className="side-menu-overlay" onClick={() => setMenuOpen(false)}>
              <div className="side-menu" onClick={(e) => e.stopPropagation()}>
                <Link to="/" onClick={() => setMenuOpen(false)}>Tracker</Link>
                <Link to="/champ-select" onClick={() => setMenuOpen(false)}>Champ Select</Link>
                <Link to="/profile" onClick={() => setMenuOpen(false)}>Profile View</Link>
              </div>
            </div>
          )}

          <div style={{ flex: 1, overflowY: "auto" }} className="custom-scrollbar">
            <Routes>
              <Route path="/" element={
                <ChampionTracker 
                  completedChamps={completedChamps}
                  setCompleted={setCompleted}
                  champions={champions}
                  version={version}
                  champByKey={champByKey} />} />
              <Route path="/champ-select" element={
                <ChampionSelect
                  completedChamps={completedChamps}
                  champions={champions}
                  idToNameMap={idToNameMap}
                  version={version}
                  champByKey={champByKey} />} />
              <Route path="/profile" element={<ProfilePage champByKey={champByKey}/>} />
            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;
