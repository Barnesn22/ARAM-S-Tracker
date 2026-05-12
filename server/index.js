const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const result = require('dotenv').config();
const { fetchSummonerInfo, fetchMatchHistory } = require('./lcuService');
console.log('Dotenv result:', result.error ? result.error : 'Success');

function transformAndLoad(matchJson, callback) {
  const gameId = String(matchJson.gameId);
  const gameCreation = new Date(matchJson.gameCreation).toISOString().slice(0, 19).replace('T', ' ');
  
  const participantRows = [];
  const summonerRows = [];
  const itemRows = [];
  const augmentRows = [];
  
  // Build identity lookup
  const identityMap = {};
  if (!matchJson.participantIdentities) {
    return callback(new Error('No participantIdentities in match data'));
  }
  
  for (const pi of matchJson.participantIdentities) {
    identityMap[pi.participantId] = pi.player;
  }
  
  // Build participant and summoner rows
  if (!matchJson.participants) {
    return callback(new Error('No participants in match data'));
  }
  
  for (const p of matchJson.participants) {
    const player = identityMap[p.participantId];
    if (!player) {
      return callback(new Error(`No player found for participantId ${p.participantId}`));
    }
    
    const puuid = player.puuid;
    const stats = p.stats;
    
    participantRows.push([
      gameId,                                    // 1
      puuid,                                      // 2
      p.championId,                            // 3
      p.teamId,                                // 4
      stats.win || false,                       // 5
      stats.kills || 0,                        // 6
      stats.deaths || 0,                       // 7
      stats.assists || 0,                      // 8
      stats.totalDamageDealtToChampions || 0, // 9
      stats.goldEarned || 0,                     // 10
      stats.damageSelfMitigated || 0,            // 11
      stats.damageDealtToObjectives || 0,       // 12
      stats.pentaKills || 0,                   // 13
      stats.magicDamageDealtToChampions || 0,   // 14
      stats.physicalDamageDealtToChampions || 0, // 15
      stats.timeCCingOthers || 0,               // 16
      stats.totalDamageTaken || 0,                // 17
      stats.totalHeal || 0,                     // 18
      stats.trueDamageDealtToChampions || 0     // 19
    ]);
    
    summonerRows.push([
      puuid,
      player.gameName,
      player.platformId,
      player.tagLine
    ]);
    
    // Add items for this participant (we'll need the participant ID after insertion)
    console.log(`Processing items for participant ${p.participantId}:`, {
      hasStats: !!p.stats,
      statsKeys: p.stats ? Object.keys(p.stats) : [],
      item0: p.stats?.item0,
      item1: p.stats?.item1,
      item2: p.stats?.item2
    });
    
    if (p.stats) {
      for (let i = 0; i <= 6; i++) {
        const itemSlot = `item${i}`;
        const itemId = p.stats[itemSlot];
        if (itemId && itemId > 0) {
          console.log(`Found item ${itemId} in slot ${itemSlot}`);
          itemRows.push([puuid, gameId, null, itemId]); // participant_id will be updated after insertion
        }
      }
    }
    
    // Add augments for this participant (ARAM specific)
    console.log(`Processing augments for participant ${p.participantId}:`, {
      hasAugments: !!p.stats?.augments,
      augments: p.stats?.augments
    });
    
    if (p.stats && p.stats.augments) {
      for (const augmentId of p.stats.augments) {
        if (augmentId && augmentId > 0) {
          console.log(`Found augment ${augmentId}`);
          augmentRows.push([puuid, gameId, null, augmentId]); // participant_id will be updated after insertion
        }
      }
    }
  }
  
  // Insert game first, then participants, then summoners
  const insertGameQuery = `
    INSERT INTO games (match_id, game_creation, game_duration, game_mode, patch)
    VALUES (?, ?, ?, ?, ?)
  `;
  
  db.query(insertGameQuery, [
    gameId,
    gameCreation,
    matchJson.gameDuration,
    matchJson.queueId,
    matchJson.gameVersion
  ], (err) => {
    if (err) {
      return callback(err);
    }
    
    // Insert summoners first (required for foreign key constraint)
    const summonerQuery = `
      INSERT INTO summoners (puuid, summoner_name, region, tagline)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      summoner_name = VALUES(summoner_name),
      region = VALUES(region),
      tagline = VALUES(tagline)
    `;
    
    let summonersProcessed = 0;
    let summonerErrors = 0;
    
    summonerRows.forEach((summonerData, index) => {
      db.query(summonerQuery, summonerData, (err) => {
        if (err) {
          console.error('Error upserting summoner:', err);
          summonerErrors++;
        }
        summonersProcessed++;
        
        // After all summoners are processed, insert participants
        if (summonersProcessed === summonerRows.length) {
          if (summonerErrors > 0) {
            // Delete the game if summoners failed
            db.query('DELETE FROM games WHERE match_id = ?', [gameId], (deleteErr) => {
              if (deleteErr) {
                console.error('Error cleaning up failed game:', deleteErr);
              }
            });
            return callback(new Error(`${summonerErrors} summoners failed to insert`));
          }
          
          // Insert participants
          const participantQuery = `
            INSERT INTO participants (
              match_id, puuid, champ_id, team_id, win, kills, deaths, assists,
              total_damage_dealt, gold_earned, damage_self_mitigated, damage_to_objectives,
              pentakills, magic_damage, physical_damage, time_CC_others, total_damage_taken,
              total_heal, true_damage_dealt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          
          let insertedCount = 0;
          let errorCount = 0;
          
          participantRows.forEach((participantData, index) => {
            db.query(participantQuery, participantData, (err) => {
              if (err) {
                console.log(err);
                errorCount++;
                // If any participant fails, delete the game to maintain consistency
                if (errorCount === 1) {
                  db.query('DELETE FROM games WHERE match_id = ?', [gameId], (deleteErr) => {
                    if (deleteErr) {
                      console.error('Error cleaning up failed game:', deleteErr);
                    }
                  });
                }
              } else {
                insertedCount++;
              }
              
              // Check if all participants are processed
              if (insertedCount + errorCount === participantRows.length) {
                if (errorCount > 0) {
                  return callback(new Error(`${errorCount} participants failed to insert`));
                }
                
                // Now insert items and augments with the participant IDs
                const insertItemsAndAugments = () => {
                  // Get the inserted participant IDs
                  const getParticipantIdsQuery = `
                    SELECT id, puuid, match_id 
                    FROM participants 
                    WHERE match_id = ?
                    ORDER BY id
                  `;
                  
                  db.query(getParticipantIdsQuery, [gameId], (err, insertedParticipants) => {
                    if (err) {
                      console.error('Error getting participant IDs:', err);
                      return callback(null, { insertedCount });
                    }
                    
                    console.log(`Processing ${itemRows.length} item rows and ${augmentRows.length} augment rows`);
                    console.log('Item rows:', itemRows);
                    console.log('Augment rows:', augmentRows);
                    console.log('Inserted participants:', insertedParticipants);
                    
                    // Update item rows with correct participant IDs
                    const updatedItemRows = [];
                    const updatedAugmentRows = [];
                    
                    itemRows.forEach(itemRow => {
                      const participant = insertedParticipants.find(p => p.puuid === itemRow[0]); // itemRow[0] is puuid
                      console.log(`Looking for participant with puuid ${itemRow[0]}, found:`, participant);
                      if (participant) {
                        updatedItemRows.push([participant.id, gameId, itemRow[3]]); // participant_id, match_id, item_id
                      }
                    });
                    
                    augmentRows.forEach(augmentRow => {
                      const participant = insertedParticipants.find(p => p.puuid === augmentRow[0]); // augmentRow[0] is puuid
                      console.log(`Looking for participant with puuid ${augmentRow[0]}, found:`, participant);
                      if (participant) {
                        updatedAugmentRows.push([participant.id, gameId, augmentRow[3]]); // participant_id, match_id, augment_id
                      }
                    });
                    
                    console.log(`Updated ${updatedItemRows.length} item rows and ${updatedAugmentRows.length} augment rows`);
                    
                    // Insert items
                    if (updatedItemRows.length > 0) {
                      const itemInsertQuery = `
                        INSERT INTO participant_items (participant_id, match_id, item_id)
                        VALUES ?
                      `;
                      
                      db.query(itemInsertQuery, [updatedItemRows], (err) => {
                        if (err) {
                          console.error('Error inserting items:', err);
                        } else {
                          console.log(`Inserted ${updatedItemRows.length} items`);
                        }
                      });
                    }
                    
                    // Insert augments
                    if (updatedAugmentRows.length > 0) {
                      const augmentInsertQuery = `
                        INSERT INTO participant_augments (participant_id, match_id, augment_id)
                        VALUES ?
                      `;
                      
                      db.query(augmentInsertQuery, [updatedAugmentRows], (err) => {
                        if (err) {
                          console.error('Error inserting augments:', err);
                        } else {
                          console.log(`Inserted ${updatedAugmentRows.length} augments`);
                        }
                      });
                    }
                    
                    callback(null, { insertedCount });
                  });
                };
                
                insertItemsAndAugments();
              }
            });
          });
        }
      });
    });
  });
}

const app = express();
app.use(cors());
app.use(express.json());

// ⚠️ use environment variables (important for Render)
const db = mysql.createConnection({
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE || 'bridge_buddy',
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  multipleStatements: false
});

// Add error handling for database connection
db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    console.error('Please check your environment variables:');
    console.error('- MYSQL_HOST:', process.env.MYSQL_HOST);
    console.error('- MYSQL_PORT:', process.env.MYSQL_PORT);
    console.error('- MYSQL_USER:', process.env.MYSQL_USER);
    console.error('- MYSQL_DATABASE:', process.env.MYSQL_DATABASE);
    console.error('- MYSQL_PASSWORD:', process.env.MYSQL_PASSWORD ? '[SET]' : '[NOT SET]');
  } else {
    console.log('Database connected successfully');
  }
});

// Handle connection errors and reconnection
db.on('error', (err) => {
  console.error('Database error:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('Attempting to reconnect to database...');
    db.connect();
  }
});

db.on('close', () => {
  console.log('Database connection closed');
});

// Helper function to ensure connection is alive
function ensureConnection(callback) {
  if (db.state === 'disconnected') {
    db.connect((err) => {
      if (err) {
        console.error('Reconnection failed:', err);
        callback(err);
      } else {
        console.log('Database reconnected successfully');
        callback(null);
      }
    });
  } else {
    callback(null);
  }
}

// API Routes
app.get('/api/matches', (req, res) => {
  const query = `
    SELECT g.*, COUNT(p.id) as participant_count
    FROM games g
    LEFT JOIN participants p ON g.match_id = p.match_id
    GROUP BY g.match_id
    ORDER BY g.game_creation DESC
    LIMIT 50
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: err });
      return;
    }
    res.json(results);
  });
});

app.get('/api/matches/:match_id/participants', (req, res) => {
  const { match_id } = req.params;
  
  const query = `
    SELECT p.*, s.summoner_name, s.region
    FROM participants p
    JOIN summoners s ON p.puuid = s.puuid
    WHERE p.match_id = ?
  `;
  
  db.query(query, [match_id], (err, results) => {
    if (err) {
      res.status(500).json({ error: err });
      return;
    }
    res.json(results);
  });
});

app.get('/api/matches/:match_id/participants/:participant_id/items', (req, res) => {
  const { match_id, participant_id } = req.params;
  
  const query = `
    SELECT item_id
    FROM participant_items
    WHERE participant_id = ?
    ORDER BY item_id
  `;
  
  db.query(query, [participant_id], (err, results) => {
    if (err) {
      res.status(500).json({ error: err });
      return;
    }
    res.json(results);
  });
});

app.get('/api/matches/:match_id/participants/:participant_id/augments', (req, res) => {
  const { match_id, participant_id } = req.params;
  
  const query = `
    SELECT augment_id
    FROM participant_augments
    WHERE participant_id = ?
    ORDER BY augment_id
  `;
  
  db.query(query, [participant_id], (err, results) => {
    if (err) {
      res.status(500).json({ error: err });
      return;
    }
    res.json(results);
  });
});

app.get('/api/matches/:match_id/participants-with-items', (req, res) => {
  const { match_id } = req.params;
  
  // First get basic participants
  const participantsQuery = `
    SELECT 
      p.*,
      s.summoner_name,
      s.region
    FROM participants p
    JOIN summoners s ON p.puuid = s.puuid
    WHERE p.match_id = ?
    ORDER BY p.team_id, p.id
  `;
  
  db.query(participantsQuery, [match_id], (err, participants) => {
    if (err) {
      console.error('Error fetching participants:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    
    console.log(`Found ${participants.length} participants for match ${match_id}`);
    
    // If no participants, return empty array
    if (participants.length === 0) {
      return res.json([]);
    }
    
    // Get items for all participants
    const itemsQuery = `
      SELECT participant_id, item_id
      FROM participant_items
      WHERE id IN (${participants.map(() => '?').join(',')})
      AND item_id > 0
      ORDER BY participant_id, item_id
    `;
    console.log(itemsQuery)
    
    const participantIds = participants.map(p => p.id);
    console.log(participantIds)
    db.query(itemsQuery, participantIds, (err, items) => {
      if (err) {
        console.error('Error fetching items:', err);
        // Continue without items rather than failing completely
        items = [];
      }
      
      console.log(`Found ${items.length} items for ${participantIds.length} participants`);
      
      // Get augments for all participants
      const augmentsQuery = `
        SELECT participant_id, augment_id
        FROM participant_augments
        WHERE participant_id IN (${participants.map(() => '?').join(',')})
        AND augment_id > 0
        ORDER BY participant_id, augment_id
      `;
      
      db.query(augmentsQuery, participantIds, (err, augments) => {
        if (err) {
          console.error('Error fetching augments:', err);
          // Continue without augments rather than failing completely
          augments = [];
        }
        
        console.log(`Found ${augments.length} augments for ${participantIds.length} participants`);
        
        // Group items and augments by participant
        const itemsByParticipant = {};
        const augmentsByParticipant = {};
        
        items.forEach(item => {
          if (!itemsByParticipant[item.participant_id]) {
            itemsByParticipant[item.participant_id] = [];
          }
          itemsByParticipant[item.participant_id].push(item.item_id);
        });
        
        augments.forEach(augment => {
          if (!augmentsByParticipant[augment.participant_id]) {
            augmentsByParticipant[augment.participant_id] = [];
          }
          augmentsByParticipant[augment.participant_id].push(augment.augment_id);
        });
        
        // Combine data
        const results = participants.map(participant => {
          const participantItems = itemsByParticipant[participant.id] || [];
          const participantAugments = augmentsByParticipant[participant.id] || [];
          
          console.log(`Participant ${participant.id} (${participant.summoner_name}): ${participantItems.length} items, ${participantAugments.length} augments`);
          
          return {
            ...participant,
            items: participantItems,
            augments: participantAugments
          };
        });
        
        console.log(`Returning ${results.length} participants with items and augments for match ${match_id}`);
        res.json(results);
      });
    });
  });
});

app.get('/api/summoners/:puuid', (req, res) => {
  const { puuid } = req.params;
  
  const query = `
    SELECT s.*, COUNT(p.id) as total_matches
    FROM summoners s
    LEFT JOIN participants p ON s.puuid = p.puuid
    WHERE s.puuid = ?
    GROUP BY s.puuid
  `;
  
  db.query(query, [puuid], (err, results) => {
    if (err) {
      res.status(500).json({ error: err });
      return;
    }
    res.json(results[0] || null);
  });
});

app.get('/api/summoners/:puuid/games', (req, res) => {
  const { puuid } = req.params;
  
  const query = `
    SELECT 
      g.*,
      p.win,
      p.kills,
      p.deaths,
      p.assists,
      p.champ_id,
      p.gold_earned,
      p.total_damage_dealt,
      p.pentakills,
      p.team_id
    FROM games g
    JOIN participants p ON g.match_id = p.match_id
    WHERE p.puuid = ?
    ORDER BY g.game_creation DESC
  `;
  
  db.query(query, [puuid], (err, results) => {
    if (err) {
      console.error('Error fetching summoner games:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(results);
  });
});

app.get('/api/summoners/:puuid/games/:match_id/participants', (req, res) => {
  const { puuid, match_id } = req.params;
  
  const query = `
    SELECT 
      p.*,
      s.summoner_name,
      s.region
    FROM participants p
    JOIN summoners s ON p.puuid = s.puuid
    WHERE p.match_id = ?
    ORDER BY p.team_id, p.id
  `;
  
  db.query(query, [match_id], (err, results) => {
    if (err) {
      console.error('Error fetching match participants:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(results);
  });
});

app.post('/api/summoners/ingest', async (req, res) => {
  const { gameName, tagLine } = req.body;
  
  if (!gameName || !tagLine) {
    return res.status(400).json({ error: 'gameName and tagLine are required' });
  }

  try {
    // Fetch summoner info from LCU
    const summoner = await fetchSummonerInfo(gameName, tagLine);
    const puuid = summoner.puuid;
    
    // Check if summoner exists in database, insert if not
    const checkSummonerQuery = 'SELECT * FROM summoners WHERE puuid = ?';
    db.query(checkSummonerQuery, [puuid], async (err, summonerResults) => {
      if (err) {
        console.error('Error checking summoner:', err);
        return res.status(500).json({ error: err.message });
      }

      if (summonerResults.length === 0) {
        const insertSummonerQuery = `
          INSERT INTO summoners (puuid, summoner_name, region, tagline) 
          VALUES (?, ?, ?, ?)
        `;
        db.query(insertSummonerQuery, [puuid, gameName, 'NA1', tagLine], (err) => {
          if (err) {
            console.error('Error inserting summoner:', err);
          }
        });
      }

      // Fetch match history from LCU (last 100 games)
      const matchHistory = await fetchMatchHistory(puuid, 100);
      const games = matchHistory.games.games.filter(game => game.gameMode === "KIWI");
      
      console.log(`Found ${games.length} KIWI games to ingest`);

      let ingestedCount = 0;
      let skippedCount = 0;

      // Process each game by fetching full match details
      let processedCount = 0;
      
      for (const game of games) {
        if (game.queueId !== 2400) {
          continue;
        }

        try {
          // Check if game already exists
          const checkGameQuery = 'SELECT match_id FROM games WHERE match_id = ?';
          
          db.query(checkGameQuery, [game.gameId], (err, gameResults) => {
            
            if (err) {
              console.error('Error checking game:', err);
              processedCount++;
              return;
            }

            if (gameResults.length > 0) {
              skippedCount++;
              processedCount++;
              return;
            }

            // Fetch full match details and process
            const { fetchMatchDetails } = require('./lcuService');
            fetchMatchDetails(game.gameId)
              .then(matchJson => {
                transformAndLoad(matchJson, (err, result) => {
                  if (err) {
                    console.error(`Error processing game ${game.gameId}:`, err);
                  } else {
                    ingestedCount++;
                    console.log(`Successfully ingested game ${game.gameId}`);
                  }
                  processedCount++;
                });
              })
              .catch(err => {
                console.error('Error fetching match details:', game.gameId, err);
                processedCount++;
              });
          });
        } catch (gameError) {
          console.error('Error processing game:', game.gameId, gameError);
          processedCount++;
        }
      }

      // Wait for all games to be processed
      const checkCompletion = () => {
        if (processedCount < games.length) {
          console.log(`Waiting for completion... ${processedCount}/${games.length} processed`);
          setTimeout(checkCompletion, 1000);
        } else {
          console.log('All games processed, sending response');
          res.json({
            message: 'Ingestion completed',
            gamesFound: games.length,
            gamesIngested: ingestedCount,
            gamesSkipped: skippedCount
          });
        }
      };
      
      setTimeout(checkCompletion, 1000);
    });
  } catch (error) {
    console.error('Error during ingestion:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stats/champions', (req, res) => {
  const query = 'SELECT * FROM champ_stats ORDER BY games DESC';
  
  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: err });
      return;
    }
    res.json(results);
  });
});

// Endpoint to refresh champ_stats table
app.post('/api/stats/champions/refresh', (req, res) => {
  const truncateQuery = 'TRUNCATE TABLE champ_stats';
  const insertQuery = `
    INSERT INTO champ_stats
    SELECT 
      champ_id,
      COUNT(*) AS games,
      AVG(win) AS winrate,
      COUNT(*) * 1.0 / SUM(COUNT(*)) OVER () AS playrate
    FROM participants
    GROUP BY champ_id
    ORDER BY games DESC;
  `;
  
  db.query(truncateQuery, (err) => {
    if (err) {
      res.status(500).json({ error: err });
      return;
    }
    
    db.query(insertQuery, (err) => {
      if (err) {
        res.status(500).json({ error: err });
        return;
      }
      res.json({ message: 'Champion stats refreshed successfully' });
    });
  });
});


app.get('/api/stats/champions/:champ_id', (req, res) => {
  const { champ_id } = req.params;
  
  const query = `
    SELECT champ_id,
           games,
           winrate,
           playrate
    FROM champ_stats
    WHERE champ_id = ?
  `;
  
  db.query(query, [champ_id], (err, results) => {
    if (err) {
      console.error('Champion stats query error:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(results[0] || null);
  });
});

app.get('/api/stats/champions/:champ_id/items', (req, res) => {
  const { champ_id } = req.params;
  
  const query = `
    SELECT item_id, games_played, winrate
    FROM champ_item_stats
    WHERE champ_id = ?
    ORDER BY games_played DESC
  `;
  
  db.query(query, [champ_id], (err, results) => {
    if (err) {
      res.status(500).json({ error: err });
      return;
    }
    res.json(results);
  });
});

app.get('/api/stats/champions/:champ_id/augments', (req, res) => {
  const { champ_id } = req.params;
  
  const query = `
    SELECT augment_id, games_played, winrate
    FROM champ_augment_stats
    WHERE champ_id = ?
    ORDER BY games_played DESC
  `;
  
  db.query(query, [champ_id], (err, results) => {
    if (err) {
      res.status(500).json({ error: err });
      return;
    }
    res.json(results);
  });
});

app.get('/api/stats/champions/:champ_id/counters', (req, res) => {
  const { champ_id } = req.params;
  
  const query = `
    SELECT 
      p2.champ_id as opponent_champ_id,
      COUNT(*) as games_together,
      AVG(p1.win) as target_champ_winrate,
      COUNT(*) * 1.0 / SUM(COUNT(*)) OVER () as playrate
    FROM participants p1
    JOIN participants p2 ON p1.match_id = p2.match_id 
      AND p1.team_id != p2.team_id
    WHERE p1.champ_id = ?
      AND p2.champ_id != ?
    GROUP BY p2.champ_id
    HAVING games_together >= 10
    ORDER BY target_champ_winrate ASC, games_together DESC
    LIMIT 20
  `;
  
  db.query(query, [champ_id, champ_id], (err, results) => {
    if (err) {
      console.error('Counters query error:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(results);
  });
});

app.get('/api/stats/champions/:champ_id/synergies', (req, res) => {
  const { champ_id } = req.params;
  
  const query = `
    SELECT 
      p2.champ_id as ally_champ_id,
      COUNT(*) as games_together,
      AVG(p1.win) as target_champ_winrate,
      COUNT(*) * 1.0 / SUM(COUNT(*)) OVER () as playrate
    FROM participants p1
    JOIN participants p2 ON p1.match_id = p2.match_id 
      AND p1.team_id = p2.team_id
      AND p1.id != p2.id
    WHERE p1.champ_id = ?
      AND p2.champ_id != ?
    GROUP BY p2.champ_id
    HAVING games_together >= 10
    ORDER BY target_champ_winrate DESC, games_together DESC
    LIMIT 20
  `;
  
  db.query(query, [champ_id, champ_id], (err, results) => {
    if (err) {
      console.error('Synergies query error:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(results);
  });
});

// Get all champions for filtering
app.get('/api/champions', (req, res) => {
  const query = 'SELECT champ_id FROM champ_stats';
  
  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: err });
      return;
    }
    res.json(results);
  });
});

// Get champion mapping (name to ID) for text search
app.get('/api/champion-mapping', (req, res) => {
  // This would ideally connect to a champions table with names
  // For now, we'll return the champ_stats data and handle name mapping on client side
  const query = 'SELECT champ_id FROM champ_stats ORDER BY champ_id';
  
  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: err });
      return;
    }
    res.json(results);
  });
});

// Get all items for filtering
app.get('/api/items', (req, res) => {
  const query = 'SELECT DISTINCT item_id FROM participant_items WHERE item_id > 0 ORDER BY item_id';
  
  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: err });
      return;
    }
    res.json(results);
  });
});

