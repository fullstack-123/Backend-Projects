const express = require("express");
const app = express();
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const dbPath = path.join(__dirname, "twitterClone.db");
app.use(express.json());
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
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
    console.log(`DB error: ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const sqlQuery = `select * from user where username='${username}';`;
  const dbUser = await db.get(sqlQuery);

  if (dbUser !== undefined) {
    response.status(400);
    response.send("User already exists");
  } else {
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const sqlQuery = `INSERT INTO user
                           (username, password, name, gender)
                           VALUES
                           (
                               '${username}',
                               '${hashedPassword}',
                               '${name}',
                               '${gender}'
                           );`;
      await db.run(sqlQuery);
      response.status(200);
      response.send("User created successfully");
    }
  }
});

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const getUser = `select * from user where username='${username}';`;
  const dbUser = await db.get(getUser);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "akhilarra11@gmail.com");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

const authenticateToken = async (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    console.log("jwt");
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "akhilarra11@gmail.com", async (error, payload) => {
      if (error) {
        console.log("hi");
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

app.get("/user/tweets/feed/", authenticateToken, async (request, response) => {
  const { username } = request;

  const selectUser = `select * from user where username='${username}';`;
  const dbUser = await db.get(selectUser);
  const sqlQuery = `select user.username as username, tweet.tweet as tweet, tweet.date_time as dateTime from follower inner join tweet on 
  follower.following_user_id=tweet.user_id inner join user on tweet.user_id=user.user_id where 
  follower.follower_user_id=${dbUser.user_id}
  order by tweet.date_time desc
  limit 4 offset 0;`;

  const dbResponse = await db.all(sqlQuery);
  response.send(dbResponse);
});

app.get("/user/following/", authenticateToken, async (request, response) => {
  const { username } = request;
  const userQuery = `select * from user where username='${username}';`;
  const dbUser = await db.get(userQuery);
  const sqlQuery = `select user.name as name from user inner join follower on user.user_id=follower.following_user_id where follower.follower_user_id=${dbUser.user_id};`;
  const dbRes = await db.all(sqlQuery);
  response.send(dbRes);
});

app.get("/user/followers/", authenticateToken, async (request, response) => {
  const { username } = request;

  const selectUser = `select * from user where username='${username}';`;
  const dbUser = await db.get(selectUser);
  const sqlQuery = `select user.name as name from follower inner join user on follower.follower_user_id=user.user_id where follower.following_user_id=${dbUser.user_id};`;

  const dbResponse = await db.all(sqlQuery);
  response.send(dbResponse);
});

app.get("/tweets/:tweetId/", authenticateToken, async (request, response) => {
  const { username } = request;
  const { tweetId } = request.params;

  const selectUser = `select * from user where username='${username}';`;
  const dbUser = await db.get(selectUser);

  //If the user requests a tweet other than the users he is following

  const usersQuery = `select tweet.tweet_id from follower inner join tweet on follower.following_user_id = tweet.user_id where follower.follower_user_id=${dbUser.user_id};`;

  const dbResponse = await db.all(usersQuery);

  const tweetsList = [];

  dbResponse.map((item) => tweetsList.push(parseInt(item.tweet_id)));
  //1,2,7,8

  const res = tweetsList.includes(parseInt(tweetId));

  if (res === true) {
    const sqlQuery = `select 
  tweet.tweet as tweet, count(distinct like.like_id) as likes, count(distinct reply.reply_id) as replies, tweet.date_time as dateTime from 
  follower inner join tweet on follower.following_user_id=tweet.user_id 
  inner join like on tweet.tweet_id=like.tweet_id inner join reply on reply.tweet_id=tweet.tweet_id 
  where follower.follower_user_id=${dbUser.user_id} and tweet.tweet_id=${tweetId}
  group by tweet.tweet_id;`;
    const dbRes = await db.all(sqlQuery);
    response.send(...dbRes);
  } else {
    response.status(401);
    response.send("Invalid Request");
  }
});

app.get("/tweets/:tweetId/likes/",authenticateToken, async (request, response) => {
    const { tweetId } = request.params;
    const { username } = request;

    const sqlQuery = `select * from user where username ='${username}';`;
    const dbUser = await db.get(sqlQuery);

    const usersQuery = `select tweet.tweet_id from follower inner join tweet on 
    follower.following_user_id = tweet.user_id where follower.follower_user_id=${dbUser.user_id};`;

    const dbResponse = await db.all(usersQuery);

    const tweetsList = [];

    dbResponse.map((item) => tweetsList.push(parseInt(item.tweet_id)));
    //1,2,7,8

    const res = tweetsList.includes(parseInt(tweetId));

    if (res === true) {
      const tweetsQuery = `select distinct user.username as username
      from follower inner join tweet on follower.following_user_id=tweet.user_id inner join like on tweet.tweet_id=like.tweet_id inner join user on user.user_id=like.user_id 
      where follower.follower_user_id=${dbUser.user_id} and tweet.tweet_id=${tweetId};`;

      const dbResponse = await db.all(tweetsQuery);
      response.send({ likes: dbResponse.map((item) => item.username) });
    } else {
      response.status(401);
      response.send("Invalid Request");
    }
  });

app.get("/tweets/:tweetId/replies/",authenticateToken, async (request, response) => {
    const { username } = request;
    const { tweetId } = request.params;

    const selectUser = `select * from user where username='${username}';`;
    const dbUser = await db.get(selectUser);

    const usersQuery = `select tweet.tweet_id from follower inner join tweet on follower.following_user_id = tweet.user_id where follower.follower_user_id=${dbUser.user_id};`;

    const dbResponse = await db.all(usersQuery);

    const tweetsList = [];

    dbResponse.map((item) => tweetsList.push(parseInt(item.tweet_id)));
    //1,2,7,8

    const res = tweetsList.includes(parseInt(tweetId));

    if (res === true) {
      const sqlQuery = `select user.name as name, reply.reply as reply
     from follower inner join tweet on follower.following_user_id=tweet.user_id 
     inner join reply on tweet.tweet_id=reply.tweet_id inner join user on 
     reply.user_id=user.user_id where follower.follower_user_id=${dbUser.user_id}
     and tweet.tweet_id=${tweetId};`;

      const dbRes = await db.all(sqlQuery);
      response.send({ replies: dbRes });
    } else {
      response.status(401);
      response.send("Invalid Request");
    }
  }
);

app.get("/user/tweets/", authenticateToken, async (request, response) => {
  const { username } = request;
  const selectUser = `select * from user where username='${username}';`;
  const dbUser = await db.get(selectUser);

  const sqlQuery = `select tweet.tweet as tweet, count(distinct like.like_id) as likes, count(distinct reply.reply_id) as replies, tweet.date_time as dateTime
    from tweet inner join like on tweet.tweet_id=like.tweet_id inner join reply on tweet.tweet_id=reply.tweet_id where tweet.user_id=${dbUser.user_id}
    group by tweet.tweet_id;`;
  const dbResponse = await db.all(sqlQuery);
  response.send(dbResponse);
});

app.post("/user/tweets/", authenticateToken, async (request, response) => {
  const { username } = request;
  const { tweet } = request.body;
  const selectUser = `select * from user where username='${username}';`;
  const dbUser = await db.get(selectUser);

  const sqlQuery = `INSERT into tweet(tweet_id, tweet, user_id, date_time)
                       VALUES
                       (
                           12, '${tweet}', ${dbUser.user_id}, "2021-04-07 14:50:15"
                       );`;
  await db.run(sqlQuery);
  response.send("Created a Tweet");
});

app.delete(
  "/tweets/:tweetId/",
  authenticateToken,
  async (request, response) => {
    const { username } = request;
    const { tweetId } = request.params;

    const selectQuery = `select * from user where username='${username}';`;
    const dbUser = await db.get(selectQuery);

    const tweetIds = `select tweet_id from tweet where user_id=${dbUser.user_id};`;
    const dbRes = await db.all(tweetIds);
    const tweetsList = [];
    dbRes.map((item) => tweetsList.push(parseInt(item.tweet_id)));

    // user 2 posted 3 and 4 tweets.
    const res = tweetsList.includes(parseInt(tweetId));

    console.log(res);

    if (res === true) {
      const deleteQuery = `delete from tweet where tweet_id=${tweetId};`;
      await db.run(deleteQuery);
      response.send("Tweet Removed");
    } else {
      response.status(401);
      response.send("Invalid Request");
    }
  }
);

module.exports = app;
