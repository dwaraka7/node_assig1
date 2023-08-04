const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const format = require("date-fns/format");

const app = express();
app.use(express.json());
let db;
const dbPath = path.join(__dirname, "todoApplication.db");

let initializeDBandServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("server rus at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`dbServer error ${error.message}`);
    process.exit(1);
  }
};

initializeDBandServer();

const convertDbQuery = (key) => {
  return {
    id: key.id,
    todo: key.todo,
    priority: key.priority,
    status: key.status,
    category: key.category,
    dueDate: key.due_date,
  };
};

//API 1
app.get("/todos/", async (req, res) => {
  const { search_q = "", status, priority, category } = req.query;
  let todoQuery;
  let checkMem = [];
  const chk_res = Object.keys(req.query).slice(-1)[0];
  const chk_query = Object.keys(req.query)[0];
  const name = chk_query[0].toUpperCase() + chk_query.slice(1);
  const name1 = chk_res[0].toUpperCase() + chk_res.slice(1);

  switch (true) {
    case req.query.status !== undefined && req.query.category !== undefined:
      checkMem = ["WORK", "HOME", "LEARNING"].concat([
        "TO DO",
        "IN PROGRESS",
        "DONE",
      ]);
      todosQuery = `
            SELECT * FROM todo 
            WHERE status = '${status}' AND category = '${category}';`;
      break;

    case req.query.category !== undefined && req.query.priority !== undefined:
      checkMem = ["WORK", "HOME", "LEARNING"].concat(["HIGH", "MEDIUM", "LOW"]);
      todosQuery = `
            SELECT * FROM todo 
            WHERE category = '${category}' AND priority = '${priority}';`;
      break;

    case req.query.priority !== undefined && req.query.status !== undefined:
      checkMem = ["TO DO", "IN PROGRESS", "DONE"].concat([
        "HIGH",
        "MEDIUM",
        "LOW",
      ]);
      todosQuery = `
            SELECT * FROM todo WHERE
            priority = '${priority}' AND status = '${status}';`;
      break;

    case req.query.search_q !== undefined:
      checkMem = [search_q];
      todosQuery = `
            SELECT * FROM todo WHERE
            todo LIKE "%${search_q}%"`;
      break;

    case req.query.status !== undefined:
      checkMem = ["TO DO", "IN PROGRESS", "DONE"];
      todosQuery = `
            SELECT * FROM todo 
            WHERE status = '${status}';`;
      break;

    case req.query.priority !== undefined:
      checkMem = ["HIGH", "MEDIUM", "LOW"];
      todosQuery = `
            SELECT * FROM todo 
            WHERE priority = '${priority}';`;
      break;

    case req.query.category !== undefined:
      checkMem = ["WORK", "HOME", "LEARNING"];
      todosQuery = `
            SELECT * FROM todo WHERE
            category = '${category}';`;
      break;

    default:
      break;
  }
  const todosArray = await db.all(todosQuery);

  if (
    checkMem.includes(req.query[chk_query]) &&
    checkMem.includes(req.query[chk_res]) &&
    todosArray.length !== 0
  ) {
    res.send(todosArray.map((e) => convertDbQuery(e)));
  } else if (!checkMem.includes(req.query[chk_query])) {
    res.status(400);
    res.send(`Invalid Todo ${name}`);
  } else if (!checkMem.includes(req.query[chk_res])) {
    res.status(400);
    res.send(`Invalid Todo ${name1}`);
  } else {
    res.status(400);
    res.send(`Invalid Todo ${name1}`);
  }
});

//API 2
app.get("/todos/:todoId/", async (req, res) => {
  const { todoId } = req.params;
  const todoIdQuery = `
    select * from todo where id=${todoId};`;
  const todo = await db.get(todoIdQuery);
  if (todo !== undefined) {
    res.send(convertDbQuery(todo));
  }
});

// API 3
app.get("/agenda/", async (req, res) => {
  let { date } = req.query;

  const year = new Date(date).getFullYear();
  const month = new Date(date).getMonth();
  const day = new Date(date).getDate();
  const datChk = !isNaN(new Date(date));
  let formatDate = "";

  if (datChk) {
    formatDate = format(new Date(year, month, day), "yyyy-MM-dd");
  }
  const dateQuery = `
    SELECT * FROM todo WHERE due_date='${formatDate}';`;
  let dateArray = await db.all(dateQuery);

  const datChkFormat = !isNaN(new Date(formatDate));
  console.log(datChkFormat);
  if (dateArray.length !== 0 && datChkFormat) {
    res.send(dateArray.map((e) => convertDbQuery(e)));
  } else {
    res.status(400);
    res.send("Invalid Due Date");
  }
});

