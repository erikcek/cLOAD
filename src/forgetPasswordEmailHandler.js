var async = require("async");
var User = require("../model/user");
var randomstring = require("randomstring");
var nodemailer = require("nodemailer");
var configAuth =  require("../config/auth");

module.exports = function(req, res) {
	async.waterfall([
		function(done) {
			User.findOne( {"local.email": req.body.email}, function(err, user){
				if(!user) {
					req.flash("forgetMessage", "Email does not exist");
					return done(true);
				}
				return done(err, user);
			});
		},

		function(user, done) {
			var token = randomstring.generate(40);

			user.local.passwordResetToken = token;
			user.local.passwordResetExpiration = Date.now() + 3600000;

			user.save(function(err) {
				return done(err, user, token);
			});
		},

		function(user, token, done) {
			var transporter = nodemailer.createTransport({
				service: 'gmail',
				auth: {
					user: configAuth.googleEmailServer.username,
					pass: configAuth.googleEmailServer.password
				}
			});

			var mailOptions = {
				from: 'youremail@gmail.com',
				to: user.local.email,
				subject: 'Sending Email using Node.js',
				text: "localhost:8888/reset/" + token
			};

			transporter.sendMail(mailOptions, function(error, info){
				if (error) {
					console.log(error);
				} else {
					console.log('Email sent: ' + info.response);
				}
			});
			console.log(token);
			return done(false);
		}
	], function(err) {
		return res.redirect("/forget");
	}
	);
}








