let ACCESS_TOKEN = 1;
let CODE = 1;

module.exports = {
  getCode: () => CODE,
  setCode: (newCode) => {CODE = newCode;},
  getAccessToken: () => ACCESS_TOKEN,
  setAccessToken: (newToken) => {ACCESS_TOKEN = newToken;}
};