// Get all augments for filtering
app.get('/api/augments', (req, res) => {
  const query = 'SELECT DISTINCT augment_id FROM participant_augments WHERE augment_id > 0 ORDER BY augment_id';
  
  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: err });
      return;
    }
    res.json(results);
  });
});

// Get item stats with filters
app.get('/api/explorer/items/:champId', (req, res) => {
  const { champId } = req.params;
  const {
    champions,
    items,
    augments,
    minGames = 0
  } = req.query;

  console.log('champId', champId)
  console.log('champions', champions)
  console.log('items', items)
  console.log('augments', augments)
  console.log('minGames', minGames)

  const champFilters = champions
    ? (Array.isArray(champions) ? champions : [champions])
    : [];

  const itemFilters = items
    ? (Array.isArray(items) ? items : [items])
    : [];

  const augmentFilters = augments
    ? (Array.isArray(augments) ? augments : [augments])
    : [];

  let whereClauses = ['p.champ_id = ?'];
  let params = [champId];

  // Require ALL selected items (using IN for AND logic)
  if (itemFilters.length > 0) {
    whereClauses.push(`
      EXISTS (
        SELECT 1
          FROM participant_items pi_req
          WHERE pi_req.participant_id = p.id
          AND pi_req.item_id IN (${itemFilters.map(() => '?').join(',')})
      )
    `);
    params.push(...itemFilters);
  }

  // Require ALL selected augments (using IN for AND logic)
  if (augmentFilters.length > 0) {
    whereClauses.push(`
      EXISTS (
        SELECT 1
          FROM participant_augments pa_req
          WHERE pa_req.participant_id = p.id
          AND pa_req.augment_id IN (${augmentFilters.map(() => '?').join(',')})
      )
    `);
    params.push(...augmentFilters);
  }

  // If other champions are filtered, find games where this champion plays with them
  if (champFilters.length > 0) {
    whereClauses.push(`
      EXISTS (
        SELECT 1
          FROM participants p2
          WHERE p2.match_id = p.match_id
          AND p2.team_id = p.team_id
          AND p2.champ_id IN (${champFilters.map(() => '?').join(',')})
      )
    `);
    params.push(...champFilters);
  }

  
  const query = `
    SELECT
      pit2.item_id AS \`key\`,
      COUNT(DISTINCT p.id) AS games,
      AVG(p.win) AS winrate
    FROM participants p
    JOIN participant_items pit2
      ON pit2.participant_id = p.id
    WHERE ${whereClauses.join(' AND ')}
    GROUP BY pit2.item_id
    HAVING games >= ?
    ORDER BY games DESC
  `;

  params.push(Number(minGames));

  console.log(query);
  console.log(params);

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Explorer items query error:', err);
      return res.status(500).json({ error: err.message });
    }

    res.json(results);
  });
});

