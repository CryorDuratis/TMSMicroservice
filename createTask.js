// 1. endpoint exist checked in app.js
// 2. endpoint correct checked in app.js

exports.CreateTask = async (req, res) => {
  try {
    // define request body parameters
    const { username, password, app_acronym, task_name } = req.body

    // 3. mandatory fields present
    // 4. valid data types
    // 5. valid user credentials
    // 6. active user
    // 7. app exists
    // 8. permitted user
    // 9. sql check

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
