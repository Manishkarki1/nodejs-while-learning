const fs = require("fs");
const http = require("http");
PORT = 3000;
http
  .createServer(function (req, res) {
    fs.readFile("index.html", function (err, data) {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.write(data);
      return res.end();
    });
  })
  .listen(PORT, () => {
    console.log("Server started");
  });
