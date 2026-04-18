import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { computeGapTiers, jenks } from "../utils/tierUtils";

export default function ChampionsPage({ champions }) {
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
    console.log(data)

    // attach champ metadata + compute tier
    const enriched = data.map((row) => {
      const champ = champions.find((c) => c.key == row.champ_id);
      const score = row.winrate * Math.log(row.playrate)
      const tier = getTier(score);

      return {
        ...row,
        name: champ?.name || "Unknown",
        image: champ?.image,
        tier,
        score,
      };
    });
    /*const withTiers = computeGapTiers(enriched, {
    scoreKey: "score"
    });

    setData(withTiers);*/
    const withClasses = jenks(enriched, "winrate", 5);
    const tierMap = {
        5: "S",
        4: "A",
        3: "B",
        2: "C",
        1: "D"
        };

    const withTiers = withClasses.map(d => ({
        ...d,
        tier: tierMap[d.jenksClass]
    }));
    setData(withTiers)
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

  function getTier(score) {
    if (score > 3.2) return "S";
    if (score > 3.0) return "A";
    if (score > 2.8) return "B";
    if (score > 2.6) return "C";
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
              <tr key={champ.champ_id} className="border-t border-accent">
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