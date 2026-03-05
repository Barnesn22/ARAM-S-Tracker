import React, { useState } from "react";
import ProfileStats from "../components/ProfileStats.jsx";
import MatchHistory from "../components/MatchHistory.jsx";
import { supabase } from '../supabaseClient.js'

const ProfilePage = ({ champByKey }) => {
  const [username, setUsername] = useState("");
  const [profileMatches, setProfileMatches] = useState(null);
  const [profileStats, setProfileStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!username) return;

    setLoading(true);
    setError("");
    setProfileMatches(null);
    setProfileStats(null)

    try {
        // Query the "profiles" table (replace with your table name)
        const { data: summoner, error: summonerError } = await supabase
            .from("summoners")
            .select("puuid")
            .eq("summoner_name", username)
            .single();

        if (summonerError) throw summonerError;

        const puuid = summoner.puuid;
        const { data: stats, error: statsError } = await supabase
          .from("profile_stats")
          .select("*")
          .eq("puuid", summoner.puuid)
          .single();
        
        if (statsError) throw statsError;
        setProfileStats(stats)

        const { data: playerMatches, error: matchError } = await supabase
          .from("participants")
          .select("match_id", "game_creation", "game_duration")
          .eq("puuid", puuid);

        if (matchError) throw matchError;

        const matchIds = playerMatches.map(m => m.match_id);
        const { data: allParticipants, error: participantError } = await supabase
          .from("participants")
          .select(`
            match_id,
            team_id,
            puuid,
            champ_id,
            win,
            kills,
            deaths,
            assists,
            gold_earned,
            total_damage_dealt,
            pentakills,
            games(game_creation, game_duration),
            summoners(summoner_name)
          `)
          .in("match_id", matchIds);

        if (participantError) throw participantError;

        const grouped = Object.values(
          allParticipants.reduce((acc, row) => {
            const matchId = row.match_id;

            if (!acc[matchId]) {
              acc[matchId] = {
                match_id: matchId,
                game_creation: row.games?.game_creation,
                game_duration: row.games?.game_duration,
                participants: [],
                player: null
              };
            }

            acc[matchId].participants.push(row);
            if (row.puuid === puuid) {
              acc[matchId].player = row;
            }
            return acc;
          }, {})
        );

        setProfileMatches(grouped);
    } catch (err) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
    };

  return (
    <div className="p-5 flex flex-col items-center custom-scrollbar">
      <div className="p-5">
        <h1>Search Profile</h1>

        <div className="flex mt-2 gap-5">
          <input
            type="text"
            className="w-1/1 p-2 rounded-lg border border-accent bg-secondary"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter summoner name"
          />
          <button className="!bg-black" onClick={handleSearch}>Search</button>
        </div>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500 pl-20">{error}</p>}

      <div className="w-3/4 flex">

        {profileStats && 
            <ProfileStats stats={profileStats}/>
        }

        {profileMatches && (
          <div className="p-4 flex-col w-2/3 flex rounded-lg bg-secondary border border-accent">
            <MatchHistory
              matches={profileMatches}
              champByKey={champByKey}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;