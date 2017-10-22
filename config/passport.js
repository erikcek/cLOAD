
var LocalStrategy = require("passport-local").Strategy;
var GoogleStrategy = require("passport-google-oauth").OAuth2Strategy;

var configAuth = require("./auth");

var User = require("../model/user");

var fs = require("fs");

module.exports = function(passport) {
	
	passport.serializeUser(function(user, done) {
		
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
    
        User.findById(id, function(err, user) {
            done(err, user);
        });
    });

    passport.use("local-singup", new LocalStrategy({
    	usernameField 		: "username",
    	passwordField 		: "password",
    	passReqToCallback 	: true
    },
		function(req, username, password, done) {
			
			process.nextTick(function() {
				User.findOne({ "local.username" :username }, function(err, user) {
					if (err) {
						
						return done(err);
					}

					if (user) {
						
						return done(null, false, req.flash("singupMessage", "This name is allready taken."));
					}
					else {
						console.log(password);
						var checkedPassword = require("./validatePassword")(password);

						if(checkedPassword.isValidated) {
							var newUser = new User();
							newUser.local.username = username;
							console.log("passport.js passport check <--");
							console.log(req.body);
							newUser.local.password = newUser.generateHash(password);

							newUser.save(function(err) {
			                    if (err)
			                        throw err;
			                    return done(null, newUser);
			                });
			                
			                fs.mkdir( require("./userDirectories.js").localFolder + username , function(err) {
			                	if (err) {
			                		console.log("Unable to create directory for new user.");
			                		console.log(err);
			                	}
			                	else {
			                		console.log("Successfully created dirrectory for new user.");
			                	}
			                })
						}
						else {
							console.log("passport.js local singup strategy <--");
							console.log(checkedPassword.message);
							return done(null, false, req.flash("singupMessage", checkedPassword.message));
						}
					}

				});
			});
		}
    ));

    passport.use("local-login", new LocalStrategy({
    	usernameField: "username",
    	passwordField: "password",
    	passReqToCallback: true
    },
	    function(req, username, password, done) {
	    	User.findOne( {"local.username": username}, function(err, user) {
	    		if (err) {
	    			return done(err);
	    		}

	    		if (!user) {
	    			return done(null, false, req.flash("loginMessage", "User not found."));
	    		}

	    		if (!user.validPassword(password)) {
	    			return done(null, false, req.flash("Wrong password"));
	    		}

	    		return done(null, user);
	    	});
	    }


    ));

    passport.use(new GoogleStrategy({	
    	clientID 		: 	configAuth.google.clientID,
    	clientSecret 	: 	configAuth.google.clientSecret,
    	callbackURL 	: 	configAuth.google.callbackURL
    },

    function(token, refreshToken, profile, done) {

    	process.nextTick(function() {

    		User.findOne( {"google.id" : profile.id}, function(err, user) {
    			if (err) {
    				console.log("in error gogole");
    				return done(err);
    
    			}

    			if (user) {
    				console.log("in user gogole");
    				return done(null, user);
    				
    			}
    			else {
    				console.log("in not user gogole");
    				var newUser = new User();

    				newUser.google.id 		= 	profile.id;
    				newUser.google.token 	= 	token;
    				newUser.google.name 	= 	profile.displayName;
    				newUser.google.email 	= 	profile.emails[0].value;

    				newUser.save(function(err) {
    					if (err) {
    						return done(err);
    					}
    					return done(null, newUser);
    				});

					fs.mkdir( require("./userDirectories.js").googleFolder +  profile.emails[0].value , function(err) {
	                	if (err) {
	                		console.log("Unable to create directory for new user.");
	                		console.log(err);
	                	}
	                	else {
	                		console.log("Successfully created dirrectory for new user.");
	                	}
                	})
    			}
			});
    	});
    }

    ));
    

};