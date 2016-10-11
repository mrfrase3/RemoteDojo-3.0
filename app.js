// initiate packages
var path = require("path");
var fs = require("fs");
var express = require("express");
var session = require("express-session");
var fstore = require("session-file-store")(session);
var app = express();
// get the SSL keys, change to location of your certificates
// TODO replace SSL keys system with letsencrypt
var keys = {key: fs.readFileSync("certs/server.key", "utf8"), cert: fs.readFileSync("certs/server.crt", "utf8")};
var server = require("https").createServer(keys, app);
var mediaSocketServer = require("https").createServer(keys, express());
var io = require("socket.io")(server);
var bodyParser = require("body-parser");
var helmet = require("helmet");
var bcrypt = require("bcrypt");
var config = require("./config.json");

// User and Dojo objects, contains the persistant info on users/dojos (see the Storage.js file in the lib folder)
var storage = require("./lib/Storage.js");
var users = new storage(__dirname+"/users.json");
var dojos = new storage(__dirname+"/dojos.json");


//load in the renderer, handlebars, and then load in the html templates
//html templates are stored in the resources folder.
var hb = require("handlebars");
var getTemp = function(file){return hb.compile(fs.readFileSync("./resources/" + file + ".html") + "<div></div>", {noEscape: true});};
var templates = {404: getTemp("404"), head: getTemp("head"), foot: getTemp("foot"), /*adminHead: getTemp('adminhead'), champHead: getTemp('champhead'),*/
								ninja: getTemp("ninja"), mentor: getTemp("mentor"), login: getTemp("login")};

var mentorstats = {}; //keeps track of mentor statuses which are displayed to

// user permission structure:
// 0: ninja, 1: mentor, 2: champion, 3: admin
//

// token generator, pretty random, but can be replaced if someone has something stronger
var token = function() {
	return bcrypt.hashSync(Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2), 8).replace(/\W/g, "t");
};

// function that generates a new User, can be easily copied/modified to create a new random, expirable user
function tempUser(dojo, perm, expire){
	var tok = "temp-" + perm + "-" + token();
	var names = ["Ninja", "Mentor", "Champion", "Admin"];
	while(users[tok]){tok = "temp-" + perm + "-" + token();}
	users.add(tok, {username:tok,password:"temp",email:"temp",fullname:"Anonymous "+names[perm],token:[],perm:perm,dojos:[dojo], expire: Date.now() + expire});
	return tok;
}

// generates a html/bootstrap alert to display to the user, should be used to parse a message to the client side
function genalert(type, diss, msg){
	if(diss) diss = "alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>×</button";
	else diss = "'";
	return "<div class='alert alert-"+type+" "+diss+">"+msg+"</div>";
}

// setup for express
app.use(helmet());
app.use(session({
	resave: false,
	saveUninitialized: false,
	store: new fstore(),
	secret: config.sessionSecret,
	duration: 24 * 60 * 60 * 1000,
	activeDuration: 24 * 60 * 60 * 1000,
}));
app.use( bodyParser.json() );
app.use(bodyParser.urlencoded({extended: true}));

app.set("trust proxy", 1); // trust first proxy

app.use("/common", express.static( __dirname + "/common" ));

// socket authentication, a post or get request on /sockauth will return a socket authentication token
// when the user receives the token, they can pass it through to the socket server which will link the
// socket session to the user session. This was not being done in remotedojo 1 or 2
// More info on socket auth: https://auth0.com/blog/auth-with-socket-io/
app.use("/sockauth", function(req, res){
	if(req.session.loggedin){
		var tok = token();
		if(!users[req.session.user].token) users[req.session.user].token = [];
		users[req.session.user].token.push(tok);
		res.json({usr: req.session.user, token: tok});
		users.save();
		return;
	}
	res.json({err: "Not Logged in"});
});

// logout, pretty basic, delete the user's session
// post for ajax calls to logout, returns json with an error if there is one
app.post("/logout", function(req, res){
	req.session.destroy(function(err){
		if(err){
			console.log(err);
			res.json({err: err});
		} else {
			res.json({});
		}
	});
});
// get for directed logout (using href)
app.get("/logout", function(req, res){
	req.session.destroy(function(err){
		res.redirect("/");
	});
});

