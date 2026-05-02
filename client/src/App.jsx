import { HashRouter as Router, Routes, Route, Link } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import ChampionTracker from "./pages/ChampionTracker.jsx";
import GamePhaseContainer from "./components/GamePhaseContainer.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import DataExplorer from "./pages/DataExplorer.jsx";
import ChampionsPage from "./pages/Champions.jsx";
import ChampionStats from "./pages/ChampionStats.jsx";
import ChampionSearch from "./components/ChampionSearch.jsx";

function App() {
  const [completedChamps, setCompleted] = useState({});
  const [champions, setChampions] = useState([]);
  const [idToNameMap, setIdToNameMap] = useState({});
  const [version, setVersion] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [augments, setAugments] = useState([]);
  const [items, setItems] = useState([]);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);

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
    const load = async () => {
      const res = await fetch(
        "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/cherry-augments.json"
      );

      const augmentsMeta = await res.json();
      const augmentMap = Object.fromEntries(
        augmentsMeta.map(a => [a.id, a])
      );

      setAugments(augmentMap)
    }
    load();
  }, [])

  useEffect(() => {
    const load = async() => {
      const res = await fetch(
          "https://ddragon.leagueoflegends.com/cdn/14.10.1/data/en_US/item.json"
        );

      const json = await res.json();

      const map = Object.fromEntries(
        Object.entries(json.data).map(([id, item]) => [
          Number(id),
          item
        ])
      );

      setItems(map)
    };
    load();
  }, [])

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

  // Update status listener
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onUpdateStatus((data) => {
        if (data.status === 'available') {
          setUpdateAvailable(true);
          setDownloadProgress(null);
        } else if (data.status === 'not-available') {
          setUpdateAvailable(false);
          setDownloadProgress(null);
        } else if (data.status === 'downloading') {
          setDownloadProgress(data.progress);
        } else if (data.status === 'downloaded') {
          setUpdateAvailable(false);
          setDownloadProgress(null);
        }
      });
      
      return () => {
        window.electronAPI.removeUpdateListener();
      };
    }
  }, []);

  const downloadUpdate = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.downloadUpdate();
      if (!result.success) {
        setDownloadProgress(null);
      }
    }
  };

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
          <div className="header-bar bg-[#1e1e1e] text-white flex items-center justify-between px-4 [-webkit-app-region:drag]">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="[-webkit-app-region:no-drag]"
              >
                ☰
              </button>
              
              <div className="[-webkit-app-region:no-drag]">
                <ChampionSearch champions={champions} />
              </div>
              
              {updateAvailable && (
                <button
                  onClick={downloadUpdate}
                  className="[-webkit-app-region:no-drag] px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm font-semibold animate-pulse"
                  title="Update available! Click to download"
                >
                  {downloadProgress !== null ? `${Math.round(downloadProgress)}%` : 'Update'}
                </button>
              )}
            </div>

            <div>
              <button onClick={() => window.electronAPI.minimize()} className="[-webkit-app-region:no-drag]">_</button>
              <button onClick={() => window.electronAPI.maximize()} className="[-webkit-app-region:no-drag]">⬜</button>
              <button onClick={() => window.electronAPI.close()} className="[-webkit-app-region:no-drag]">X</button>
            </div>
          </div>

          {/* Sidebar */}
          {/* Sidebar Overlay */}
          {menuOpen && (
            <div className="absolute top-[63px] bottom-0 z-10 w-1/1 bg-[rgba(0,0,0,0.3)] flex" onClick={() => setMenuOpen(false)}>
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
                <GamePhaseContainer
                  completedChamps={completedChamps}
                  champions={champions}
                  idToNameMap={idToNameMap}
                  version={version}
                  champByKey={champByKey}
                  augmentMap={augments}
                  itemMap={items} />} />
              <Route path="/profile" element={<ProfilePage champByKey={champByKey}/>} />
              <Route path="/data-explorer" element={<DataExplorer />} />
              <Route path="/champions" element={<ChampionsPage champions={champions} />} />
              <Route path="/champion/:championId" element={
                <ChampionStats 
                  champions={champions}
                  champByKey={champByKey}
                  augmentMap={augments}
                  itemMap={items} 
                />} />
            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;
