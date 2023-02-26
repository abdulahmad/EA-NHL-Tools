const axios = require('axios');
const fs = require('fs');
const { parse } = require('json2csv');

// Set base URL
const baseURL = 'https://statsapi.web.nhl.com/api/v1/';

// Define function to fetch data from the API
async function fetchData(endpoint) {
  console.log('fetchData',endpoint);
  try {
    const response = await axios.get(`${baseURL}${endpoint}`);
    return response.data;
  } catch (error) {
    console.error(error);
  }
}

// Define function to get all players
async function getAllPlayers() {
    console.log('getAllPlayers');
  const players = await fetchData('teams?expand=team.roster');
  const allPlayers = [];
  players.teams.forEach(team => {
    team.roster.roster.forEach(player => {
      allPlayers.push(player);
    });
  });
  return allPlayers;
}

// Define function to get player stats for the 2022-2023 season
async function getPlayerStats(playerId) {
  console.log('getPlayerStats', playerId);
  const stats = await fetchData(`people/${playerId}/stats?stats=statsSingleSeason&season=20222023`);
  if (stats.stats.length === 0) {
    return null;
  }
  const stat = stats.stats[0];
  if (!stat.splits || stat.splits.length === 0) {
    return null;
  }
  return stat.splits[0].stat;
}

// Define main function to get all player information and save to CSV
async function getAllPlayerInformation() {
  console.log('getAllPlayerInformation');
  const players = await getAllPlayers();
  const allPlayerInfo = [];
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const playerInfo = await fetchData(`people/${player.person.id}`);
    const playerStats = await getPlayerStats(player.person.id);
    allPlayerInfo.push({
      id: player.person.id,
      fullName: player.person.fullName,
      ...playerInfo.people[0],
      ...playerStats
    });
  }
  const csv = parse(allPlayerInfo);
  fs.writeFileSync('nhl-players.csv', csv);
}

// Call main function
getAllPlayerInformation();
