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
var io = require("socket.io")(server);
var bodyParser = require("body-parser");
var helmet = require("helmet");
var bcrypt = require("bcrypt");
var config = require("./config.json");

// User and Dojo objects, contains the persistant info on users/dojos (see the Storage.js file in the lib folder)
var storage = require("./lib/Storage.js");
var users = new storage(__dirname+"/users.json");
var dojos = new storage(__dirname+"/dojos.json");
var ipaddresses = [];

//load in the renderer, handlebars, and then load in the html templates
//html templates are stored in the resources folder.
var hb = require("handlebars");
var getTemp = function(file){return hb.compile(fs.readFileSync("./resources/" + file + ".html") + "<div></div>", {noEscape: true});};
var templates = {404: getTemp("404"), index: getTemp("index"), head: getTemp("head"), foot: getTemp("foot"), adminhead: getTemp("adminhead"),
								ninja: getTemp("ninja"), mentor: getTemp("mentor"), champion: getTemp("champion"), admin: getTemp("admin"),
								login: getTemp("login"), demo: getTemp("demo")};

var mentorstats = {}; //keeps track of mentor statuses which are displayed to
if(config.runInDemoMode){
	var demoUserAuth = function(atok){
		for(var j=0; j < users._indexes.length; j++){
			i = users._indexes[j];
			if(users[i].authtok && users[i].authtok == atok){
				return i;
			}
		}
    	return null;
	};
}

// user permission structure:
// 0: ninja, 1: mentor, 2: champion, 3: admin
//

//This will check the ip address of the clients. If they are not able to connect
//it will return false and if they are able to connect it will return true
//Verify the return value and then establish the connection
var ipverification = function(ipaddress, maxtoday) {
	var today = new Date();
	var dd = today.getDate();
	var testip = {
		address: ipaddress,
		count: 0,
		date: dd
	};
	if(ipaddresses.indexOf(testip.address) == -1){
		ipaddresses.push(testip);
		return true;
	}else if(ipaddresses.indexOf(testip.address) != -1){
		var index = ipaddresses.indexOf(testip.address);
		if(ipaddresses[index].count >= maxtoday) return false;
		if(ipaddresses[index].date != dd){
			ipaddresses[index].count = 0;
			ipaddresses[index].date = dd;
		}
		ipaddresses[index].count = ipaddresses[index].count + 1;
		return true;
	}
};

// token generator, pretty random, but can be replaced if someone has something stronger
var token = function() {
	return bcrypt.hashSync(Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2), 10).replace(/\W/g, "t");
};

// function that generates a new User, can be easily copied/modified to create a new random, expirable user
function tempUser(dojo, perm, expire){
	if(expire < 0) return "no";
	var tok = "temp-" + perm + "-" + token();
	var names = ["Ninja", "Mentor", "Champion", "Admin"];
	while(users[tok]) tok = "temp-" + perm + "-" + token();
	users.add(tok, {username:tok,password:"temp",email:"temp",fullname:"Anonymous "+names[perm],token:[],perm:perm,dojos:[dojo], expire: Date.now() + expire});
	setTimeout(removeUser, expire, tok);

	if(config.runInDemoMode){
		var atok = token();
		while(demoUserAuth(atok) != null) atok = token();
		users[tok].authtok = atok;
	}
	return tok;
}

