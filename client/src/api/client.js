// API Client for ARAM Tracker Backend
class ApiClient {
  constructor(baseURL = null) {
    // Try to get environment variable from Electron, fallback to localhost for development
    const envURL = window.electronAPI?.getEnvVar?.('REACT_APP_API_URL');
    this.baseURL = baseURL || envURL || 'http://localhost:3001';
    console.log(envURL)
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Match related endpoints
  async getMatches(limit = 50) {
    return this.request(`/api/matches?limit=${limit}`);
  }

  async getMatchParticipants(matchId) {
    return this.request(`/api/matches/${matchId}/participants`);
  }

  // Summoner related endpoints
  async getSummoner(puuid) {
    return this.request(`/api/summoners/${puuid}`);
  }

  async getSummonerGames(puuid) {
    return this.request(`/api/summoners/${puuid}/games`);
  }

  async getMatchParticipantsByMatchId(matchId) {
    return this.request(`/api/summoners/null/games/${matchId}/participants`);
  }

  async getParticipantItems(matchId, participantId) {
    return this.request(`/api/matches/${matchId}/participants/${participantId}/items`);
  }

  async getParticipantAugments(matchId, participantId) {
    return this.request(`/api/matches/${matchId}/participants/${participantId}/augments`);
  }

  async getMatchParticipantsWithItems(matchId) {
    return this.request(`/api/matches/${matchId}/participants-with-items`);
  }

  async ingestSummonerData(gameName, tagLine) {
    return this.request('/api/summoners/ingest', {
      method: 'POST',
      body: JSON.stringify({ gameName, tagLine })
    });
  }

  // Stats related endpoints
  async getChampionStats() {
    return this.request('/api/stats/champions');
  }

  async getChampionStatsById(champId) {
    return this.request(`/api/stats/champions/${champId}`);
  }

  async getChampionItemStats(champId) {
    return this.request(`/api/stats/champions/${champId}/items`);
  }

  async getChampionAugmentStats(champId) {
    return this.request(`/api/stats/champions/${champId}/augments`);
  }

  async getChampionCounters(champId) {
    return this.request(`/api/stats/champions/${champId}/counters`);
  }

  async getChampionSynergies(champId) {
    return this.request(`/api/stats/champions/${champId}/synergies`);
  }

  // Data Explorer endpoints
  async getChampions() {
    return this.request('/api/champions');
  }

  async getItems() {
    return this.request('/api/items');
  }

  async getAugments() {
    return this.request('/api/augments');
  }

  async getExplorerData(filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.champions && filters.champions.length > 0) {
      filters.champions.forEach(champ => params.append('champions', champ));
    }
    if (filters.items && filters.items.length > 0) {
      filters.items.forEach(item => params.append('items', item));
    }
    if (filters.augments && filters.augments.length > 0) {
      filters.augments.forEach(augment => params.append('augments', augment));
    }
    if (filters.minGames) {
      params.append('minGames', filters.minGames);
    }
    
    return this.request(`/api/explorer?${params.toString()}`);
  }

  async getExplorerItems(champId, filters = {}) {
    const params = new URLSearchParams();
    
    // Only pass item and augment filters, not champion filters
    // since champId represents the player's champion
    if (filters.items && filters.items.length > 0) {
      filters.items.forEach(item => params.append('items', item));
    }
    if (filters.augments && filters.augments.length > 0) {
      filters.augments.forEach(augment => params.append('augments', augment));
    }
    if (filters.minGames) {
      params.append('minGames', filters.minGames);
    }
    
    const queryString = params.toString();
    return this.request(`/api/explorer/items/${champId}${queryString ? '?' + queryString : ''}`);
  }

  async getExplorerAugments(champId, filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.champions && filters.champions.length > 0) {
      filters.champions.forEach(champ => params.append('champions', champ));
    }
    if (filters.items && filters.items.length > 0) {
      filters.items.forEach(item => params.append('items', item));
    }
    if (filters.augments && filters.augments.length > 0) {
      filters.augments.forEach(augment => params.append('augments', augment));
    }
    if (filters.minGames) {
      params.append('minGames', filters.minGames);
    }
    
    const queryString = params.toString();
    return this.request(`/api/explorer/augments/${champId}${queryString ? '?' + queryString : ''}`);
  }

  async getExplorerGamesCount(filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.champions && filters.champions.length > 0) {
      filters.champions.forEach(champ => params.append('champions', champ));
    }
    if (filters.items && filters.items.length > 0) {
      filters.items.forEach(item => params.append('items', item));
    }
    if (filters.augments && filters.augments.length > 0) {
      filters.augments.forEach(augment => params.append('augments', augment));
    }
    
    const queryString = params.toString();
    return this.request(`/api/explorer/games/count${queryString ? '?' + queryString : ''}`);
  }

  // Health check
  async healthCheck() {
    return this.request('/');
  }
}

// Create and export singleton instance
const apiClient = new ApiClient();

export default apiClient;
