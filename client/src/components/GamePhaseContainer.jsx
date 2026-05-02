import { useState, useEffect, useRef } from "react";
import { supabase } from '../supabaseClient'
import ChampionSelect from "./ChampionSelect";
import InGame from "./InGame";
import calculateMVPScores from "../utils/MVPScores";

export default function GamePhaseContainer({ completedChamps, champions, idToNameMap, version, champByKey, augmentMap, itemMap }) {
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
  const [itemWR, setItemWR] = useState([]);
  const [augmentWR, setAugmentWR] = useState([]);
  const [augmentsByRarity, setAugmentsByRarity] = useState([]);
  const [bootItems, setBootItems] = useState([]);
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
    
    else {
      try {
        const phase = await window.electronAPI.getGamePhase();
        
        if (phase == "InProgress") {
          let eventData = null;

          try {
            eventData = await window.electronAPI.getGameEvents();
          } catch (err) {
            console.error("getGameEvents failed:", err);
          }
          if (eventData && playerListRef.current.length > 0) {
            setScores(calculateMVPScores(eventData.Events, playerListRef.current));
          }

          setInChampSelect(false)
          const session = await window.electronAPI.getGameSession();
          
          const summoner = await window.electronAPI.getCurrentSummoner();
          const puuid = summoner["puuid"]
          
          const selections = session?.gameData?.playerChampionSelections || [];
          const p = selections.find(p => p.puuid === puuid);
          setPlayer(p)
         
          if (playerListRef.current.length === 0) {
            const rawList = await window.electronAPI.getPlayerList();

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
          }

          
          if (augmentWR.length == 0) {
            const { data: augment_wr, error: augment_error } = await supabase
              .from("champ_augment_winrates")
              .select("*")
              .eq("champ_id", p.championId)
              .gt("games", 25)
              .order('winrate', { ascending: false});

            if (augment_error) {
              console.error("Error fetching augment stats:", augment_error);
            } else {
              const enrichedAugments = augment_wr.map(a => ({
                ...a,
                meta: augmentMap[a.augment_id]
              }));
              setAugmentWR(enrichedAugments);

              const augmentsRarity = enrichedAugments.reduce((acc, aug) => {
                const rarity = aug.meta?.rarity ?? "unknown";

                if (!acc[rarity]) acc[rarity] = [];
                acc[rarity].push(aug);

                return acc;
              }, {});
              setAugmentsByRarity(augmentsRarity);
            }
          }


          if (itemWR.length == 0) {
            const { data: item_wr, error: item_error } = await supabase
              .from("champ_item_winrates")
              .select("*")
              .eq("champ_id", p.championId)
              .gt("games", 25)
              .order('winrate', { ascending: false});

            if (item_error) {
              console.error("Error fetching item stats:", item_error);
            } else {
              const enrichedItems = item_wr.map(i => ({
                ...i,
                meta: itemMap[i.item_id]
              }));

              const boots = [];
              const fullItems = [];

              enrichedItems.forEach(item => {
                const meta = item.meta;

                if (!meta || item.item_id === 2052) return;

                const isBoots =
                  meta.tags?.includes("Boots") || meta.tags?.includes("Boot");

                const isFinalItem = !meta.into || meta.into.length === 0;

                if (isBoots) {
                  boots.push(item);
                } else if (isFinalItem) {
                  fullItems.push(item);
                }
              });

              setBootItems(boots);
              setItemWR(fullItems);
            }
          }
          setInGame(true);
          return
        }
        else {
          setAugmentWR([]);
          setItemWR([]);
          setInGame(false);
          setTeamOne([]);
          setTeamTwo([]);
          playerListRef.current = [];
        }

        if (phase == "ChampSelect") {
          setInChampSelect(true);

          const mySelection = await window.electronAPI.getMySelection();
          if (mySelection["championId"] == 0) {
            setInitialSelection(true);
            const response = await window.electronAPI.getInitialChamps();
            setOptions(response)
          }
          else {
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
          return
        }

      } catch (err) {
        console.error(err);
      } finally {
      }
      setInChampSelect(false)
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
        itemWR={itemWR}
        augmentsByRarity={augmentsByRarity}
        winrates={winrates}
        champByKey={champByKey}
        completedChamps={completedChamps}
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