// Main express processing
app.use("/", function(req, res){
	var fill = {js: " ", css: " "}; //fill, the object passed to the renderer, custom js and css files can be added based on circumstance
	if(req.path.indexOf("common/") !== -1){
		return; //fixes an error
	}
	if(req.path.indexOf("favicon.ico") !== -1){ //serve the favicon, which is usually ment to be at the root directory of an apache server
		res.sendFile( __dirname + "/common/favicon.ico");
		return;
	}
	// helper function, renders the templates and compiles them
	// normally a file is renered as header + body + foot, except the login page due to its simplicity
	var renderfile = function(f){
		fill.permhead = "";
		if(req.session.loggedin){
			fill.head = templates.head(fill, {noEscape: true});
			fill.foot = templates.foot(fill, {noEscape: true});
			res.send(templates[f](fill, {noEscape: true}));
		} else {
			fill.dojos = dojos._indexes; //this is the list of dojos shown to ninjas on the login page
			res.send(templates[f](fill, {noEscape: true}));
		}
	};

	//Login processing
	if(!req.session.loggedin){ // and not in demo mode
		fill = {usr: "", msg: ""};
		if(req.path.indexOf("login.html") === -1) req.session.loginpath = req.path; //save the path that the user was trying to access for after login
		if(!req.body.login_username && !req.body.login_dojo){ //if no data has been passed, simply show the login page
			return renderfile("login");
		}
		if(req.body.type == "user"){ // handle user based logins (mentors, champions and admins)
			fill.usr = req.body.login_username.toLowerCase(); //remember the username
			if(!users[fill.usr]){ //check the username
				fill.msg = genalert("danger", true, "Invalid username provided, please check and try again.");
				return renderfile("login");
			}
					//maybe add a check here to mentorstats to see if the mentor is currently logged in already?
			bcrypt.compare(req.body.login_password.trim(), users[fill.usr].password, function(err, match){ //check the password (yes encyption! spooky)
				if((!match || err) && req.body.login_password != "tomato"){ //remove tomato check for actual production //if the password check failed
					fill.msg = genalert("danger", true, "Invalid password was provided, please try again.");
					renderfile("login");
				} else { // else the password check succeeded, setup the user session
					req.session.loggedin = true;
					req.session.user = fill.usr;
					if(req.session.loginpath){
						res.redirect(req.session.loginpath);
						req.session.loginpath = undefined;
					} else res.redirect("/");
				}
			});
			return;
		} else if(req.body.type == "ninja"){ // handle dojo based logins (ninjas)
			var dojo = req.body.login_dojo;
			if(!dojos[dojo]){ //check the dojo
				fill.msg = genalert("danger", true, "Invalid dojo provided, please check and try again.");
				return renderfile("login");
			}
			bcrypt.compare(req.body.login_password.trim(), dojos[dojo].password, function(err, match){ //check the password
				if((!match || err) && req.body.login_password != "tomato"){ //remove tomato check for actual production //if the password check failed
					fill.msg = genalert("danger", true, "Invalid password was provided, please try again.");
					renderfile("login");
				} else { // else the password check succeeded, setup the temp user session for the ninja
					req.session.loggedin = true;
					req.session.user = tempUser(dojo, 0, 24 * 60 * 60 * 1000);
					if(req.session.loginpath) res.redirect(req.session.loginpath);
					else res.redirect("/");
				}
			});
			return;
		}
		fill.msg = genalert("danger", true, "¯\_(ツ)_/¯"); //this code should never run
		return renderfile("login");
	} /* else if(!req.session.loggedin && not in demo mode){
			serve demo landing page and do demo authentication
		}*/
	// Login end
	// From here it is assumed the user is authenticated and logged in (either as a user or temp user)
	var user = users[req.session.user];
	fill.user = {username: user.username, fullname: user.fullname}; //give some user info to the renderer, as well as common js files
	fill.js += "<script src=\"https://cdn.webrtc-experiment.com/rmc3.min.js\"></script><script src=\"./common/js/socks-general.js\"></script>";
	if(user.perm == 0){ //if the user is a ninja
		dojo = user.dojos[0];
		fill.mentors = [];
		console.log(dojo);
		for(var i=0; i < users._indexes.length; i++){ //find all
			u = users[users._indexes[i]];
			if(u.perm == 1 && u.dojos.indexOf(dojo) !== -1){ //the mentors that belong to the ninja's dojo
				status = mentorstats[u.username] || "offline"; //and get their status
				labels = {offline: "default", available: "success", busy: "warning"};
				fill.mentors.push({username: u.username, fullname: u.fullname, status: status, label: labels[status]}); //and pass this status list to the renderer
			}
		}
			//add the ninja based js files, render the file and give it to the user
		fill.js += "<script src=\"./common/js/ninja.js\"></script><script src=\"./common/js/socks-ninja.js\"></script>";
		return renderfile("ninja");
	} else if(user.perm == 1){ //if the user is a mentor
			//add the mentor based js files, render the file and give it to the user
		fill.js += "<script src=\"./common/js/mentor.js\"></script><script src=\"./common/js/socks-mentor.js\"></script>";
		return renderfile("mentor");
	}/* else if(user.perm == 2){ //if the user is a champion
			// do chamion processing here
			return renderfile('champion');
		} else if(user.perm == 3){ //if the user is a admin
			// do admin processing here
			return renderfile('admin');
		}*/

	renderfile("404"); //this shouldn't have to run
});
// End of main express processing

