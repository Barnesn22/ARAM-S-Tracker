import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.js";

export default function DataExplorer() {
  const [filters, setFilters] = useState({
    champs: [],
    items: [],
    augments: [],
  });

  const [groupBy, setGroupBy] = useState("champ");
  const [results, setResults] = useState([]);
  const [minGames, setMinGames] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    console.log(filters)
    console.log(groupBy)
    console.log(minGames)

    const { data, error } = await supabase.rpc("explorer", {
        champs: filters.champs.length ? filters.champs : null,
        items: filters.items.length ? filters.items : null,
        group_by: groupBy,
        min_games: minGames
        });

    if (error) {
      console.error(error);
    } else {
      setResults(data);
    }

    setLoading(false);
  };
  console.log(results)

  useEffect(() => {
    fetchData();
  }, [filters, groupBy, minGames]);

  const toggleValue = (type, value) => {
    setFilters((prev) => {
      const exists = prev[type].includes(value);
      return {
        ...prev,
        [type]: exists
          ? prev[type].filter((v) => v !== value)
          : [...prev[type], value],
      };
    });
  };

  return (
    <div style={{ padding: 20, background: "#121212", color: "#fff" }}>
      <h1>Data Explorer</h1>

      <FilterSection
        title="Champs"
        values={[1, 2, 3, 4]}
        selected={filters.champs}
        onToggle={(v) => toggleValue("champs", v)}
      />

      <FilterSection
        title="Items"
        values={[101, 102, 103]}
        selected={filters.items}
        onToggle={(v) => toggleValue("items", v)}
      />

      <FilterSection
        title="Augments"
        values={[201, 202]}
        selected={filters.augments}
        onToggle={(v) => toggleValue("augments", v)}
      />

      <div style={{ marginTop: 20 }}>
        <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
          <option value="item">Item</option>
          <option value="champ">Champ</option>
          <option value="augment">Augment</option>
        </select>

        <input
          type="number"
          value={minGames}
          onChange={(e) => setMinGames(Number(e.target.value))}
        />
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table style={{ marginTop: 20, width: "100%" }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Games</th>
              <th>Winrate</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={i}>
                <td>{r.key}</td>
                <td>{r.games}</td>
                <td>{(r.winrate * 100).toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function FilterSection({ title, values, selected, onToggle }) {
  return (
    <div>
      <h3>{title}</h3>
      {values.map((v) => (
        <button
          key={v}
          onClick={() => onToggle(v)}
          style={{
            margin: 4,
            background: selected.includes(v) ? "green" : "gray",
          }}
        >
          {v}
        </button>
      ))}
    </div>
  );
}