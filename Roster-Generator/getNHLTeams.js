const axios = require('axios');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// Make a GET request to the NHL API
axios.get('https://statsapi.web.nhl.com/api/v1/teams/')
  .then(response => {
    // Extract the relevant data from the API response
    const teams = response.data.teams.map(team => ({
      id: team.id,
      name: team.name,
      abbreviation: team.abbreviation,
      conference: team.conference.name,
      division: team.division.name,
      venue: team.venue.name,
      city: team.venue.city,
      timeZone: team.venue.timeZone.id
    }));

    // Write the data to a CSV file
    const csvWriter = createCsvWriter({
      path: 'teams.csv',
      header: [
        {id: 'id', title: 'ID'},
        {id: 'name', title: 'Name'},
        {id: 'abbreviation', title: 'Abbreviation'},
        {id: 'conference', title: 'Conference'},
        {id: 'division', title: 'Division'},
        {id: 'venue', title: 'Venue'},
        {id: 'city', title: 'City'},
        {id: 'timeZone', title: 'Time Zone'}
      ]
    });
    csvWriter.writeRecords(teams)
      .then(() => console.log('CSV file successfully written'))
      .catch(error => console.log('Error writing CSV file:', error));
  })
  .catch(error => console.log('Error fetching data:', error));
