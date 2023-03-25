const express = require("express");
const app = express();
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const dbPath = path.join(__dirname, "covid19IndiaPortal.db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
app.use(express.json());
let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log(`Server running at http://localhost:3000`);
    });
  } catch (e) {
    console.log(`DB error: ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const sqlUser = `select * from user where username='${username}';`;
  const dbUser = await db.get(sqlUser);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY SECRET KEY");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];

  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY SECRET KEY", (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

const convertDbResponse = (item) => ({
  stateId: item.state_id,
  stateName: item.state_name,
  population: item.population,
});

app.get("/states/", authenticateToken, async (request, response) => {
  const sqlQuery = `select * from state;`;
  const dbUser = await db.all(sqlQuery);
  response.send(dbUser.map((item) => convertDbResponse(item)));
});

app.get("/states/:stateId/", authenticateToken, async (request, response) => {
  const { stateId } = request.params;
  const sqlQuery = `select * from state where state_id=${stateId};`;
  const dbUser = await db.get(sqlQuery);
  response.send(convertDbResponse(dbUser));
});

app.post("/districts/", authenticateToken, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const sqlQuery = `INSERT INTO district (district_name, state_id, cases, cured, active, deaths)
                   VALUES 
                   ('${districtName}', 
                    ${stateId},
                    ${cases},
                    ${cured},
                    ${active},
                    ${deaths});`;
  const dbResponse = await db.run(sqlQuery);
  response.send("District Successfully Added");
});

const convertDistrict = (item) => ({
  districtId: item.district_id,
  districtName: item.district_name,
  stateId: item.state_id,
  cases: item.cases,
  cured: item.cured,
  active: item.active,
  deaths: item.deaths,
});

app.get(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const sqlQuery = `select * from district where district_id=${districtId};`;
    const dbUser = await db.get(sqlQuery);
    response.send(convertDistrict(dbUser));
  }
);

app.delete(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const sqlQuery = `select * from district where district_id=${districtId};`;
    const dbUser = await db.run(sqlQuery);
    response.send("District Removed");
  }
);

app.put(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const sqlQuery = `update district set 
                      district_name='${districtName}',
                      state_id=${stateId},
                      cases = ${cases},
                      cured = ${cured},
                      active = ${active},
                      deaths = ${deaths}
                      where district_id=${districtId};`;

    await db.run(sqlQuery);
    response.send("District Details Updated");
  }
);

app.get(
  "/states/:stateId/stats/",
  authenticateToken,
  async (request, response) => {
    const { stateId } = request.params;
    const sqlQuery = `select sum(cases) as totalCases, sum(cured) as totalCured, sum(active) as totalActive, sum(deaths) as totalDeaths from district where state_id = ${stateId};`;
    const dbRes = await db.get(sqlQuery);
    response.send(dbRes);
  }
);
