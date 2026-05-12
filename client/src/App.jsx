import { HashRouter as Router, Routes, Route, Link } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import ChampionTracker from "./pages/ChampionTracker.jsx";
import GamePhaseContainer from "./pages/GamePhaseContainer.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import DataExplorer from "./pages/DataExplorer.jsx";
import ChampionsPage from "./pages/Champions.jsx";
import ChampionStats from "./pages/ChampionStats.jsx";
import ChampionSearch from "./components/ChampionSearch.jsx";
import "./styles/sidebar.css";

function App() {
  const [completedChamps, setCompleted] = useState({});
  const [champions, setChampions] = useState([]);
  const [idToNameMap, setIdToNameMap] = useState({});
  const [version, setVersion] = useState("");
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
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

  function convertToCDragon(path) {
    return "https://raw.communitydragon.org/latest/game/" +
      path.replace("/lol-game-data/assets/", "").replace("small", "large").toLowerCase();
  }

  useEffect(() => {
    const load = async () => {
      const res = await fetch(
        "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/cherry-augments.json"
      );

      const augmentsMeta = await res.json();
      const augmentMap = Object.fromEntries(
        augmentsMeta.map(a => [a.id, {
          ...a,
          image: a.augmentSmallIconPath ? convertToCDragon(a.augmentSmallIconPath) : null
        }])
      );

      setAugments(augmentMap)
    }
    load();
  }, [])

  useEffect(() => {
    const load = async() => {
      const res = await fetch(
          `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/item.json`
        );

      const json = await res.json();

      const map = Object.fromEntries(
        Object.entries(json.data).map(([id, item]) => [
          Number(id),
          {
            ...item,
            image: `https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${id}.png`
          }
        ])
      );
      setItems(map)
    };
    load();
  }, [version])

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
      <div className="text-white bg-gradient-to-br from-[#0f0f23] to-[#1a1a2e] h-screen">
        <div className="h-1/1 flex flex-col">
          <div className="header-bar bg-[#121212] text-white flex items-center justify-between px-6 py-3 [-webkit-app-region:drag] border-b border-gray-700 shadow-lg font-header">
            <div className="flex items-center gap-6">
              
              {updateAvailable && (
                <button
                  onClick={downloadUpdate}
                  className="[-webkit-app-region:no-drag] px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 rounded-lg text-sm font-semibold shadow-md transform hover:scale-105 transition-all duration-200 animate-pulse"
                  title="Update available! Click to download"
                >
                  {downloadProgress !== null ? `${Math.round(downloadProgress)}%` : 'Update'}
                </button>
              )}
            </div>

            <div className={`flex items-center justify-center flex-1 px-8 transition-all duration-300 ease-in-out ml-16`}>
                <div className="[-webkit-app-region:no-drag] w-full max-w-lg">
                  <ChampionSearch champions={champions} />
                </div>
              </div>

            <div className="flex items-center gap-1">
              <button 
                onClick={() => window.electronAPI.minimize()} 
                className="[-webkit-app-region:no-drag] w-8 h-8 rounded-md hover:bg-gray-700 transition-colors duration-200 flex items-center justify-center text-sm font-medium"
              >
                <i class="fa-solid fa-window-minimize"></i>
              </button>
              <button 
                onClick={() => window.electronAPI.maximize()} 
                className="[-webkit-app-region:no-drag] w-8 h-8 rounded-md hover:bg-gray-700 transition-colors duration-200 flex items-center justify-center text-sm"
              >
                <i class="fa-regular fa-window-maximize"></i>
              </button>
              <button 
                onClick={() => window.electronAPI.close()} 
                className="[-webkit-app-region:no-drag] w-8 h-8 rounded-md hover:bg-red-600 transition-colors duration-200 flex items-center justify-center text-sm font-medium"
              >
                <i class="fa-solid fa-x"></i>
              </button>
            </div>
          </div>

          {/* Collapsible Sidebar */}
          <div 
            className={`fixed left-0 top-[63px] bottom-0 z-10 bg-primary transition-all duration-300 ease-in-out border-r border-gray-700 ${
              sidebarExpanded ? 'w-64' : 'w-16'
            }`}
            onMouseEnter={() => setSidebarExpanded(true)}
            onMouseLeave={() => setSidebarExpanded(false)}
          >
            <div className="p-4 flex flex-col gap-2">
              <Link 
                className="sidebar-link flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-colors duration-200 text-[#8282b9] group font-header font-medium"
                to="/"
              >
                <span className="sidebar-icon text-xl min-w-[24px] text-center"><i class="fa-solid fa-table"></i></span>
                <span className={`whitespace-nowrap transition-all duration-300 ${sidebarExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none'}`}>
                  Tracker
                </span>
              </Link>
              
              <Link 
                className="sidebar-link flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-colors duration-200 text-[#8282b9] group font-header font-medium"
                to="/champ-select"
              >
                <span className="sidebar-icon text-xl min-w-[24px] text-center"><i class="fa-solid fa-gamepad"></i></span>
                <span className={`whitespace-nowrap transition-all duration-300 ${sidebarExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none'}`}>
                  Live Game
                </span>
              </Link>
              
              <Link 
                className="sidebar-link flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-colors duration-200 text-[#8282b9] group font-header font-medium"
                to="/profile"
              >
                <span className="sidebar-icon text-xl min-w-[24px] text-center"><i class="fa-regular fa-circle-user"></i></span>
                <span className={`whitespace-nowrap transition-all duration-300 ${sidebarExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none'}`}>
                  Profile View
                </span>
              </Link>
              
              <Link 
                className="sidebar-link flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-colors duration-200 text-[#8282b9] group font-header font-medium"
                to="/data-explorer"
              >
                <span className="sidebar-icon text-xl min-w-[24px] text-center"><i class="fa-regular fa-compass"></i></span>
                <span className={`whitespace-nowrap transition-all duration-300 ${sidebarExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none'}`}>
                  Data Explorer
                </span>
              </Link>
              
              <Link 
                className="sidebar-link flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-colors duration-200 text-[#8282b9] group font-header font-medium"
                to="/champions"
              >
                <span className="sidebar-icon text-xl min-w-[24px] text-center"><i class="fa-solid fa-list-ol"></i></span>
                <span className={`whitespace-nowrap transition-all duration-300 ${sidebarExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none'}`}>
                  Champions
                </span>
              </Link>
            </div>
          </div>

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
              <Route path="/data-explorer" element={
                <DataExplorer 
                  champByKey={champByKey}
                  augmentMap={augments}
                  itemMap={items}
                />} />
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
