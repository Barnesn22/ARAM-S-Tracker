import { useState, useEffect, useRef } from "react";
import { supabase } from '../supabaseClient'
import ChampionSelect from "../components/ChampionSelect";
import InGame from "../components/InGame";
import calculateMVPScores from "../utils/MVPScores";

export default function GamePhaseContainer({ completedChamps, champByKey, itemMap, augmentMap }) {
  const [picks, setPicks] = useState([]);
  const [bench, setBench] = useState([]);
  const [inChampSelect, setInChampSelect] = useState(false);
  const [winrates, setWinrates] = useState([]);
  const [initialSelection, setInitialSelection] = useState(false);
  const [options, setOptions] = useState([]);
  const [inGame, setInGame] = useState(false);
  const [teamOne, setTeamOne] = useState([]);
  const [teamTwo, setTeamTwo] = useState([]);
  const [player, setPlayer] = useState("");
    const [scores, setScores] = useState([]);

  const playerListRef = useRef([]);
  const testing = false;

  useEffect(() => {
    const fetchStats = async () => {
      const { data, error } = await supabase
        .from('champion_stats')
        .select('*')
        .order('winrate', { ascending: false });
  
      if (error) {
        console.error('Error fetching champion stats:', error)
      } else {
        setWinrates(data)
      }
    }

    fetchStats()
  }, [])
  
  const getChampSelect = async () => {
    if (testing) {
      setInChampSelect(true);
      setInitialSelection(true);
      const teamPicks = [
        { Summoner: "Faker", champ: champByKey[157] || null },
        { Summoner: "Caps", champ: champByKey[238] || null },
        { Summoner: "Chovy", champ: champByKey[99] || null },
        { Summoner: "Ruler", champ: champByKey[22] || null },
        { Summoner: "Keria", champ: champByKey[412] || null },
      ];
      setPicks(teamPicks)
      return;
    }
    
    try {
        const phase = await window.electronAPI.getGamePhase();
        
        if (phase == "InProgress") {
          let eventData = null;
          let rawList = null;

          try {
            eventData = await window.electronAPI.getGameEvents();
          } catch (err) {
            console.error("getGameEvents failed:", err);
          }
          
          if (eventData && eventData.Events && Array.isArray(eventData.Events) && playerListRef.current.length > 0) {
            setScores(calculateMVPScores(eventData.Events, playerListRef.current));
          }

          setInChampSelect(false)
          const session = await window.electronAPI.getGameSession();
          
          const summoner = await window.electronAPI.getCurrentSummoner();
          const puuid = summoner["puuid"]
          
          const selections = session?.gameData?.playerChampionSelections || [];
          const p = selections.find(p => p.puuid === puuid);
          setPlayer(p)

          console.log(playerListRef.current)
         
          if (playerListRef.current.length === 0) {
            try {
              rawList = await window.electronAPI.getPlayerList();
            } catch (err) {
              console.error("getPlayerList failed:", err);
              rawList = [];
            }
            
            // Ensure rawList is an array before using .find
            if (Array.isArray(rawList)) {
              const joined = selections.map(participant => {
                const champName = champByKey[participant.championId]?.name;

                const liveMatch = rawList.find(
                  player => player.championName === champName
                );

                return {
                  ...participant,
                  ...liveMatch
                };
              });

              playerListRef.current = joined;
              
              setTeamOne(joined.filter(p => p.team === "ORDER"));
              setTeamTwo(joined.filter(p => p.team === "CHAOS"));
            } else {
              // Fallback: use selections without live match data
              const joined = selections.map(participant => ({
                ...participant,
                // Add empty live match data
              }));
              
              playerListRef.current = joined;
              setTeamOne(joined.filter(p => p.team === "ORDER"));
              setTeamTwo(joined.filter(p => p.team === "CHAOS"));
            }
          }

          
                    setInGame(true);
          return;
        } else if (phase == "ChampSelect") {
          setInGame(false);
          setTeamOne([]);
          setTeamTwo([]);
          playerListRef.current = [];
          
          setInChampSelect(true);

          const mySelection = await window.electronAPI.getMySelection();
          if (mySelection["championId"] == 0) {
            setInitialSelection(true);
            const response = await window.electronAPI.getInitialChamps();
            setOptions(response)
          } else {
            setInitialSelection(false)
          }

          const data = await window.electronAPI.getChampSelect();
          const bench = data["benchChampions"];
          const picks = data["myTeam"];

          const benchChamps = bench.map((b) => champByKey[b["championId"]] || null);
          setBench(benchChamps);

          const teamPicks = picks.map((p) => ({
            Summoner: p["gameName"],
            champ: champByKey[p["championId"]] || null,
          }));
          setPicks(teamPicks);
          return;
        } else {
          // Handle other phases (None, etc.)
          setInGame(false);
          setInChampSelect(false);
          setTeamOne([]);
          setTeamTwo([]);
          playerListRef.current = [];
        }

      } catch (err) {
        console.error("Error in getChampSelect:", err);
        // Reset state on error to prevent hanging, but don't stop the interval
        setInChampSelect(false);
        setInGame(false);
        setTeamOne([]);
        setTeamTwo([]);
        playerListRef.current = [];
        setScores([]);
      }
  };

  useEffect(() => {
    getChampSelect();
    const interval = setInterval(getChampSelect, 2000);
    return () => clearInterval(interval);
  }, []);

  if (inGame) {
    return (
      <InGame 
        player={player}
        teamOne={teamOne}
        teamTwo={teamTwo}
        scores={scores}
        winrates={winrates}
        champByKey={champByKey}
        completedChamps={completedChamps}
        itemMap={itemMap}
        augmentMap={augmentMap}
      />
    );
  }

  return (
    <ChampionSelect 
      inChampSelect={inChampSelect}
      initialSelection={initialSelection}
      picks={picks}
      bench={bench}
      options={options}
      completedChamps={completedChamps}
      winrates={winrates}
      champByKey={champByKey}
    />
  );
}
