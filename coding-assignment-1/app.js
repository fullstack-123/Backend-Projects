const { format } = require("date-fns");
var isValid = require("date-fns/isValid");
const express = require("express");
const app = express();
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const path = require("path");
const dbPath = path.join(__dirname, "todoApplication.db");
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
    console.log(`DB error: ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const hasStatusAndPriority = (requestBody) => {
  return requestBody.status !== undefined && requestBody.priority !== undefined;
};

const hasCategoryAndStatus = (requestBody) => {
  return requestBody.category !== undefined && requestBody.status !== undefined;
};

const hasCategoryAndPriority = (requestBody) => {
  return (
    requestBody.category !== undefined && requestBody.priority !== undefined
  );
};

const hasStatus = (requestBody) => {
  return requestBody.status !== undefined;
};

const hasPriority = (requestBody) => {
  return requestBody.priority !== undefined;
};

const hasCategory = (requestBody) => {
  return requestBody.category !== undefined;
};

const convertTodo = (item) => ({
  id: item.id,
  todo: item.todo,
  priority: item.priority,
  status: item.status,
  category: item.category,
  dueDate: item.due_date,
});

app.get("/todos/", async (request, response) => {
  let getSqlQuery = "";
  const { status, priority, search_q = "", category } = request.query;

  const statusList = ["TO DO", "IN PROGRESS", "DONE"];
  const priorityList = ["HIGH", "MEDIUM", "LOW"];
  const categoryList = ["WORK", "HOME", "LEARNING"];

  switch (true) {
    case hasStatusAndPriority(request.query):
      if (statusList.includes(status)) {
        if (priorityList.includes(priority)) {
          getSqlQuery = `select * from todo where status='${status}' and priority='${priority}';`;
          const dbResponse = await db.all(getSqlQuery);
          response.send(dbResponse.map((item) => convertTodo(item)));
        } else {
          response.status(400);
          response.send("Invalid Todo Priority");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;
    case hasCategoryAndStatus(request.query):
      if (categoryList.includes(category)) {
        if (statusList.includes(status)) {
          getSqlQuery = `select * from todo where category='${category}' and status='${status}';`;
          const dbResponse = await db.all(getSqlQuery);
          response.send(dbResponse.map((item) => convertTodo(item)));
        } else {
          response.status(400);
          response.send("Invalid Todo Status");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;
    case hasCategoryAndPriority(request.query):
      if (categoryList.includes(category)) {
        if (priorityList.includes(priority)) {
          getSqlQuery = `select * from todo where category='${category}' and priority = '${priority}';`;
          const dbResponse = await db.all(getSqlQuery);
          response.send(dbResponse.map((item) => convertTodo(item)));
        } else {
          response.status(400);
          response.send("Invalid Todo Priority");
        }
      } else {
        response.send(400);
        response.send("Invalid Todo Category");
      }
      break;
    case hasStatus(request.query):
      if (statusList.includes(status)) {
        getSqlQuery = `select * from todo where status='${status}';`;
        const dbResponse = await db.all(getSqlQuery);
        response.send(dbResponse.map((item) => convertTodo(item)));
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;
    case hasPriority(request.query):
      if (priorityList.includes(priority)) {
        getSqlQuery = `select * from todo where priority= '${priority}';`;
        const dbResponse = await db.all(getSqlQuery);
        response.send(dbResponse.map((item) => convertTodo(item)));
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;
    case hasCategory(request.query):
      if (categoryList.includes(category)) {
        getSqlQuery = `select * from todo where category= '${category}';`;
        const dbResponse = await db.all(getSqlQuery);
        response.send(dbResponse.map((item) => convertTodo(item)));
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;
    default:
      getSqlQuery = `select * from todo where todo LIKE "%${search_q}%";`;
      const dbResponse = await db.all(getSqlQuery);
      response.send(dbResponse.map((item) => convertTodo(item)));
      break;
  }
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const selectSqlQuery = `select * from todo where id=${todoId};`;
  const dbResponse = await db.get(selectSqlQuery);
  response.send(convertTodo(dbResponse));
});

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  const newDate = new Date(date);

  if (date === undefined) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    const isDateValid = isValid(newDate);
    if (isDateValid === true) {
      const formattedDate = format(newDate, "yyyy-MM-dd");
      const getQuery = `select * from todo where due_date= '${formattedDate}';`;
      const dbResponse = await db.all(getQuery);
      response.send(dbResponse.map((item) => convertTodo(item)));
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  }
});

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const isValidDate = isValid(new Date(dueDate));

  const statusList = ["TO DO", "IN PROGRESS", "DONE"];
  const priorityList = ["HIGH", "MEDIUM", "LOW"];
  const categoryList = ["WORK", "HOME", "LEARNING"];

  if (statusList.includes(status)) {
    if (priorityList.includes(priority)) {
      if (categoryList.includes(category)) {
        if (isValidDate === true) {
          const formattedDate = format(new Date(dueDate), "yyyy-MM-dd");
          const sqlQuery = `INSERT INTO todo
                    (id, todo, priority, status, category, due_date)
                    VALUES
                    (${id}, '${todo}', '${priority}', '${status}', '${category}', '${formattedDate}');`;
          await db.run(sqlQuery);
          response.send("Todo Successfully Added");
        } else {
          response.status(400);
          response.send("Invalid Due Date");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
    }
  } else {
    response.status(400);
    response.send("Invalid Todo Status");
  }
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const { todo, priority, status, category, dueDate } = request.body;
  let updatedColumn = "";
  let sqlQuery = "";
  const requestBody = request.body;

  const statusList = ["TO DO", "IN PROGRESS", "DONE"];
  const priorityList = ["HIGH", "MEDIUM", "LOW"];
  const categoryList = ["WORK", "HOME", "LEARNING"];

  switch (true) {
    case requestBody.status !== undefined:
      updatedColumn = "Status";
      break;
    case requestBody.priority !== undefined:
      updatedColumn = "Priority";
      break;
    case requestBody.todo !== undefined:
      updatedColumn = "Todo";
      break;
    case requestBody.category !== undefined:
      updatedColumn = "Category";
      break;
    case requestBody.dueDate !== undefined:
      updatedColumn = "Due Date";
      break;
    default:
      return null;
  }

  switch (true) {
    case hasStatus(request.body):
      if (statusList.includes(status)) {
        sqlQuery = `UPDATE todo set 
                             status = '${status}'
                             where id = ${todoId};`;
        await db.run(sqlQuery);
        response.send(`${updatedColumn} Updated`);
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }

      break;
    case hasPriority(request.body):
      if (priorityList.includes(priority)) {
        sqlQuery = `UPDATE todo set 
                             priority = '${priority}'
                             where id= ${todoId};`;
        await db.run(sqlQuery);
        response.send(`${updatedColumn} Updated`);
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;
    case hasCategory(request.body):
      if (categoryList.includes(category)) {
        sqlQuery = `UPDATE todo set category='${category}'
                            where id= ${todoId};`;
        await db.run(sqlQuery);
        response.send(`${updatedColumn} Updated`);
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;
    case requestBody.todo !== undefined:
      sqlQuery = `UPDATE todo set todo = "${todo}"
                              where id = ${todoId};`;
      await db.run(sqlQuery);
      response.send(`${updatedColumn} Updated`);
      break;
    case requestBody.dueDate !== undefined:
      const newDate = new Date(dueDate);
      const isValidDate = isValid(newDate);
      if (isValidDate === true) {
        const formattedDate = format(newDate, "yyyy-MM-dd");
        sqlQuery = `UPDATE todo set due_date = '${formattedDate}'
                             where id = ${todoId};`;
        await db.run(sqlQuery);
        response.send(`${updatedColumn} Updated`);
      } else {
        response.status(400);
        response.send("Invalid Due Date");
      }
      break;
    default:
      return null;
  }
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const sqlQuery = `delete from todo where id = ${todoId};`;
  await db.run(sqlQuery);
  response.send("Todo Deleted");
});

module.exports = app;
