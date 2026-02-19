import { useEffect, useState } from "react";


function ChampionTracker({completedChamps, setCompleted}) {
  const [champions, setChampions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  

  // Fetch champion list from Riot Data Dragon
  useEffect(() => {
    const fetchChampions = async () => {
      try {
        const versionRes = await fetch(
          "https://ddragon.leagueoflegends.com/api/versions.json"
        );
        const versions = await versionRes.json();
        const latestVersion = versions[0];

        const champRes = await fetch(
          `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion.json`
        );
        const champData = await champRes.json();

        const champArray = Object.values(champData.data).map((champ) => ({
          name: champ.name,
          id: champ.id,
          image: `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/champion/${champ.image.full}`,
        }));

        champArray.sort((a, b) => a.name.localeCompare(b.name));
        setChampions(champArray);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching champions:", error);
      }
    };

    fetchChampions();
  }, []);

  const toggleChampion = (name) => {
    const updated = { ...completedChamps };
    updated[name] = !updated[name];
    setCompleted(updated);

    // Save to file
    window.electronAPI.saveMissions(updated);
  };

  const filteredChamps = champions.filter((champ) =>
    champ.name.toLowerCase().includes(search.toLowerCase())
  );

  //if (loading) return <h2 style={{ padding: "40px" }}>Loading Champions...</h2>;

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={{textAlign: "center"}}>ARAM S Tracker</h1>

        {/* Search bar */}
        <input
          type="text"
          placeholder="Search champions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.search}
        />

        {/* Scrollable grid */}
        <div className="scroll-container" style={styles.scrollContainer}>
          <div style={styles.grid}>
            {filteredChamps.map((champ) => {
              const isCompleted = completedChamps[champ.name] === true;

              return (
                <div
                  className="card"
                  key={champ.name}
                  style={{
                    ...styles.card,
                    filter: isCompleted ? "grayscale(100%)" : "none",
                    opacity: isCompleted ? 0.4 : 1,
                  }}
                  onClick={() => toggleChampion(champ.name)}
                >
                  <img src={champ.image} alt={champ.name} style={styles.image} />
                  {isCompleted && <div style={styles.overlay}>Completed</div>}
                  <p style={styles.name}>{champ.name}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    backgroundColor: "#1e1e2f",
    minHeight: "100vh",
    padding: "20px",
    color: "#f0f0f0",
    fontFamily: "Arial, sans-serif",
  },

  container: {
    maxWidth: "1200px",
    margin: "auto",
  },

  search: {
    width: "100%",
    padding: "10px",
    margin: "20px 0",
    borderRadius: "6px",
    border: "1px solid #444",
    backgroundColor: "#2c2c3f",
    color: "#f0f0f0",
    fontSize: "14px",
  },

  scrollContainer: {
    maxHeight: "600px",
    overflowY: "auto",
    border: "1px solid #444",
    padding: "15px",
    borderRadius: "10px",
    backgroundColor: "#2c2c3f",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "15px",
  },

  card: {
    position: "relative",
    cursor: "pointer",
    textAlign: "center",
    borderRadius: "10px",
    transition: "transform 0.2s, box-shadow 0.2s",
  },

  image: {
    width: "100%",
    borderRadius: "10px",
    transition: "0.3s",
    aspectRatio: "1 / 1",
    objectFit: "cover",
  },

  name: {
    marginTop: "5px",
    fontSize: "12px",
    fontWeight: "bold",
  },

  overlay: {
    position: "absolute",
    top: "40%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    backgroundColor: "rgba(255, 152, 0, 0.85)",
    color: "#1e1e2f",
    padding: "5px 8px",
    borderRadius: "5px",
    fontSize: "10px",
    fontWeight: "bold",
  },
};

export default ChampionTracker;