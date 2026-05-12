import React, { useState, useEffect, useRef } from 'react';

const ChampionFilterDropdown = ({ champByKey, selectedChampion, onChampionSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredChampions, setFilteredChampions] = useState([]);
  const dropdownRef = useRef(null);

  // Initialize filtered champions
  useEffect(() => {
    const champions = Object.entries(champByKey)
      .sort(([, a], [, b]) => a.name.localeCompare(b.name))
      .map(([champId, champData]) => ({
        id: champId,
        name: champData.name,
        image: champData.image
      }));
    
    setFilteredChampions(champions);
  }, [champByKey]);

  // Filter champions based on search term
  useEffect(() => {
    if (!searchTerm) {
      const champions = Object.entries(champByKey)
        .sort(([, a], [, b]) => a.name.localeCompare(b.name))
        .map(([champId, champData]) => ({
          id: champId,
          name: champData.name,
          image: champData.image
        }));
      setFilteredChampions(champions);
    } else {
      const filtered = Object.entries(champByKey)
        .filter(([, champData]) => 
          champData.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort(([, a], [, b]) => a.name.localeCompare(b.name))
        .map(([champId, champData]) => ({
          id: champId,
          name: champData.name,
          image: champData.image
        }));
      setFilteredChampions(filtered);
    }
  }, [searchTerm, champByKey]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChampionSelect = (champion) => {
    onChampionSelect(champion.id);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClearFilter = () => {
    onChampionSelect('');
    setIsOpen(false);
    setSearchTerm('');
  };

  const selectedChampionData = selectedChampion ? champByKey[selectedChampion] : null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected Champion Display / Search Bar */}
      <div 
        className="w-full p-3 rounded-lg border border-accent bg-secondary text-white cursor-pointer flex items-center justify-between"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center flex-1">
          {selectedChampionData ? (
            <>
              {selectedChampionData.image && (
                <img 
                  src={selectedChampionData.image} 
                  alt={selectedChampionData.name}
                  className="w-8 h-8 mr-3 rounded"
                />
              )}
              <span className="font-medium">{selectedChampionData.name}</span>
            </>
          ) : (
            <span className="text-gray-400">All Champions</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedChampion && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClearFilter();
              }}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ×
            </button>
          )}
          <span className="text-gray-400">{isOpen ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Dropdown Content */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-secondary border border-accent rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
          {/* Search Bar */}
          <div className="p-3 border-b border-accent">
            <input
              type="text"
              placeholder="Search champions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-full p-2 bg-primary border border-accent/50 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>

          {/* Champion List */}
          <div className="max-h-80 overflow-y-auto">
            {/* "All Champions" Option */}
            <div
              onClick={() => handleClearFilter()}
              className="flex items-center p-3 hover:bg-accent/20 cursor-pointer border-b border-accent/30"
            >
              <div className="w-8 h-8 mr-3 rounded bg-gray-600 flex items-center justify-center">
                <span className="text-xs">All</span>
              </div>
              <span className="text-white">All Champions</span>
            </div>

            {/* Champion Options */}
            {filteredChampions.map((champion) => (
              <div
                key={champion.id}
                onClick={() => handleChampionSelect(champion)}
                className="flex items-center p-3 hover:bg-accent/20 cursor-pointer border-b border-accent/30 last:border-b-0"
              >
                {champion.image ? (
                  <img 
                    src={champion.image} 
                    alt={champion.name}
                    className="w-8 h-8 mr-3 rounded"
                  />
                ) : (
                  <div className="w-8 h-8 mr-3 rounded bg-gray-600 flex items-center justify-center">
                    <span className="text-xs">?</span>
                  </div>
                )}
                <span className="text-white">{champion.name}</span>
              </div>
            ))}

            {/* No Results */}
            {filteredChampions.length === 0 && (
              <div className="p-4 text-center text-gray-400">
                No champions found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChampionFilterDropdown;
