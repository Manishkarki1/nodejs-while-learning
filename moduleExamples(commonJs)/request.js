//it is the short way to export module
// exports.REQUEST_TIMEOUT = 500;

REQUEST_TIMEOUT = 500;
function encrypt(data) {
  return "encrypted data";
}
function send(url, data) {
  const encryptedData = encrypt(data);
  console.log(`sending ${encryptedData} to ${url}`);
}

// console.log(module);
// this is the long way to export module and good to use
module.exports = {
  REQUEST_TIMEOUT,
  send,
};
