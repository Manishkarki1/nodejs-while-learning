const path = require("path"); //  /folder/files.jpg \folder\files.jpg
const { title } = require("process");
const friends = require("../models/friends.model");

function getMessages(req, res) {
  //dirname is folder name where this files is save
  // res.sendFile(path.join(__dirname, "..", "public", "assets", "download.jpg"));
  // res.send("<ul><li>Hello John</li></ul>");

  res.render("messages", {
    title: "messages to friends",
    friend: "niroj",
  });
}
function postMessage(req, res) {
  console.log("Updating messages..");
}
module.exports = {
  getMessages: getMessages,
  postMessage: postMessage,
};
