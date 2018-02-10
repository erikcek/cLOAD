var fs = require("fs");
var ss = require("socket.io-stream");
var Directory = require("../model/directory");
var async = require("async");
var mime = require("mime-types");
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
				function(done) {
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
				function(directory, done) {
					console.log(2)
					for (var i=0; i < directory.files.length; i++) {
						if (directory.files[i].name == file.name) {
							return done(false, directory, true);
						}
					}
					return done(false, directory, false);
				},

				// overí, či nie je rovnaky subo r v súborovom systéme 
				function(directory, fileInDBExists, done) {
					console.log(3)
					fs.stat(directory.path + file.name, function(err, stat) {
						if (err == null) {
							console.log("file exists");
							return done(false, directory, true, fileInDBExists);
						}

						else if (err.code == 'ENOENT') {
							return done(false, directory, false, fileInDBExists);
						}

						else {
							return done(true);
						}
					});
				},
				//skontroluje či sa subor nachádza v databáze a ak nie tak ho pridá
				function(directory, fileExists, fileInDBExists, done) {
					if (!fileExists && !fileInDBExists) {
						directory.files.push({ name: file.name, notFullyUploaded: true });
						return done(false, directory, false, false);
					}

					else if (fileExists && !fileInDBExists) {
						directory.files.push({ name: file.name, notFullyUploaded: true });
						return done(false, directory, false, false);
						//socket send to inform that file allready existrs
					}

					else if (!fileExists && fileInDBExists) {
						for (var i=0; i<directory.files.length; i++) {
							if (directory.files[i].name == file.name) {
								directory.files.splice(i, 1);
								return done(false, directory, false, false)
							}
						}
					}

					else {
						for (var i=0; i<directory.files.length; i++) {
							if (directory.files[i].name == file.name) {
								if (directory.files[i].notFullyUploaded) {
									return done(false, directory, false, false);
								}
							}
						}
						return done(true, "File allready exists");
					}
					
				},

				function(directory, fileExists, fileInDBExists, done) {
					if (!fileInDBExists) {
						directory.save(function(err) {
							if (err) {
								return done(err, "unable to save file in directory in startUpload | socketAPI");
							}
							else {
								return done(false, directory, fileExists);
							}
						})	
					}
					else {
						return done(false, directory, fileExists)
					}
				},

				// pridá súbor do databazy priecinkov, pošle požiadavku na začatie posielania dát,
				// uloží do sessionu správu o tom aké súbory sa uploaduju a ich cestu
				function(directory, fileExists, done) {
					if (!socket.request.session.uploadFiles) {
							socket.request.session.uploadFiles = [];
						}
					socket.request.session.uploadFiles.push({name: file.name, path: directory.path});

					if (!fileExists) {
						console.log(4)
						console.log("initiate OK");
						socket.emit("sendData", { name: file.name, position: 0});

					}
					else if (fileExists) {
						fs.stat(directory.path + "/" + file.name, function(err, stat) {
							if (err) {
								return done(err, "unable to find stat insfo in startUpload | socketAPI");
							}

							else if (!stat) {
								return done(true, "no stat object in startUpload | socketAPI");
							}

							else {
								console.log(5)
								console.log("initiate OK" + stat.size);
								socket.emit("sendData", {name: file.name, position: stat.size});
							}
						});
					}
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
		ss(socket).on("uploadData", function(stream, file) {   
			console.log("in upload Data");
			console.log(file);

			//stream.pipe(fs.createWriteStream(__dirname + "test.png"));



			async.waterfall([

				function (done) {
					files = socket.request.session.uploadFiles
					for (var i=0; i< files.length; i++) {
						if (files[i].name == file.name) {
							return done(false, files[i]);
							socket.request.session.uploadFiles.splice(i, 1);
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
				/*
				function (oneOfFiles, done) {
					Directory.findOne( {"path": oneOfFiles.path}, function(err, directory) {
						if (err) {
							return done(err);
						}
						else if (directory) {
							directory.files.push({ name: oneOfFiles.name, notFullyUploaded: true });
							return done(false, oneOfFiles, directory);
						}
						else {
							return done(true);
						}
					});
				},

				function(oneOfFiles, directory, done) {
					directory.save(function(err) {
						if (err) {
							return done(err);
						}
						else {
							return done(false, oneOfFiles);
						}
					});
				},
	*/
				function (oneOfFiles, done) {
					console.log("cresting write strem for file");
					if (file.start == 0) {
						var writeStream  = fs.createWriteStream(oneOfFiles.path + file.name, {flags: "w+", start: file.start});
						stream.pipe(writeStream);
					}
					else {
						console.log(oneOfFiles);
						var writeStream = fs.createWriteStream(oneOfFiles.path + file.name, {flags: "a", start: file.start});
						stream.pipe(writeStream);
					}
					//writeStream.write("file")
 				}
			], function(err, message) {
				console.log("error in ss.on(uploadData) | socketAPI.js");
				console.log(err);
				console.log(message);
			});

		});

		//done
		socket.on("deleteFile", function(data) {
			async.waterfall([

				// vyhladá pracovný priečinok
				function(done) {
					console.log(1);
					Directory.findOne( {"_id": socket.request.session.workingDirectory}, function(err, directory) {
						if (err) {
							return done(err, "Unable to find working directory in deleteFile | socketAPI");
						}
						else if (directory) {
							return done(false, directory);
						}
					});
				},

				//overí čí sa súbr nachádza v pracovnom priečinku
				function(directory, done) {
					files = directory.files;
					for (var i=0; i<files.length; i++) {
						if (files[i].name == data.name) {
							return done(false, directory, i);
						}
					}
					return done(true, "No such file in directory");
				},

				//overí či sa súbor nachádza v súborovom systéme
				function(directory, index, done) {
					fs.unlink(directory.path + "/" + directory.files[index].name, function(err) {
						if (err) {
							//vypíše chybovú hlášku (v pripade ak subor vo FS neexistuje) ale waterfall pokračuje aby sa subor vymazal z databázy
							console.log(err);
							console.log("unable to unlink file from fileSystem in deleteFile | socketAPI");
							//pokračovanie waterfallu
							return done(false, directory, index);
						}
						else {
							return done(false, directory, index);
						}
					})
				},

				//vymaže zaznam o subore z databázy
				function(directory, index, done) {
					directory.files.splice(index, 1);
					directory.save(function(err) {
						if (err) {
							return done(err, "unable to save directory in deleteFIle | socketAPI");
						}
					})
				}
			], function(err, message) {
				console.log(err);
				console.log(message);
			})
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

				function(fileName, done) {
					var files = new Array();
					for (var i=0; i<fileName.length; i++) {
						console.log(mime.lookup(fileName[i]));
						files.push({
							"name": fileName[i],
							"type": mime.lookup(fileName[i])
						});
					}
					return done(false, files);
				},

				function(files, done) {
					socket.emit("lsFilesReturn", files);
					console.log(files);
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
					Directory.findOne( { $and: [{ "_id": socket.request.session.workingDirectory}, {"nestedDirectories.name": data.name}] }, function(err, directory) {
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
					var idOfDirectory = directory.nestedDirectories.filter( function(elements) {
						return elements.name == data.name;
					})[0]._id;

					socket.request.session.workingDirectory = idOfDirectory;
					socket.emit("openDirectoryReturn");
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
					console.log(1)
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
					console.log(2)
					Directory.findOne( {"path": directory.parentDirectoryPath}, function(err, dir) {
						if (dir) { 
							socket.request.session.workingDirectory = dir._id;
							socket.emit("returnToUpperDirectoryReturn");
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


