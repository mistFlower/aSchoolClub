const express = require("express");
const expressSession = require("express-session");
const serveStatic = require("serve-static");
const path = require("path");
const fs = require("fs");
const isMobile = require("mobile-detect");
const mysql = require("./db_mysql.js");
const connection = mysql.connection;
const app = express();
const port = app.listen(process.env.PORT || 80);
const bodyParser = require("body-parser");
let user = {};
connection.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use("/static", express.static("public"));
app.use(serveStatic(path.join(__dirname, "public")));
app.listen(port, function () {
  console.log("start! express server");
});
app.use(bodyParser.json());
app.use(
  expressSession({
    secret: "my key",
    resave: true,
    saveUninitialized: true,
  })
);

/** 첫화면 */
app.get("/", function (req, res) {
  if (isMobileSession(req, res)) {
    //PC
    page("index.html", req, res);
  } else {
    //MOBI
    page("login.html", req, res);
  }
});

/** 회원가입 로직 */
app.post("/join", function (req, res) {
  const { name, id, password, state } = req.body;
  const sql = `INSERT  INTO USER(USER_ID, PASSWORD, JOIN_DATE, NAME, USER_STATE) VALUES ('${id}', '${password}','${nowDate(
    0
  )}',' ${name}',' ${state}');`;
  //mysql.query(sql);
  connection.query(sql, function (err, results, fields) {
    if (err) {
      console.log(err);
    }
  });
  res.json("success");
});

/** 로그인 로직 */
app.post("/login", function (req, res) {
  const { id, password } = req.body;
  const sql = `WITH USER_TABLE AS (
    SELECT USER_ID, PASSWORD, JOIN_DATE, NAME, USER_STATE 
    FROM user 
    WHERE USER_ID = '${id}' AND PASSWORD = '${password}')
  SELECT A.*, success
    FROM (SELECT * FROM USER_TABLE) A, 
    (SELECT EXISTS( SELECT * FROM USER_TABLE) as success
     FROM DUAL) B;`;
  connection.query(sql, function (err, results, fields) {
    if (err) {
      console.log(err);
    }
    if (results.length > 0) {
      const { NAME, success, PASSWORD, USER_ID, USER_STATE } = results[0];

      if (success == 0) {
        res.json({ success: 0 });
      } else if (success == 1) {
        res.json({ success: true, name: NAME.trim() });
        req.session.user = {
          id: id,
          name: NAME.trim(),
          state: USER_STATE.trim(),
          timer: nowDate(1) + 1000,
          authorized: true,
        };
        user = req.session.user;
      }
    } else {
      res.json({ success: 0 });
    }
  });
});

/** 모바일 메인 화면 */
app.get("/index", function (req, res) {
  if (!isLoginSession()) {
    user = {};
    page("login.html", req, res);
  } else if (user) {
    page("index.html", req, res);
  } else {
    console.log("not");
  }
});

/** 모바일 메인 화면 */
app.post("/isSelectClub", function (req, res) {
  if (!isLoginSession()) {
    res.json({ msg: "로그인이 만료되었습니다." });
  } else {
    const sql =
      user.state == "professor"
        ? `SELECT * FROM club WHERE PID = '${user.id}' AND CLUB_STATE = 'Y'`
        : `SELECT * FROM apply_club WHERE USER_ID = '${user.id}' AND APPLY_STATE != 'F'`;
    connection.query(sql, function (err, results, fields) {
      if (err) {
        console.log(err);
      } else {
        if (results.length <= 0) {
          res.json({ leg: 0, state: user.state });
        } else {
          res.json({ leg: results.length, state: user.state, apply: results });
        }
      }
    });
  }
});

/** 동아리 생성 페이지 */
app.get("/makeClub", function (req, res) {
  if (!isLoginSession()) {
    page("login.html", req, res);
    //res.json({ msg: "로그인이 만료되었습니다." });
  } else {
    page("makeClub.html", req, res);
  }
});

/** 동아리 생성 로직 */
app.post("/makeClubLogic", function (req, res) {
  const { name } = req.body;
  const clubId = user.id + "-" + nowDate(1);

  let sql = `INSERT INTO apply_club (APPLY_SN, USER_ID, CLUB_ID, APPLY_STATE, JOIN_STATE, CLUB_NAME) 
  VALUES ( '${clubId}', '${user.id}', '${clubId}', 'N', 'Y', '${name}');`;
  connection.query(sql, function (err, results, fields) {
    if (err) {
      console.log(err);
    }
  });

  sql = `INSERT INTO club (CLUB_ID, SID, PID, CLUB_STATE, CLUB_NAME) 
  VALUES ( '${clubId}', '${user.id}', '-', 'N', '${name}');`;
  connection.query(sql, function (err, results, fields) {
    if (err) {
      console.log(err);
    }
  });
  res.json("success");
});

/** 동아리 고문 페이지 */
app.get("/clubList", function (req, res) {
  if (!isLoginSession()) {
    page("login.html", req, res);
  } else {
    page("clubList.html", req, res);
  }
});

