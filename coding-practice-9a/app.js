const express = require("express");
const app = express();
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const dbPath = path.join(__dirname, "userData.db");
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
      console.log(`Server running at http://localhost:3000/`);
    });
  } catch (e) {
    console.log(`DB: error ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

app.post("/register/", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const sqlQuery = `select * from user where username='${username}';`;
  const dbUser = await db.get(sqlQuery);
  /*
  const sqlQueryUpdate = `UPDATE user set 
                   password='${hashedPassword}' 
                   where username = '${username}'
  ;`;

  const dbUpdate = await db.run(sqlQueryUpdate);
*/

  if (dbUser === undefined) {
    if (password.length < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const createUser = `INSERT INTO user (username, name, password, gender, location)
                             VALUES
                            (
                                '${username}',
                                '${name}',
                                '${hashedPassword}',
                                '${gender}',
                                '${location}'
                            );`;

      const dbResponse = await db.run(createUser);
      response.status(200);
      response.send("User Created Successfully");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const sqlQuery = `select * from user where username = '${username}';`;
  const dbUser = await db.get(sqlQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      response.status(200);
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.delete("/users/", async (request, response) => {
  const { username } = request.body;
  const selectUser = `delete from user where username='${username}';`;
  await db.run(selectUser);
  response.send(`${username} is deleted`);
});


 
app.put("/change-password/", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const oldQuery = `select * from user where username ='${username}';`;
  const oldUser = await db.get(oldQuery);

  const isPasswordMatched = await bcrypt.compare(oldPassword, oldUser.password);

  const newHashedPassword = await bcrypt.hash(newPassword, 10);

  if (isPasswordMatched !== true) {
    response.status(400);
    response.send("Invalid current password");
  } else {
    if (newPassword.length < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const sqlQuery = `UPDATE user set
                           password='${newHashedPassword}'
                           where username='${username}';`;
      await db.run(sqlQuery);

      response.status(200);
      response.send("Password updated");
    }
  }
});

module.exports = app;
