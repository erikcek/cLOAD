
var LocalStrategy = require("passport-local").Strategy;
var GoogleStrategy = require("passport-google-oauth").OAuth2Strategy;

var configAuth = require("./auth");
var User = require("../model/user");
var Directory = require("../model/directory");
var fs = require("fs");
var async = require("async");

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
						console.log("else");
						async.waterfall([
							//######################################################################
							// 							check username
							//######################################################################
							function(async_done) {
								var checkedUserName =require("../src/validateUserName")(username);

								if (checkedUserName.isValidated) {
									return async_done(false);
								}
								else {
									req.flash("singupMessage", checkedUserName.message);
									return async_done(true);
								}
							},
							//######################################################################
							// 					check if passwords are the same
							//######################################################################
							function(async_done) {
								if (req.body.controlPassword == password) {
									return async_done(false);
								}
								else {
									req.flash("singupMessage", "Passwords are not the same.");
									return async_done(true);
								}
							},
							//######################################################################
							// 				check if email is correct and if email exists
							//######################################################################
							function(async_done) {
								var email = req.body.email;
								if (require("../src/validateEmail")(email)) {
									User.findOne( {"local.email": email}, function(err, user) {
										if (err) {
											return async_done(true);
										}
										else if(user) {
											req.flash("singupMessage", "Email is allready taken.");
											return async_done(true);
										}
										else {
											return async_done(false, email);
										}
									});
								}
								else {
									req.flash("singupMessage", "Email is incorrect.");
									return async_done(true);
								}
							},
							//######################################################################
							// 					check if password is strong enaught
							//######################################################################
							function(email,async_done) {
								var checkedPassword = require("../src/validatePassword")(password);

								if(checkedPassword.isValidated) {
									var newUser = new User();									//creating new user
									newUser.local.username = username;
									newUser.local.password = newUser.generateHash(password);
									newUser.local.email    = email

					                return async_done(false, newUser);			//returning new user
								
								}
								else {
									req.flash("singupMessage", checkedPassword.message);
									return async_done(true);
								}
							},
							//######################################################################
							// 					create new directory for new user
							//######################################################################
							function(newUser, async_done) {
				                fs.mkdir( require("./userDirectories").localFolder + newUser.local.username , function(err) {
				       				if (err) {
				       					return async_done(err);
				       				}
				       				else {
				       					return async_done(false, newUser);
				       				}
				                });
							},

							function(newUser, async_done) {
								var newDirectory = Directory();
								newDirectory.name = newUser.local.username;
								newDirectory.parentDirectoryPath = require("./userDirectories").localFolder;

								newDirectory.save(function(err, directory) {
									if (err) {
										return async_done(err);
									}
									else {
										return async_done(false, newUser, directory._id);
									}
								});
							},

							function(newUser, id, async_done) {
								newUser.directory = id;

								newUser.save(function(err, newUser) {
									if (err) {
										return async_done(err)
									}
									else {
										return done(null,newUser);
									}
								})
							}

						], function(err) {
							console.log("passport sing-up local error");
							return done(null, false);
						});
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

    		async.waterfall([

    			function(async_done) {
    				User.findOne( {"google.id" : profile.id}, function(err, user) {
    					if (err) {
    						return async_done(true);
    					}
    					else if (user) {
    						return done(null, user);
    					}
    					else {
    						return async_done(false);
    					}
    				})
    			},
    			// check if user directory is not in directory collection and if there is than will do nothing for now
    			function(async_done) {
    				Directory.findOne( {"name": profile.emails[0].values }, function(err, directory) {
    					if (err) {
    						return async_done(true);
    					}
    					else if (directory) {
    						console.log(directory)
    						return async_done(true);
    					}
    					else {
    						return async_done(false);
    					}
    				})
    			},

    			//check if in userDirectories/google folder is not directory with same email as newUser, if there is than will do nothing for now
    			function(async_done) {
    				fs.exists(require("./userDirectories").googleFolder + profile.emails[0].value, function(exists) {
    					if (exists) {
    						return async_done(true);
    					}
    					else {
    						return async_done(false);
    					}
    				})
    			},

    			function(async_done) {
    				var newUser = new User();
    				var newDirectory = new Directory();

    				newDirectory.name = profile.emails[0].value;
    				newDirectory.parentDirectoryPath = require("./userDirectories").googleFolder;

    				newUser.google.id 		= 	profile.id;
    				newUser.google.token 	= 	token;
    				newUser.google.name 	= 	profile.displayName;
    				newUser.google.email 	= 	profile.emails[0].value;

    				return async_done(false, newUser, newDirectory);
    			},

    			function(newUser, newDirectory, async_done) {
    				newDirectory.save(function(err, directory) {
    					if (err) {
    						return async_done(true);
    					}

    					else {
    						newUser.directory = directory._id;
    						return async_done(false, newUser);
    					}
    				});
    			},

    			function(newUser, async_done) {
    				newUser.save(function(err, user) {
    					if (err) {
    						return async_done(true);
    					}
    					else {
    						return async_done(false, user);
    					}
    				});
    			},

    			function(user, async_done) {
    				fs.mkdir( require("./userDirectories.js").googleFolder +  user.google.email , function(err) {
	                	if (err) {
	                		console.log("Unable to create directory for new user.");
	                		console.log(err);
	                		return async_done(true);
	                	}
	                	else {
	                		console.log("Successfully created dirrectory for new user.");
	                		return done(null, user);
	                	}
                	});
    			}
    		], function(err) {
    			console.log("error in passport google at waterrfall err function");
    			return done(null, false);
    		});
    		/*
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
    				console.log(newUser);

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
                	});
    			}
			}); */
    	});
    }

    ));
    

};