// Get total games count with filters
app.get('/api/explorer/games/count', (req, res) => {
  const { champions, items, augments } = req.query;
  
  // Convert query parameters to arrays properly
  const champNames = champions ? (Array.isArray(champions) ? champions : [champions]) : [];
  const itemNames = items ? (Array.isArray(items) ? items : [items]) : [];
  const augmentIds = augments ? (Array.isArray(augments) ? augments : [augments]) : [];
  
  let baseQuery = `
    SELECT COUNT(DISTINCT p.match_id) as total_games
    FROM participants p
  `;
  let whereConditions = [];
  let joins = [];
  let params = [];
  
  // Build WHERE conditions and JOINs to find matches with filtered criteria
  if (champNames.length > 0) {
    whereConditions.push(`p.champ_id IN (${champNames.map(() => '?').join(',')})`);
    params.push(...champNames);
  }
  
  if (itemNames.length > 0) {
    joins.push(`JOIN participant_items pi ON p.id = pi.participant_id`);
    whereConditions.push(`pi.item_id IN (${itemNames.map(() => '?').join(',')})`);
    params.push(...itemNames);
  }
  
  if (augmentIds.length > 0) {
    joins.push(`JOIN participant_augments pa ON p.id = pa.participant_id`);
    whereConditions.push(`pa.augment_id IN (${augmentIds.map(() => '?').join(',')})`);
    params.push(...augmentIds);
  }
  
  const joinClause = joins.length > 0 ? joins.join(' ') : '';
  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
  
  const query = `
    ${baseQuery}
    ${joinClause}
    ${whereClause}
  `;
  
  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Games count query error:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(results[0] || { total_games: 0 });
  });
});

