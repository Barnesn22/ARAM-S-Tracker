import { useState, version, useEffect, useRef } from "react";
import { supabase } from '../supabaseClient'
import TeamChampCard from "../components/TeamChampCard";
import CenterChampView from "../components/CenterChampView";
import calculateMVPScores from "../utils/MVPScores";

export default function ChampionSelect({ completedChamps, champions, idToNameMap, version, champByKey, augmentMap, itemMap }) {
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

  // placeholder "current champ"
  const currentChamp = {
    id: 266,
    name: "Aatrox",
    image: "https://ddragon.leagueoflegends.com/cdn/img/champion/loading/Aatrox_0.jpg",
    key: "Aatrox"
  };
  const testing = false;

  useEffect(() => {
    const fetchStats = async () => {
      const { data, error } = await supabase
        .from('champion_stats')  // your materialized view
        .select('*')
        .order('winrate', { ascending: false }) // optional sort
  
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
        { Summoner: "Faker", champ: champByKey[157] || null },       // Yasuo
        { Summoner: "Caps", champ: champByKey[238] || null },        // Zed
        { Summoner: "Chovy", champ: champByKey[99] || null },        // Lux
        { Summoner: "Ruler", champ: champByKey[22] || null },        // Ashe
        { Summoner: "Keria", champ: champByKey[412] || null },       // Thresh
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
            console.log(joined)
            
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

          // Map picks: convert championId → champ object + keep Summoner name
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

  const getWinrate = (champId) => {
    const champ = winrates.find(c => {return c.champ_id === Number(champId)});
    return champ ? champ.winrate : 0; // default 0 if not found
  }

  useEffect(() => {
    getChampSelect();
    const interval = setInterval(getChampSelect, 2000); // then every 2 seconds
    return () => clearInterval(interval); // cleanup on unmount
  }, []);

  if (inGame && (!player || !player.championId)) {
    return <div>Loading...</div>;
  }
  if (inGame) {
    const winrate = getWinrate(currentChamp.key) || 0;
    const completed = completedChamps[currentChamp.id] === true;
    console.log(teamOne)

    return (
      <div className="flex w-full h-screen bg-[#1e1e2f] text-[#f0f0f0]">

        {/* LEFT TEAM */}
        <div className="w-[20%] flex flex-col gap-3 p-4">
          {teamOne.map(participant => (
            <TeamChampCard champ={champByKey[participant.championId]} 
            player={player}
            scores={scores}
            name={participant.riotIdGameName} />
          ))}
        </div>

        {/* CENTER */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <CenterChampView 
          champ={champByKey[player.championId]}
          itemWR={itemWR}
          augmentsByRarity={augmentsByRarity} 
          winrate={getWinrate(player.championId) || 0}/>
        </div>

        {/* RIGHT TEAM */}
        <div className="w-[20%] flex flex-col gap-3 p-4 items-end">
          {teamTwo.map(participant => (
            <TeamChampCard champ={champByKey[participant.championId]}
            player={player}
            align="right"
            scores={scores}
            name={participant.riotIdGameName} />
          ))}
        </div>

      </div>
    );
  }

  return (
    <div className="flex flex-col p-5 text-[#f0f0f0] bg-[#1e1e2f]">
      
      {/* Top status */}
      <div className="flex justify-center mb-5">
        {!inChampSelect && (
          <p className="text-center text-red-500 font-bold my-5">
            Not in Champ Select
          </p>
        )}
      </div>

      {/* Bench */}
      {inChampSelect && (
        <div className="flex gap-2.5 overflow-x-auto pb-2 justify-center">
          {Array.from({ length: 10 }).map((_, index) => {
            const champ = bench[index];
            const isEmpty = !champ;

            const completed = champ
              ? completedChamps[champ.id] === true
              : false;

            const winrate = champ
              ? getWinrate(champ.key) || 0
              : 0;

            return (
              <div
                key={index}
                className={`w-[100px] h-[120px] rounded-lg overflow-hidden flex-shrink-0 flex flex-col items-center bg-[#2a2a3a]
                  ${completed ? "border-4 border-green-500" : "border-4 border-gray-600"}`}
              >
                <img
                  src={
                    champ
                      ? champ.image
                      : "./ChampionSquare.webp"
                  }
                  alt={champ ? champ.name : "Empty"}
                  className={`w-full h-[100px] object-cover ${
                    isEmpty ? "opacity-40" : ""
                  }`}
                />

                <span className="mt-1 text-sm font-bold">
                  {champ ? `${(winrate * 100).toFixed(2)}%` : "--"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* MAIN AREA */}
      <div className="flex flex-1 gap-10 w-[90%]">
        
        {/* LEFT: Picks */}
        <div className="flex flex-col py-2 w-[300px] gap-2">
          {picks.map((p) => {
            const champ = p.champ || {
              id: -1,
              name: "Unknown",
              image: "./ChampionSquare.webp",
            };

            const completed = completedChamps[champ.id] === true;
            const winrate = getWinrate(champ.key);

            return (
              <div
                key={p.Summoner}
                className="flex items-center py-2 gap-3 bg-[#333] px-3 rounded-lg w-full"
                style={{ height: 'calc(15vh - 8px)' }}
              >
                {/* LEFT: image + winrate */}
                <div className="flex flex-col h-full items-center flex-shrink-0">
                  <div className="flex-1 flex items-center pt-3">
                    <img
                      src={champ.image}
                      alt={champ.name}
                      className={`w-25 aspect-square object-cover rounded
                        ${completed ? "border-4 border-green-500" : "border-4 border-gray-600"}`}
                    />
                  </div>

                  <span className="text-md text-gray-300">
                    {winrate !== undefined
                      ? `${(winrate * 100).toFixed(1)}%`
                      : "—"}
                  </span>
                </div>

                {/* RIGHT: summoner */}
                <div className="flex-1 min-w-0 flex items-center">
                  <span className="truncate text-lg">
                    {p.Summoner}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* MIDDLE: Options */}
        {initialSelection && (
          <div className="flex flex-1 justify-center items-center">
            <div className="flex gap-4">
              {options.map((c) => {
                const champ = champByKey[c];
                const winrate = getWinrate(champ.key) || 0;
                const completed = completedChamps[champ.id] === true;

                return (
                  <div
                    key={champ.id}
                    className={`rounded-lg overflow-hidden flex flex-col items-center
                      ${completed ? "border-4 border-green-500" : "border-4 border-gray-600"}`}
                  >
                    <img
                      src={`https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${champ.id}_0.jpg`}
                      alt={champ.name}
                      className="h-full object-contain"
                    />

                    <span className="mt-1 text-lg font-bold">
                      {(winrate * 100).toFixed(2)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
