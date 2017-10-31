
var express = require("express");
var app = express();
var path = require("path");

var mongoose = require("mongoose");
var redis = require("redis");
var passport = require("passport");
var flash = require("connect-flash");

var morgan       = require("morgan");
var cookieParser = require("cookie-parser");
var bodyParser   = require("body-parser")

var session      = require("express-session");
//var MongoStore = require("connect-mongo")(session);
var RedisStore = require("connect-redis")(session);

var configDB = require("./config/database.js");

//var sessionStore = new MongoStore({ url: "mongodb://localhost:27017/User" });
var client = redis.createClient();
var sessionStore = new RedisStore({
	host: "localhost", 
	port: 6379, 
	client: client
});


require("./config/passport")(passport)

//configure mongo database
mongoose.connect(configDB.url, {
	useMongoClient: true
});

//configuring logger, coockie accesser, HTML form accesser in requests

app.use(morgan('dev')); 								// log every request to the console
app.use(cookieParser()); 								// read cookies (needed for session, passport and sockets)
app.use(bodyParser());  								// access HTML form data in requests


app.set("views", path.join(__dirname, "views")); 		//setting view engine and default view directory
app.set("view engine", "hbs");

var sessionMiddleware = session({ 
	name: "connect.session.cookie",
	secret: "9zQeF4LNLKQZ38VWajTH2bbw", 	//creating session with default key "connect.sid"
	cookie: { 
		path: '/', 
		httpOnly: true, 
		secure: false, 
		maxAge: 30*24*60*60*1000
	},
	saveUninitialized: false,				
	resave: false,
	store: sessionStore						// configuring sessionStore (needed for passport.socketio)
});

app.use(sessionMiddleware); 									// sessionStore is "connect-mongo" (configured on top of the document)

app.use(passport.initialize()); 						//inicializing passport on express application
app.use(passport.session());							//setting session middleware for passport auth control
app.use(flash());										//configuring flash messages for eaier form handling

app.use(express.static(__dirname + "/public"));			//setting directory for static files 


require('./routes/routes.js')(app, passport);			//uploading routes paths (configuring them on app and passport)


var http = require("http");
var server = http.createServer(app);				
var io = require("socket.io")(server);


io.use(function(socket, next) {										//used for middleware sharing beetween socket and redis
    sessionMiddleware(socket.request, socket.request.res, next);
});


require("./config/socket.js")(io, {
	passport: passport,
	cookieParser: cookieParser,
	key: "connect.session.cookie",
	secret: "9zQeF4LNLKQZ38VWajTH2bbw",
	sessionStore: sessionStore,
	},
	function onAuthorizeSuccess(data, accept){
		console.log('successful connection to socket.io');
		accept();
	},
	function onAuthorizeFail(data, message, error, accept){
		if(error)
			throw new Error(message);
			console.log('failed connection to socket.io:', message);

			// If you don't want to accept the connection
			if(error)
				accept(new Error(message));
				// this error will be sent to the user as a special error-package
				// see: http://socket.io/docs/client-api/#socket > error-object
		}
	);
/*
io.on("connection", function(socket) {
	console.log(' %s sockets connected', io.engine.clientsCount);
	socket.on("g", function() {
		console.log(socket.request.user.local.username);
		socket.emit("user", socket.request.user.local.username);
	})
})
*/
require("./src/socketAPI.js")(io);

server.listen(9999);

//exporting module
module.exports = app;