// Get augment stats with filters
app.get('/api/explorer/augments/:champId', (req, res) => {
  const { champId } = req.params;
  const {
    items,
    augments,
    minGames = 0
  } = req.query;

  console.log('champId', champId)
  console.log('items', items)
  console.log('augments', augments)
  console.log('minGames', minGames)

  const itemFilters = items
    ? (Array.isArray(items) ? items : [items])
    : [];

  const augmentFilters = augments
    ? (Array.isArray(augments) ? augments : [augments])
    : [];

  let whereClauses = ['p.champ_id = ?'];
  let params = [champId];

  // Require ALL selected items (using IN for AND logic)
  if (itemFilters.length > 0) {
    whereClauses.push(`
      EXISTS (
        SELECT 1
          FROM participant_items pi_req
          WHERE pi_req.participant_id = p.id
          AND pi_req.item_id IN (${itemFilters.map(() => '?').join(',')})
      )
    `);
    params.push(...itemFilters);
  }

  // Require ALL selected augments (using IN for AND logic)
  if (augmentFilters.length > 0) {
    whereClauses.push(`
      EXISTS (
        SELECT 1
          FROM participant_augments pa_req
          WHERE pa_req.participant_id = p.id
          AND pa_req.augment_id IN (${augmentFilters.map(() => '?').join(',')})
      )
    `);
    params.push(...augmentFilters);
  }

  const query = `
    SELECT
      pa.augment_id AS \`key\`,
      COUNT(DISTINCT p.id) AS games,
      AVG(p.win) AS winrate
    FROM participants p
    JOIN participant_augments pa ON p.id = pa.participant_id
    WHERE ${whereClauses.join(' AND ')}
    GROUP BY pa.augment_id
    HAVING games >= ?
    ORDER BY games DESC
  `;

  params.push(Number(minGames));

  console.log('Final augment query:', query);
  console.log('Final augment params:', params);

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Explorer augments query error:', err);
      return res.status(500).json({ error: err.message });
    }
    console.log('Augment query results:', results);
    console.log('Number of results:', results ? results.length : 0);
    res.json(results);
  });
});