//API 4
app.post("/todos/", async (req, res) => {
  const { id, todo, priority, status, category, dueDate } = req.body;
  const year = new Date(dueDate).getFullYear();
  const month = new Date(dueDate).getMonth();
  const day = new Date(dueDate).getDate();
  const datChk = !isNaN(new Date(dueDate));
  let formatDate = "";

  if (datChk) {
    formatDate = format(new Date(year, month, day), "yyyy-MM-dd");
  }
  const datChkFormat = !isNaN(new Date(formatDate));
  const createQuery = `
    INSERT INTO
        todo (id,todo,priority,status,category,due_date)
    VALUES (
        ${id},'${todo}','${priority}','${status}','${category}','${formatDate}'
    );`;
  let statusTest;
  let checkStatus = false;

  switch (false) {
    case ["WORK", "HOME", "LEARNING"].includes(category):
      checkStatus = true;
      statusTest = `Invalid Todo Category`;
      break;
    case ["TO DO", "IN PROGRESS", "DONE"].includes(status):
      checkStatus = true;
      statusTest = `Invalid Todo Status`;
      break;
    case ["HIGH", "MEDIUM", "LOW"].includes(priority):
      checkStatus = true;
      statusTest = `Invalid Todo Priority`;
      break;

    case datChkFormat:
      checkStatus = true;
      statusTest = `Invalid Due Date`;
  }
  if (checkStatus) {
    res.status(400);
    res.send(`${statusTest}`);
  } else {
    await db.run(createQuery);
    res.send("Todo Successfully Added");
  }
});

//API 5
app.put("/todos/:todoId/", async (req, res) => {
  const { todoId } = req.params;
  const { status, priority, todo, category, dueDate } = req.body;
  let updateQuery;
  let statusText;
  let arrayChk;
  switch (true) {
    case status !== undefined:
      arrayChk = ["TO DO", "IN PROGRESS", "DONE"].includes(status);
      statusText = "Status";
      updateQuery = `
                UPDATE
                    TODO
                SET
                    status='${status}'
                WHERE
                    id=${todoId};`;
      break;

    case category !== undefined:
      arrayChk = ["WORK", "HOME", "LEARNING"].includes(category);
      statusText = "Category";
      updateQuery = `
                UPDATE
                    TODO
                SET
                    category='${category}'
                WHERE
                
                id=${todoId};`;
      break;
    case priority !== undefined:
      arrayChk = ["HIGH", "MEDIUM", "LOW"].includes(priority);
      statusText = "Priority";
      updateQuery = `
                UPDATE
                    TODO
                SET
                    priority='${priority}'
                WHERE
                    id=${todoId};`;
      break;

    case dueDate !== undefined:
      const year = new Date(dueDate).getFullYear();
      const month = new Date(dueDate).getMonth();
      const day = new Date(dueDate).getDate();
      const datChk = !isNaN(new Date(dueDate));
      let formatDate = "";

      if (datChk) {
        formatDate = format(new Date(year, months, day), "yyyy-MM-dd");
      }

      const datChkFormat = !isNaN(new Date(formatDate));

      arrayChk = datChkFormat;
      statusText = "Due Date";
      updateQuery = `
                UPDATE
                    TODO
                SET
                    due_date='${formatDt}'
                WHERE
                    id=${todoId};`;

      break;

    default:
      statusText = "Todo";
      arrayChk = true;
      updateQuery = `
            UPDATE
                TODO
            SET
                todo='${todo}'
            WHERE
                id=${todoId};`;
      break;
  }

  if (arrayChk) {
    await db.run(updateQuery);
    res.send(`${statusText} Updated`);
  } else if (dueDate !== undefined) {
    res.status(400);
    res.send(`Invalid ${statusText}`);
  } else {
    res.status(400);
    res.send(`Invalid Todo ${statusText}`);
  }
});

//API 6
app.delete("/todos/:todoId/", async (req, res) => {
  const { todoId } = req.params;
  const deleteQuery = `
        DELETE FROM todo WHERE id='${todoId}';`;
  await db.run(deleteQuery);
  res.send("Todo Deleted");
});

//check
app.get("/db/", async (req, res) => {
  const todoIdQuery = `
    select * from todo ;`;
  const todo = await db.all(todoIdQuery);

  res.send(todo);
});

module.exports = app;