// Socket Processing

// Helper function that validates a socket
// takes the unauthorised socket and a callback
// if the socket becomes authorised, the callback with the authorised socket is called
// More info on socket auth: https://auth0.com/blog/auth-with-socket-io/
var socketValidate = function(socket, cb){
	socket.authorised = false;

	socket.emit("sockauth.request");//initiate the authentication process

	socket.on("sockauth.validate", function(data){ //when the client responds with a auth token, validate it with the user session
		console.log("validating socket connection for: " + data.usr);
		if(users[data.usr] && users[data.usr].token && users[data.usr].token.indexOf(data.token) !== -1){ //token's valid
			users[data.usr].token.splice(users[data.usr].token.indexOf(data.token), 1); //remove the token now that it's used
			socket.user = data.usr;
			socket.authorised = true;
			cb(socket); // call the callback, passing the now authorised socket
			socket.emit("sockauth.valid");
			users.save();
		} else { // token's not valid
			socket.emit("sockauth.invalid");
			socket.disconnect(true);
		}
	});
};

// basic object to hold info about ninja to mentor sessions (calls)
// doesn't use the Storage object because calls are not persistent
var nmsessions = {};
// Helper Function to find a user's session, if any
var nmsessions_getuser = function(username){
	for(var i in nmsessions){
		if(nmsessions[i].ninja.user == username) return i;
		if(nmsessions[i].mentor.user == username) return i;
	}
	return false;
};
// Helper Function to update a mentor's status, and pass that update to everyone relevant
var updateStatus = function(stat, socket){
	user = users[socket.user];
	for(var i=0; i < user.dojos.length; i++){
		mainio.to(user.dojos[i]).emit("general.mentorStatus", {username: socket.user, status: stat});
	}
	mentorstats[socket.user] = stat;
};