// Advanced data explorer endpoint with multiple filters
app.get('/api/explorer', (req, res) => {
  console.log("fetching explorer data")
  const { champions, items, augments, minGames = 0 } = req.query;
  
  // Convert query parameters to arrays properly
  const champNames = champions ? (Array.isArray(champions) ? champions : [champions]) : [];
  const itemNames = items ? (Array.isArray(items) ? items : [items]) : [];
  const augmentIds = augments ? (Array.isArray(augments) ? augments : [augments]) : [];
  
  let baseQuery = `
    SELECT DISTINCT p.match_id, p.team_id
    FROM participants p
  `;
  let whereConditions = [];
  let joins = [];
  let params = [];
  
  // Build WHERE conditions and JOINs to find matches with filtered criteria
  if (champNames.length > 0) {
    whereConditions.push(`p.champ_id IN (${champNames.map(() => '?').join(',')})`);
    params.push(...champNames);
  }
  
  if (itemNames.length > 0) {
    joins.push(`JOIN participant_items pi ON p.id = pi.participant_id`);
    whereConditions.push(`pi.item_id IN (${itemNames.map(() => '?').join(',')})`);
    params.push(...itemNames);
  }
  
  if (augmentIds.length > 0) {
    joins.push(`JOIN participant_augments pa ON p.id = pa.participant_id`);
    whereConditions.push(`pa.augment_id IN (${augmentIds.map(() => '?').join(',')})`);
    params.push(...augmentIds);
  }
  
  const joinClause = joins.length > 0 ? joins.join(' ') : '';
  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
  
  baseQuery = `
    SELECT DISTINCT p.match_id, p.team_id
    FROM participants p
    ${joinClause}
    ${whereClause}
  `;
  
  // Final query to get teammates from those matches
  const query = `
    SELECT 
      p.champ_id as \`key\`,
      COUNT(DISTINCT p.match_id) as games,
      AVG(p.win) as winrate
    FROM participants p
    JOIN (${baseQuery}) filtered_matches ON p.match_id = filtered_matches.match_id 
      AND p.team_id = filtered_matches.team_id
    ${champNames.length > 0 ? `WHERE p.champ_id NOT IN (${champNames.map(() => '?').join(',')})` : ''}
    GROUP BY p.champ_id
    HAVING games >= ?
    ORDER BY games DESC
  `;
  
  if (champNames.length > 0) {
    params.push(...champNames);
  }
  params.push(minGames);
  
  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Explorer query error:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(results);
  });
});

