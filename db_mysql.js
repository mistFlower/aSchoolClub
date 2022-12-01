var mysql = require("mysql");
var connection = mysql.createConnection({
  host: "127.0.0.1",
  port: "3306",
  user: "root",
  password: "jongmin",
  database: "sys",
});
// connection.connect();

// function select(
//   sql = "SELECT 'sql => [undefined] or [null]' AS ERROR FROM DUAL"
// ) {
//   connection.query(sql, function (err, results, fields) {
//     if (err) {
//       console.log(err);
//     }
//     console.log(results);
//   });
// }

// function query(
//   sql = "query'sql => [undefined] or [null]' AS ERROR FROM DUAL",
//   res
// ) {
//   connection.query(sql, function (err, results, fields) {
//     if (err) {
//       console.log(err);
//     }
//       // res.render("add", { results: results });
//       // return res;
//   });
// }

exports.connection = connection;

//connection.end(); // DB 접속 종료
