var fs = require("fs");
var ss = require("socket.io-stream");
var Directory = require("../model/directory");
var async = require("async");
const SocketIOFile = require('socket.io-file');

module.exports = function(io) {

	io.on('connection', socket => {

//##############################################################################################################################
//##############################################################################################################################
												//all in progress
//##############################################################################################################################
//##############################################################################################################################
		
		socket.on("startUpload", function(file) {
			//vytvory novy zaznam v scheme pre suvbory
			//zada jej velkost aj to ze este nie je uplne uploadnuty
			//pri ukonceni uploadovania sa tento parameter odsranu (vdaka nemu bude mozne pokracovat v nahrávaní a roztriedit subbory podla 
			// ci su uplne uploadnute)

			console.log("in start Data");
			console.log(file);

			async.waterfall([
				// nájde priečinok v databáze
				function (done) {
					console.log(1);
					Directory.findOne( {"_id": socket.request.session.workingDirectory}, function(err, directory) {
						if (err) {
							return done(err);
						}
						else if (directory) {
							return done(false, directory);
						}
					});
				},
				// overí či už neexistuje subor v databaze
				function (directory, done) {
					console.log(2)
					for (var i=0; i < directory.files.length; i++) {
						if (directory.files[i].name == file.name) {
							return done(true);
						}
					}
					return done(false, directory);
				},

				// overí, či nie je rovnaky subo r v súborovom systéme 
				function (directory, done) {
					console.log(3)
					fs.stat(directory.path + file.name, function(err, stat) {
						if (err == null) {
							return done(false, directory);
							console.log("file exists");
						}

						else if (err.code == 'ENOENT') {
							return done(false, directory);
						}

						else {
							return done(true);
						}
					});
				},

				// pridá súbor do databazy priecinkov, pošle požiadavku na začatie posielania dát,
				// uloží do sessionu správu o tom aké súbory sa uploaduju a ich cestu
				function (directory, done) {
					console.log(4)
					directory.files.push({name: file.name});
					console.log("initiate OK");
					socket.emit("sendData", file.name);
					if (!socket.request.session.uploadFiles) {
						socket.request.session.uploadFiles = [];
					}
					socket.request.session.uploadFiles.push({name: file.name, path: directory.path});
				}
			], function(err) {
				console.log("error in startUpload");  // správa chýb
			})
		});

/*
		socket.on("endUpload", function(fileName) {
			async.waterfall([

				function (done) {
					files = socket.request.session.uploadFiles
					for (var i=0; i< files.length; i++) {
						if (files[i].name = file.name) {
							return done(false, files[i].path);
						}
					}

					return done(true);
				},

				function (path, done) {
					Directory.findOne( {"path": path }, function(err, directory) {
						if (err) {
							return done(err);
						}
						else if (directory) {
							return done(false, directory);
						}
					});
				},

				function (directory, done) {
					//nastavit v directory.files.mojSubor. not FullyUploaded == undefined
					//pravdepodobne bude vytvorena nova schema pre subory
				}

			]);
		});
	*/	

		// socket io stream listener pre upload suborov cez streamy
		ss(socket).on("uploadData", function(stream,file) {   
			console.log("in upload Data");
			console.log(file);

			//stream.pipe(fs.createWriteStream(__dirname + "test.png"));



			async.waterfall([

				function (done) {
					files = socket.request.session.uploadFiles
					for (var i=0; i< files.length; i++) {
						if (files[i].name == file.name) {
							return done(false, files[i].path);
						}
					}

					return done(true);
					/*
					Directory.findOne( {"_id": socket.request.session.workingDirectory}, function(err, directory) {
						if (err) {
							return done(err);
						}
						else if (directory) {
							return done(false, directory);
						}
					}); */
				},

				function (path, done) {
					console.log("cresting write strem for file");
					var writeStream  = fs.createWriteStream(path + file.name);
					//writeStream.write("file")
					stream.pipe(writeStream);
				}
			]);

		});




//##############################################################################################################################
//##############################################################################################################################
//##############################################################################################################################
//##############################################################################################################################
		





		socket.on("info", function(){
			console.log(socket.request.session);
		});

		//#######################################################################################
		// 										lsFiles
		//#######################################################################################

		socket.on("lsFiles", function(data) {

			async.waterfall([

				function(done) {
					var workingDirectory = socket.request.session.workingDirectory;
					Directory.findOne( {"_id": workingDirectory}, function(err, directory) {
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
					var fileNames = new Array();
					for (var i = 0 ; i< directory.files.length; i++) {
						fileNames.push(directory.files[i].name);
					}
					return done(false, fileNames);
				},

				function(fileNames, done) {
					//socket.emit("lsDirectoriesReturn", fileNames);
					console.log(fileNames);
				}

			], function(err) {
				console.log("error in lsFiles | socketAPI ");
			});

		});

		//#######################################################################################
		// 									lsDirectories
		//#######################################################################################

		socket.on("lsDirectories", function() {

			async.waterfall([

				function(done) {
					var workingDirectory = socket.request.session.workingDirectory;
					Directory.findOne( {"_id": workingDirectory}, function(err, directory) {
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
					var directoryNames = new Array();
					for (var i = 0 ; i< directory.nestedDirectories.length; i++) {
						directoryNames.push(directory.nestedDirectories[i].name);
					}
					return done(false, directoryNames);
				},

				function(directoryNames, done) {
					socket.emit("lsDirectoriesReturn", directoryNames);
					console.log(directoryNames);
				}

			], function(err) {
				console.log("error in lsDirectories | socketAPI ");
			});

		});


		//#######################################################################################
		// 										createDirectory
		//#######################################################################################
		
		socket.on("createNewDirectory", function(data) {

			var workingDirectory = socket.request.session.workingDirectory;

			async.waterfall([

									//skontroluje, či pracovný priečinok užívateľa existuje
				//#######################################################################################
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

											//vytvorí objekt newDirectory 	
				//#######################################################################################
				function(directory, done) {
					console.log("2");
					var newDirectory = new Directory();

					newDirectory.name = data.name;
					newDirectory.path = directory.path + data.name + "/";
					newDirectory.parentDirectoryPath = directory.path;

					return done(false, directory, newDirectory);
				},

									//vytvorý súbor zodpovedajúci objektu newDirecotrx
				//#######################################################################################
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

									//uloží objekt newDirectory do databázy
				//#######################################################################################
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

									//obnoví dokument rodičovského súboru v databáze
				//#######################################################################################
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


									//funkcia na spracovanie chýb a ich opravu
				//#######################################################################################
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
//##############################################################################################################################
//##############################################################################################################################
												//all in progress
//##############################################################################################################################
//##############################################################################################################################
		socket.on("openDirectory", function(data) {
			
			var workingDirectory = socket.request.session.workingDirectory;

			async.waterfall([

									//skontroluje, či pracovný priečinok užívateľa existuje
				//#######################################################################################
				function(done) {									
					console.log("1");
					Directory.findOne( { $and: [{ "_id": socket.request.session.workingDirectory}, {"nestedDirectories.name": data}] }, function(err, directory) {
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
					var idOfDirectory = directory.nestedDirectories.filter(function(el) {
						return el.name == data;
					})[0]._id;

					socket.request.session.workingDirectory = idOfDirectory;
					console.log(directory);
				}

			], function(err) {
				console.log("error in openDirectory | socketAPI");
			})

/*
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
*/
		});

		socket.on("returnToUpperDirectory", function() {

			var workingDirectory = socket.request.session.workingDirectory;

			async.waterfall([	

				function(done) {
					Directory.findOne( {"_id": workingDirectory}, function(err,directory) {
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
					Directory.findOne( {"path": directory.parentDirectoryPath}, function(err, dir) {
						if (dir) { 
							socket.request.session.workingDirectory = dir._id;
						}
						else {
							return done(true);
						}
					})
					// znovunacitanie suborov 
				}

			], function(err) {
				console.log("error in returnToUpperDirectory | socktAPI");
			});
		});

		socket.on("repairFileSystem", function() {
			var workingDirectory = socket.request.session.workingDirectory;
			repairFileSystem(workingDirectory);
		});

//##############################################################################################################################
//##############################################################################################################################
//##############################################################################################################################
//##############################################################################################################################

	});
}

function repairFileSystem(workingDirectory) {	
	Directory.findOne( {"_id": workingDirectory}, function(err, directory) {
		if (directory) {
			var directoryNames = new Array();
			for (var i = 0 ; i< directory.nestedDirectories.length; i++) {
				directoryNames.push(directory.nestedDirectories[i].name);
			}
			console.log("directory names");
			console.log(directoryNames);

			fs.readdir(directory.path, function(err, files) {
				console.log("files");
				files = files.filter(function(name) {
					return !(name.startsWith("."));
				})
				console.log(files);

				if (directoryNames.length < files.length) {
					var unknowDirectories = files.filter(function(name) {
						return directoryNames.indexOf(name) == -1;
					});
					// vytvor záznamy v Directory kolekcii pre vsetky priecinky v premennej unknowDirectories
				}
				// ak je file.l viac ako dir.l tak musíš záznamy v Directory kolekcii vymazat

				//ak su rovné tak je vsetko v poriadu

				//skontroluj ci sedia subory rovnako ako priecinky

				//rekurzivne pokracuj pre vsetky vnorene prieciny.
			})
		}
	});
}


function getWorkingDirectoryPath(workingDirectory) {
	console.log(workingDirectory);
	Directory.findOne( {"_id": workingDirectory }, function(err,directory) {
		//console.log("ddd");
		if (directory) {
			//console.log(directory.path);
			return directory;
		}
	})
}


