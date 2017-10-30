var mongoose = require("mongoose");

var directorySchema = mongoose.Schema({
	name				: {type: String, required: true},
	path 				: {type: String, required: true},
	parentDirectoryPath : {type: String, required: true},
	nestedDirectories	: [{
			name: String,
			_id: {type: mongoose.Schema.Types.ObjectId, ref: "directories"}
	}],
	files 				: [{
							name: String,
						}]
}, {collection: "directories"});

module.exports = mongoose.model("Directory", directorySchema);