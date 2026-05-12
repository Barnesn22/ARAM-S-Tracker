import { useState, useEffect } from 'react';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-domain.com/api' 
  : 'http://localhost:3001/api';

export const useMatchAPI = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/matches`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setMatches(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getMatchParticipants = async (matchId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/matches/${matchId}/participants`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (err) {
      console.error('Error fetching participants:', err);
      return [];
    }
  };

  const getSummonerStats = async (puuid) => {
    try {
      const response = await fetch(`${API_BASE_URL}/summoners/${puuid}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Error fetching summoner stats:', err);
      return null;
    }
  };

  const getChampionStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/stats/champions`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (err) {
      console.error('Error fetching champion stats:', err);
      return [];
    }
  };

  return {
    matches,
    loading,
    error,
    fetchMatches,
    getMatchParticipants,
    getSummonerStats,
    getChampionStats,
    refetch: fetchMatches
  };
};
