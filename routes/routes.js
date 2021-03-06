
module.exports = function(app, passport) {

	app.get("/", function(req, res) {
		res.render("index");
		console.log(req.user);
		console.log(req.session.user);
	});

	app.get("/sign", function(req, res) {
		res.render("sign");
	});

	app.post("/signin", passport.authenticate("local-login", {
		successRedirect	: "/profile",
		failureRedirect	: "/sign",
		failureFlash	: true
	}));

	app.post("/signup", passport.authenticate("local-singup", {
		successRedirect : '/profile', 		// redirect to the secure profile section
        failureRedirect : '/sign', // redirect back to the signup page if there is an error
        failureFlash 	: true 		// allow flash messages
	}));

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