import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { computeGapTiers, jenks } from "../utils/tierUtils";

export default function ChampionsPage({ champions }) {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState("score");
  const [sortDirection, setSortDirection] = useState("desc");

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    setLoading(true);

    const { data, error } = await supabase
        .from('champion_stats')  // your materialized view
        .select('*');

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const minMax = (arr) => ({
      min: Math.min(...arr),
      max: Math.max(...arr),
    });

    const weightWR = 0.8;
    const weightPR = 0.2;
    const winrates = data.map(d => d["winrate"]);
    const playrates = data.map(d => d["playrate"]);
    const { min: minWR, max: maxWR } = minMax(winrates);
    const { min: minPR, max: maxPR } = minMax(playrates);

    const normalize = (v, min, max) =>
      max === min ? 0 : (v - min) / (max - min);

    const scores = data.map(d => {
      const wr = normalize(d["winrate"], minWR, maxWR);
      const pr = normalize(d["playrate"], minPR, maxPR);

      return wr * weightWR + pr * weightPR;
    });
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance =
      scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;

    const std = Math.sqrt(variance);

    // attach champ metadata + compute tier
    const enriched = data.map((row) => {
      const champ = champions.find((c) => c.key == row.champ_id);
      const normWR = (row.winrate - minWR) / (maxWR - minWR)
      const normPR = (row.playrate - minPR) / (maxPR - minPR)
      const score = normWR * weightWR + normPR * weightPR;
      const tier = getTier(score, mean, std);

      return {
        ...row,
        name: champ?.name || "Unknown",
        image: champ?.image,
        tier,
        score,
      };
    });

    
    setData(enriched)
    setLoading(false)
  }

  const sortedData = [...data].sort((a, b) => {
    let valA = a[sortKey];
    let valB = b[sortKey];

    if (sortKey === "tier") {
        const tierRank = { S: 5, A: 4, B: 3, C: 2, D: 1 };
        return sortDirection === "asc"
        ? tierRank[valA] - tierRank[valB]
        : tierRank[valB] - tierRank[valA];
    }

    if (typeof valA === "string") {
        return sortDirection === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    }

    return sortDirection === "asc"
        ? valA - valB
        : valB - valA;
    });

  function handleSort(key) {
    if (sortKey === key) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
        setSortKey(key);
        setSortDirection("desc");
    }

    console.log(sortedData)
    }

  function getTier(score, mean, std) {
    console.log(score, mean, std)
    if (score > mean + std*1.5) return "S";
    if (score > mean + std*.25) return "A";
    if (score > mean - std*.25) return "B";
    if (score > mean - std*1) return "C";
    return "D";
  }

  function renderArrow(key) {
    return "";
    if (sortKey !== key) return "";

    return sortDirection === "asc" ? " ↑" : " ↓";
  }

  function getHeaderClass(key) {
    return `p-2 cursor-pointer ${
        sortKey === key ? "text-accent font-bold" : ""
    }`;
    }

    function getCellClass(key) {
    return sortKey === key ? "bg-black/30" : "";
    }

  const handleChampionClick = (champKey) => {
    navigate(`/champion/${champKey}`);
  };

  if (loading) {
    return <div className="p-5">Loading...</div>;
  }

  return (
    <div className="p-5">
      <h1 className="text-center mb-4">Champion Stats</h1>

      <div className="w-3/5 place-self-center overflow-y-auto max-h-[80vh] border border-accent rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-secondary sticky top-0">
            <tr>
                <th className="p-2 text-left cursor-pointer" onClick={() => handleSort("name")}>
                Champ {renderArrow("name")}
                </th>

                <th className="p-2 cursor-pointer" onClick={() => handleSort("games")}>
                Games {renderArrow("games")}
                </th>

                <th className="p-2 cursor-pointer" onClick={() => handleSort("winrate")}>
                Winrate {renderArrow("winrate")}
                </th>

                <th className="p-2 cursor-pointer" onClick={() => handleSort("playrate")}>
                Playrate {renderArrow("playrate")}
                </th>

                <th className="p-2 cursor-pointer" onClick={() => handleSort("tier")}>
                Tier {renderArrow("tier")}
                </th>
            </tr>
            </thead>

          <tbody>
            {sortedData.map((champ) => (
              <tr 
                key={champ.champ_id} 
                className="border-t border-accent cursor-pointer hover:bg-[#2a2a3a] transition-colors"
                onClick={() => handleChampionClick(champ.champ_id)}
              >
                {/* Champ */}
                <td className={`p-2 flex items-center gap-2 ${getCellClass("name")}`}>
                  <img
                    src={champ.image}
                    alt={champ.name}
                    className="w-16 h-16 rounded"
                  />
                  {champ.name}
                </td>

                {/* Games */}
                <td className={`text-center ${getCellClass("games")}`}>{champ.games}</td>

                {/* Winrate */}
                <td className={`text-center ${getCellClass("winrate")}`}>
                  {(champ.winrate * 100).toFixed(1)}%
                </td>

                {/* Playrate */}
                <td className={`text-center ${getCellClass("playrate")}`}>
                  {(champ.playrate * 100).toFixed(1)}%
                </td>

                {/* Tier */}
                <td className={`text-center font-bold ${tierColor(champ.tier)} ${getCellClass("tier")}`}>
                  {champ.tier}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 🎨 Tier colors
function tierColor(tier) {
  switch (tier) {
    case "S":
      return "text-red-400";
    case "A":
      return "text-orange-400";
    case "B":
      return "text-yellow-400";
    case "C":
      return "text-blue-400";
    default:
      return "text-gray-400";
  }
}