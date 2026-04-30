const express = require("express");
const app = express();
const cluster = require("cluster");
const os = require("os");

PORT = 4000;
function delay(duration) {
  const startTime = Date.now();
  while (Date.now() - startTime < duration) {}
}
app.get("/", (req, res) => {
  res.send(`hey, checking performance ${process.pid}`);
});
app.get("/timer", (req, res) => {
  delay(900);
  res.send("finally" + process.pid);
});
if (cluster.isMaster) {
  console.log("I am Master");
  //logical cores(maximizing cluster performance)
  // const NUM_WORKERES = os.cpus().length;
  // for (let i = 0; i < NUM_WORKERES; i++) {
  //   cluster.fork();
  // }
  // physical cores

  cluster.fork();
  cluster.fork();
} else {
  console.log("I am Worker");
  app.listen(PORT, () => {
    console.log(`listening to port ${PORT}`);
  });
}
