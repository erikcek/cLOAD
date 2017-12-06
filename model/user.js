var mongoose = require("mongoose");
var bcrypt = require("bcrypt-nodejs");

var userSchema = mongoose.Schema({
	local: {
		username                : {type: String},
		password                : {type: String},
        email                   : {type: String},
        passwordResetToken      : String,
        passwordResetExpiration : String 
	},
    google: {
        id           : String,
        token        : String,
        email        : String,
        name         : String
    },
    directory: {type: mongoose.Schema.Types.ObjectId, ref: "directories"}
}, {collection: "users"});

userSchema.methods.generateHash = function(password) {
	return bcrypt.hashSync(password,  bcrypt.genSaltSync(8), null)
};

userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.local.password);
};

module.exports = mongoose.model("User", userSchema); 