app.get('/', (req, res) => {
  res.send('ARAM Tracker API is running');
});

// Function to refresh champ_stats table
function refreshChampStats() {
  const truncateQuery = 'TRUNCATE TABLE champ_stats';
  const insertQuery = `
    INSERT INTO champ_stats
    SELECT 
      champ_id,
      COUNT(*) AS games,
      AVG(win) AS winrate,
      COUNT(*) * 1.0 / SUM(COUNT(*)) OVER () AS playrate
    FROM participants
    GROUP BY champ_id
    ORDER BY games DESC
  `;
  
  db.query(truncateQuery, (err) => {
    if (err) {
      console.error('Error truncating champ_stats:', err);
      return;
    }
    
    db.query(insertQuery, (err) => {
      if (err) {
        console.error('Error inserting champ_stats:', err);
        return;
      }
      console.log('Champion stats refreshed successfully');
    });
  });
}

// Function to refresh champ_item_stats table
function refreshChampItemStats() {
  const dropTempQuery = 'DROP TABLE IF EXISTS champ_item_stats_temp';
  const createTempQuery = `
    CREATE TABLE champ_item_stats_temp AS
    SELECT 
        p.champ_id,
        pi.item_id,
        COUNT(*) AS games_played,
        AVG(p.win) AS winrate,
        COUNT(*) * 1.0 / SUM(COUNT(*)) OVER (PARTITION BY p.champ_id) AS playrate
    FROM participants p
    JOIN participant_items pi ON p.id = pi.participant_id
    WHERE pi.item_id > 0
    GROUP BY p.champ_id, pi.item_id;
  `;
  
  const dropQuery = 'DROP TABLE IF EXISTS champ_item_stats';
  const renameQuery = 'RENAME TABLE champ_item_stats_temp TO champ_item_stats';
  
  db.query(dropTempQuery, (err) => {
    if (err) {
      console.error('Error dropping champ_item_stats_temp:', err);
      return;
    }
    
    db.query({sql: createTempQuery, timeout: 60000}, (err) => {
      if (err) {
        console.error('Error creating champ_item_stats_temp:', err);
        return;
      }
      
      db.query(dropQuery, (err) => {
        if (err) {
          console.error('Error dropping champ_item_stats:', err);
          return;
        }
        
        db.query(renameQuery, (err) => {
          if (err) {
            console.error('Error renaming champ_item_stats:', err);
            return;
          }
          console.log('Champion item stats refreshed successfully');
        });
      });
    });
  });
}

