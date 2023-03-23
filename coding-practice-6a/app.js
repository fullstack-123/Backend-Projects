const express = require("express");
const app = express();
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const dbPath = path.join(__dirname, "covid19India.db");
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

const convertToDbResponse = (item) => ({
  stateId: item.state_id,
  stateName: item.state_name,
  population: item.population,
});

const convertDistrictResponse = (item) => ({
  districtName: item.district_name,
  stateId: item.state_id,
  cases: item.cases,
  cured: item.cured,
  active: item.active,
  deaths: item.deaths,
});

app.get("/states/", async (request, response) => {
  const sqlQuery = `select * from state`;
  const dbResponse = await db.all(sqlQuery);
  response.send(dbResponse.map((item) => convertToDbResponse(item)));
});

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const sqlQuery = `select * from state where state_id=${stateId};`;
  const dbResponse = await db.get(sqlQuery);
  response.send(convertToDbResponse(dbResponse));
});

app.post("/districts/", async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;

  const sqlQuery = `INSERT INTO district (district_name, state_id, cases, cured, active, deaths)
                      VALUES
                      (
                          '${districtName}',
                           ${stateId},
                           ${cases},
                           ${cured},
                           ${active},
                           ${deaths}
                      );`;
  const dbResponse = await db.run(sqlQuery);
  response.send("District Successfully Added");
});

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const sqlQuery = `select * from district where district_id=${districtId};`;
  const dbResponse = await db.get(sqlQuery);
  response.send(convertDistrictResponse(dbResponse));
});

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const sqlQuery = `delete from district where district_id = ${districtId};`;
  await db.run(sqlQuery);
  response.send(`District Removed`);
});

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const sqlQuery = `UPDATE 
               district 
               SET 
               district_name='${districtName}',
               state_id = ${stateId},
               cases  = ${cases},
               cured  = ${cured},
               active = ${active},
               deaths = ${deaths}
               where district_id= ${districtId};
               `;

  await db.run(sqlQuery);
  response.send("District Details Updated");
});

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const sqlQuery = `select sum(cases) as totalCases, sum(cured) as totalCured, sum(active) as totalActive, sum(deaths) as totalDeaths from district
                  where state_id=${stateId};`;
  const dbResponse = await db.get(sqlQuery);
  response.send(dbResponse);
});

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const sqlQuery = `select state.state_name from district inner join state 
    on district.state_id=state.state_id where 
    district.district_id=${districtId};`;
  const dbResponse = await db.get(sqlQuery);
  response.send({ stateName: dbResponse.state_name });
});
