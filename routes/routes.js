
module.exports = function(app, passport) {



	app.get('/socket.io-file-client.js', (req, res, next) => {
	    return res.sendFile("/Users/erikkandalik/Documents/rop/cLOAD/public/js/socket.io-file-client/socket.io-file-client.js");
	});
	 
	app.get('/socket.io.js', (req, res, next) => {
	    return res.sendFile(__dirname + '/../node_modules/socket.io-client/dist/socket.io.js');
	});

	app.get('/app.js', (req, res, next) => {
		console.log("test");
		console.log(__dirname + "/../public/js/client-socket.js");
	    return res.sendFile("/Users/erikkandalik/Documents/rop/cLOAD/public/js/client-socket.js");
	});





	app.get("/", function(req, res) {
		res.render("index");
		console.log(req.user);
		console.log(req.session)
		//console.log(req.session.user);
	});

	app.get("/sign", function(req, res) {
		res.render("sign", {"singupMessage": req.flash("singupMessage")});
	});

	app.get("/signin", function (req, res){
		res.render("login", {"signInMessage": req.flash("signInMessage")});
	});

	app.post("/signin", passport.authenticate("local-login", {
		successRedirect	: "/profile",
		failureRedirect	: "/signin",
		failureFlash	: true
	}));

	app.post("/signup", passport.authenticate("local-singup", {
		successRedirect : '/profile', 		// redirect to the secure profile section
        failureRedirect : '/sign', // redirect back to the signup page if there is an error
        failureFlash 	: true 		// allow flash messages
	}));

	app.get("/forget", function(req, res) {
		res.render("forget", {"forgetMessage": req.flash("forgetMessage")});
	});

	app.post("/forget", function(req, res) {
		require("../src/forgetPasswordEmailHandler")(req, res);
	});

	app.get("/reset/:token", function(req,res) {
		require("../src/tokenHandler")(req, res);
	});

	app.post("/reset/:token", function(req, res) {
		require("../src/resetPasswordHandler")(req, res);
	});

	app.get("/auth/google", passport.authenticate("google", {
		scope : ['profile', 'email']
	}));

	app.get("/auth/google/callback", passport.authenticate("google", {
		successRedirect : '/profile',
        failureRedirect : '/'
	}));

	app.get("/profile", isLoggedIn ,function(req, res) {
		console.log(req.user.google.name);
		if(req.user.local.username) {
			res.render("profile", {user: req.user.local.username});
		}
		else {
			res.render("profile", {user: req.user.google.name});
		}
	});

	app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });

};

function isLoggedIn(req, res, next) {

    if (req.isAuthenticated())
        return next();

    res.redirect('/');
};