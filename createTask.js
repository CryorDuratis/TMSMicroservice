// All node modules are imported here
const express = require("express")
const dotenv = require("dotenv")
const cors = require("cors")
const cookieParser = require("cookie-parser")

// Express is initiated here
const app = express()

// Uncaught exception error shuts down server here
process.on("uncaughtException", err => {
  console.log(`Error: ${err.stack}`)
  console.log("Shutting down the server due to uncaught exception.")
  process.exit(1)
})

// Constants declared here
dotenv.config({ path: "./config/config.env" })
const port = process.env.PORT
const environment = process.env.NODE_ENV
const bodyParser = express.json()

// create pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})
const promisePool = pool.promise()

const executeQuery = catchAsyncErrors(async (querystr, values) => {
  const [rows, fields] = await promisePool.query(querystr, values)
  return rows
})

// Middleware used here
app.use(cors({ origin: "http://localhost:3000" }))
app.use(bodyParser)
app.use(cookieParser())

// Router is initialized here
// const router = express.Router()

// // Tasks
// router.route("/task").post(isAuthenticatedUser, getTask) // display task information to everyone
// router.route("/task/create").post(isAuthenticatedUser, createTask)
// router.route("/task/promote").post(isAuthenticatedUser, promoteTask) // promote task and edit notes

// API endpoint to create a new task
app.post("/createTask", async (req, res) => {
  try {
    const { Task_name, Task_description = null, Task_app_Acronym } = req.body.formData

    // get app permit
    var querystr = `SELECT App_permit_Create FROM application WHERE App_Acronym = ?`
    var values = [Task_app_Acronym]
    var result = await executeQuery(querystr, values)

    // check if user role matches app permits
    const auth = await Checkgroup(req.user, result[0].App_permit_Create)
    if (!auth) {
      return res.json({
        unauth: "role"
      })
    }

    // check that task name is not null
    if (!Task_name) {
      return res.json({
        success: false,
        message: "required"
      })
    }

    // get task id
    querystr = `SELECT App_Rnumber FROM application WHERE App_Acronym = ?`
    values = [Task_app_Acronym]
    result = await executeQuery(querystr, values)
    const Task_id = Task_app_Acronym + "_" + result[0].App_Rnumber

    // get current timestamp
    const timestamp = new Date()

    const stamp = `[${timestamp.toISOString()}] ${req.user} (Open): `
    const createMsg = `Task created.`

    // concat
    const newNote = stamp + createMsg

    // create date
    const currentdate = timestamp.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })

    // insert
    querystr = "INSERT INTO task (`Task_name`,`Task_description`,`Task_id`,`Task_app_Acronym`,`Task_creator`,`Task_owner`,`Task_state`,`Task_createDate`,`Task_notes`) VALUES (?,?,?,?,?,?,'Open',?,?)"
    values = [Task_name, Task_description, Task_id, Task_app_Acronym, req.user, req.user, currentdate, newNote]
    result = await executeQuery(querystr, values)

    // increment app rnumber
    querystr = "UPDATE application SET App_Rnumber = App_Rnumber + 1 WHERE App_Acronym = ?"
    values = [Task_app_Acronym]
    result = await executeQuery(querystr, values)

    // return result
    return res.json({
      success: true,
      taskid: Task_id
    })
  } catch (e) {
    // catch errors
    console.log(e)
    // SQL database errors
    if (e.code === "ER_DATA_OUT_OF_RANGE") {
      const match = error.message.match(/column '(.*?)'/)
      const columnName = match ? match[1] : "unknown_column"
      if (columnName === "Task_name")
        return res.json({
          error: "The Task name you entered is too long, please try again."
        })
      if (columnName === "App_Rnumber")
        return res.json({
          error: "Maximum number of tasks reached, please make a new app."
        })
    }
    if (e.code === "ER_DUP_ENTRY") {
      return res.json({
        success: false
      })
    }
  }
})

// Error-handling middleware (defined after other routes and middleware)
app.use((err, req, res, next) => {
  console.error(err.message)
  if (err && err.name === "TokenExpiredError") {
    return res.json({
      error: "routenotfound"
    })
  } else {
    console.log(err)
    return res.json({
      error: "Internal Server Error"
    })
  }
})

// Route not found catch
app.all("*", (req, res) => {
  res.json({
    error: "route"
  })
})

// Server started on port
const server = app.listen(port, () => {
  console.log(`Server started on port ${port} in ${environment} mode`)
})

// Unhandled promise rejection error
process.on("unhandledRejection", err => {
  console.log(`Error: ${err.message}`)
  console.log("Shutting down the server due to unhandled promise rejection.")
  server.close(() => {
    process.exit(1)
  })
})
