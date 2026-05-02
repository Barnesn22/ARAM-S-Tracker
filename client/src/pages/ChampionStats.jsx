import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import ChampionStatsView from "../components/ChampionStatsView";

export default function ChampionStats({ champions, champByKey, augmentMap, itemMap }) {
  const { championId } = useParams();
  const [champion, setChampion] = useState(null);
  const [itemWR, setItemWR] = useState([]);
  const [augmentWR, setAugmentWR] = useState([]);
  const [augmentsByRarity, setAugmentsByRarity] = useState([]);
  const [winrates, setWinrates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const champ = champByKey[championId] || champions.find(c => c.id === championId);
    setChampion(champ);
  }, [championId, champions, champByKey]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!champion) return;
      
      setLoading(true);

      // Fetch champion winrates
      const { data: wrData, error: wrError } = await supabase
        .from('champion_stats')
        .select('*')
        .eq('champ_id', champion.key);

      if (wrError) {
        console.error('Error fetching champion stats:', wrError);
      } else {
        setWinrates(wrData);
      }

      // Fetch item winrates for this champion
      const { data: itemData, error: itemError } = await supabase
        .from("champ_item_winrates")
        .select("*")
        .eq("champ_id", champion.key)
        .gt("games", 25)
        .order('winrate', { ascending: false });

      if (itemError) {
        console.error("Error fetching item stats:", itemError);
      } else {
        const enrichedItems = itemData.map(i => ({
          ...i,
          meta: itemMap[i.item_id]
        }));

        const fullItems = enrichedItems.filter(item => {
          const meta = item.meta;
          if (!meta || item.item_id === 2052) return false;
          const isBoots = meta.tags?.includes("Boots") || meta.tags?.includes("Boot");
          const isFinalItem = !meta.into || meta.into.length === 0;
          return !isBoots && isFinalItem;
        });

        setItemWR(fullItems);
      }

      // Fetch augment winrates for this champion
      const { data: augmentData, error: augmentError } = await supabase
        .from("champ_augment_winrates")
        .select("*")
        .eq("champ_id", champion.key)
        .gt("games", 25)
        .order('winrate', { ascending: false });

      if (augmentError) {
        console.error("Error fetching augment stats:", augmentError);
      } else {
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
      }

      setLoading(false);
    };

    fetchStats();
  }, [champion, itemMap, augmentMap]);

  if (!champion) {
    return <div className="p-5 text-white">Champion not found</div>;
  }

  if (loading) {
    return <div className="p-5 text-white">Loading champion stats...</div>;
  }

  const winrate = winrates.length > 0 ? winrates[0].winrate : 0;

  return (
    <div className="flex flex-col h-full p-5 items-center">
      <div className="w-full max-w-6xl flex-1">
        <ChampionStatsView 
          champ={champion}
          itemWR={itemWR}
          augmentsByRarity={augmentsByRarity} 
          winrate={winrate}
        />
      </div>
    </div>
  );
}