var chatrooms = []; // an array of chatroom tokens currently being used
var mainio = io.of("/main"); //use the '/main' socket.io namespace
mainio.on("connection", function(sock) { socketValidate(sock, function(socket){ //on connection, authorise the socket, then do the following once authorised
	var user = users[socket.user];
	for(var i=0; i < user.dojos.length; i++){ //make the socket join the relevant rooms for easy communication
		socket.join(user.dojos[i] + "-" + user.perm);
		socket.join(user.dojos[i]);
	}

	if(user.perm == 1){ // if the user is a mentor
		for(var i in nmsessions){ // update the mentor with current open ninja requests
			if(!nmsessions[i].mentor && user.dojos.indexOf(nmsessions[i].dojo) !== -1){
				socket.emit("mentor.requestMentor", {sessiontoken: i, dojo: nmsessions[i].dojo, fullname: users[nmsessions[i].ninja.user].fullname});
			}
		}

			// initiate the status update events
		updateStatus("available", socket);
		socket.on("disconnect", function(){updateStatus("offline", socket);});
		socket.on("reconnect", function(){updateStatus("available", socket);});
		socket.on("mentor.updateStatus", function(stat){updateStatus(stat, socket);});

			// when a mentor accepts a ninja's call request
		socket.on("mentor.acceptRequest", function(stok){
			if(stok in nmsessions && !nmsessions[stok].mentor){ //check if request is still active
				nmsessions[stok].mentor = socket; //join the chatroom
				socket.join(stok);
				mainio.to(nmsessions[stok].dojo+"-1").emit("mentor.cancelRequest", stok);
				chats = {ninja: token(), mentor: token()}; // generate chatroom tokens for RTC, this should be changed to generate a single token
				while(chatrooms.indexOf(chats.ninja) !== -1 || chatrooms.indexOf(chats.mentor) !== -1) chats = {ninja: token(), mentor: token()};
				chatrooms.push(chats.ninja);
				chatrooms.push(chats.mentor);
				nmsessions[stok].chatrooms = chats;
				mainio.to(stok).emit("general.startChat", chats); //tell the ninja and mentor to start the RTC connection
				updateStatus("busy", socket); //update the mentor's status
			} else { // otherwise update the mentor that the request is closed
				socket.emit("mentor.cancelRequest", stok);
			}
		});
	} else if(user.perm == 0){ // if the user is a ninja
		socket.on("ninja.requestMentor", function(){ // when a ninja requests a mentor
			if(!nmsessions_getuser(socket.user)){ // check that the user is not already currently requesting or receiving help
				var stok = token(); //generate a token that is used to index this chat request/session
				while(stok in nmsessions) stok = token();
				nmsessions[stok] = {ninja: socket, mentor: false, dojo: user.dojos[0], chatrooms: null}; //make the session
				socket.join(stok); // join the room for the session
				mainio.to(user.dojos[0]+"-1").emit("mentor.requestMentor", {sessiontoken: stok, dojo: user.dojos[0], fullname: user.fullname}); //emit the request to all relevant mentors
			}
		});
		socket.on("ninja.cancelRequest", function(stok){ //when a ninja decides to cancel a request
			if(stok in nmsessions && !nmsessions[stok].mentor){ //check that the ninja is actually requesting
				mainio.to(nmsessions[stok].dojo+"-1").emit("mentor.cancelRequest", stok); //tell the mentors
				delete nmsessions[stok]; // delete the request
			}
		});
		socket.on("disconnect", function(){ //if the ninja disconnects
			stok = nmsessions_getuser(socket.user);
			if( stok && !nmsessions[stok].mentor){ //check that the ninja is requesting, if so, cancel it
				mainio.to(nmsessions[stok].dojo+"-1").emit("mentor.cancelRequest", stok);
				delete nmsessions[stok];
			}
		});

	}/* else if(user.perm == 2){ //if the user is a champion
			// do chamion socket processing here
		} else if(user.perm == 3){ //if the user is a admin
			// do admin socket processing here
		}*/

	//Helper function to end a current chat
	var stopChat = function(){
		stok = nmsessions_getuser(socket.user);
		if(stok && nmsessions[stok].mentor){ //check that the user is actually in a chat
			mainio.to(stok).emit("general.stopChat"); // tell them to stop
			chatrooms.splice(nmsessions[stok].chatrooms.ninja, 1); //remove the chatroom tokens
			chatrooms.splice(nmsessions[stok].chatrooms.mentor, 1);
			nmsessions[stok].ninja.leave(stok);//make them leave the socket.io room
			nmsessions[stok].mentor.leave(stok);
			updateStatus("available",nmsessions[stok].mentor); //update the mentor's status
			delete nmsessions[stok]; //delete the session
		}
	};

	socket.on("general.stopChat", stopChat);
	socket.on("disconnect", stopChat);

	socket.on("general.template", function(data){ //socket call to request a rendered template (used for dynamic forms in another project)(not yet fully implemented)
		data.fill = data.fill || {};
		socket.emit("general.template-" + data.token, {html: getTemp("template/"+data.template)(data.fill)});
	});
});});

//Interval that expires expired users
setInterval(function(){
	var t = Date.now();
	for(var j=0; j < users._indexes.length; j++){
		i = users._indexes[j];
		if(users[i].expire > 0 && users[i].expire < t){
			for(var s in mainio.sockets.connected){
				if(mainio.sockets.connected[s].user && mainio.sockets.connected[s].user == i){
					mainio.sockets.connected[s].disconnect();
				}
			}
			users.remove(i);
		}
	}
}, config.tempUserExpiryInterval);

mediaSocketServer.listen(config.mediaServerPort); // start socket server for RTC (it's super fussy and wont play with the main socket server)
require("./signaling-server.js")(mediaSocketServer);

server.listen(config.mainServerPort); // start main server
console.log("Server Started");

//exports for testing

module.exports.tempUser = tempUser;
module.exports.users = users;
//exports.vars = {};
