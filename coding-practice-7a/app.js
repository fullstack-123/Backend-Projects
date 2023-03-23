const express = require("express");
const app = express();
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const dbPath = path.join(__dirname, "cricketMatchDetails.db");
let db = null;
app.use(express.json());

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log(`Server running at http://localhost:3000/`);
    });
  } catch (e) {
    console.log(`DB error: ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const convertPlayerDetails = (item) => ({
  playerId: item.player_id,
  playerName: item.player_name,
});

app.get("/players/", async (request, response) => {
  const sqlQuery = `select * from player_details;`;
  const dbResponse = await db.all(sqlQuery);
  response.send(dbResponse.map((item) => convertPlayerDetails(item)));
});

app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const sqlQuery = `select * from player_details where player_id=${playerId};`;
  const dbResponse = await db.get(sqlQuery);
  response.send(convertPlayerDetails(dbResponse));
});

app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const playerDetails = request.body;
  const { playerName } = playerDetails;

  const sqlQuery = `UPDATE player_details 
                    SET 
                    player_name='${playerName}'
                    where player_id=${playerId};`;

  await db.run(sqlQuery);
  response.send(`Player Details Updated`);
});

const convertMatchDetails=(item)=>({
     matchId:item.match_id,
     match:item.match,
     year:item.year 
});


app.get("/matches/:matchId/", async(request, response)=>{
    const {matchId} = request.params;
    const sqlQuery = `select * from match_details where match_id=${matchId};`;
    const dbResponse = await db.get(sqlQuery);
    response.send(convertMatchDetails(dbResponse));
});


app.get('/players/:playerId/matches/', async(request,response)=>{
    const {playerId} = request.params;
    const sqlQuery = `select * from match_details inner join player_match_score on match_details.match_id=player_match_score.match_id
    where player_match_score.player_id=${playerId};`;
    const dbResponse = await db.all(sqlQuery);
    response.send(dbResponse.map((item)=>(convertMatchDetails(item))));
});



app.get('/matches/:matchId/players/', async(request, response)=>{
    const {matchId} = request.params;
    const sqlQuery = `select * from player_details inner join player_match_score on player_details.player_id=player_match_score.player_id where player_match_score.match_id=${matchId};`;
    const dbResponse = await db.all(sqlQuery);
    response.send(dbResponse.map((item)=>(convertPlayerDetails(item))));
});


app.get('/players/:playerId/playerScores/', async(request, response)=>{
    const {playerId} = request.params;
    const sqlQuery = `select player_details.player_id as playerId, player_details.player_name as playerName, sum(score) as totalScore, sum(fours) as totalFours, sum(sixes) as totalSixes from player_details left join player_match_score on player_details.player_id=player_match_score.player_id where player_details.player_id=${playerId};`;
    const dbResponse = await db.get(sqlQuery);
    response.send(dbResponse);
})