const express = require("express");
const path = require("path");
const https = require("https");
const fs = require("fs");
const helmet = require("helmet");
const app = express();
app.use(helmet());
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/secret", (req, res) => {
  res.send("your personal secret value is 42!");
});

https
  .createServer({
    key: fs.readFileSync("key.pem"),
    cert: fs.readFileSync("cert.pem"),
  })
  .listen(3000, () => {
    console.log("Server is running on port 3000");
  });
