const express = require("express");
const path = require("path");

const friendsRouter = require("./routes/friends.router");
const messageRouter = require("./routes/messages.router");
const { title } = require("process");
const app = express();
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));
const PORT = 4000;

//first middleware
app.use((req, res, next) => {
  const start = Date.now();
  next();
  //actions go here...
  const delta = Date.now() - start;
  console.log(`${req.method} ${req.baseUrl}${req.url} ${delta}ms`);
});
app.use("/site", express.static(path.join(__dirname, "public"))); //serving website
app.use(express.json());

// route handlers
app.get("/", (req, res) => {
  res.render("index", {
    title: "Serving website",
    caption: "Asia Map",
  });
});
app.use("/friends", friendsRouter);
app.use("/messages", messageRouter);

//these all work is done in routes folder
//POST
// app.post("/friends", friendsController.postFriend);
// // GET /friends
// app.get("/friends", friendsController.getFriends);
// // parameterized route
// // GET /friends/2
// app.get("/friends/:friendId", friendsController.postFriend);

// app.get("/messages", messagesController.getMessages);
// app.post("/messages", messagesController.postMessage);
app.listen(PORT, () => {
  console.log(`Listening on ${PORT}`);
});
