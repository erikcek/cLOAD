

const express = require('express')
const rimraf = require('rimraf')
const MongoClient = require("mongodb").MongoClient;
const db_url = "mongodb://localhost:27017/mydb"
const app = express()
const http_app = express()
const fs = require("fs");
const http_server = require('http').createServer(http_app)
const server = require("https").createServer({
												key: fs.readFileSync('key.pem'),
												cert: fs.readFileSync('cert.pem')
											}, app)
const io = require('socket.io')(server)

var users = [{"erik": "password"},{"niekto": "password"}]
var directories = {"erik": "/erik", "niekto": "/niekto"}
var tokens = {"erik": "", "niekto": ""}

var Uploading_files = {"erik": {}, "niekto": {}} //premenna ktora sa bude ukladat a obsahueje informacie o suboroch ktore este neboli uplno nahraté
var Files = {} //docasna premenna pre nahravanie suborov
//prepare_db();
//prepare_users_db();

app.use(express.static(__dirname))
app.set('port', process.env.PORT || 9443)


io.on('connection', socket => {
    
	socket.emit("checkLoged")

	socket.on("tryLogin", data => {
		if(tokens[data[0]] == data[1]){
			socket.emit("loged", [true, data[0], data[1]])
		}
	})

	socket.on("login", data => {
		try {
			
			MongoClient.connect(db_url, function(err, db) {
				var query = {"username": data[0]}
				db.collection("users").find(query).toArray(function(err, res) {
					if(!err) {
						try {
							console.log(res[0].auth["password"]);
							if(res[0].auth["password"] == data[1]) {
								tokens[data[0]] = randToken();
								//console.log(tokens)
								get_downloading_files(data[0]);
								socket.emit("loged", [true, data[0],tokens[data[0]]]);
							}
							else {
								socket.emit("loged", [false]);
							}
						}
						catch(error) {
							socket.emit("loged", [false]);
						}
					}
				})
			})
			/*
			MongoClient.connect(db_url, function(err, db) {
				if(!err) {
					db.collection("users").find().limit(5).toArray( function(err, res) {
						if(!err) {
							console.log(res);
							db.close();
						}
					})
				}
			})
			*/
		}
		catch(error) {

		}
		/*
    	for(var i = 0; i<users.length; i++){
			if(users[i][data[0]] == data[1]){
				//defaultDirectory = directories[i][data[0]]
				tokens[data[0]] = randToken()
				//console.log(tokens)
				get_downloading_files(data[0]);
				socket.emit("loged", [true, data[0],tokens[data[0]]])
			}
			else {
				socket.emit("loged", [false])
			}
    	}
    	*/
    })

    socket.on("logout", data => {
    	if(data["user_name"] != null && data["token"] != null) {
		 	if(tokens[data["user_name"]] == data["token"]) {
		 		tokens[data["user_name"]] = "";
		 		Uploading_files[data["user_name"]] = {};
		 	}   
		}

    })

	 socket.on("lsfiles", data => {
	 	if(data[1] != null && data[2] != null){
		 	if(tokens[data[1]] == data[2]){
		    	var fils = new Array()
		    	var not_fully_uploaded_files = new Array()
		    	var not_fully_uploaded_files_percent = new Array()
		    	//console.log("up_files")
		    	console.log(Uploading_files)
		    	//console.log("up_files")
				fs.readdir(__dirname + directories[data[1]]+  data[0], (err,files) => {
					if(err){
						console.log(err)
					}
					else{
						files.forEach(file => {
							if(fs.statSync(__dirname + directories[data[1]] +  data[0] + "/" + file).isDirectory() != true){
								
								if(!(file.replace(".", "___") in Uploading_files[data[1]])) {
									fils.push(file)
								}
								else if(file.replace(".", "___") in Uploading_files[data[1]] && Uploading_files[data[1]][file.replace(".", "___")].path ==  __dirname + directories[data[1]] +  data[0] + "/") {
									//get_downloading_files(data[1]);
									not_fully_uploaded_files.push(file)
									not_fully_uploaded_files_percent.push({file: Uploading_files[data[1]][file.replace(".", "___")].perecnt});
								}
								
							}
						}) 

						/*
						MongoClient.connect(db_url, function(err, db) {
							if(!err) {
								var myquery = {"username": data[1]}
								db.collection("users_not_downloaded_files").find(myquery).toArray(function(err, res) {
									//console.log("in query_lsf " + err);
									if(!err) {
										//console.log("this is response_lsf: ");
										//console.log(res)
										//console.log("end of response_lsf");
										files.forEach(file => {
											//console.log("this is file_lsf: " + file)
											//console.log(res[0].files)
											if(fs.statSync(__dirname + directories[data[1]] +  data[0] + "/" + file).isDirectory() != true){
												if(!(file.replace(".", "___") in res[0].files)) {
													fils.push(file);
												}
												else if(file.replace(".", "___") in res[0].files && res[0].files[file.replace(".", "___")].path == __dirname + directories[data[1]] +  data[0] + "/") {
													not_fully_uploaded_files.push(file)
													not_fully_uploaded_files_percent.push({file: res[0].files[file.replace(".", "___")].perecnt});
												}
											}
										})
										if(fils.length > 0 && not_fully_uploaded_files.length > 0) {
											//console.log(Uploading_files)
											socket.emit("files", fils)
											socket.emit("not_fully_uploaded_files", [not_fully_uploaded_files, not_fully_uploaded_files_percent]);
										}
										else if(fils.length > 0) {
											//console.log("if else")
											socket.emit("files", fils)
											socket.emit("not_fully_uploaded_files", false)
										}
										else if(not_fully_uploaded_files.length > 0) {
											//console.log("if else 2")
											socket.emit("files", [])
											socket.emit("not_fully_uploaded_files", [not_fully_uploaded_files, not_fully_uploaded_files_percent]);
										}
										else{
											//console.log("else")
											socket.emit("files", [])
											socket.emit("not_fully_uploaded_files", false)
										}
										db.close();

										
									}
								})
							}
						})
						*/
							
							if(fils.length > 0 && not_fully_uploaded_files.length > 0) {
								console.log(Uploading_files)
								socket.emit("files", fils)
								socket.emit("not_fully_uploaded_files", [not_fully_uploaded_files, not_fully_uploaded_files_percent]);
							}
							else if(fils.length > 0) {
								console.log("if else")
								socket.emit("files", fils)
								socket.emit("not_fully_uploaded_files", false)
							}
							else if(not_fully_uploaded_files.length > 0) {
								console.log("if else 2")
								socket.emit("files", [])
								socket.emit("not_fully_uploaded_files", [not_fully_uploaded_files, not_fully_uploaded_files_percent]);
							}
							else{
								console.log("else")
								socket.emit("files", [])
								socket.emit("not_fully_uploaded_files", false)
							}
							
						}
				})
			}
			else {
				console.log("nelognuty")
				socket.emit("loged", [false])
			}
		}
		else {
			console.log("nn")
			socket.emit("loged", [false])
		}
    })

    socket.on("lsdir", data => {
    	//console.log(data)
    	if(data[1] != null && data[2] != null){
	    	if(tokens[data[1]] == data[2]){
				var dirs = new Array()
				fs.readdir(__dirname + directories[data[1]] + "/" + data[0], (err,files) => {
					if(err){
						console.log(err)
					}
					else {
						files.forEach(file => {
							if(fs.statSync(__dirname + directories[data[1]] + "/" + data[0] + "/" + file).isDirectory()){
								dirs.push(file)
							}
						})
						}
					socket.emit("dirs", dirs)
				})
			}
			else {
				console.log("nelognuty")
				socket.emit("loged", [false])
			}
		}
		else {
			console.log("nn")
			socket.emit("loged", [false])
		}
    })


    socket.on("upload_file", data => {
    	fs.writeFile(__dirname + "/" + "erik", data[0], function(err) {
		    if(err) {
		        return console.log(err);
		    }

		    console.log("The file was saved!");
		}); 
    })

    socket.on('Start', function (data) { //data contains the variables that we passed through in the html file
		if(data["userName"] != null && data["userToken"] != null){
		 	if(tokens[data["userName"]] == data["userToken"]){        

		        var Name = data['Name'];
		        var uploadPath =  __dirname + directories[data["userName"]] + data["path"] + "/"
		        Files[Name] = {  //Create a new Entry in The Files Variable
		            FileSize : data['Size'],
		            Data     : "",
		            Downloaded : 0
		        }
		        //create text entry for chceck if file is relay fully loadet after node server reboot
		        Uploading_files[data["userName"]][Name.replace(".", "___")] = {
		        	name: Name.replace(".", "___"),
		        	path: uploadPath,
		        	perecnt: 0
		        }
		        show_db();
		        console.log("########################")
		        console.log(Uploading_files)
		       	update_downloading_files_in_db(data["userName"], Uploading_files[data["userName"]]);

		        var Place = 0;
		        try{
		        	console.log(uploadPath + Name)
		            var Stat = fs.statSync(uploadPath +  Name);
		            if(Stat.isFile())
		            {
		            	console.log("stat size:" + Stat.size)
		            	console.log("full size:" + Files[Name]["FileSize"])
		                Files[Name]['Downloaded'] = Stat.size;
		                Place = Stat.size / 524288;
		            }
		        }
		        catch(er){} //It's a New File

		        fs.open( (uploadPath + Name), "a", 0755, function(err, fd){
		            if(err)
		            {
		                console.log(err);
		            }
		            else
		            {
		                Files[Name]['Handler'] = fd; //We store the file handler so we can write to it later
		                console.log("fd:" + Files[Name]['Handler'])
		                socket.emit('MoreData', { 'Place' : Place, Percent : 0 });
		            }
		        });
		    }
			else {
				console.log("nelognuty")
				socket.emit("loged", [false])
			}
		}
		else {
			console.log("nn")
			socket.emit("loged", [false])
		}
    });

    socket.on('Upload', function (data){
        if(data["userName"] != null && data["userToken"] != null){
		 	if(tokens[data["userName"]] == data["userToken"]){  
		 	console.log("Nameee: " + data["Name"]);
		        var Name = data['Name'];
		        Files[Name]['Downloaded'] += data['Data'].length;
		        Files[Name]['Data'] += data['Data'];
		        if(Files[Name]['Downloaded'] == Files[Name]['FileSize']) //If File is Fully Uploaded
		        {
		        	socket.emit("$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$")
		            fs.write(Files[Name]['Handler'], Files[Name]['Data'], null, 'Binary', function(err, Writen){
		                socket.emit("done");
		            });
		            delete Uploading_files[data["userName"]][Name.replace(".", "___")];
		        }
		        else if(Files[Name]['Data'].length > /*10485760*/ 20971520){ //If the Data Buffer reaches 10MB
		            fs.write(Files[Name]['Handler'], Files[Name]['Data'], null, 'Binary', function(err, Writen){
		                Files[Name]['Data'] = ""; //Reset The Buffer
		                var Place = Files[Name]['Downloaded'] / 524288;
		                var Percent = (Files[Name]['Downloaded'] / Files[Name]['FileSize']) * 100;
	
		                Uploading_files[data["userName"]][Name.replace(".", "___")].perecnt = Percent;
		                update_downloading_files_in_db(data["userName"], Uploading_files[data["userName"]]);
		                console.log(Percent);
		                socket.emit('MoreData', { 'Place' : Place, 'Percent' :  Percent});
		            });
		        }
		        else
		        {
		            var Place = Files[Name]['Downloaded'] / 524288;
		            var Percent = (Files[Name]['Downloaded'] / Files[Name]['FileSize']) * 100;
		            Uploading_files[data["userName"]][Name.replace(".", "___")].perecnt = Percent;
		            update_downloading_files_in_db(data["userName"], Uploading_files[data["userName"]]);
		            console.log(Percent);
		            socket.emit('MoreData', { 'Place' : Place, 'Percent' :  Percent});
		        }
			}
    		else {
				socket.emit("loged", [false])
			}
		}
		else {
			socket.emit("loged", [false])
		}
	});

	socket.on("getFile", data => {
		if(data["userName"] != null && data["userToken"] != null){
			if(tokens[data["userName"]] == data["userToken"]){ 
				if(data["path"] != null && data["path"] != ""){
					var path = directories[data["userName"]] + data["path"] + "/" + data["fileName"]
					if(data["fileName"].indexOf(".") > -1) {
						var ending = data["fileName"].split(".").slice(-1).pop();
					}
					else {
						var ending = "";
					}
					console.log(ending);
					socket.emit("fileAction", {"path": path, "fileEnding": ending});
				}
				else {
					var path = directories[data["userName"]] + "/" + data["fileName"];
					if(data["fileName"].indexOf(".") > -1) {
						var ending = data["fileName"].split(".").slice(-1).pop();
					}
					else {
						var ending = "";
					}
					console.log(ending);
					socket.emit("fileAction", {"path": path, "fileEnding": ending});
				}
			}
		}
	})

	socket.on("mkdir", data => {
		if(data["user_name"] != null && data["token"] != null){
		 	if(tokens[data["user_name"]] == data["token"]){
		 		var dir = __dirname + directories[data["user_name"]] + data["path"] + "/" + data["dir_name"];
		 		if(!fs.existsSync(dir)) {
		 			fs.mkdirSync(dir);
		 			console.log("created true");
		 			socket.emit("dir_created", true);
		 		}
		 		else {
		 			console.log("created false");
		 			socket.emit("dir_created", false);
		 		}
		 	}
		}

	})

/*	socket.on("rmdir", data => {
		if(data["user_name"] != null && data["token"] != null){
		 	if(tokens[data["user_name"]] == data["token"]){
		 		var dir = __dirname + directories[data["user_name"]] + data["path"] + "/" + data["dir_name"];
		 		if(fs.existsSync(dir)) {
		 			rimraf(dir, () => {
		 				socket.emit("dir_deleted");

		 			})
		 		}
		 	}
		}

	})  */

	socket.on("rm", data => {
		if(data["user_name"] != null && data["token"] != null){
		 	if(tokens[data["user_name"]] == data["token"]){
		 		var dir = __dirname + directories[data["user_name"]] + data["path"] + "/" + data["name"];
		 		if(fs.existsSync(dir) &&  dir != __dirname + directories[data["user_name"]]) {
		 			rimraf(dir, () => {
		 				socket.emit("dir_deleted");
		 				if(data["not_fully_uploaded"] == true) {
		 					//Files[data["name"]].FileSize = Files["name"]['Downloaded']
		 					console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ " + data["name"])
		 					delete Uploading_files[data["user_name"]][data["name"].replace(".", "___")];
		 					update_downloading_files_in_db(data["user_name"], Uploading_files[data["user_name"]]);
		 					console.log(Uploading_files[data["user_name"]])
		 					console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@")
		 				}
		 			})
		 		}
		 	}
		}

	})
/*
	socket.on("remove_not_fully_uploaded", data => {
		if(data["user_name"] != null && data["token"] != null){
		 	if(tokens[data["user_name"]] == data["token"]){
		 		var dir = __dirname + directories[data["user_name"]] + data["path"] + "/" + data["name"];
		 		if(fs.existsSync(dir)) {
		 			rimraf(dir, () => {
		 				socket.emit("dir_deleted");
		 				delete Uploading_files[data["user_name"]][data["name"]];
		 				update_downloading_files_in_db(data["user_name"], Uploading_files[data["user_name"]]);
		 			})
		 		}
		 	}
		}
	})
*/
	socket.on("rename", data => {
		if(data["user_name"] != null && data["token"] != null){
		 	if(tokens[data["user_name"]] == data["token"]){
		 		console.log(data);
		 		var dir = __dirname + directories[data["user_name"]] ;
		 		console.log(dir);
		 		fs.exists(dir + data["new_path"], bool => {
		 			if(bool) {
		 				socket.emit("rename_done", false);
		 			}
		 			else {
		 				fs.rename(dir + data["old_path"], dir + data["new_path"], function(err) {
				 			if(err)  {
				 				console.log("rename unsuccesful");
				 				socket.emit("rename_done", false);
				 			}
				 			else {
				 				socket.emit("rename_done", true);
				 			}
				 		})
		 			}
		 		})

		 	}
		}
	})


})
      




