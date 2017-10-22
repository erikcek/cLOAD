var fs = require("fs");

module.exports = function(io) {
	io.on('connection', socket => {
		socket.on("info", function(){
			console.log(socket.request.user);
		});

		//#######################################################################################
		// 										lsFiles
		//#######################################################################################

		socket.on("lsFiles", function(data) {
			var directoryName = getDirectoryName(socket.request);
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

		});

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




