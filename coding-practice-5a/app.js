const express = require("express");
const app = express();
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const dbPath = path.join(__dirname, "moviesData.db");
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
    console.log(`DB error:${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const convertToDbResponse = (item) => ({
  movieId: item.movie_id,
  directorId: item.director_id,
  movieName: item.movie_name,
  leadActor: item.lead_actor,
});

const convertDbResponse = (item) => ({
  directorId: item.director_id,
  directorName: item.director_name,
});

app.get("/movies/", async (request, response) => {
  const sqlQuery = `select * from movie`;
  const dbRes = await db.all(sqlQuery);
  response.send(dbRes.map((item) => convertToDbResponse(item)));
});

app.post("/movies/", async (request, response) => {
  const movieDetails = request.body;
  const { directorId, movieName, leadActor } = movieDetails;

  const sqlQuery = `INSERT INTO movie
             (director_id, movie_name, lead_actor)
             VALUES
             (
                 ${directorId},
                 '${movieName}',
                 '${leadActor}'
             );`;
  const dbResponse = await db.run(sqlQuery);
  response.send("Movie Successfully Added");
});

app.get("/movies/:movieId/", async (request, response) => {
  const { movieId } = request.params;
  const sqlQuery = `select * from movie where movie_id = ${movieId};`;
  const res = await db.get(sqlQuery);
  response.send(convertToDbResponse(res));
});

app.put("/movies/:movieId/", async (request, response) => {
  const { movieId } = request.params;
  const movieDetails = request.body;
  const { directorId, movieName, leadActor } = movieDetails;

  const sqlQuery = `UPDATE movie
                     SET 
                     director_id=${directorId},
                     movie_name='${movieName}',
                     lead_actor='${leadActor}'
                     where movie_id=${movieId};`;
  await db.run(sqlQuery);
  response.send("Movie Details Updated");
});

app.delete("/movies/:movieId/", async (request, response) => {
  const { movieId } = request.params;
  const sqlQuery = `delete from movie where movie_id=${movieId};`;
  await db.run(sqlQuery);
  response.send("Movie Removed");
});

app.get("/directors/", async (request, response) => {
  const sqlQuery = `select * from director;`;
  const dbResponse = await db.all(sqlQuery);
  response.send(dbResponse.map((item) => convertDbResponse(item)));
});



app.get("/directors/:directorId/movies/", async(request, response)=>{
    const {directorId} = request.params;

    const sqlQuery = `select * from movie where director_id=${directorId};`;
    const dbResponse = await db.all(sqlQuery);
    response.send(dbResponse.map((item)=>({movieName:item.movie_name})));
})