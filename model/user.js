var mongoose = require("mongoose");
var bcrypt = require("bcrypt-nodejs");

var userSchema = mongoose.Schema({
	local: {
		username                : {type: String, required: true},
		password                : {type: String, required: true},
        email                   : {type: String, required: true},
        passwordResetToken      : String,
        passwordResetExpiration : String 
	},
	facebook         : {
        id           : String,
        token        : String,
        email        : String,
        name         : String
    },
    twitter          : {
        id           : String,
        token        : String,
        displayName  : String,
        username     : String
    },
    google           : {
        id           : String,
        token        : String,
        email        : String,
        name         : String
    }
});

userSchema.methods.generateHash = function(password) {
	return bcrypt.hashSync(password,  bcrypt.genSaltSync(8), null)
};

userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.local.password);
};

module.exports = mongoose.model('User', userSchema);