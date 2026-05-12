import React, { useState, useEffect, useCallback } from "react";
import ProfileStats from "../components/ProfileStats.jsx";
import MatchHistory from "../components/MatchHistory.jsx";
import ChampionFilterDropdown from "../components/ChampionFilterDropdown.jsx";
import apiClient from "../api/client.js";

const ProfilePage = ({ champByKey }) => {
  const [gameName, setGameName] = useState("");
  const [tagLine, setTagLine] = useState("");
  const [profileMatches, setProfileMatches] = useState(null);
  const [profileStats, setProfileStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [matches, setMatches] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentPuuid, setCurrentPuuid] = useState(null);
  const [selectedChampion, setSelectedChampion] = useState("");

  const handleSearch = useCallback(async (e) => {
    if (e) e.preventDefault();
    if (!gameName) return;

    setLoading(true);
    setError("");
    setProfileMatches(null);
    setProfileStats(null);

    try {
        // Fetch PUUID from alias lookup endpoint to get database data
        const summoner = await window.electronAPI.fetchSummonerInfo(gameName, tagLine || "NA1");
        const puuid = summoner.puuid;
        setCurrentPuuid(puuid);
        
        // Fetch all games from database
        const dbGames = await apiClient.getSummonerGames(puuid);
        console.log("Database games:", dbGames)
        console.log("Database games found:", dbGames.length);
        
        // Transform database games to MatchCard format
        const transformedMatches = await Promise.all(
            dbGames.map(async (dbGame) => {
                try {
                    let participants;
                    
                    try {
                        // Try to fetch participants with items and augments for this match
                        participants = await apiClient.getMatchParticipantsWithItems(dbGame.match_id);
                    } catch (enhancedError) {
                        console.warn("Enhanced endpoint failed, falling back to basic participants:", enhancedError.message);
                        // Fallback to original endpoint
                        const basicParticipants = await apiClient.getMatchParticipantsByMatchId(dbGame.match_id);
                        participants = basicParticipants.map(p => ({
                            ...p,
                            items: [],
                            augments: []
                        }));
                    }
                    
                    return {
                        match_id: dbGame.match_id,
                        game_creation: dbGame.game_creation,
                        game_duration: dbGame.game_duration,
                        queue_type: dbGame.queue_type,
                        player: {
                            win: dbGame.win,
                            kills: dbGame.kills,
                            deaths: dbGame.deaths,
                            assists: dbGame.assists,
                            champ_id: dbGame.champ_id,
                            gold_earned: dbGame.gold_earned,
                            total_damage_dealt: dbGame.total_damage_dealt,
                            pentakills: dbGame.pentakills
                        },
                        participants: participants.map(p => ({
                            match_id: dbGame.match_id,
                            team_id: p.team_id,
                            puuid: p.puuid,
                            champ_id: p.champ_id,
                            win: p.win,
                            kills: p.kills,
                            deaths: p.deaths,
                            assists: p.assists,
                            gold_earned: p.gold_earned,
                            total_damage_dealt: p.total_damage_dealt,
                            pentakills: p.pentakills,
                            summoner_name: p.summoner_name,
                            items: p.items || [],
                            augments: p.augments || []
                        }))
                    };
                } catch (error) {
                    console.error("Error transforming database game:", dbGame.match_id, error);
                    return null;
                }
            })
        );
        
        // Filter out null matches and sort by game_creation descending (most recent first)
        const validMatches = transformedMatches.filter(m => m !== null);
        validMatches.sort((a, b) => b.game_creation - a.game_creation);
        
        setProfileMatches(validMatches);
        
        // Calculate stats from all matches
        if (validMatches && validMatches.length > 0) {
            const wins = validMatches.filter(match => match.player?.win === 1).length;
            const totalGames = validMatches.length;
            const winRate = wins / totalGames;
            
            setProfileStats({
                winrate: winRate,
                games_played: totalGames
            });
        }
        console.log("Final matches from database:", validMatches);
        
    } catch (err) {
        console.error("Error in handleSearch:", err);
        setError(err.message || 'Failed to fetch summoner data');
    } finally {
        setLoading(false);
    }
    }, [gameName, tagLine]);

  // Filter matches based on selected champion
  const filteredMatches = profileMatches ? profileMatches.filter(match => {
    if (!selectedChampion) return true;
    return match.player.champ_id.toString() === selectedChampion;
  }) : [];

  // Calculate filtered statistics
  const filteredStats = React.useMemo(() => {
    if (!filteredMatches || filteredMatches.length === 0) {
      return { winrate: 0, games_played: 0 };
    }
    
    const wins = filteredMatches.filter(match => match.player?.win === 1).length;
    const totalGames = filteredMatches.length;
    const winRate = wins / totalGames;
    
    return { winrate: winRate, games_played: totalGames };
  }, [filteredMatches]);

  const handleUpdate = useCallback(async () => {
    if (!gameName || !tagLine || !currentPuuid) return;

    setIsUpdating(true);
    setError("");

    try {
        // Trigger server ingestion for the summoner
        console.log("Starting ingestion for:", `${gameName}#${tagLine}`);
        const ingestionResult = await apiClient.ingestSummonerData(gameName, tagLine);
        console.log("Ingestion result:", ingestionResult);
        
        // Refresh data after ingestion
        await handleSearch();
        
    } catch (err) {
        console.error("Error in handleUpdate:", err);
        setError(err.message || 'Failed to update summoner data');
    } finally {
        setIsUpdating(false);
    }
  }, [gameName, tagLine, currentPuuid, handleSearch]);

  return (
    <div className="p-5 flex flex-col items-center custom-scrollbar">
      <div className="p-5">
        <h1 className="font-header text-2xl font-bold">Search Profile</h1>

        <form onSubmit={handleSearch} className="flex mt-2 gap-5">
          <input
            type="text"
            className="w-1/2 p-2 rounded-lg border border-accent bg-secondary"
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
            placeholder="Enter game name"
          />
          <input
            type="text"
            className="w-1/4 p-2 rounded-lg border border-accent bg-secondary"
            value={tagLine}
            onChange={(e) => setTagLine(e.target.value)}
            placeholder="Enter tag line"
          />
          <button type="submit" className="!bg-black font-header font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">Search</button>
          <button 
            type="button"
            className="!bg-blue-600 font-header font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed" 
            onClick={handleUpdate}
            disabled={!currentPuuid || isUpdating}
          >
            {isUpdating ? 'Updating...' : 'Update'}
          </button>
        </form>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500 pl-20">{error}</p>}

      <div className="w-3/4 flex">

        {profileStats && 
            <ProfileStats 
              stats={profileStats}
              filteredStats={selectedChampion ? filteredStats : null}
              selectedChampion={selectedChampion}
              champByKey={champByKey}
            />
        }

        {profileMatches && (
          <div className="p-4 flex-col w-2/3 flex rounded-lg bg-secondary border border-accent">
            {/* Champion Filter Dropdown */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Filter by Champion:</label>
              <ChampionFilterDropdown
                champByKey={champByKey}
                selectedChampion={selectedChampion}
                onChampionSelect={setSelectedChampion}
              />
              {selectedChampion && (
                <div className="mt-2 text-sm text-gray-400">
                  Showing {filteredMatches.length} {filteredMatches.length === 1 ? 'match' : 'matches'} for {champByKey[selectedChampion]?.name}
                </div>
              )}
            </div>
            <MatchHistory
              matches={filteredMatches}
              champByKey={champByKey}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;