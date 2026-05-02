import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function ChampionSearch({ champions }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [filteredChamps, setFilteredChamps] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = champions.filter(champ =>
        champ.name.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 5); // Limit to 5 results
      setFilteredChamps(filtered);
    } else {
      setFilteredChamps([]);
    }
  }, [searchTerm, champions]);

  const handleChampionClick = (champId) => {
    navigate(`/champion/${champId}`);
    setSearchTerm("");
    setShowResults(false);
  };

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Search champions..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => setShowResults(true)}
        onBlur={() => setTimeout(() => setShowResults(false), 200)} // Delay to allow click
        className="w-64 px-4 py-2 bg-[#2a2a3a] text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
      />
      
      {searchTerm && (
        <div
          onClick={() => setSearchTerm("")}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white text-lg leading-none cursor-pointer"
        >
          ✕
        </div>
      )}

      {/* Search Results Dropdown */}
      {showResults && filteredChamps.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-[#2a2a3a] border border-gray-600 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto custom-scrollbar">
          {filteredChamps.map((champ) => (
            <div
              key={champ.id}
              onClick={() => handleChampionClick(champ.key)}
              className="flex items-center gap-3 p-3 hover:bg-[#3a3a4a] cursor-pointer transition-colors"
            >
              <img
                src={champ.image}
                alt={champ.name}
                className="w-8 h-8 rounded"
              />
              <span className="text-white">{champ.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