app.get('/', (req,res) => {
    res.sendFile('index.html') 
  })

http_app.get("/", (req, res) =>{
	res.redirect('https://192.168.0.105:9443');
})


http_server.listen(9999, () => {
    //console.log("Server pocuva na localhost:" + app.get('port'))
    console.log("Request")
})



server.listen(app.get("port"), () => {
    console.log("Server pocuva na localhost:" + app.get('port'))
    console.log("Request")
})


function lsdir(path){
	dirs = []
	files = []
	fs.readdir(path, files => {
		files.forEach(file => {
			if(fs.statSync(path + "/" + file).isDirectory()){
				dirs.push(file)
			}
			else {
				files.push(file)
			}
		})
	})
}

function randToken(){
	return Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2)
}

function update_downloading_files_in_db(username, files) {	
	MongoClient.connect(db_url, function(err, db) {
		if(!err) {
			//console.log("in db")
			var myquery = {username}
			var values = {"username": username, "files": files}
			db.collection("users_not_downloaded_files").updateOne(myquery, values,function(err, res) {
				//console.log("in query " + err);
				if(!err) {
					//console.log("updated!!!!");
					db.close();
				}
			})
		}
	})
}

function get_downloading_files(username) {
	
	MongoClient.connect(db_url, function(err, db) {
		if(!err) {
			//console.log("in db")
			var myquery = {username}
			db.collection("users_not_downloaded_files").find(myquery).toArray(function(err, res) {
				//console.log("in query " + err);
				if(!err) {
					//console.log("this is response: ");
					//console.log(res)
					//console.log(Uploading_files)
					//console.log("end of response");
					Uploading_files[username] = res[0].files;
					//console.log(Uploading_files)
					//console.log("endend")
					db.close();
				}
			})
		}
	})
	/*
	MongoClient.connect(db_url, function(err, db) {
		if(!err) {
			db.collection("users_not_downloaded_files").find().limit(5).toArray( function(err, res) {
				if(!err) {
					console.log(res);
					db.close();
				}
			})
		}
	})
	*/
}