function tempDojo(expire){
	var tok = "temp-dojo-" + token();
	while(dojos[tok]) tok = "temp-dojo-" + token();
	dojos.add(tok, {dojoname: tok, name:"A Demo Dojo", password: "temp", location: "temp", email: "temp", expire: Date.now() + expire});
	setTimeout(removeDojo, expire, tok);
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
	if(req.session.loggedin || ( config.runInDemoMode && req.query.u) ){
		var user;
		if(config.runInDemoMode) user = demoUserAuth(req.query.u);
		else user = req.session.user;
		if(user){
			var tok = token();
			if(!users[user].token) users[user].token = [];
			users[user].token.push(tok);
			res.json({usr: user, token: tok});
			users.save();
			return;
		}
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
	var fill = {js: " ", css: " ", feedback: config.feedbackLink}; //fill, the object passed to the renderer, custom js and css files can be added based on circumstance
	var uid;
	if(req.path.indexOf("common/") !== -1){
		return; //fixes an error
	}
	if(req.path.indexOf("favicon.ico") !== -1){ //serve the favicon, which is usually meant to be at the root directory of an apache server
		res.sendFile( __dirname + "/common/favicon.ico");
		return;
	}
	// helper function, renders the templates and compiles them
	// normally a file is renered as header + body + foot, except the login page due to its simplicity
	var renderfile = function(f){
		fill.permhead = "";
		if (!uid) {
			fill.dojos = []; //this is the list of dojos shown to ninjas on the login page
        	for(var i = 0; i < dojos._indexes.length; i++){
            	var d = dojos._indexes[i];
            	fill.dojos.push({dojoname: d, name: dojos[d].name});
			}
			res.send(templates[f](fill, {noEscape: true}));
		} else if(users[uid].perm == 0 || users[uid].perm == 1){
			fill.head = templates.head(fill, {noEscape: true});
			fill.foot = templates.foot(fill, {noEscape: true});
			res.send(templates[f](fill, {noEscape: true}));
		} else if (users[uid].perm == 2 || users[uid].perm == 3) {
			fill.admins = []; //this is the list of admins
			fill.champions = []; //this is the list of champions
			fill.mentors = []; //this is the list of mentors
			for(var i = 0; i < users._indexes.length; i++){
            	var u = users._indexes[i];
            	if (u == uid) continue;
            	if (users[u].perm == 1) fill.mentors.push({username: u, fullname: users[u].fullname, email: users[u].email, 
        																dojos: users[u].dojos, allDojos: users[u].allDojos});
            	else if (users[u].perm == 2) fill.champions.push({username: u, fullname: users[u].fullname, email: users[u].email, 
            															dojos: users[u].dojos, allDojos: users[u].allDojos});
            	else if (users[u].perm == 3) fill.admins.push({username: u, fullname: users[u].fullname, email: users[u].email, 
            															dojos: users[u].dojos, allDojos: users[u].allDojos});
			}

			fill.dojos = []; //this is the list of dojos
        	for(var i = 0; i < dojos._indexes.length; i++){
            	var d = dojos._indexes[i];
            	fill.dojos.push({dojoname: d, name: dojos[d].name, email: dojos[d].email, location: dojos[d].location});
			}

			fill.head = templates.adminhead(fill, {noEscape: true});
			fill.foot = templates.foot(fill, {noEscape: true});

			res.send(templates[f](fill, {noEscape: true}));
		}
	};

	//Login processing
	if((!users[req.session.user] || !req.session.loggedin) && !config.runInDemoMode){
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
			bcrypt.compare(req.body.login_password.trim(), users[fill.usr].password, function(err, match){ //check the password (yes encyption! spooky)
				if(!match || err){ //if the password check failed
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
				if(!match || err){ //if the password check failed
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
		fill.msg = genalert("danger", true, "¯\\_(ツ)_/¯"); //this code should never run
		return renderfile("login");
	} else if(config.runInDemoMode){
		if(req.query.u){
			uid = demoUserAuth(req.query.u);
		} else if(req.method == "POST"){
			var ip = req.ip;
			if(req.ips.length) ip = req.ips[0]; //detects through proxies
			if(ipverification(ip,config.maxAccessesPerDay)){ //check ip here to see if max
				dojo = tempDojo(config.demoDuration);
				fill.mentor = "/?u=" + users[tempUser(dojo, 1, config.demoDuration)].authtok;
				fill.ninja = "/?u=" + users[tempUser(dojo, 0, config.demoDuration)].authtok;
				return renderfile("demo");
			}
		}
		if(!uid) return renderfile("index");
	}
	// Login end
	// From here it is assumed the user is authenticated and logged in (either as a user or temp user)
	if(!uid) uid = req.session.user;
    var user = users[uid];
	fill.user = {username: user.username, fullname: user.fullname, email: user.email, expire: " ", demomode: " "}; //give some user info to the renderer, as well as common js files
	if(user.expire > -1) fill.user.expire = " data-expire=\"" + user.expire + "\" ";
	if(config.runInDemoMode) fill.user.demomode = " data-demo-mode=\"true\" ";
	fill.js += "<script src=\"https://webrtc.github.io/adapter/adapter-latest.js\"></script>"+
		"<script src=\"https://cdn.webrtc-experiment.com/getScreenId.js\"></script>"+
		"<script src=\"./common/js/socks-general.js\"></script>"+
		"<script src=\"./common/js/rtc.js\"></script>";
	if(user.perm == 0){ //if the user is a ninja
		dojo = user.dojos[0];
		fill.mentors = [];
		for(var i=0; i < users._indexes.length; i++){ //find all
			u = users[users._indexes[i]];
			if(u.perm == 1 && (u.allDojos || u.dojos.indexOf(dojo) !== -1)){ //the mentors that belong to the ninja's dojo
				status = mentorstats[u.username] || "offline"; //and get their status
				labels = {offline: "default", available: "success", busy: "warning"};
				fill.mentors.push({username: u.username, fullname: u.fullname, status: status, label: labels[status]}); //and pass this status list to the renderer
			}
		}
			//add the ninja based js files, render the file and give it to the user
		fill.js += "<script src=\"./common/js/ninja.js\"></script><script src=\"./common/js/socks-ninja.js\"></script><script src=\"./common/js/main.js\"></script>";
		return renderfile("ninja");
	} else if(user.perm == 1){ //if the user is a mentor
			//add the mentor based js files, render the file and give it to the user
		fill.js += "<script src=\"./common/js/mentor.js\"></script><script src=\"./common/js/socks-mentor.js\"></script><script src=\"./common/js/main.js\"></script>";
		return renderfile("mentor");
	} else if(user.perm == 2){ //if the user is a champion
		fill.js += "<script src=\"./common/js/socks-champion.js\"></script>";
		return renderfile("champion");
	} else if(user.perm == 3){ //if the user is a admin
		fill.js += "<script src=\"./common/js/socks-admin.js\"></script>";
		return renderfile("admin");
	}

	renderfile("404"); //this shouldn't have to run
});
// End of main express processing

// Socket Processing

// Helper function that validates a socket
// takes the unauthorised socket and a callback
// if the socket becomes authorised, the callback with the authorised socket is called
// More info on socket auth: https://auth0.com/blog/auth-with-socket-io/
var socketValidate = function(socket, cb, nodupe, ns){
	if(!ns) ns = "/"
	socket.authorised = false;

	socket.emit("sockauth.request");//initiate the authentication process

	socket.once("sockauth.validate", function(data){ //when the client responds with a auth token, validate it with the user session
		if(users[data.usr] && users[data.usr].token && users[data.usr].token.indexOf(data.token) !== -1){ //token's valid
			users[data.usr].token.splice(users[data.usr].token.indexOf(data.token), 1); //remove the token now that it's used
        	if(nodupe){
        		for(var s in io.of(ns).connected){
					if(io.of(ns).connected[s].user && io.of(ns).connected[s].user == data.usr){
                		if(!socket.other) socket.other = [];
        				socket.other.push( io.of(ns).connected[s]);
					}
				}
            }
        	socket.user = data.usr;
        	if(socket.other){
               	socket.once("sockauth.dupeResolution", function(r){
                   	if(r && socket.other){
                       	for(var i = 0; i < socket.other.length; i++){
            	           	socket.other[i].emit("general.disconnect", "A newer duplicate session has kicked this session.");
                            socket.other[i].disconnect();
                        }
                    	socket.other = null;
                    	socket.authorised = true;
						cb(socket); // call the callback, passing the now authorised socket
						socket.emit("sockauth.valid");
                    } else {
            	       	socket.emit("general.disconnect", "An older duplicate session has kicked this session.");
                        socket.disconnect();
                    }
                });
            	socket.emit("sockauth.dupeConflict");
            } else {
				socket.authorised = true;
				cb(socket); // call the callback, passing the now authorised socket
				socket.emit("sockauth.valid");
            }
			users.save();
		} else { // token's not valid
			socket.emit("sockauth.invalid");
        	socket.emit("general.disconnect", "Invalid authorisation details.");
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
	if (user.allDojos) {
		for(var i = 0; i < dojos._indexes.length; i++){
        	var d = dojos._indexes[i];
        	mainio.to(d).emit("general.mentorStatus", {username: socket.user, status: stat});
		}
	} else {
		for(var i=0; i < user.dojos.length; i++){
			mainio.to(user.dojos[i]).emit("general.mentorStatus", {username: socket.user, status: stat});
		}
	}
	mentorstats[socket.user] = stat;
};

var mainio = io.of("/main"); //use the '/main' socket.io namespace
mainio.on("connection", function(sock) { socketValidate(sock, function(socket){ //on connection, authorise the socket, then do the following once authorised
	var user = users[socket.user];
	if (user.allDojos) {
		for(var i = 0; i < dojos._indexes.length; i++){
        	var d = dojos._indexes[i];
        	socket.join(d + "-" + user.perm);
			socket.join(d);
		}
	} else {
		for(var i=0; i < user.dojos.length; i++){ //make the socket join the relevant rooms for easy communication
			socket.join(user.dojos[i] + "-" + user.perm);
			socket.join(user.dojos[i]);
		}
	}
	if(user.perm == 1){ // if the user is a mentor
		for(var i in nmsessions){ // update the mentor with current open ninja requests
			if(!nmsessions[i].mentor && (user.allDojos || user.dojos.indexOf(nmsessions[i].dojo) !== -1)){
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
				mainio.to(stok).emit("general.startChat"); //tell the ninja and mentor to start the RTC connection
				updateStatus("busy", socket); //update the mentor's status
			} else { // otherwise update the mentor that the request is closed
				socket.emit("mentor.cancelRequest", stok);
			}
		});

		socket.on("mentor.passwordChange", function(data){
			var pwd = data.newPwd;
			var curPwd = data.curPwd;

			// TODO move pwdRules to global scope, perform push at startup only.
			var pwdRules = [];
			// pwdRules.push(new RegExp(/.{8,}/)); // minimum 8 characters
			// pwdRules.push(new RegExp(/^[a-z]/i)) // alpha
			// pwdRules.push(new RegExp(/[a-z]/)); // lowercase
			// pwdRules.push(new RegExp(/[A-Z]/)); // uppercase
			// pwdRules.push(new RegExp(/[\d]/)); // numeric
			// pwdRules.push(new RegExp(/[.\/,<>?;:"'`~!@#$%^&*()[\]{}_+=|\\-]/)); // special character
			negativePwdRule = new RegExp(/[^a-zA-Z\d.\/,<>?;:"'`~!@#$%^&*()[\]{}_+=|\\-]/); // keyboard character

			var pass = true;  // repeat of checks performed client side.
			for (var i = 0; i < pwdRules.length; ++i) {
				if (!pwdRules[i].test(pwd)) {
					pass = false;
					break;
				}
			}
			if (negativePwdRule.test(pwd)) pass = false;

			bcrypt.compare(curPwd, user.password, function(err, match){ //check the password
				if(match && !err) {
					user.password = bcrypt.hashSync(pwd, 10)
					users.save();
					socket.emit("mentor.passwordChange", true);
				} else {
					socket.emit("mentor.passwordChange", false);
				}
			});
		});

		socket.on("mentor.fullnameChange", function(data){
			var newName = data.substring(0,20);
			var nonalpha = new RegExp(/[^a-z ]/i);
			if (!nonalpha.test(newName)) { // Repeating check performed on client side. Fails silently if error occurs
				user.fullname = newName;
				users.save();
			}
		});

		socket.on("mentor.emailChange", function(data){
			var email = data;
			user.email = email;
			users.save();
		});

	} else if(user.perm == 0){ // if the user is a ninja
		socket.on("ninja.requestMentor", function(){ // when a ninja requests a mentor
			if(!nmsessions_getuser(socket.user)){ // check that the user is not already currently requesting or receiving help
				var stok = token(); //generate a token that is used to index this chat request/session
				while(stok in nmsessions) stok = token();
				nmsessions[stok] = {ninja: socket, mentor: false, dojo: user.dojos[0], chatrooms: null}; //make the session
				socket.join(stok); // join the room for the session
				mainio.to(user.dojos[0]+"-1").emit("mentor.requestMentor", {sessiontoken: stok, dojo: dojos[user.dojos[0]].name, fullname: user.fullname}); //emit the request to all relevant mentors
			}
		});
		socket.on("ninja.cancelRequest", function(){ //when a ninja decides to cancel a request
        	var stok = nmsessions_getuser(socket.user);
			if(stok && !nmsessions[stok].mentor){ //check that the ninja is actually requesting
				mainio.to(nmsessions[stok].dojo+"-1").emit("mentor.cancelRequest", stok); //tell the mentors
				delete nmsessions[stok]; // delete the request
			}
		});
		socket.on("ninja.fullnameChange", function(data){
			var newName = data.substring(0,10);
			var nonalpha = new RegExp(/[^a-z ]/i);
			if (!nonalpha.test(newName)) { // Repeating check performed on client side. Fails silently if error occurs
				user.fullname = newName;
			}
		});
		socket.on("disconnect", function(){ //if the ninja disconnects
			var stok = nmsessions_getuser(socket.user);
			if( stok && !nmsessions[stok].mentor){ //check that the ninja is requesting, if so, cancel it
				mainio.to(nmsessions[stok].dojo+"-1").emit("mentor.cancelRequest", stok);
				delete nmsessions[stok];
			}
		});
	} else if(user.perm == 2){ //if the user is a champion
		var champEmitFullDatabase = function(){ // A highly inefficient but convenient function to update champions after they make changes.
			var data = {};
			data.admins = [];
			data.champions = [];
			data.mentors = [];
			data.dojos = [];
			data.user = {username: user.username, fullname: user.fullname, email: user.email};
        	for(var i = 0; i < users._indexes.length; i++){
            	var u = users._indexes[i];
            	if (users[u].username == user.username) continue;
            	if (users[u].perm == 1) data.mentors.push({username: u, fullname: users[u].fullname, email: users[u].email, 
        																dojos: users[u].dojos, allDojos: users[u].allDojos});
            	else if (users[u].perm == 2) data.champions.push({username: u, fullname: users[u].fullname, email: users[u].email});
            	else if (users[u].perm == 3) data.admins.push({username: u, fullname: users[u].fullname, email: users[u].email});
			}
			for(var i = 0; i < dojos._indexes.length; i++){
            	var d = dojos._indexes[i];
            	data.dojos.push({dojoname: d, name: dojos[d].name, email: dojos[d].email, location: dojos[d].location});
			}
			socket.emit("champion.fullDatabase", data);
		}

		// TODO add admins and champions to a room so as to be updated on any changes (without having to refresh)
		// This function entirely trusts the admin and champion. Checks may be added here and to the admin/champion pages as required
		var champAddUserFields = function(data, perm) {
			if (perm == 2 && data.user != user.username) return;
			var u = data.user;
			var newusr = (u === "");
			var allDojos = false;
			for (var i = 0; i < data.dojos.length; ++i) {
				if (data.dojos[i] == "all") {
					allDojos = true;
					data.dojos.splice(i,1);
					break;
				}
			}
			if (newusr) {
				var username = data.username.toLowerCase();
				var password = bcrypt.hashSync(data.password, 10);
				users.add(username, {username: username, fullname: data.fullname, email: data.email, 
								password: password, perm: perm, dojos: data.dojos, allDojos: allDojos, expire: -1});
			} else {
				// Modify each field if it was not left blank
				if (!users[u]) return;
				if (data.email !== "") users[u].email = data.email;
				if (data.fullname !== "") users[u].fullname = data.fullname;
				if (data.password !== "") users[u].password = bcrypt.hashSync(data.password, 10);
				users[u].dojos = data.dojos;
				users[u].allDojos = allDojos;
				users.save();
			}
		}

		socket.on("champion.championEdit", function(data){
			champAddUserFields(data, 2);
			champEmitFullDatabase();
		});

		socket.on("champion.mentorEdit", function(data){
			champAddUserFields(data, 1);
			champEmitFullDatabase();
		});

		socket.on("champion.dojoEdit", function(data){
			var d = data.user;
			var newdojo = d === "";
			if (newdojo) {
				var dojoname = data.dojoname.toLowerCase()
				var password = bcrypt.hashSync(data.password, 10);
				dojos.add(dojoname, {dojoname: dojoname, name: data.name, password: password, location: data.location, email: data.email, expire: -1});
			} else {
				if (!dojos[d]) return;
				if (data.name !== "") dojos[d].name = data.name;
				if (data.email !== "") dojos[d].email = data.email;
				if (data.location !== "") dojos[d].location = data.location;
				if (data.password !== "") dojos[d].password = bcrypt.hashSync(data.password, 10);
				dojos.save();
			}
			champEmitFullDatabase();
		});

		socket.on("champion.deleteUser", function(data){
			if (data.type == "admin" || data.type == "champion") return;
			if (data.type == "dojo") removeDojo(data.uid);
			else removeUser(data.uid);
			champEmitFullDatabase();
		});
	} else if(user.perm == 3){ //if the user is an admin
		var emitFullDatabase = function(){ // A highly inefficient but convenient function to update admins after they make changes.
			var data = {};
			data.admins = [];
			data.champions = [];
			data.mentors = [];
			data.dojos = [];
			data.user = {username: user.username, fullname: user.fullname, email: user.email};
        	for(var i = 0; i < users._indexes.length; i++){
            	var u = users._indexes[i];
            	if (users[u].username == user.username) continue;
            	if (users[u].perm == 1) data.mentors.push({username: u, fullname: users[u].fullname, email: users[u].email, 
        																dojos: users[u].dojos, allDojos: users[u].allDojos});
            	else if (users[u].perm == 2) data.champions.push({username: u, fullname: users[u].fullname, email: users[u].email});
            	else if (users[u].perm == 3) data.admins.push({username: u, fullname: users[u].fullname, email: users[u].email});
			}
			for(var i = 0; i < dojos._indexes.length; i++){
            	var d = dojos._indexes[i];
            	data.dojos.push({dojoname: d, name: dojos[d].name, email: dojos[d].email, location: dojos[d].location});
			}
			socket.emit("admin.fullDatabase", data);
		}

		// This function entirely trusts the admin and champion. Checks may be added here and to the admin/champion pages as required
		var addUserFields = function(data, perm) {
			var u = data.user;
			var newusr = (u === "");
			var allDojos = false;
			for (var i = 0; i < data.dojos.length; ++i) {
				if (data.dojos[i] == "all") {
					allDojos = true;
					data.dojos.splice(i,1);
					break;
				}
			}
			if (newusr) {
				var username = data.username.toLowerCase();
				var password = bcrypt.hashSync(data.password, 10);
				users.add(username, {username: username, fullname: data.fullname, email: data.email, 
								password: password, perm: perm, dojos: data.dojos, allDojos: allDojos, expire: -1});
			} else {
				// Modify each field if it was not left blank
				if (!users[u]) return;
				if (data.email !== "") users[u].email = data.email;
				if (data.fullname !== "") users[u].fullname = data.fullname;
				if (data.password !== "") users[u].password = bcrypt.hashSync(data.password, 10);
				users[u].dojos = data.dojos;
				users[u].allDojos = allDojos;
				users.save();
			}
		}

		socket.on("admin.adminEdit", function(data){
			addUserFields(data, 3);
			emitFullDatabase();
		});

		socket.on("admin.championEdit", function(data){
			addUserFields(data, 2);
			emitFullDatabase();
		});

		socket.on("admin.mentorEdit", function(data){
			addUserFields(data, 1);
			emitFullDatabase();
		});

		socket.on("admin.dojoEdit", function(data){
			var d = data.user;
			var newdojo = d === "";
			if (newdojo) {
				var dojoname = data.dojoname.toLowerCase()
				var password = bcrypt.hashSync(data.password, 10);
				dojos.add(dojoname, {dojoname: dojoname, name: data.name, password: password, location: data.location, email: data.email, expire: -1});
			} else {
				if (!dojos[d]) return;
				if (data.name !== "") dojos[d].name = data.name;
				if (data.email !== "") dojos[d].email = data.email;
				if (data.location !== "") dojos[d].location = data.location;
				if (data.password !== "") dojos[d].password = bcrypt.hashSync(data.password, 10);
				dojos.save();
			}
			emitFullDatabase();
		});

		socket.on("admin.deleteUser", function(data){
			if (data.uid == user.username) return; // prevent self deletions
			if (data.type === "dojo") removeDojo(data.uid);
			else removeUser(data.uid);
			emitFullDatabase();
		});
	}

	//Helper function to end a current chat
	var stopChat = function(){
		stok = nmsessions_getuser(socket.user);
		if(stok && nmsessions[stok].mentor){ //check that the user is actually in a chat
			mainio.to(stok).emit("general.stopChat"); // tell them to stop
			nmsessions[stok].ninja.leave(stok);//make them leave the socket.io room
			nmsessions[stok].mentor.leave(stok);
			updateStatus("available",nmsessions[stok].mentor); //update the mentor's status
			delete nmsessions[stok]; //delete the session
		}
	};

	socket.on("general.stopChat", stopChat);
	socket.on("disconnect", stopChat);

	// Signaling Server
	socket.on("rtc.offer", function(desc){
		var stok = nmsessions_getuser(socket.user);
		if( stok && nmsessions[stok].mentor){
			socket.broadcast.to(stok).emit("rtc.offer", desc);
		}
	});
	socket.on("rtc.answer", function(desc2){
		var stok = nmsessions_getuser(socket.user);
		if( stok && nmsessions[stok].mentor){
			socket.broadcast.to(stok).emit("rtc.answer", desc2);
		}
	});
	socket.on("rtc.connected", function(){
		var stok = nmsessions_getuser(socket.user);
		if( stok && nmsessions[stok].mentor){
			mainio.to(stok).emit("rtc.connected");
		}
	});
	socket.on("rtc.negotiate", function(){
		var stok = nmsessions_getuser(socket.user);
		if( stok && nmsessions[stok].mentor){
			mainio.to(stok).emit("rtc.negotiate");
		}
	});
	socket.on("rtc.iceCandidate", function(candidate){
		var stok = nmsessions_getuser(socket.user);
		if( stok && nmsessions[stok].mentor){
			socket.broadcast.to(stok).emit("rtc.iceCandidate", candidate);
		}
	});

	socket.on("general.template", function(data){ //socket call to request a rendered template (used for dynamic forms in another project)(not yet fully implemented)
		data.fill = data.fill || {};
		socket.emit("general.template-" + data.token, {html: getTemp("template/"+data.template)(data.fill)});
	});
}, true, "/main");});

var removeUser = function(uid){
	if(!users[uid]) return;
	for(var s in io.of("/main").connected){
		if(io.of("/main").connected[s].user && io.of("/main").connected[s].user == uid){
        	io.of("/main").connected[s].emit("general.disconnect", "Your user session has expired. <a class='btn btn-success' href='/' style='position:absolute;top:10px;right:25px;'><i class='fa fa-refresh'></i></a>");
			io.of("/main").connected[s].disconnect();
		}
	}
	users.remove(uid);
};

var removeDojo = function(uid){
	if(!dojos[uid]) return;
	dojos.remove(uid);
};

//check that expires expired users
var checkExpired = function(){
	var t = Date.now();
	for(var j=0; j < users._indexes.length; j++){
		i = users._indexes[j];
		if(users[i].expire > 0){
			if(users[i].expire <= t){
				removeUser(i);
			} else {
				setTimeout(removeUser, users[i].expire - t, i);
			}
		}
	}
	for(var j=0; j < dojos._indexes.length; j++){
		i = dojos._indexes[j];
		if(dojos[i].expire > 0){
			if(dojos[i].expire <= t){
				removeDojo(i);
			} else {
				setTimeout(removeDojo, dojos[i].expire - t, i);
			}
		}
	}
};
checkExpired();

server.listen(config.serverPort); // start main server
console.log("Server Started");

//exports for testing
exports.testing = {app: app};
exports.testing.functions = {tempUser: tempUser, ipverification: ipverification};
exports.testing.vars = {ipaddresses: ipaddresses, users: users, dojos: dojos};
