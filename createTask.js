// require node modules
const mysql = require("mysql2")
const dotenv = require("dotenv")
const bcrypt = require("bcryptjs")
// dotenv set up
dotenv.config({ path: "./config/config.env" })

// 1. endpoint exist checked in app.js

exports.CreateTask = async (req, res) => {
  try {
    // define request body parameters
    var { username, password, app_acronym, task_name, task_description = "" } = req.body

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
    var querystr = "SELECT * FROM users WHERE `username` = ?" // case insensitive
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
    values = [app_acronym]
    result = await promisePool.query(querystr, values)
    if (result.length < 1) {
      return res.json({
        code: "D500"
      })
    }
    const app = result[0]
    // get task id
    const Task_id = app_acronym + "_" + app.App_Rnumber

    // 10. permitted user
    querystr = `SELECT role FROM users WHERE username = ? AND role LIKE ?`
    values = [username, `%${app.App_permit_Create}%`]
    result = await promisePool.query(querystr, values)
    if (result.length < 1) {
      return res.json({
        code: "AM600"
      })
    }

    // get current timestamp=========================================
    const timestamp = new Date()

    const stamp = `[${timestamp.toISOString()}] ${user} (Open): `
    const createMsg = `Task created.`

    // concat
    const newNote = stamp + createMsg

    // create date
    const currentdate = timestamp.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })

    // insert
    querystr = "INSERT INTO task (`Task_name`,`Task_description`,`Task_id`,`Task_app_Acronym`,`Task_creator`,`Task_owner`,`Task_state`,`Task_createDate`,`Task_notes`) VALUES (?,?,?,?,?,?,'Open',?,?)"
    values = [task_name, task_description, Task_id, app_acronym, user, user, currentdate, newNote]
    await promisePool.query(querystr, values)

    // increment app rnumber
    querystr = "UPDATE application SET App_Rnumber = App_Rnumber + 1 WHERE App_Acronym = ?"
    values = [app_acronym]
    await promisePool.query(querystr, values)

    // success======================================================
    return res.json({
      code: "S100",
      task_id: Task_id
    })
  } catch (e) {
    console.log(e)
    // 11. sql check
    if (e.code === "ER_DATA_OUT_OF_RANGE" || e.code === "ER_DATA_TOO_LONG") {
      return res.json({
        code: "T700"
      })
    }
    // 12. catch other errors
    // async error
    return res.json({
      code: "T701"
    })
  }
}
