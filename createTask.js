// require node modules
const mysql = require("mysql2")
const dotenv = require("dotenv")
// dotenv set up
dotenv.config({ path: "./config/config.env" })

// 1. endpoint exist checked in app.js

exports.CreateTask = async (req, res) => {
  try {
    // define request body parameters
    const { username, password, app_acronym, task_name, task_description } = req.body

    // establish database connection
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

    // 2. endpoint includes params
    if (req.url.includes("?") || req.url.includes("&") || req.url.includes("=") || req.url.includes("+")) {
      return res.json({
        code: "AS201"
      })
    }

    // 3. mandatory fields present
    if (!username || !password || !app_acronym || !task_name) {
      return res.json({
        code: "PS300"
      })
    }

    // 4. valid data types
    if (typeof username !== "string" || typeof password !== "string" || typeof app_acronym !== "string" || typeof task_name !== "string" || typeof task_description !== "string") {
      return res.json({
        code: "PS301"
      })
    }

    // 5. valid user credentials
    promisePool.query()

    // 6. active user
    // 7. app exists
    // 8. permitted user
    // 9. sql check

    // actual transaction

    // success
    res.json({
      code: "x"
    })
  } catch (e) {
    console.log(e)
    // 10. catch other errors
    // async error
    return res.json({
      code: "T701"
    })
  }
}
