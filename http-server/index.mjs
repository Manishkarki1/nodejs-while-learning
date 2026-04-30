// const http = require("http");
import http from "http";
const PORT = 3000;

const server = http.createServer();

const friends = [
  { id: 0, name: "bhupendra" },
  { id: 1, name: "prajwal" },
];

server.on("request", (req, res) => {
  const items = req.url.split("/"); //  /friends/2=>['','friends','2']
  if (req.method === "POST" && items[1] === "friends") {
    req.on("data", (data) => {
      const friend = data.toString();
      console.log("Request:", friend);
      friends.push(JSON.parse(friend));
    });
    req.pipe(res);
  } else if (req.method === "GET" && items[1] === "friends") {
    //the below both method is same
    // res.writeHead(200, {
    //   "Content-Type": "application/json", //this is where we can set what kind of data to transfer in server
    // }); 
    res.statusCode = "200";
    res.setHeader("Content-Type", "application/json");
    if (items.length === 3) {
      const friendIndex = Number(items[2]);
      res.end(JSON.stringify(friends[friendIndex]));
    } else {
      res.end(JSON.stringify(friends));
    }
  } else if (req.method === "GET" && items[1] === "messages") {
    res.setHeader("Content-Type", "text/html");
    res.write("<html>");
    res.write("<body>");
    res.write("<ul>");
    res.write("<li>hey manish!</li>");
    res.write("<li>Are you fine my friend?</li>");
    res.write("<li>I hope you are fine</li>");
    res.write("</ul>");
    res.write("</body>");
    res.write("</html>");
    res.end();
  }
});
server.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
}); //127.0.0.1 => localhost
