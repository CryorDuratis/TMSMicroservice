// All node modules are imported here
const express = require("express")
const dotenv = require("dotenv")
const cors = require("cors")
const cookieParser = require("cookie-parser")

// Controller API are imported here

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

// Middleware used here
app.use(cors({ origin: "http://localhost:3000" }))
app.use(bodyParser)
app.use(cookieParser())

// Router is initialized here
const router = express.Router()

// External API
router.route("/CreateTask").post(CreateTask)
router.route("/GetTaskByState").post(GetTaskByState)
router.route("/PromoteTask2Done").post(PromoteTask2Done)

// use router
app.use(router)

app.all("*", (req, res) => {
  // 2. endpoint includes params
  const regex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/
  if (regex.test(req.url.slice(1))) {
    return res.json({
      code: "AS201"
    })
  }
  // 1. Route not found catch
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
