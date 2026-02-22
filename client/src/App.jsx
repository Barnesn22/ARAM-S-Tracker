import { HashRouter as Router, Routes, Route, Link } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import ChampionTracker from "./ChampionTracker.jsx";
import ChampionSelect from "./ChampionSelect.jsx";

function App() {
  const [completedChamps, setCompleted] = useState({});
  const [champions, setChampions] = useState([]);
  const [idToNameMap, setIdToNameMap] = useState({});
  const [version, setVersion] = useState("");

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
          <div className="header-bar" style={{ display: "flex", justifyContent: "flex-end", padding: "10px" }}>
            <button onClick={() => window.electronAPI.minimize()}>_</button>
            <button onClick={() => window.electronAPI.maximize()}>⬜</button>
            <button onClick={() => window.electronAPI.close()}>X</button>
          </div>
        
          <nav style={{ display: "flex", justifyContent: "center", gap: "30px", padding: "20px" }}>
            <Link to="/">Tracker</Link>
            <Link to="/champ-select">Champ Select</Link>
          </nav>

          <div style={{ flex: 1, overflowY: "auto" }}>
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
            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;
