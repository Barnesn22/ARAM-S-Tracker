import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import apiClient from "../api/client";
import ChampionStatsView from "../components/ChampionStatsView";

export default function ChampionStats({ champions, champByKey, augmentMap, itemMap }) {
  const { championId } = useParams();
  const [champion, setChampion] = useState(null);
  const [itemWR, setItemWR] = useState([]);
  const [bootsWR, setBootsWR] = useState([]);
  const [augmentWR, setAugmentWR] = useState([]);
  const [augmentsByRarity, setAugmentsByRarity] = useState([]);
  const [winrates, setWinrates] = useState([]);
  const [counters, setCounters] = useState([]);
  const [synergies, setSynergies] = useState([]);
  const [loading, setLoading] = useState(true);

  console.log(itemMap)

  useEffect(() => {
    const champ = champByKey[championId] || champions.find(c => c.id === championId);
    setChampion(champ);
  }, [championId, champions, champByKey]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!champion) return;
      
      setLoading(true);

      try {
        // Fetch champion winrates
        const wrData = await apiClient.getChampionStatsById(championId);
        setWinrates(wrData ? [wrData] : []);

        // Fetch item winrates for this champion
        const itemData = await apiClient.getChampionItemStats(championId);
        console.log(itemData)
        
        const enrichedItems = itemData.map(i => ({
          ...i,
          meta: itemMap[i.item_id]
        }));
        console.log(enrichedItems)

        // Separate boots and regular items
        const boots = enrichedItems.filter(item => {
          const meta = item.meta;
          if (!meta || item.item_id === 2052) return false;
          const isBoots = meta.tags?.includes("Boots") || meta.tags?.includes("Boot");
          return isBoots;
        });
        console.log(boots)

        const fullItems = enrichedItems.filter(item => {
          if (item.name === "Luden's Companion") {
            console.log(item);
          }
          const meta = item.meta;
          if (!meta || item.item_id === 2052) return false;
          const isBoots = meta.tags?.includes("Boots") || meta.tags?.includes("Boot");
          const isFinalItem = meta.gold?.total > 2000;
          return !isBoots && isFinalItem;
        });

        setItemWR(fullItems);
        setBootsWR(boots);

        // Fetch augment winrates for this champion
        const augmentData = await apiClient.getChampionAugmentStats(championId);
        
        const enrichedAugments = augmentData.map(a => ({
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

        // Fetch champion counters
        const countersData = await apiClient.getChampionCounters(championId);
        const enrichedCounters = countersData.map(counter => ({
          ...counter,
          meta: champByKey[counter.opponent_champ_id]
        }));
        setCounters(enrichedCounters);

        // Fetch champion synergies
        const synergiesData = await apiClient.getChampionSynergies(championId);
        const enrichedSynergies = synergiesData.map(synergy => ({
          ...synergy,
          meta: champByKey[synergy.ally_champ_id]
        }));
        setSynergies(enrichedSynergies);

      } catch (error) {
        console.error('Error fetching champion stats:', error);
      }

      setLoading(false);
    };

    fetchStats();
  }, [champion, itemMap, augmentMap, champByKey]);

  if (!champion) {
    return <div className="p-5 text-white text-center">Champion not found</div>;
  }

  if (loading) {
    return <div className="p-5 text-center text-white">Loading champion stats...</div>;
  }

  const winrate = winrates.length > 0 ? winrates[0].winrate : 0;

  return (
    <div className="min-h-screen">
      <div className="flex flex-col h-full p-5 items-center">
        <div className="w-full max-w-6xl flex-1">
          <ChampionStatsView 
            champ={champion}
            itemWR={itemWR}
            bootsWR={bootsWR}
            augmentsByRarity={augmentsByRarity} 
            winrate={winrate}
            games={winrates.length > 0 ? winrates[0].games : 0}
            counters={counters}
            synergies={synergies}
            champByKey={champByKey}
          />
        </div>
      </div>
    </div>
  );
}
