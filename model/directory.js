var mongoose = require("mongoose");

var directorySchema = mongoose.Schema({
	name				: {type: String, required: true},
	parentDirectoryPath : {type: String, required: true},
	nestedDirectories	: [String],
	files 				: [{
							name: String,
						}]
}, {collection: "directories"});

module.exports = mongoose.model("Directory", directorySchema);