// Function to refresh champ_augment_stats table
function refreshChampAugmentStats() {
  const dropTempQuery = 'DROP TABLE IF EXISTS champ_augment_stats_temp';
  const createTempQuery = `
    CREATE TABLE champ_augment_stats_temp AS
    SELECT 
        p.champ_id,
        pa.augment_id,
        COUNT(*) AS games_played,
        AVG(p.win) AS winrate,
        COUNT(*) * 1.0 / SUM(COUNT(*)) OVER (PARTITION BY p.champ_id) AS playrate
    FROM participants p
    JOIN participant_augments pa ON p.id = pa.participant_id
    WHERE pa.augment_id > 0
    GROUP BY p.champ_id, pa.augment_id;
  `;
  
  const dropQuery = 'DROP TABLE IF EXISTS champ_augment_stats';
  const renameQuery = 'RENAME TABLE champ_augment_stats_temp TO champ_augment_stats';
  
  db.query(dropTempQuery, (err) => {
    if (err) {
      console.error('Error dropping champ_augment_stats_temp:', err);
      return;
    }
    
    db.query({sql: createTempQuery, timeout: 60000}, (err) => {
      if (err) {
        console.error('Error creating champ_augment_stats_temp:', err);
        return;
      }
      
      db.query(dropQuery, (err) => {
        if (err) {
          console.error('Error dropping champ_augment_stats:', err);
          return;
        }
        
        db.query(renameQuery, (err) => {
          if (err) {
            console.error('Error renaming champ_augment_stats:', err);
            return;
          }
          console.log('Champion augment stats refreshed successfully');
        });
      });
    });
  });
}

// Refresh champ_stats every 5 minutes (300000 ms)
setInterval(refreshChampStats, 300000);

// Refresh champ_item_stats every 30 minutes (1800000 ms) - less frequent due to longer processing time
setInterval(refreshChampItemStats, 1800000);

// Refresh champ_augment_stats every 30 minutes (1800000 ms) - less frequent due to longer processing time
setInterval(refreshChampAugmentStats, 1800000);

// Initial refresh on server start
//refreshChampStats();
//refreshChampItemStats();
//refreshChampAugmentStats();

app.listen(process.env.PORT || 3001, () => {
  console.log('Server running on port ' + (process.env.PORT || 3001));
});