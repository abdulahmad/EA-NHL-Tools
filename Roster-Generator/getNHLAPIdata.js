const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const players = [
  {firstName: 'Connor', lastName: 'McDavid'},
  {firstName: 'Sidney', lastName: 'Crosby'},
  {firstName: 'Auston', lastName: 'Matthews'},
];

const getAttributes = async (firstName, lastName) => {
    const url = `https://www.nhlratings.net/${firstName}-${lastName}`;
    const response = await axios.get(url);
    const html = response.data;
  
    // Extract NHL 23 Attributes
    const attributesStartComment = '<!-- Start Attributes -->';
    const attributesEndComment = '<!-- End attributes -->';
    const attributesHtml = html.slice(html.indexOf(attributesStartComment) + attributesStartComment.length, html.indexOf(attributesEndComment));
    const $ = cheerio.load(attributesHtml);
  
    const attributes = Object.create(null); // create a new object with no prototype
  
    $('body ul li').each((index, element) => {
      const spc = $(element).text().indexOf(' ')+1;
      const attribute = $(element).text().substring(spc).trim().replace(/\s+/g, ' ');
      const value = $(element).find('.attribute-box').text().trim();
      attributes[attribute] = value;
    });
  
    return attributes;
  };
  

const getSuperstarAbilities = async (firstName, lastName) => {
  const url = `https://www.nhlratings.net/${firstName}-${lastName}`;
  const response = await axios.get(url);
  const html = response.data;
  const $ = cheerio.load(html);

  const abilities = {};
 
  $('h4.text-white.mb-0').each((index, element) => {
    const ability = $(element).text().trim().replace(/\s+/g, ' ');
    // console.log(ability);
    abilities[ability] = true;
  });

  return abilities;
};

(async () => {
  const data = [];

  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    try {
        const attributes = await getAttributes(player.firstName, player.lastName);
        const abilities = await getSuperstarAbilities(player.firstName, player.lastName);

        const playerData = {
        firstName: player.firstName,
        lastName: player.lastName,
        ...attributes,
        ...abilities,
        };
        console.log(playerData);

        data.push(playerData);
    } catch(e) {
        console.log(`failed getting https://www.nhlratings.net/${player.firstName}-${player.lastName}`, e.response.status,e.response.statusText);
    }
  }

  const csv = generateCsv(data);
  fs.writeFileSync('players.csv', csv);

  console.log('Data saved to players.csv');
})();

  const generateCsv = (data) => {
    // console.log(data);
    let uniqueAttributeNames = new Set();
    for (playerIndex in data) {
        let player = data[playerIndex];
         // get the keys of the current object
        let keys = Object.keys(player);
        // loop through the keys and add unique ones to the Set
        for (let j = 0; j < keys.length; j++) {
            uniqueAttributeNames.add(keys[j]);
        }
    }
    
    // convert the Set back to an array or object
    let uniqueAttributeNamesArray = Array.from(uniqueAttributeNames);
    // let uniqueAttributeNamesObject = {};
    // for (let i = 0; i < uniqueAttributeNamesArray.length; i++) {
    //     uniqueAttributeNamesObject[uniqueAttributeNamesArray[i]] = null;
    // }

    const headers = uniqueAttributeNamesArray.join(',');
    const rows = data.map((player) => {
      const rowValues = [];
      for (const header of headers.split(',')) {
        // If the header matches a key in the player object, add its value to the row
        if (player.hasOwnProperty(header)) {
          rowValues.push(player[header]);
        } else {
          rowValues.push('');
        }
      }
      return rowValues.join(',');
    });
    return headers + '\n' + rows.join('\n');
  };
  
  
