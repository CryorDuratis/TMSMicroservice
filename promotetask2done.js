// require node modules
const mysql = require("mysql2")
const dotenv = require("dotenv")
const bcrypt = require("bcryptjs")
const sendEmail = require("./sendEmail")
// dotenv set up
dotenv.config({ path: "./config/config.env" })

// 1. endpoint exist checked in app.js
// 2. endpoint includes special characters checked in app.js

exports.PromoteTask2Done = async (req, res) => {
  try {
    // define request body parameters
    var { username, password, task_app_acronym, task_id, new_notes = "" } = req.body

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
    if (!username || !password || !task_app_acronym || !task_id) {
      console.log("error code 3")
      return res.json({
        code: "PS300"
      })
    }

    // 4. valid data types
    if (typeof username !== "string" || typeof password !== "string" || typeof task_app_acronym !== "string" || typeof task_id !== "string" || typeof new_notes !== "string") {
      console.log("error code 4")
      return res.json({
        code: "PS301"
      })
    }

    // 5. valid user credentials
    var querystr = "SELECT * FROM users WHERE `username` = ?" //case insensitive
    var values = [username]
    var [result] = await promisePool.query(querystr, values)
    if (result.length < 1) {
      console.log("error code 5")
      console.log("no user found")
      return res.json({
        code: "A400"
      })
    }

    const user = result[0]
    const isMatched = await bcrypt.compare(password, user.password) // case sensitive
    if (!isMatched) {
      console.log("error code 5")
      console.log("password wrong")
      return res.json({
        code: "A400"
      })
    }

    // 6. active user
    if (user.isactive != 1) {
      console.log("error code 6")
      return res.json({
        code: "A401"
      })
    }

    // 7. app exists
    querystr = `SELECT App_Rnumber,App_permit_Doing FROM application WHERE App_Acronym = ?`
    values = [task_app_acronym]
    var [result] = await promisePool.query(querystr, values)
    if (result.length < 1) {
      console.log("error code 7")
      return res.json({
        code: "D500"
      })
    }
    const app = result[0]

    // 8. task exists
    querystr = "SELECT * FROM task WHERE Task_id = ?"
    values = [task_id]
    var [result] = await promisePool.query(querystr, values)
    if (result.length < 1) {
      console.log("error code 8")
      return res.json({
        code: "D501"
      })
    }
    const task = result[0]

    // 9. correct task state input
    if (task.Task_state !== "Doing") {
      console.log("error code 9")
      return res.json({
        code: "D502"
      })
    }

    // 10. permitted user
    querystr = `SELECT role FROM users WHERE username = ? AND role LIKE ?`
    values = [username, `%${app.App_permit_Doing}%`]
    var [result] = await promisePool.query(querystr, values)
    if (result.length < 1) {
      console.log("error code 10")
      return res.json({
        code: "AM600"
      })
    }

    // get current timestamp===========================================
    const timestamp = new Date().toISOString()

    const stamp = `[${timestamp}] ${user} (Doing): `
    const newMsg = `${new_notes}\n\n`

    // get old task info, maybe dunnid query
    querystr = "SELECT * FROM task WHERE Task_id = ?"
    values = [task_id]
    var [result] = await promisePool.query(querystr, values)
    const oldNote = result[0].Task_notes

    // promote msg
    const promotemsg = `Task promoted from "Doing" to "Done". `

    // concat
    const newNote = stamp + promotemsg + newMsg + oldNote

    // update database
    querystr = `UPDATE task SET Task_notes = ?, Task_state = ?, Task_owner = ? WHERE Task_id = ?`
    values = [newNote, "Done", user.username, task_id]
    await promisePool.query(querystr, values)

    // send email
    const applink = `http://localhost:3000/apps/${task_app_acronym}`

    const text = `Dear User,\n\n

    The task ${result[0].Task_name} has been promoted to the "Done" state.\n\n
    
    Task Details:\n
    Task Name: ${result[0].Task_name}\n
    Assigned To: ${result[0].Task_owner}\n\n

    Please view the task at ${applink}\n
    Thank you for your attention.\n\n
    
    Best Regards,\n
    Your TMS Team `

    const html = `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Task Promotion Notification</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          background-color: #f4f4f4;
          padding: 20px;
        }
    
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          padding: 20px;
          border-radius: 5px;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
    
        h2 {
          color: #333333;
        }
    
        p {
          color: #666666;
        }
    
        .task-details {
          margin-top: 20px;
        }
    
        .button {
          display: inline-block;
          padding: 10px 20px;
          background-color: #3498db;
          color: #ffffff;
          text-decoration: none;
          border-radius: 3px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Task Promotion Notification</h2>
        <p>Dear User,</p>
        <p>The task "<strong>${result[0].Task_name}</strong>" has been promoted to the "Done" state.</p>
    
        <div class="task-details">
          <strong>Task Details:</strong>
          <ul>
            <li><strong>Task Name:</strong> ${result[0].Task_name}</li>
            <li><strong>Assigned To:</strong> ${result[0].Task_owner}</li>
          </ul>
        </div>
    
        <p>Thank you for your attention.</p>
        <p>Best Regards,<br>Your TMS Team</p>
    
        <div class="button-container">
          <a href="${applink}" class="button">View Task</a>
        </div>
      </div>
    </body>
    </html>`

    console.log("Send an email")

    sendEmail({
      to: "user@tms.com",
      subject: "A task is done and needs your attention!",
      text,
      html
    })
      .then(() => {
        console.log("Send email completed")
      })
      .catch(error => {
        console.log("error: ", error)
      })

    // success=========================================================
    console.log("success code")
    return res.json({
      code: "S100"
    })
  } catch (e) {
    console.log(e)
    // 12. catch other errors
    console.log("error code 12")
    // async error
    return res.json({
      code: "T701"
    })
  }
}
