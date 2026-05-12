import { useState, useEffect } from "react";
import apiClient from "../api/client.js";

export default function DataExplorer({ champByKey, augmentMap, itemMap }) {
  const [filters, setFilters] = useState([]);
  const [results, setResults] = useState([]);
  const [itemStats, setItemStats] = useState([]);
  const [augmentStats, setAugmentStats] = useState([]);
  const [totalGames, setTotalGames] = useState(0);
  const [minGames, setMinGames] = useState(0);
  const [loading, setLoading] = useState(false);
  const [champions, setChampions] = useState([]);
  const [items, setItems] = useState([]);
  const [augments, setAugments] = useState([]);
  const [autocompleteStates, setAutocompleteStates] = useState({});
  const [inputValues, setInputValues] = useState({});
  const [activeTab, setActiveTab] = useState('champions');
  const [sortConfig, setSortConfig] = useState({ key: 'games', direction: 'desc' });

  // Load filter options on mount
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const [champsData, itemsData, augmentsData] = await Promise.all([
          apiClient.getChampions(),
          apiClient.getItems(),
          apiClient.getAugments()
        ]);
        
        const enrichedItems = itemsData.map(i => ({
          ...i,
          meta: itemMap && itemMap[i.key] || itemMap[i.item_id]
        }));

        const enrichedAugments = augmentsData.map(a => ({
          ...a,
          meta: augmentMap && augmentMap[a.key] || augmentMap[a.augment_id]
        }));

        setChampions(champsData);
        setItems(enrichedItems);
        setAugments(enrichedAugments);
      } catch (error) {
        console.error('Error loading filter options:', error);
      }
    };

    loadFilterOptions();
  }, []);

  // Convert champion name to ID
  const getChampionIdByName = (nameOrId) => {
    // If it's already a number, return it
    if (!isNaN(nameOrId)) {
      return nameOrId;
    }
    
    // Search for champion by name (case insensitive)
    for (const [champId, champData] of Object.entries(champByKey)) {
      if (champData.name && champData.name.toLowerCase() === nameOrId.toLowerCase()) {
        return champId;
      }
    }
    
    // Return as-is if not found (might be an ID as string)
    return nameOrId;
  };

  // Fetch data when filters change
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      const filterParams = {
        champions: filters
          .filter(f => f.type === 'champion' && f.value && f.value.trim() !== '')
          .map(f => getChampionIdByName(f.value)),
        items: filters
          .filter(f => f.type === 'item' && f.value && f.value.trim() !== '')
          .map(f => f.value),
        augments: filters
          .filter(f => f.type === 'augment' && f.value && f.value.trim() !== '')
          .map(f => f.value)
      };

      // Don't make API calls if no meaningful filters are applied
      if (filterParams.champions.length === 0 && 
          filterParams.items.length === 0 && 
          filterParams.augments.length === 0) {
        setResults([]);
        setItemStats([]);
        setAugmentStats([]);
        setTotalGames(0);
        setLoading(false);
        return;
      }

      try {
        const [championData, itemData, augmentData, gamesCount] = await Promise.all([
          apiClient.getExplorerData(filterParams),
          // Only fetch item/augment stats if we have a single champion filter
          filterParams.champions.length === 1 ? apiClient.getExplorerItems(filterParams.champions[0], filterParams) : Promise.resolve([]),
          filterParams.champions.length === 1 ? apiClient.getExplorerAugments(filterParams.champions[0], filterParams) : Promise.resolve([]),
          apiClient.getExplorerGamesCount(filterParams)
        ]);

        console.log('itemData', itemData)

        const enrichedItems = itemData.map(i => ({
          ...i,
          meta: itemMap && itemMap[i.key] || itemMap[i.item_id]
        }));

        const enrichedAugments = augmentData.map(a => ({
          ...a,
          meta: augmentMap && augmentMap[a.key] || augmentMap[a.augment_id]
        }));
        
        // Apply client-side minimum games filtering
        const filterByMinGames = (data) => {
          return data.filter(item => item.games >= minGames);
        };
        const filteredChampionData = filterByMinGames(championData);
        const filteredItemData = filterByMinGames(enrichedItems);
        const filteredAugmentData = filterByMinGames(enrichedAugments);
        
        console.log('enrichedAugments', enrichedAugments)
        console.log('enrichedItems', enrichedItems)
        setResults(filteredChampionData);
        setItemStats(filteredItemData);
        setAugmentStats(filteredAugmentData);
        setTotalGames(gamesCount.total_games || 0);
      } catch (error) {
        console.error('Error fetching explorer data:', error);
        setResults([]);
        setItemStats([]);
        setAugmentStats([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters, minGames, champByKey]);

  const addFilter = (type) => {
    const filterId = Date.now();
    const initialValue = '';
    
    const newFilter = {
      id: filterId,
      type,
      value: initialValue
    };
    
    setFilters([...filters, newFilter]);
    setInputValues(prev => ({ ...prev, [filterId]: initialValue }));
  };

  const removeFilter = (id) => {
    setFilters(filters.filter(f => f.id !== id));
    setInputValues(prev => {
      const newValues = { ...prev };
      delete newValues[id];
      return newValues;
    });
  };

  const updateFilter = (id, value) => {
    setFilters(filters.map(f => 
      f.id === id ? { ...f, value } : f
    ));
  };

  const getOptionsForType = (type) => {
    switch (type) {
      case 'champion':
        return champions.map(c => ({ id: c.champ_id, name: champByKey[c.champ_id]?.name || `Champion ${c.champ_id}` }));
      case 'item':
        return items.map(i => ({ id: i.item_id, name: `Item ${i.item_id}` }));
      case 'augment':
        return augments.map(a => ({ id: a.augment_id, name: `Augment ${a.augment_id}` }));
      default:
        return [];
    }
  };

  const getChampionNameById = (champId) => {
    return champByKey[champId]?.name || `Champion ${champId}`;
  };

  const getChampionImageById = (champId) => {
    return champByKey[champId]?.image || null;
  };

  // Autocomplete functionality
  const getFilteredChampions = (query) => {
    if (!query || typeof query !== 'string') return [];
    const lowerQuery = query.toLowerCase();
    return Object.entries(champByKey)
      .filter(([id, champ]) => 
        champ.name && champ.name.toLowerCase().includes(lowerQuery)
      )
      .slice(0, 8); // Limit to 8 results
  };

  const getFilteredItems = (query) => {
    if (!query || typeof query !== 'string') return [];
    const lowerQuery = query.toLowerCase();
    return items
      .filter(item => 
        item.item_id.toString().includes(lowerQuery) ||
        (item.meta?.name && item.meta.name.toLowerCase().includes(lowerQuery))
      )
      .slice(0, 8);
  };

  const getFilteredAugments = (query) => {
    if (!query || typeof query !== 'string') return [];
    const lowerQuery = query.toLowerCase();
    return augments
      .filter(augment => 
        augment.augment_id.toString().includes(lowerQuery) ||
        (augment.meta?.nameTRA && augment.meta.nameTRA.toLowerCase().includes(lowerQuery)) ||
        (augment.meta?.name && augment.meta.name.toLowerCase().includes(lowerQuery))
      )
      .slice(0, 8);
  };

  const handleAutocompleteSelect = (filterId, value) => {
    updateFilter(filterId, value);
    setInputValues(prev => ({ ...prev, [filterId]: value }));
    setAutocompleteStates(prev => ({ ...prev, [filterId]: false }));
  };

  const handleInputChange = (filterId, value) => {
    setInputValues(prev => ({ ...prev, [filterId]: value }));
    setAutocompleteStates(prev => ({ ...prev, [filterId]: true }));
  };

  const handleInputBlur = (filterId) => {
    // Delay hiding autocomplete to allow click on suggestion
    setTimeout(() => {
      setAutocompleteStates(prev => ({ ...prev, [filterId]: false }));
    }, 200);
  };

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const sortData = (data) => {
    const sortedData = [...data];
    if (sortConfig.key === 'games') {
      sortedData.sort((a, b) => {
        return sortConfig.direction === 'desc' 
          ? b.games - a.games 
          : a.games - b.games;
      });
    } else if (sortConfig.key === 'winrate') {
      sortedData.sort((a, b) => {
        return sortConfig.direction === 'desc' 
          ? b.winrate - a.winrate 
          : a.winrate - b.winrate;
      });
    }
    return sortedData;
  };

  return (
    <div className="ml-16 flex flex-col p-4 md:p-6 text-[#f0f0f0] bg-gradient-to-br from-[#0f0f23] to-[#1a1a2e] min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          Data Explorer
        </h1>
        <p className="text-gray-400 text-lg mb-4">
          Analyze champion, item, and augment statistics with custom filters
        </p>
        {totalGames > 0 && (
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg px-4 py-2 backdrop-blur-sm">
            <p className="text-blue-300 font-semibold">
              {totalGames.toLocaleString()} games found with current filters
            </p>
          </div>
        )}
      </div>

      {/* Filter Controls */}
      <div className="mb-8">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-2 text-white">Filters</h2>
          <p className="text-gray-400 text-sm">Add filters to narrow down your data analysis</p>
        </div>
        
        {/* Add Filter Buttons */}
        <div className="mb-6 flex flex-wrap gap-3">
          <button 
            onClick={() => addFilter('champion')}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white border border-blue-500/30 rounded-lg cursor-pointer hover:from-blue-700 hover:to-blue-800 transition-all duration-200 select-none shadow-lg hover:shadow-blue-500/25 transform hover:scale-105"
          >
            <span className="flex items-center gap-2">
              <span className="text-lg">+</span>
              <span>Add Champion Filter</span>
            </span>
          </button>
          <button 
            onClick={() => addFilter('item')}
            className="px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white border border-green-500/30 rounded-lg cursor-pointer hover:from-green-700 hover:to-green-800 transition-all duration-200 select-none shadow-lg hover:shadow-green-500/25 transform hover:scale-105"
          >
            <span className="flex items-center gap-2">
              <span className="text-lg">+</span>
              <span>Add Item Filter</span>
            </span>
          </button>
          <button 
            onClick={() => addFilter('augment')}
            className="px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-orange-600 text-white border border-yellow-500/30 rounded-lg cursor-pointer hover:from-yellow-600 hover:to-orange-700 transition-all duration-200 select-none shadow-lg hover:shadow-yellow-500/25 transform hover:scale-105"
          >
            <span className="flex items-center gap-2">
              <span className="text-lg">+</span>
              <span>Add Augment Filter</span>
            </span>
          </button>
        </div>

        {/* Active Filters */}
        <div className="mb-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white mb-1">Active Filters</h3>
            <p className="text-gray-400 text-sm">Current filters applied to your data analysis</p>
          </div>
          {filters.length === 0 ? (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 text-center">
              <p className="text-gray-400">No filters applied. Add filters above to narrow down results.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filters.map(filter => (
                <div key={filter.id} className="flex items-center p-3 bg-gradient-to-r from-gray-800/80 to-gray-800/60 border border-gray-700/50 rounded-lg backdrop-blur-sm">
                  <div className="mr-3 min-w-24">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 border border-blue-500/30">
                      {filter.type}
                    </span>
                  </div>
                  <div className="flex-1">
                    {filter.type === 'champion' || filter.type === 'item' || filter.type === 'augment' ? (
                      <div className="relative">
                        <input
                          type="text"
                          value={inputValues[filter.id] || ''}
                          onChange={(e) => handleInputChange(filter.id, e.target.value)}
                          onBlur={() => handleInputBlur(filter.id)}
                          onFocus={() => setAutocompleteStates(prev => ({ ...prev, [filter.id]: true }))}
                          placeholder={`Enter ${filter.type} name or ID`}
                          className="w-full p-2.5 bg-gray-700/80 text-white border border-gray-600/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                        />
                        {autocompleteStates[filter.id] && (
                          <div className="absolute top-full left-0 right-0 bg-gray-800/95 border border-gray-600/50 rounded-lg mt-2 max-h-48 overflow-y-auto z-10 backdrop-blur-sm shadow-xl">
                            {filter.type === 'champion' && getFilteredChampions(inputValues[filter.id] || '').map(([id, champ]) => (
                              <div
                                key={id}
                                onClick={() => handleAutocompleteSelect(filter.id, champ.name)}
                                className="flex items-center p-3 hover:bg-gray-700/50 cursor-pointer transition-colors duration-150 border-b border-gray-700/30 last:border-b-0"
                              >
                                {champ.image && (
                                  <img 
                                    src={champ.image} 
                                    alt={champ.name}
                                    className="w-6 h-6 mr-3 rounded"
                                  />
                                )}
                                <span className="text-white font-medium">{champ.name}</span>
                              </div>
                            ))}
                            {filter.type === 'item' && getFilteredItems(inputValues[filter.id] || '').map(item => (
                              <div
                                key={item.item_id}
                                onClick={() => handleAutocompleteSelect(filter.id, item.item_id.toString())}
                                className="flex items-center p-3 hover:bg-gray-700/50 cursor-pointer transition-colors duration-150 border-b border-gray-700/30 last:border-b-0"
                              >
                                {item.meta?.image && (
                                  <img 
                                    src={item.meta.image} 
                                    alt={item.meta.name}
                                    className="w-6 h-6 mr-3 rounded"
                                  />
                                )}
                                <span className="text-white font-medium">{item.meta?.name || `Item ${item.item_id}`}</span>
                              </div>
                            ))}
                            {filter.type === 'augment' && getFilteredAugments(inputValues[filter.id] || '').map(augment => (
                              <div
                                key={augment.augment_id}
                                onClick={() => handleAutocompleteSelect(filter.id, augment.augment_id.toString())}
                                className="flex items-center p-3 hover:bg-gray-700/50 cursor-pointer transition-colors duration-150 border-b border-gray-700/30 last:border-b-0"
                              >
                                {augment.meta?.img && (
                                  <img 
                                    src={augment.meta.img}
                                    alt={augment.meta.nameTRA || augment.meta.name}
                                    className="w-6 h-6 mr-3 rounded"
                                  />
                                )}
                                <span className="text-white font-medium">{augment.meta?.nameTRA || augment.meta?.name || `Augment ${augment.augment_id}`}</span>
                              </div>
                            ))}
                            {(filter.type === 'champion' && getFilteredChampions(inputValues[filter.id] || '').length === 0) ||
                             (filter.type === 'item' && getFilteredItems(inputValues[filter.id] || '').length === 0) ||
                             (filter.type === 'augment' && getFilteredAugments(inputValues[filter.id] || '').length === 0) ? (
                              <div className="p-3 text-gray-400 text-center">No results found</div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    ) : (
                      <select
                        value={filter.value}
                        onChange={(e) => updateFilter(filter.id, e.target.value)}
                        className="w-full p-2.5 bg-gray-700/80 text-white border border-gray-600/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                      >
                        {getOptionsForType(filter.type).map(option => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <button
                    onClick={() => removeFilter(filter.id)}
                    className="ml-3 px-3 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white border border-red-500/30 rounded-lg cursor-pointer hover:from-red-700 hover:to-red-800 transition-all duration-200 select-none shadow-lg hover:shadow-red-500/25 transform hover:scale-105"
                  >
                    <span className="flex items-center gap-1">
                      <span className="text-sm">×</span>
                      <span className="text-sm">Remove</span>
                    </span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Minimum Games Filter */}
        <div className="mb-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white mb-1">Minimum Games</h3>
            <p className="text-gray-400 text-sm">Set minimum games threshold for data reliability</p>
          </div>
          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-3">
              <span className="text-gray-300 font-medium">Min Games:</span>
              <input
                type="number"
                min="0"
                value={minGames}
                onChange={(e) => setMinGames(Number(e.target.value))}
                className="w-24 p-2.5 bg-gray-700/80 text-white border border-gray-600/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-white mb-2">Results</h2>
          <p className="text-gray-400 text-sm">Explore your filtered data across different categories</p>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-700/50 mb-6 bg-gray-800/30 rounded-t-lg overflow-hidden">
          <button
            onClick={() => setActiveTab('champions')}
            className={`px-6 py-3 font-medium transition-all duration-200 border-b-2 ${
              activeTab === 'champions' 
                ? 'text-blue-400 border-blue-400 bg-blue-500/10' 
                : 'text-gray-400 border-transparent hover:text-white hover:bg-gray-700/30'
            }`}
          >
            <span className="flex items-center gap-2">
              <span>Teammates</span>
            </span>
          </button>
          <button
            onClick={() => setActiveTab('items')}
            className={`px-6 py-3 font-medium transition-all duration-200 border-b-2 ${
              activeTab === 'items' 
                ? 'text-blue-400 border-blue-400 bg-blue-500/10' 
                : 'text-gray-400 border-transparent hover:text-white hover:bg-gray-700/30 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
            disabled={filters.filter(f => f.type === 'champion').length !== 1}
          >
            <span className="flex items-center gap-2">
              <span>Items</span>
            </span>
          </button>
          <button
            onClick={() => setActiveTab('augments')}
            className={`px-6 py-3 font-medium transition-all duration-200 border-b-2 ${
              activeTab === 'augments' 
                ? 'text-blue-400 border-blue-400 bg-blue-500/10' 
                : 'text-gray-400 border-transparent hover:text-white hover:bg-gray-700/30 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
            disabled={filters.filter(f => f.type === 'champion').length !== 1}
          >
            <span className="flex items-center gap-2">
              <span>Augments</span>
            </span>
          </button>
        </div>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-400 text-lg">Loading data...</p>
          </div>
        ) : activeTab === 'champions' ? (
          results.length === 0 ? (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 text-center">
              <div className="text-4xl mb-4">🔍</div>
              <p className="text-gray-400 text-lg">No data found</p>
              <p className="text-gray-500 text-sm mt-2">Try adjusting your filters to see results</p>
            </div>
          ) : (
            <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg overflow-hidden backdrop-blur-sm shadow-xl">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-700/80 to-gray-700/60 border-b border-gray-600/50">
                    <th className="p-4 text-left text-gray-300 font-semibold border-b border-gray-600/30">
                      <span className="flex items-center gap-2">
                        <span>Champion</span>
                      </span>
                    </th>
                    <th 
                      className="p-4 text-left text-gray-300 font-semibold border-b border-gray-600/30 cursor-pointer hover:bg-gray-600/50 transition-colors duration-150"
                      onClick={() => handleSort('games')}
                    >
                      <span className="flex items-center gap-2">
                        <span>Games</span>
                        {sortConfig.key === 'games' && (
                          <span className="text-blue-400 ml-1">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </span>
                    </th>
                    <th 
                      className="p-4 text-left text-gray-300 font-semibold border-b border-gray-600/30 cursor-pointer hover:bg-gray-600/50 transition-colors duration-150"
                      onClick={() => handleSort('winrate')}
                    >
                      <span className="flex items-center gap-2">
                        <span>Win Rate</span>
                        {sortConfig.key === 'winrate' && (
                          <span className="text-blue-400 ml-1">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortData(results).map((result, index) => (
                    <tr key={index} className="border-b border-gray-700/30 hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-purple-500/10 transition-all duration-200 group">
                      <td className="p-4">
                        <div className="flex items-center">
                          <div className="relative">
                            {getChampionImageById(result.key) && (
                              <img 
                                src={getChampionImageById(result.key)} 
                                alt={getChampionNameById(result.key)}
                                className="w-10 h-10 mr-3 rounded-lg border-2 border-gray-600/50 group-hover:border-blue-500/50 transition-colors duration-200"
                              />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-white group-hover:text-blue-300 transition-colors duration-200">
                              {getChampionNameById(result.key)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center">
                          <span className="text-green-400 font-semibold text-lg">{result.games.toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center">
                          <span className={`font-bold text-lg ${
                            result.winrate >= 0.55 ? 'text-green-400' : 
                            result.winrate >= 0.5 ? 'text-yellow-400' : 
                            'text-red-400'
                          }`}>
                            {(result.winrate * 100).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : activeTab === 'items' ? (
          itemStats.length === 0 ? (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 text-center">
              <div className="text-4xl mb-4">🔍</div>
              <p className="text-gray-400 text-lg">No data found</p>
              <p className="text-gray-500 text-sm mt-2">Try adjusting your filters to see results</p>
            </div>
          ) : (
            <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg overflow-hidden backdrop-blur-sm shadow-xl">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-700/80 to-gray-700/60 border-b border-gray-600/50">
                    <th className="p-4 text-left text-gray-300 font-semibold border-b border-gray-600/30">
                      <span className="flex items-center gap-2">
                        <span>Item</span>
                      </span>
                    </th>
                    <th 
                      className="p-4 text-left text-gray-300 font-semibold border-b border-gray-600/30 cursor-pointer hover:bg-gray-600/50 transition-colors duration-150"
                      onClick={() => handleSort('games')}
                    >
                      <span className="flex items-center gap-2">
                        <span>Games</span>
                        {sortConfig.key === 'games' && (
                          <span className="text-blue-400 ml-1">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </span>
                    </th>
                    <th 
                      className="p-4 text-left text-gray-300 font-semibold border-b border-gray-600/30 cursor-pointer hover:bg-gray-600/50 transition-colors duration-150"
                      onClick={() => handleSort('winrate')}
                    >
                      <span className="flex items-center gap-2">
                        <span>Win Rate</span>
                        {sortConfig.key === 'winrate' && (
                          <span className="text-blue-400 ml-1">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortData(itemStats).map((result, index) => (
                    <tr key={index} className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="p-3">
                        <div className="flex items-center">
                          {result.meta?.image && (
                            <img 
                              src={result.meta.image} 
                              alt={result.meta.name}
                              className="w-8 h-8 mr-2 rounded"
                            />
                          )}
                          <span>{result.meta?.name || `Item ${result.key}`}</span>
                        </div>
                      </td>
                      <td className="p-3">{result.games}</td>
                      <td className="p-3">
                        {(result.winrate * 100).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : activeTab === 'augments' ? (
          augmentStats.length === 0 ? (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 text-center">
              <div className="text-4xl mb-4">🔍</div>
              <p className="text-gray-400 text-lg">Select a single champion to view augment stats</p>
              <p className="text-gray-500 text-sm mt-2">Add a champion filter to see augment data</p>
            </div>
          ) : (
            <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg overflow-hidden backdrop-blur-sm shadow-xl">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-700/80 to-gray-700/60 border-b border-gray-600/50">
                    <th className="p-4 text-left text-gray-300 font-semibold border-b border-gray-600/30">
                      <span className="flex items-center gap-2">
                        <span>Augment</span>
                      </span>
                    </th>
                    <th 
                      className="p-4 text-left text-gray-300 font-semibold border-b border-gray-600/30 cursor-pointer hover:bg-gray-600/50 transition-colors duration-150"
                      onClick={() => handleSort('games')}
                    >
                      <span className="flex items-center gap-2">
                        <span>Games</span>
                        {sortConfig.key === 'games' && (
                          <span className="text-blue-400 ml-1">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </span>
                    </th>
                    <th 
                      className="p-4 text-left text-gray-300 font-semibold border-b border-gray-600/30 cursor-pointer hover:bg-gray-600/50 transition-colors duration-150"
                      onClick={() => handleSort('winrate')}
                    >
                      <span className="flex items-center gap-2">
                        <span>Win Rate</span>
                        {sortConfig.key === 'winrate' && (
                          <span className="text-blue-400 ml-1">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortData(augmentStats).map((result, index) => (
                    <tr key={index} className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="p-3">
                        <div className="flex items-center">
                          {
                            <img 
                              src={result.meta.image}
                              alt={result.meta.nameTRA || result.meta.name}
                              className="w-8 h-8 mr-2 rounded"
                            />
                          }
                          <span>{result.meta?.nameTRA || result.meta?.name || `Augment ${result.key}`}</span>
                        </div>
                      </td>
                      <td className="p-3">{result.games}</td>
                      <td className="p-3">
                        {(result.winrate * 100).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}