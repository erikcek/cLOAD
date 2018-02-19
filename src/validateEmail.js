var emailValidator = require("email-validator");

module.exports = function(email) {
  return emailValidator.validate(email);
};
