const express = require("express");
const app = express();
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const dbPath = path.join(__dirname, "cricketTeam.db");
app.use(express.json());
let db = null;

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
    console.log(`DB error:${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const convertDbResponse = (item) => ({
  playerId: item.player_id,
  playerName: item.player_name,
  jerseyNumber: item.jersey_number,
  role: item.role,
});

app.get("/players/", async (request, response) => {
  const sqlQuery = `select * from cricket_team`;
  const dbResponse = await db.all(sqlQuery);
  response.send(dbResponse.map((item) => convertDbResponse(item)));
});

app.post("/players/", async (request, response) => {
  const playerDetails = request.body;
  const { playerName, jerseyNumber, role } = playerDetails;

  const sqlQuery = `
    INSERT INTO
      cricket_team (player_name, jersey_number,role)
    VALUES
      (
        '${playerName}',
         ${jerseyNumber},
        '${role}'
      );`;

  const dbResponse = await db.run(sqlQuery);
  response.send("Player Added to Team");
});

app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const sqlQuery = `select * from cricket_team where player_id=${playerId};`;
  const dbResponse = await db.get(sqlQuery);
  response.send(convertDbResponse(dbResponse));
});

app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  console.log(playerId);
  const playerDetails = request.body;
  const { playerName, jerseyNumber, role } = playerDetails;
  const sqlQuery = `UPDATE cricket_team
                     SET 
                     player_name = '${playerName}',
                     jersey_number = ${jerseyNumber},
                     role = '${role}'
                     WHERE 
                     player_id=${playerId};`;

  await db.run(sqlQuery);
  response.send("Player Details Updated");
});

app.delete("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getSqlQuery = `delete from cricket_team
                 where player_id=${playerId};`;

  await db.run(getSqlQuery);
  response.send("Player Removed");
});
