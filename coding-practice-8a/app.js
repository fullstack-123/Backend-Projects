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

const hasStatusAndPriorityQuery = (requestQuery) => {
  return (
    requestQuery.status !== undefined && requestQuery.priority !== undefined
  );
};

const hasStatusQuery = (requestQuery) => {
  return requestQuery.status !== undefined;
};

const hasPriorityQuery = (requestQuery) => {
  return requestQuery.priority !== undefined;
};

app.get("/todos/", async (request, response) => {
  let data = null;
  let getSqlQuery = "";
  const { search_q = "", status, priority } = request.query;

  switch (true) {
    case hasStatusAndPriorityQuery(request.query):
      getSqlQuery = `select * from todo where status='${status}' and priority='${priority}' and todo LIKE "%${search_q}%";`;
      break;
    case hasStatusQuery(request.query):
      getSqlQuery = `select * from todo where status='${status}' and todo LIKE "%${search_q}%";`;
      break;
    case hasPriorityQuery(request.query):
      getSqlQuery = `select * from todo where priority='${priority}' and todo LIKE "%${search_q}%";`;
      break;
    default:
      getSqlQuery = `select * from todo where todo LIKE '%${search_q}%';`;
      break;
  }
  console.log(getSqlQuery);
  data = await db.all(getSqlQuery);
  response.send(data);
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const sqlQuery = `select * from todo where id=${todoId};`;
  const dbResponse = await db.get(sqlQuery);
  response.send(dbResponse);
});

app.post("/todos/", async (request, response) => {
  const todoDetails = request.body;
  const { id, todo, priority, status } = todoDetails;

  const sqlQuery = `INSERT INTO todo(id, todo, priority,status)
                       VALUES
                       (
                           ${id},
                           '${todo}',
                          ' ${priority}',
                           '${status}'
                       );`;
  const dbResponse = await db.run(sqlQuery);
  response.send(`Todo Successfully Added`);
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  let updatedColumn = "";
  const requestBody = request.query;
  let sqlQuery="";

  const selectPrevious = `select * from todo where id=${todoId};`;
  const previousTodo = await db.get(selectPrevious);
  const { todo, priority, status } = previousTodo;

  
   console.log(requestBody);

  switch (true) {
      case hasStatusQuery(requestBody):
          sqlQuery = `UPDATE todo set 
                            
                                todo = '${todo}',
                                priority = '${priority}',
                                status = '${requestBody.status}'
                            
                            where id=${todoId};`;
           break;
        case hasPriorityQuery(requestBody):
            sqlQuery = `UPDATE todo set 
                           todo= '${todo}',
                           priority= '${requestBody.priority}',
                           status = '${status}'
            
            where id=${todoId};`;
            break;
        case requestBody.todo !== null:
            sqlQuery = `UPDATE todo set 
                           todo='${requestBody.todo}',
                           priority = '${priority}',
                           status = '${status}'
            
            where id=${todoId};`;
            break;
        default:
            return null;

  }
  
  const dbResponse = await db.run(sqlQuery);
  
  switch(true){
      case hasPriorityQuery(requestBody):
          updatedColumn = "Priority"
          break;
      case hasStatusQuery(requestBody):
          updatedColumn = "Status"
          break;
      case requestBody.todo !== null:
          updatedColumn = 'Todo Updated'
        break;
      default:
          return null;
  }
  
   response.send(`${updatedColumn} Updated`);

});


app.delete('/todos/:todoId/', async(request, response)=>{
    const {todoId} = request.params;
    console.log(todoId);
    const sqlQuery = `delete from todo where id=${todoId};`;
    const dbResponse = await db.run(sqlQuery);
    response.send(`Todo Deleted`);
});