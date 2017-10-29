var async = require("async");
var User = require("../model/user");

module.exports = function(req, res) {
	async.waterfall([

		function(done) {
			if (req.body.password == req.body.controlPassword) {
				return done(false);
			}
			else {
				req.flash("resetMessage", "Passwords are not tha same.");
				return done(true);
			}
		},

		function(done) {
			var checkedPassword = require("./validatePassword")(req.body.password);
			if(checkedPassword.isValidated) {
				return done(false);
			}
			else {
				req.flash("resetMessage", checkedPassword.message);
				return done(true);
			}
		},

		function(done) {
			User.findOne( {"local.passwordResetToken": req.params.token, "local.passwordResetExpiration": {$gt: Date.now() }}, function(err, user){
				return done(err, user);
			});
		},

		function(user, done) {
			user.local.password = user.generateHash(req.body.password);
			user.local.passwordResetToken = undefined;
			user.local.passwordResetExpiration = undefined;

			user.save(function(err) {
				return done(err);
			})
		},
		function(done) {
			req.flash("forgetMessage", "Password was changed");
			return res.redirect("/forget");
		}

	],function(err) {
		return res.redirect("back")
	});
}