function prepare_db() {
	MongoClient.connect(db_url, function(err, db) {
		if(!err) {
			db.createCollection("users_not_downloaded_files", function(err, res) {
				if(!err) {
					console.log("Database and table created");
					var myobj = {"username":"erik","files": {}}
					db.collection("users_not_downloaded_files").insertOne(myobj, function(err, res) {
						if(!err) {
							console.log("uspesne nahrany pouzivatel");
							db.close();
						}
					})
				}
			})

		}
	});
		
}

function prepare_users_db() {
	MongoClient.connect(db_url, function(err, db) {
		if(!err) {
			db.createCollection("users", function(err,res) {
				if(!err) {	
					console.log("table created");
					var myobj = {"username": "erik", "auth": {"password": "password"}}
					db.collection("users").insertOne(myobj, function(err, res) {
						if(!err) {
							console.log("uspesne nahrany pouzivatel");
							db.close();
						}
					})
				}
			})
		}
	});

}

function show_db() {
	MongoClient.connect(db_url, function(err, db) {
		if(!err) {
			db.collection("users_not_downloaded_files").find().limit(5).toArray( function(err, res) {
				if(!err) {
					console.log(res);
					db.close();
				}
			})
		}
	})
}



/*
old lsfile funkcia bez token autentifikacie
    socket.on("lsfiles", path => {
    	var fils = new Array()
		fs.readdir(__dirname + defaultDirectory+  path, (err,files) => {
			if(err){
				console.log(err)
				console.log(path)
			}
			else{
				files.forEach(file => {
					if(fs.statSync(__dirname + defaultDirectory +  path+ "/" + file).isDirectory() != true){
						fils.push(file)
					}
				})
					if(fils.length > 0){
						socket.emit("files", fils)
					}
					else{
						socket.emit("files", [])
					}
				}
		})
    })
    
*/



app.get('/:meno', (req,res) => {
    res.send("Request na " + req.url)
    res.end()
})
/*
app.get('/info', (req,res) => {
    res.send("Toto funguje")
    res.end()
    console.log("Bol vytvoreny request na /info")
  })
*/


