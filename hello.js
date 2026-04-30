// const hobby = process.argv[2];
// if (hobby == "coding") {
//   console.log(`now start ${hobby}`);
// } else {
//   console.log("learn new hobby");
// }

//Event emitter
const EventEmitter = require("events");
const celebrity = new EventEmitter();

//Subscribe to celebrity for observer 1
celebrity.on("race win", function () {
  console.log("Congratulations! You are the best");
});
celebrity.on("race lose", function () {
  console.log("Bad luck! next time");
});
celebrity.emit("race win");
celebrity.emit("race lose");
//http module
// const http = require("https");
// using destructuring
const { get } = require("https");
const req = get("https://www.google.com", (res) => {
  res.on("data", (chunk) => {
    console.log(`Data chunk:${chunk}`);
  });
  res.on("end", () => {
    console.log("No more data");
  });
});

// req.end(); //it is needed when using without destructuring {get}
