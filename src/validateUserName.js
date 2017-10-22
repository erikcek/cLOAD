var userNameSchema = require("password-validator");

var schema = new userNameSchema();

schema
	.is().min(1)
	.is().max(100)
	.has().not().spaces();


module.exports = function(userName) {
	if (schema.validate(userName)) {
		return {isValidated: true};
	}
	else {
		var message = [];
		var errorMessages = schema.validate(userName, {list: true});
		for (var i = 0; i < errorMessages.length; i++) {
			switch (errorMessages[i]) {
				case "min":
					message.push("User name must be at least 1 character long.");
					break;
				case "max":
					message.push("User name must be at shorter than 100 characters.");
					break;
				case "spaces":
					message.push("User name cannot have any spaces.");
					break;
			}
		}
		return {isValidated: false, message: message};
	}
}