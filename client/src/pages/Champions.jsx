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
    if (sortKey !== key) return <span className="text-gray-500 ml-1">⇅</span>;
    return sortDirection === "asc" ? <span className="text-blue-400 ml-1">↑</span> : <span className="text-blue-400 ml-1">↓</span>;
  }

  function getHeaderClass(key) {
    return `p-3 cursor-pointer transition-all duration-200 hover:bg-[#2a2a3a] ${
        sortKey === key ? "bg-[#2a2a3a] text-blue-400 font-bold" : "text-gray-300 hover:text-white"
    }`;
    }

    function getCellClass(key) {
    return sortKey === key ? "bg-[#1a1a2e]/50" : "";
    }

  const handleChampionClick = (champKey) => {
    navigate(`/champion/${champKey}`);
  };

  if (loading) {
    return <div className="p-5">Loading...</div>;
  }

  return (
    <div className="p-5 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Champion Tier List</h1>
        </div>

        <div className="bg-[#1a1a2e]/50 backdrop-blur-sm rounded-xl shadow-2xl border border-[#2a2a3a] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#2a2a3a]/80 sticky top-0 z-10">
                <tr>
                    <th className={getHeaderClass("name")} onClick={() => handleSort("name")}>
                    <div className="flex items-center justify-between">
                      <span>Champion</span>
                      {renderArrow("name")}
                    </div>
                    </th>

                    <th className={getHeaderClass("games")} onClick={() => handleSort("games")}>
                    <div className="flex items-center justify-between">
                      <span>Games</span>
                      {renderArrow("games")}
                    </div>
                    </th>

                    <th className={getHeaderClass("winrate")} onClick={() => handleSort("winrate")}>
                    <div className="flex items-center justify-between">
                      <span>Win Rate</span>
                      {renderArrow("winrate")}
                    </div>
                    </th>

                    <th className={getHeaderClass("playrate")} onClick={() => handleSort("playrate")}>
                    <div className="flex items-center justify-between">
                      <span>Play Rate</span>
                      {renderArrow("playrate")}
                    </div>
                    </th>

                    <th className={getHeaderClass("tier")} onClick={() => handleSort("tier")}>
                    <div className="flex items-center justify-center">
                      <span>Tier</span>
                      {renderArrow("tier")}
                    </div>
                    </th>
                </tr>
                </thead>

              <tbody className="divide-y divide-[#2a2a3a]">
                {sortedData.map((champ, index) => (
                  <tr 
                    key={champ.champ_id} 
                    className={`cursor-pointer transition-all duration-200 hover:bg-[#2a2a3a]/30 ${getCellClass("name")} ${index % 2 === 0 ? "bg-[#1a1a2e]/20" : ""}`}
                    onClick={() => handleChampionClick(champ.champ_id)}
                  >
                    {/* Champ */}
                    <td className={`p-3 ${getCellClass("name")}`}>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={champ.image}
                            alt={champ.name}
                            className="w-12 h-12 rounded-lg border-2 border-[#2a2a3a]"
                          />
                          <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${tierBgColor(champ.tier)} border border-[#1a1a2e] flex items-center justify-center`}>
                            <span className="text-xs font-bold text-white">{champ.tier}</span>
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-white">{champ.name}</span>
                          <span className="text-xs text-gray-400">#{index + 1}</span>
                        </div>
                      </div>
                    </td>

                    {/* Games */}
                    <td className={`p-3 text-center ${getCellClass("games")}`}>
                      <span className="text-gray-300 font-medium">{champ.games.toLocaleString()}</span>
                    </td>

                    {/* Winrate */}
                    <td className={`p-3 text-center ${getCellClass("winrate")}`}>
                      <div className="flex items-center justify-center">
                        <span className={`font-semibold ${getWinrateColor(champ.winrate)}`}>
                          {(champ.winrate * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>

                    {/* Playrate */}
                    <td className={`p-3 text-center ${getCellClass("playrate")}`}>
                      <div className="flex items-center justify-center">
                        <span className="text-gray-300 font-medium">
                          {(champ.playrate * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>

                    {/* Tier */}
                    <td className={`p-3 text-center ${getCellClass("tier")}`}>
                      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm ${tierBgColor(champ.tier)} text-white`}>
                        {champ.tier}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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

// 🎨 Tier background colors
function tierBgColor(tier) {
  switch (tier) {
    case "S":
      return "bg-gradient-to-br from-red-500 to-red-600";
    case "A":
      return "bg-gradient-to-br from-orange-500 to-orange-600";
    case "B":
      return "bg-gradient-to-br from-yellow-500 to-yellow-600";
    case "C":
      return "bg-gradient-to-br from-blue-500 to-blue-600";
    default:
      return "bg-gradient-to-br from-gray-500 to-gray-600";
  }
}

// 🎨 Winrate colors
function getWinrateColor(winrate) {
  if (winrate >= 0.55) return "text-green-400";
  if (winrate >= 0.52) return "text-blue-400";
  if (winrate >= 0.48) return "text-yellow-400";
  return "text-red-400";
}