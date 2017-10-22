const MongoClient = require("mongodb").MongoClient;
const db_url = "mongodb://localhost:27017/drop_db"
/*
MongoClient.connect(db_url, function(err, db) {
	if(!err) {
		db.createCollection("users_not_downloaded_files", function(err, res) {
			if(!err) {
				console.log("Database and table created");
				db.close();
			}
		})
	}
}) 
*/
/*
MongoClient.connect(db_url, function(err, db) {
  if (!err) {
		db.createCollection("users_not_downloaded_files", function(err, res) {
		if (!err) {
			console.log("Table created!");
			db.close();
			}
		})
	}
  });


MongoClient.connect(db_url, function(err, db) {
	if(!err) {
		var myobj = {"user_name": "erik", "files": {}}
		db.collection("users_not_downloaded_files").insertOne(myobj, function(err, res) {
			if(!err) {
				console.log("uspesne nahrany pouzivatel");
			}
		})
	}
})
*/
/*
update_downloading_files_in_db("erik", {"req": "eeee"})
*/
//prepare_db();

update_downloading_files_in_db("erik", {"nieco": "in"})

MongoClient.connect(db_url, function(err, db) {
	if(!err) {
		db.collection("users_not_downloaded_files").find().limit(10).toArray( function(err, res) {
			if(!err) {
				console.log(res);
				db.close();
			}
		})
	}
})



//get_downloading_files("erik")

function update_downloading_files_in_db(username, files) {	
	MongoClient.connect(db_url, function(err, db) {
		if(!err) {
			console.log("in db")
			var myquery = {username}
			var values = {$addToSet: {"files": { "files": "rwerwe"}}}
			db.collection("users_not_downloaded_files").update(myquery, values,function(err, res) {
				console.log("in query " + err);
				if(!err) {
					console.log("updated!!!!");
					db.close();
				}
			})
		}
	})
}

function get_downloading_files(username) {
	
	MongoClient.connect(db_url, function(err, db) {
		if(!err) {
			console.log("in db")
			var myquery = {"user_name": username}
			db.collection("users_not_downloaded_files").find(myquery).toArray(function(err, res) {
				console.log("in query " + err);
				if(!err) {
					console.log("this is response: ");
					console.log(res)
					//console.log(Uploading_files)
					console.log("end of response");
					//Uploading_files[username] = res[0].files;
					//console.log(Uploading_files)
					console.log("endend")
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


















