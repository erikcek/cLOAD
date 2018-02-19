var passwordSchema = require("password-validator");

var schema = new passwordSchema();

var excludePasswords = [
  "123456",
  "123456789",
  "qwerty",
  "12345678",
  "111111",
  "1234567890",
  "1234567",
  "password",
  "qwertyuiop",
  "987654321"
];

schema
  .is()
  .min(8)
  .is()
  .max(50)
  .has()
  .uppercase()
  .has()
  .lowercase()
  .has()
  .digits()
  .has()
  .not()
  .spaces()
  .is()
  .not()
  .oneOf(excludePasswords);

module.exports = function(password) {
  if (schema.validate(password)) {
    return { isValidated: true };
  } else {
    var message = [];
    var checkedPassword = schema.validate(password, { list: true });
    for (var i = 0; i < checkedPassword.length; i++) {
      switch (checkedPassword[i]) {
        case "min":
          message.push("Password must have at least 8 characters.");
          break;
        case "max":
          message.push("Password must have least than 50 characters.");
          break;
        case "uppercase":
          message.push("Password must have at least one uppercase character.");
          break;
        case "lowercase":
          message.push("Password must have at least one lowercase character.");
          break;
        case "digits":
          message.push("Password must have at least one digit.");
          break;
        case "spaces":
          message.push("Password cannot have any spaces");
          break;
      }
    }
    return { isValidated: false, message: message };
  }
};
