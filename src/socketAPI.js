var fs = require("fs");
var Directory = require("../model/directory");
var async = require("async");

module.exports = function(io) {
	io.on('connection', socket => {
		socket.on("info", function(){
			console.log(socket.request.session);
		});

		//#######################################################################################
		// 										lsFiles
		//#######################################################################################

		socket.on("lsFiles", function(data) {
			var directoryName = getDirectoryName(socket.request);
			Directory.findOne({"_id": socket.request.user.directory}, function(err, directory) {
				if (err) {
					return console.log("error in socketAPI on lsFiles");
				}
				console.log(directory);
			});
			/*
			fs.readdir(directoryName + data.path, (err,files) => {

				var filesForReturn = new Array();
				
				if (err) {
					console.log(err)
				}
				else {
					files.forEach( function(file) {
						if(fs.statSync(directoryName + data.path + "/" + file).isDirectory() != true){
							
							filesForReturn.push(file);	
						}		
					});
					socket.emit("lsFilesReturn", filesForReturn);
				}
			});
			*/

		});
//##############################################################################################################################
//##############################################################################################################################
												//all in progress
//##############################################################################################################################
//##############################################################################################################################
		socket.on("createNewDirectory", function(data) {

			var workingDirectory = socket.request.session.workingDirectory;

			async.waterfall([
				function(done) {
					console.log("1");
					Directory.findOne({ "_id": workingDirectory}, function(err, directory) {
						if (err) {
							return done(true);
						}
						else if (!directory) {
							return done(true);
						}
						else {
							return done(false, directory);
						}

					});
				},

				function(directory, done) {
					console.log("2");
					var newDirectory = new Directory();

					newDirectory.name = data.name;
					newDirectory.path = directory.path + data.name + "/";
					newDirectory.parentDirectoryPath = directory.path;

					return done(false, directory, newDirectory);
				},

				function(directory, newDirectory, done) {
					console.log("3");
					fs.mkdir(newDirectory.path, function(err) {
						if (err) {
							//socket.request.flash("directoryCreateError", "Directory allready exists");
							return done(true);
						}
						return done(false, directory, newDirectory);
					});
				},

				function(directory, newDirectory, done) {
					console.log("4");
					newDirectory.save(function(err, newDirectory) {
						if (err) {
							console.log("unable to create newDirectory document  socketAPI/createNewDirectory");
							var errorIn = "saveNewDirectory";
							return done(true, errorIn, directory, newDirectory);
						}
						return done(false, directory, newDirectory);
					});
				},

				function(directory, newDirectory, done) {
					console.log("5");
					directory.nestedDirectories.push({
						name 	: data.name,
						_id		: newDirectory._id
					});

					directory.save(function(err) {
						console.log("6");
						if (err) {
							console.log("unable to update directory document  socketAPI/createNewDirectory");
							var errorIn = "saveDirectory";
							return done(true, errorIn, directory, newDirectory);
						}
						return done(false, directory, newDirectory);
					}); 
				},

				function(directory, newDirectory) {
					console.log("directory");
					console.log(directory);
					console.log("newDirectory");
					console.log(newDirectory);
				}



			], function(err, errorIn, directory, newDirectory) {
				if (errorIn == "saveNewDirectory") {
					fs.rmdir(newDirectory.path, function (err) {
						if (err) {
							console.log(directory.path + "unable to remove |error in socketAPI create new directory|");
						}	
						console.log("11 all");
					});
				}

				else if (errorIn == "saveDirectory") {
					fs.rmdir(newDirectory.path, function (err) {
						if (err) {
							console.log(directory.path + "unable to remove |error in socketAPI create new directory|");
						}
						else {
							Directory.remove( {_id: newDirectory._id}, function(err) {
								if (err) {
									console.log("id. "+ newDirectory._id + "unable to remove directory document |error in socketAPI create new directory|");
								}
							});
						}
					});
				}
				console.log("error in createNewDirectory");
			})
/*
			Directory.findOne({ "_id": socket.request.session.workingDirectory}, function(err, directory) {
				if (err) {
					return 0
				}

				else {
					fs.mkdir(directory.parentDirectoryPath + directory.name + "/" + data, function(err) {
						if (err) {
							console.log("error in creating new directory  SOCKETAPI")
						}
						else {
							var newDirectory = new Directory();

							newDirectory.name = data;
							newDirectory.parentDirectoryPath = directory.parentDirectoryPath + directory.name + "/"

							newDirectory.save(function(err, newDirectory) {
								if(!err) {
									directory.nestedDirectories.push({name: data, _id: newDirectory._id});
									directory.save(function(err) {
										if (!err) {
											console.log(newDirectory);
										}
									})
								}
							})
						}
					})
					console.log(directory);
				}
			})
			*/
		});

		socket.on("openDirectory", function(data) {
			Directory.findOne( { $and: [{ "_id": socket.request.session.workingDirectory}, {"nestedDirectories.name": data}] }, function(err, directory) {
				if (err) {
					console.log(err);
				}
				else if (directory){
					var idOfDirectory = directory.nestedDirectories.filter(function(el) {
						return el.name == data;
					})[0]._id;

					socket.request.session.workingDirectory = idOfDirectory;

					console.log(idOfDirectory);
				}
			});
		});

//##############################################################################################################################
//##############################################################################################################################
//##############################################################################################################################
//##############################################################################################################################



		//#######################################################################################
		// 									lsDirectories
		//#######################################################################################

		socket.on("lsDirectories", function(data) {

			var directoryName = getDirectoryName(socket.request);

			fs.readdir(directoryName + data.path, (err,files) => {

				var directoriesForReturn = new Array();
				
				if (err) {
					console.log(err)
				}
				else {
					files.forEach( function(directory) {
						if(fs.statSync(directoryName + data.path + "/" + directory).isDirectory() == true){
							
							directoriesForReturn.push(directory);	
						}
					});
					socket.emit("lsDirestoriesReturn", directoriesForReturn);
				}

			});

		});

		//#######################################################################################
		// 										lsFiles
		//#######################################################################################

	});
}



function getDirectoryName(req) {
	if (req.user.local.username) {
		var directoryName = require("../config/userDirectories.js").localFolder + req.user.local.username;
	}
	else if (req.user.google.email) {
		var directoryName = require("../config/userDirectories.js").googleFolder + req.user.google.email;
	}
	else {
		return console.log("error in lsDirectory socket.io");
	}
	return directoryName;
}




