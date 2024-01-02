// All node modules are imported here
const express = require("express")
const dotenv = require("dotenv")
const cors = require("cors")
const cookieParser = require("cookie-parser")

// Controller API are imported here
const { CreateTask } = require("./createTask")
const { GetTaskByState } = require("./gettaskbystate")
const { PromoteTask2Done } = require("./promotetask2done")

// Express is initiated here
const app = express()

// Uncaught exception error shuts down server here
process.on("uncaughtException", err => {
  console.log(`Error: ${err.stack}`)
  console.log("Shutting down the server due to uncaught exception.")
  process.exit(1)
})

// Constants declared here
dotenv.config({ path: "./config.env" })
const port = process.env.PORT
const environment = process.env.NODE_ENV
const bodyParser = express.json()

// Middleware used here
app.use(cors({ origin: "http://localhost:3000" }))
app.use(bodyParser)
app.use(cookieParser())

// Router is initialized here
const router = express.Router()
// use router
app.use(router)

router.use((req, res, next) => {
  // 2. endpoint includes params
  const regex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/
  console.log(req.url.slice(1))
  if (regex.test(req.url.slice(1))) {
    console.log("error code 2")
    return res.json({
      code: "AS201"
    })
  }
  next()
})

// External API
router.route("/CreateTask").post(CreateTask)
router.route("/GetTaskbyState").post(GetTaskByState)
router.route("/PromoteTask2Done").post(PromoteTask2Done)

app.all("*", (req, res) => {
  // 1. Route not found catch
  console.log("error code 1")
  return res.json({
    code: "AS200"
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
