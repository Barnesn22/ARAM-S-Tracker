import { HashRouter as Router, Routes, Route, Link } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import ChampionTracker from "./pages/ChampionTracker.jsx";
import ChampionSelect from "./pages/ChampionSelect.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import DataExplorer from "./pages/DataExplorer.jsx";
import ChampionsPage from "./pages/Champions.jsx"

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
          key: champ.key,
          tags: champ.tags
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
      <div className="text-white bg-primary h-screen">
        <div className="h-1/1 flex flex-col">
          <div className="header-bar bg-[#1e1e1e] text-white [-webkit-app-region:drag]">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
            >
              ☰
            </button>

            <div>
              <button onClick={() => window.electronAPI.minimize()}>_</button>
              <button onClick={() => window.electronAPI.maximize()}>⬜</button>
              <button onClick={() => window.electronAPI.close()}>X</button>
            </div>
          </div>

          {/* Sidebar */}
          {/* Sidebar Overlay */}
          {menuOpen && (
            <div className="absolute top-[50px] bottom-0 z-10 w-1/1 bg-[rgba(0,0,0,0.3)] flex" onClick={() => setMenuOpen(false)}>
              <div className="w-1/8 bg-secondary p-5 flex flex-col gap-4 animate-[slideIn_0.2s_ease-out] rounded-e-lg" onClick={(e) => e.stopPropagation()}>
                <Link className="border rounded-lg p-2 text-md hover:text-blue-500 text-[#f0f0f0]" to="/" onClick={() => setMenuOpen(false)}>Tracker</Link>
                <Link className="border rounded-lg p-2 text-md hover:text-blue-500 text-[#f0f0f0]" to="/champ-select" onClick={() => setMenuOpen(false)}>Champ Select</Link>
                <Link className="border rounded-lg p-2 text-md hover:text-blue-500 text-[#f0f0f0]" to="/profile" onClick={() => setMenuOpen(false)}>Profile View</Link>
                <Link className="border rounded-lg p-2 text-md hover:text-blue-500 text-[#f0f0f0]" to="/data-explorer" onClick={() => setMenuOpen(false)}>Data Explorer</Link>
                <Link className="border rounded-lg p-2 text-md hover:text-blue-500 text-[#f0f0f0]" to="/champions" onClick={() => setMenuOpen(false)}>Champions</Link>
              </div>
            </div>
          )}

          <div className="flex flex-1 overflow-y-auto flex-col custom-scrollbar">
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
              <Route path="/data-explorer" element={<DataExplorer />} />
              <Route path="/champions" element={<ChampionsPage champions={champions} />} />
            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;
