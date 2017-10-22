var passportSocketIo = require("passport.socketio");

module.exports = function(io, argument, onAuthorizeSuccess, onAuthorizeFail) {

	io.use(passportSocketIo.authorize({
		passport 		: argument.passport,
		cookieParser	: argument.cookieParser,      	// the same middleware you registrer in express
		key				: argument.key,       			// the name of the cookie where express/connect stores its session_id
		secret 			: argument.secret,    			// the session_secret to parse the cookie
		store 			: argument.sessionStore,        // we NEED to use a sessionstore. no memorystore please
		success 		: onAuthorizeSuccess,  			// *optional* callback on success - read more below
		fail 			: onAuthorizeFail,     			// *optional* callback on fail/error - read more below
	}));

}