/** 고문 : 동아리 생성 */
app.post("/clubProUpdate", function (req, res) {
  const { id } = req.body;
  sql = `UPDATE apply_club  SET APPLY_STATE = 'Y' WHERE CLUB_ID = '${id}';`;
  console.log(sql);
  connection.query(sql, function (err, results, fields) {
    if (err) {
      console.log(err);
    }
  });

  sql = `UPDATE club SET CLUB_STATE = 'Y', PID = '${user.id}' WHERE CLUB_ID = '${id}';`;
  console.log(sql);
  connection.query(sql, function (err, results, fields) {
    if (err) {
      console.log(err);
    }
  });
});

/** 동아리 고문 리스트 조회 로직 */
app.post("/clubListSelectLogic", function (req, res) {
  if (!isLoginSession()) {
    page("login.html", req, res);
  } else {
    const clubId = user.id + "-" + nowDate(1);
    let sql = `SELECT ap.*, u.name FROM apply_club ap, user u WHERE APPLY_STATE = 'N' AND ap.USER_ID = u.user_id`;
    console.log(sql);
    connection.query(sql, function (err, results, fields) {
      if (err) {
        console.log(err);
      } else {
        if (results.length <= 0) {
          res.json({ leg: 0, state: user.state });
        } else {
          res.json({ leg: results.length, state: user.state, apply: results });
        }
      }
    });
  }
});
/** 회원가입 화면 */
app.get("/register", function (req, res) {
  page("register.html", req, res);
});

/** 동아리 페이지 */
app.post("/clubPostCheck", function (req, res) {
  const { id } = req.body;
  let sql =
    user.state == "professor"
      ? `SELECT PID FROM CLUB WHERE CLUB_ID = '${id}' AND PID = '${user.id}'`
      : `SELECT USER_ID FROM APPLY_CLUB WHERE USER_ID = '${user.id}' AND CLUB_ID = '${id}'`;
  connection.query(sql, function (err, results, fields) {
    if (err) {
      console.log(err);
    } else {
      if (results.length >= 1) {
        user.clubIdPost = `${id}`;
        console.log(user.clubIdPost);
        res.json("/clubPost");
      } else {
        res.json("/index");
      }
    }
  });
});

/** 동아리 상세 페이지 */
app.get("/clubPost", function (req, res) {
  page("clubPost.html", req, res);
});

app.post("/clubPostLogic", function (req, res) {
  let sql = `SELECT * FROM CLUB_NOTICE WHERE CLUB_ID = '${user.clubIdPost}' `;
  connection.query(sql, function (err, results, fields) {
    if (err) {
      console.log(err);
    } else {
      res.json({ results: results });
    }
  });
});

/** 동아리 게시글 작성 페이지 */
app.get("/clubPostCreate", function (req, res) {
  page("clubPostCreate.html", req, res);
});

app.post("/insertPostLogic", function (req, res) {
  let sql = `INSERT INTO club_notice (CLUB_NOTICE_ID, USER_ID, CLUB_ID, NOTICE_TITLE, NOTICE_CONTENT, NOTICE_DATE, STATE_VIEWS) 
  VALUES (${user.clubIdPost}_${nowDate(0)}, ${user.id}, ${
    user.clubIdPost
  }, NOTICE_TITLE, NOTICE_CONTENT, NOTICE_DATE, STATE_VIEWS);`;
  res.json({ results: results });
});
/** ------------------------------------------- */
/** -------------------Utill------------------- */
/** ------------------------------------------- */

/** Utill isEmpty 함수 */
var isEmpty = function (value) {
  if (
    value == "" ||
    value == null ||
    value == undefined ||
    (value != null && typeof value == "object" && !Object.keys(value).length)
  ) {
    return true;
  } else {
    return false;
  }
};

var isLoginSession = function () {
  if (user.timer <= nowDate(1)) {
    return false;
  } else if (isEmpty(user.id)) {
    return false;
  } else {
    return true;
  }
};

/** 모바일 세션 */
const isMobileSession = function (req, res) {
  const md = new isMobile(req.headers["user-agent"]);
  return isEmpty(md.mobile()); //true == PC || false == MO/
};

/** JSP 화면 세팅 함수 */
var page = function (jsp, req, res) {
  const root = isMobileSession(req, res)
    ? "WEB_JSP/pc_jsp/"
    : "WEB_JSP/mo_jsp/";
  return fs.readFile(root + jsp, function (rerror, data) {
    res.writeHead(200, { "Context-Type": "text/html" });
    res.end(data);
  });
};

function nowDate(param) {
  let today = new Date();

  let year = today.getFullYear(); // 년도
  let month = today.getMonth() + 1; // 월
  let date = today.getDate();
  let hours = today.getHours(); // 시
  let minutes = today.getMinutes(); // 분
  let seconds = today.getSeconds();
  if (param == 0) {
    return (
      year +
      "/" +
      month +
      "/" +
      date +
      " " +
      hours +
      ":" +
      minutes +
      ":" +
      seconds
    );
  } else if (param == 1) {
    return parseInt(
      year + "" + month + "" + date + "" + hours + "" + minutes + "" + seconds
    );
  }
}
