// require node modules
const mysql = require("mysql2")
const dotenv = require("dotenv")
const bcrypt = require("bcryptjs")
// dotenv set up
dotenv.config({ path: "./config/config.env" })

// 1. endpoint exist checked in app.js

exports.GetTaskByState = async (req, res) => {
  try {
    // define request body parameters
    var { username, password, task_app_acronym, task_state } = req.body

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

    // 3. mandatory fields present
    if (!username || !password || !task_app_acronym || !task_state) {
      return res.json({
        code: "PS300"
      })
    }

    // 4. valid data types
    if (typeof username !== "string" || typeof password !== "string" || typeof task_app_acronym !== "string" || typeof task_state !== "string") {
      return res.json({
        code: "PS301"
      })
    }

    // 5. valid user credentials
    var querystr = "SELECT * FROM users WHERE `username` = ?" //case insensitive
    var values = [username]
    var result = promisePool.query(querystr, values)
    if (result.length < 1) {
      console.log("no user found")
      return res.json({
        code: "A400"
      })
    }

    const user = result[0]
    const isMatched = await bcrypt.compare(password, user.password) // case sensitive
    if (!isMatched) {
      console.log("password wrong")
      return res.json({
        code: "A400"
      })
    }

    // 6. active user
    if (user.isactive != 1) {
      return res.json({
        code: "A401"
      })
    }

    // 7. app exists
    querystr = `SELECT App_Rnumber,App_permit_Create FROM application WHERE App_Acronym = ?`
    values = [task_app_acronym]
    result = await promisePool.query(querystr, values)
    if (result.length < 1) {
      return res.json({
        code: "D500"
      })
    }

    // 9. correct task state input
    switch (task_state) {
      case "open":
        task_state = "Open"
        break
      case "todo":
        task_state = "Todolist"
        break
      case "doing":
        task_state = "Doing"
        break
      case "done":
        task_state = "Done"
        break
      case "closed":
        task_state = "Closed"
        break
      default:
        return res.json({
          code: "D502"
        })
    }

    // get all tasks in a specified state=============================
    querystr = "SELECT * FROM task WHERE `Task_app_Acronym` = ? AND `Task_state` = ?"
    values = [task_app_acronym, task_state]
    const data = await promisePool.query(querystr, values)

    // success========================================================
    return res.json({
      code: "S100",
      data
    })
  } catch (e) {
    console.log(e)
    // 12. catch other errors
    // async error
    return res.json({
      code: "T701"
    })
  }
}
