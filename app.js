// initiate packages
var path = require("path");
var fs = require("fs");
var express = require("express");
var session = require("express-session");
const MongoStore = require('connect-mongo')(session);
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var app = express();
// get the SSL keys, change to location of your certificates
// TODO replace SSL keys system with letsencrypt
var keys = {key: fs.readFileSync("certs/server.key", "utf8"), cert: fs.readFileSync("certs/server.crt", "utf8")};
var server = require("https").createServer(keys, app);
var io = require("socket.io")(server);
var bodyParser = require("body-parser");
var helmet = require("helmet");
var crypto = require("crypto");
var config = require("./config.json");


const users = mongoose.model('user', require("./lib/user.schema.js"));
const dojos = mongoose.model('dojo', require("./lib/dojo.schema.js"));
var ipaddresses = [];

//load in the renderer, handlebars, and then load in the html templates
//html templates are stored in the resources folder.
var hb = require("handlebars");
var getTemp = function(file){return hb.compile(fs.readFileSync("./resources/" + file + ".html") + "<div></div>", {noEscape: true});};
var templates = {404: getTemp("404"), index: getTemp("index"), head: getTemp("head"), foot: getTemp("foot"), adminhead: getTemp("adminhead"),
								ninja: getTemp("ninja"), mentor: getTemp("mentor"), champion: getTemp("champion"), admin: getTemp("admin"),
								login: getTemp("login"), demo: getTemp("demo")};

var mentorstats = {}; //keeps track of mentor statuses which are displayed to


// user rolls structure:
// ninja, mentor, champion, admin
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
var token = function(length=256) {
	return crypto.randomBytes(length).toString('hex');
};

// gets mongoose errors
var geterrs = (errors) => {
	var msgs = {};
	for(var i in errors) msgs[i] = errors[i].message;
	return msgs;
}

var getvalues = (obj) =>{
	var vals = [];
	for(let i in obj) vals.push(obj[i]);
	return vals;
}

// generates a html/bootstrap alert to display to the user, should be used to parse a message to the client side
function genalert(type, diss, msg){
	if(diss) diss = "alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>×</button";
	else diss = "'";
	return "<div class='alert alert-"+type+" "+diss+">"+msg+"</div>";
}

// Mongo Stuff

var mongouri = `mongodb://${config.database.mongo.user}:${config.database.mongo.password}`
    +`@${config.database.mongo.host}:${config.database.mongo.port}/${config.database.mongo.name}`;

// Setup express modules/settings/renderer

app.use(session({
    secret: config.sessionSecret,
    saveUninitialized: false, // dont save empty sessions
    resave: false, //don't save unchanged sessions
    store: new MongoStore({ 
        mongooseConnection: mongoose.connection, //reuse the existing mongoose connection
        touchAfter: 24 * 3600 //sec
    })
}));

app.use(helmet());

app.use( bodyParser.json() );
app.use(bodyParser.urlencoded({extended: true}));

app.set("trust proxy", 1); // trust first proxy

app.use("/common", express.static( __dirname + "/common" ));

// socket authentication, a post or get request on /sockauth will return a socket authentication token
// when the user receives the token, they can pass it through to the socket server which will link the
// socket session to the user session. This was not being done in remotedojo 1 or 2
// More info on socket auth: https://auth0.com/blog/auth-with-socket-io/
app.use("/sockauth", function(req, res){
	let reject = err => {
    	console.error(err);
    	res.json({err: "Unknown Error", success: false});
    }
	users.loadUser( req, dojos, config.runInDemoMode ).catch(reject).then(([user, msg])=>{
    	if(!user) res.json({err: msg || "Not Logged in", success: false});
    	user.genToken('sockauth', Date.now() + 5*60*60*1000).catch(reject).then(token=>{
        	user.save().catch(reject).then(()=>{
            	res.json({usr: user.username, token: token, success: true});
            });
        });
    });
});

// logout, pretty basic, delete the user's session
// post for ajax calls to logout, returns json with an error if there is one
app.post("/logout", function(req, res){
	req.session.destroy(function(err){
		if(err){
			console.error(err);
			res.json({err: err, success: false});
		} else {
			res.json({success: true});
		}
	});
});

// get for directed logout (using href)
app.get("/logout", function(req, res){
	req.session.destroy(function(err){
    	if(err) console.error(err);
		res.redirect("/");
	});
});

// Main express processing
app.use("/", function(req, res){
	let reject = err => {
    	console.error(err);
    	res.sendStatus(500);
    }

	var fill = {js: " ", css: " ", feedback: config.feedbackLink}; //fill, the object passed to the renderer, custom js and css files can be added based on circumstance
	var uid, user;
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
        	dojos.find().catch(reject).then(all_dojos =>{
				fill.dojos = all_dojos; //this is the list of dojos shown to ninjas on the login page
				res.send(templates[f](fill, {noEscape: true}));
            });
		} else if(user.roll == "ninja" || user.roll == "mentor"){
			fill.head = templates.head(fill, {noEscape: true});
			fill.foot = templates.foot(fill, {noEscape: true});
			res.send(templates[f](fill, {noEscape: true}));
		} else if (user.roll == "champion" || user.roll == "admin") {
			fill.admins = []; //this is the list of admins
			fill.champions = []; //this is the list of champions
			fill.mentors = []; //this is the list of mentors

			fill.dojos = []; //this is the list of dojos

			fill.head = templates.adminhead(fill, {noEscape: true});
			fill.foot = templates.foot(fill, {noEscape: true});

			res.send(templates[f](fill, {noEscape: true}));
		}
	};

	
	users.loadUser( req, dojos, config.runInDemoMode ).catch(reject).then(([loaded_user, msg])=>{
    if(!loaded_user){
    	if(msg) fill.msg = genalert("danger", true, msg);
    	if(config.runInDemoMode){
        	if(req.method == "POST"){
            	let expire = Date.now() + (config.demoDuration || 200000);
            	dojos.tempDojo(expire).catch(reject).then((temp_dojo) =>{
            		users.tempUser(temp_dojo.dojoname, "ninja", expire, true).catch(reject).then(([temp_ninja, temp_ninja_token]) =>{
                		users.tempUser(temp_dojo.dojoname, "mentor", expire, true).catch(reject).then(([temp_mentor, temp_mentor_token]) =>{
            				fill.mentor = "/?u=" + temp_mentor + "&a=" + temp_mentor_token;
							fill.ninja = "/?u=" + temp_ninja + "&a=" + temp_ninja_token;
							renderfile("demo");
                    	});
                	});
                });
            }
        	else return renderfile("demo");
    	}
    	return renderfile("login");
    }
    user = loaded_user;
    uid = user.username;

	// Login end
	// From here it is assumed the user is authenticated and logged in (either as a user or temp user)
	if(!uid) uid = req.session.user;
    var user = users[uid];*/
	fill.user = {username: user.username, fullname: user.fullname, email: user.email, expire: " ", demomode: " "}; //give some user info to the renderer, as well as common js files
	if(user.expire > -1) fill.user.expire = " data-expire=\"" + user.expire + "\" ";
	if(config.runInDemoMode) fill.user.demomode = " data-demo-mode=\"true\" ";
	fill.js += "<script src=\"https://webrtc.github.io/adapter/adapter-latest.js\"></script>"+
		"<script src=\"https://cdn.webrtc-experiment.com/getScreenId.js\"></script>"+
		"<script src=\"./common/js/socks-general.js\"></script>"+
		"<script src=\"./common/js/rtc.js\"></script>";
	if(user.roll == "ninja"){ //if the user is a ninja
		let dojo = user.dojos[0];
		fill.mentors = [];
    	users.find({roll: 'mentor', $or: [ {allDojos: true}, {dojos: {$in: [dojo]}} ] }).catch(reject).then(mentors=>{ //the mentors that belong to the ninja's dojo
			for(var i=0; i < mentors.length; i++){ //find all
            	let u = mentors[i];
				let status = mentorstats[u.username] || "offline"; //and get their status
				let labels = {offline: "default", available: "success", busy: "warning"};
				fill.mentors.push({username: u.username, fullname: u.fullname, status: status, label: labels[status]}); //and pass this status list to the renderer
			}
			//add the ninja based js files, render the file and give it to the user
			fill.js += "<script src=\"./common/js/ninja.js\"></script><script src=\"./common/js/socks-ninja.js\"></script><script src=\"./common/js/main.js\"></script>";
			return renderfile("ninja");
        });
    	return;
	} else if(user.roll == "mentor"){ //if the user is a mentor
			//add the mentor based js files, render the file and give it to the user
		fill.js += "<script src=\"./common/js/mentor.js\"></script><script src=\"./common/js/socks-mentor.js\"></script><script src=\"./common/js/main.js\"></script>";
		return renderfile("mentor");
	} else if(user.roll == "champion"){ //if the user is a champion
		fill.js += "<script src=\"./common/js/socks-champion.js\"></script>";
		return renderfile("champion");
	} else if(user.roll == "admin"){ //if the user is a admin
		fill.js += "<script src=\"./common/js/socks-admin.js\"></script>";
		return renderfile("admin");
	}

    console.log(user);
	renderfile("404"); //this shouldn't have to run
});});
// End of main express processing

// Socket Processing

// Helper function that validates a socket
// takes the unauthorised socket and a callback
// if the socket becomes authorised, the callback with the authorised socket is called
// More info on socket auth: https://auth0.com/blog/auth-with-socket-io/
var socketValidate = function(socket, cb, nodupe, ns){
	var reject = ([err, msg]) =>{
    	if(err) console.error(err);
        socket.emit("general.disconnect", msg || "Unknown Error");
        socket.emit("sockauth.invalid");
		socket.disconnect(true);
    }

	if(!ns) ns = "/"
	socket.authorised = false;

	socket.emit("sockauth.request");//initiate the authentication process

	socket.once("sockauth.validate", function(data){ //when the client responds with a auth token, validate it with the user session
    users.findByUsername(data.usr, (err, user) =>{
    	if(err) return reject([err]);
    	if(!user) return reject([null, "Unknown user."]);
    	user.useToken("sockauth", data.token).catch(reject).then( valid =>{
        if(!valid) return reject([null, "Invalid authorisation details."]);
        	if(nodupe){
        		for(let s in io.of(ns).connected){
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
                       	for(let i = 0; i < socket.other.length; i++){
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
			user.save();
		});
    });
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
var updateStatus = function(stat, user){
	let update_rooms = udojos => {
    	for(var i=0; i < udojos.length; i++){
			mainio.to(udojos[i]).emit("general.mentorStatus", {username: user.username, status: stat});
		}
    }
	if (user.allDojos) {
		dojos.find().catch(console.error).then(all_dojos=>{
        	var udojos = [];
        	for(let i in all_dojos) udojos.push(all_dojos[i].dojoname);
        	update_rooms(udojos)
        });
	} else {
		update_rooms(user.dojos)
	}
	mentorstats[user.username] = stat;
};

var mainio = io.of("/main"); //use the '/main' socket.io namespace
mainio.on("connection", function(sock) { socketValidate(sock, function(socket){ //on connection, authorise the socket, then do the following once authorised
users.findByUsername(socket.user, (err, user) =>{
	if(err) return console.error(err);
	if (user.allDojos) {
    	dojos.find().catch(console.error).then( all_dojos =>{
			for(let i = 0; i < all_dojos.length; i++){
        		let d = all_dojos[i].dojoname;
        		socket.join(d + "-" + user.roll);
				socket.join(d);
			}
        });
	} else {
		for(let i=0; i < user.dojos.length; i++){ //make the socket join the relevant rooms for easy communication
			socket.join(user.dojos[i] + "-" + user.roll);
			socket.join(user.dojos[i]);
		}
	}
	socket.updateUserVar = () => {
    	users.findByUsername(socket.user, (err, newuser) =>{
        	if(err) return console.error(err);
        	if(!newuser) return socket.disconnect();
        	user = newuser;
        });
    }

	if(user.roll == "mentor"){ // if the user is a mentor
		for(let i in nmsessions) (nmsession =>{ // update the mentor with current open ninja requests
			if(!nmsession.mentor && (user.allDojos || user.dojos.indexOf(nmsession.dojo) !== -1)){
            	users.findByUsername(nmsession.ninja.user, (err, ninja) =>{
                	if(err) return console.error(err);
					socket.emit("mentor.requestMentor", {sessiontoken: i, dojo: nmsession.dojo, fullname: ninja.fullname});
                });
			}
		})(nmsessions[i]);

		// initiate the status update events
		updateStatus("available", user);
		socket.on("disconnect", function(){updateStatus("offline", user);});
		socket.on("reconnect", function(){updateStatus("available", user);});
		socket.on("mentor.updateStatus", function(stat){updateStatus(stat, user);});

		// when a mentor accepts a ninja's call request
		socket.on("mentor.acceptRequest", function(stok){
        	if(typeof stok !== "string") return;
			if(stok in nmsessions && !nmsessions[stok].mentor){ //check if request is still active
				nmsessions[stok].mentor = socket; //join the chatroom
				socket.join(stok);
				mainio.to(nmsessions[stok].dojo+"-mentor").emit("mentor.cancelRequest", stok);
				mainio.to(stok).emit("general.startChat"); //tell the ninja and mentor to start the RTC connection
				updateStatus("busy", user); //update the mentor's status
			} else { // otherwise update the mentor that the request is closed
				socket.emit("mentor.cancelRequest", stok);
			}
		});

		socket.on("mentor.passwordChange", function(data){ // TODO - fix... whatever this is...
        	if(typeof data.newPwd !== "string" || typeof data.curPwd !== "string") return;
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
        	if(pwd.trim().length < 6) pass = false
			if (negativePwdRule.test(pwd)) pass = false;
        	
        	
        	if(!pass) return socket.emit("mentor.passwordChange", false); // reason needs to be passed through as well.
        	user.changePassword(curPwd, pwd).catch(console.error).then(valid =>{
            	if(!valid){
                	socket.emit("mentor.passwordChange", false); //curPwd doesn't match
                	return socket.emit('general.genalert', "danger", true, "Invalid password given, check capslock and try again.");
                }
            	user.save().catch(err =>{
                	console.error(err);
                	socket.emit("mentor.passwordChange", false);
                	socket.emit('general.genalert', "danger", true, "Unknown Error. Password was not updated.");
                }).then(() =>{
                	socket.emit("mentor.passwordChange", true);
                	socket.emit('general.genalert', "success", true, "Password changed!");
                })
            });
		});

		socket.on("mentor.fullnameChange", function(fullname){ // fullname is being discont. use first/last name instead
        	if(typeof fullname !== "string") return;
        	let oldname = user.fullname;
        	user.fullname = fullname;
        	let error = user.validateSync();
        	if(error && error.errors){ 
            	user.fullname = oldname;
            	socket.emit('general.genalert', "danger", true, getvalues(geterrs(error.errors)).join('<br>'));
            } else user.save().catch(console.error).then(()=>{
            	socket.emit('general.genalert', "success", true, "Name changed!");
            });
		});

		socket.on("mentor.emailChange", function(email){
        	if(typeof email !== "string") return;
        	let oldemail = user.email;
			user.email = email;
            let error = user.validateSync();
        	if(error && error.errors){ 
            	user.email = oldemail;
            	socket.emit('general.genalert', "danger", true, getvalues(geterrs(error.errors)).join('<br>'));
            } else user.save().catch(console.error).then(()=>{
            	socket.emit('general.genalert', "success", true, "Email changed!");
            });
		});

	} else if(user.roll == "ninja"){ // if the user is a ninja
    	var dojoname = user.dojos[0];
		socket.on("ninja.requestMentor", function(){ // when a ninja requests a mentor
			if(!nmsessions_getuser(socket.user)){ // check that the user is not already currently requesting or receiving help
				var stok = token(); //generate a token that is used to index this chat request/session
				while(stok in nmsessions) stok = token();
				nmsessions[stok] = {ninja: socket, mentor: false, dojo: dojoname, chatrooms: null}; //make the session
				socket.join(stok); // join the room for the session
            	dojos.findByDojoName(dojoname, (err, dojo) =>{
                	if(err) return console.error(err);
					mainio.to(user.dojos[0]+"-mentor").emit("mentor.requestMentor", {sessiontoken: stok, dojo: dojo.name, fullname: user.fullname}); //emit the request to all relevant mentors
                });
			}
		});
		socket.on("ninja.cancelRequest", function(){ //when a ninja decides to cancel a request
        	var stok = nmsessions_getuser(socket.user);
			if(stok && !nmsessions[stok].mentor){ //check that the ninja is actually requesting
				mainio.to(nmsessions[stok].dojo+"-mentor").emit("mentor.cancelRequest", stok); //tell the mentors
				delete nmsessions[stok]; // delete the request
			}
		});
		socket.on("ninja.fullnameChange", function(fullname){
        	if(typeof fullname !== "string") return;
        	let oldname = user.fullname;
        	user.fullname = fullname;
        	let error = user.validateSync();
        	if(error && error.errors){ 
            	user.fullname = oldname;
            	socket.emit('general.genalert', "danger", true, getvalues(geterrs(error.errors)).join('<br>'));
            } else user.save().catch(console.error).then(()=>{
            	socket.emit('general.genalert', "success", true, "Name changed!");
            });
		});
		socket.on("disconnect", function(){ //if the ninja disconnects
			var stok = nmsessions_getuser(socket.user);
			if( stok && !nmsessions[stok].mentor){ //check that the ninja is requesting, if so, cancel it
				mainio.to(nmsessions[stok].dojo+"-mentor").emit("mentor.cancelRequest", stok);
				delete nmsessions[stok];
			}
		});
	} else if(user.roll == "champion"){ //if the user is a champion
		var champEmitFullDatabase = function(){ // A highly inefficient but convenient function to update champions after they make changes.
			var data = {};
			data.admins = [];
			data.champions = [];
			data.mentors = [];
			data.dojos = [];
			data.user = {username: user.username, fullname: user.fullname, email: user.email, dojos: user.dojos, allDojos: user.allDojos};
        	let userquery = {roll: {$ne: "ninja"}}
            let dojoquery = {}
            if(!user.allDojos){
            	userquery.dojos = {$in: user.dojos};
            	//dojoquery.dojoname = {$in: user.dojos};
            }
        	users.find(userquery).catch(console.error).then(all_users => {
        		for(var i = 0; i < all_users.length; i++){
            		var u = all_users[i];
            		if (u.username == user.username) continue;
            		if (u.roll == "mentor") data.mentors.push({username: u.username, fullname: u.fullname, email: u.email, 
        																dojos: u.dojos, allDojos: u.allDojos});
            		else if (u.roll == "champion") data.champions.push({username: u.username, fullname: u.fullname, email: u.email, 
        																dojos: u.dojos, allDojos: u.allDojos});
            		else if (u.roll == "admin") data.admins.push({username: u.username, fullname: u.fullname, email: u.email});
				}
            	dojos.find().catch(console.error).then(all_dojos => {
					for(var i = 0; i < all_dojos.length; i++){
            			data.dojos.push({dojoname: all_dojos[i].dojoname, name: all_dojos[i].name, email: all_dojos[i].email, location: all_dojos[i].location});
					}
					socket.emit("champion.fullDatabase", data);
            	});
        	});
		}
        champEmitFullDatabase();
    	socket.on("champion.fullDatabase", champEmitFullDatabase);

		// TODO add admins and champions to a room so as to be updated on any changes (without having to refresh)
		// This function entirely trusts the admin and champion. Checks may be added here and to the admin/champion pages as required
		var champAddUserFields = function(data, roll) {
        	return new Promise((resolve, reject) => {
				if (roll === "admin" || (roll === "champion" && data.user != user.username)) resolve([null, {general: "You can only modify mentors and yourself, not other champions and admins"}]);
				var allDojos = false;
				if (data.dojos && Array.isArray(data.dojos) && data.dojos.indexOf("all") !== -1) {
					allDojos = true;
					data.dojos.splice(data.dojos.indexOf("all"),1);
				}
				if (data.user === "") { //new user?
            		if(!data.firstname && data.fullname) data.firstname = data.fullname.trim().split(" ")[0] || "";
            		if(!data.lastname && data.fullname) data.lastname = data.fullname.replace(data.firstname, "").trim() || "";
            		users.newUser(data.username, data.password, data.email, data.firstname, data.lastname, data.dojos, roll).catch(reject).then(resolve);
				} else {
                	users.findByUsername( data.user, (err, changee) => {
                    	if(err) return reject(err);
                    	if(!changee) return resolve([null, {general: "Unknown user attempting to update, try refreshing your page."}]);
                    	let commondojo = false;
                    	for(var i in changee.dojos){
                        	if(user.dojos.indexOf(changee.dojos[i]) !== -1){
                            	commondojo = true;
                            	break;
                            }
                        }
                    	if(!commondojo) return resolve([null, {general: "The user you are trying to edit does not belong to one of your dojos."}]);
						// Modify each field if it was not left blank
						changee.update(data).catch(reject).then(resolve);
                    });
				}
            });
		}

		socket.on("champion.championEdit", function(data){
			champAddUserFields(data, "champion").catch(console.error).then(([changee, msgs]) =>{
            	if(changee){
                	socket.emit('general.genalert', "success", true, "Changes were successfully made!");
                	return champEmitFullDatabase(); //change to single user update here for more efficency
                }
				if(msgs) socket.emit('general.genalert', "danger", true, getvalues(msgs).join('<br>'));
            	
            });
		});

		socket.on("champion.mentorEdit", function(data){
			champAddUserFields(data, "mentor").catch(console.error).then(([changee, msgs]) =>{
            	if(changee){
                	socket.emit('general.genalert', "success", true, "Changes were successfully made!");
                	return champEmitFullDatabase(); //change to single user update here for more efficency
                }
				if(msgs) socket.emit('general.genalert', "danger", true, getvalues(msgs).join('<br>'));
            });
		});

		socket.on("champion.dojoEdit", function(data){
			if (data.user === "") {
            	socket.emit('general.genalert', "danger", true, "Only Admins may create new dojos.");
			} else {
            	if(user.dojos.indexOf(data.user) === -1) return socket.emit('general.genalert', "danger", true, "You do not belong to the dojo you are trying to edit.");
            	dojos.findByDojoName(data.user, (err, dojo) =>{
                	if(err) return console.error(err);
                	if(!dojo) return socket.emit('general.genalert', "danger", true, "Unknown dojo attempting to update, try refreshing your page.");
                	dojo.update(data).catch(console.error).then(([changee, msgs]) =>{
            			if(changee){
                			socket.emit('general.genalert', "success", true, "Changes were successfully made!");
                			return champEmitFullDatabase(); //change to single user update here for more efficency
                		}
						if(msgs) socket.emit('general.genalert', "danger", true, getvalues(msgs).join('<br>'));
            		});
                });
			}
			//champEmitFullDatabase();
		});

		socket.on("champion.deleteUser", function(data){
        	if(data.type === "dojo"){
            	socket.emit('general.genalert', "danger", true, "Only admins can delete dojos.");
            } else {
        		users.findByUsername( data.uid || data.user || data.username, (err, changee) => {
            		if(err) return console.error(err);
                	if(!changee) return socket.emit('general.genalert', "danger", true, "Unknown user attempting to delete, try refreshing your page.");
					if (changee.roll == "admin" || changee.roll == "champion") return socket.emit('general.genalert', "danger", true, "Only admins can delete other admins/champions.");
                	let commondojo = false;
                    for(var i in changee.dojos){
                       	if(user.dojos.indexOf(changee.dojos[i]) !== -1){
                           	commondojo = true;
                           	break;
                        }
                    }
                    if(!commondojo) return socket.emit('general.genalert', "danger", true, "The user you are trying to delete does not belong to one of your dojos.");
					removeUser(data.uid).catch(console.error).then(() => {
                    	socket.emit('general.genalert', "success", true, "User was successfully removed.");
                    	champEmitFullDatabase();
                    });
            	});
            }
		});
	} else if(user.roll == "admin"){ //if the user is an admin
		var emitFullDatabase = function(){ // A highly inefficient but convenient function to update admins after they make changes.
			var data = {};
			data.admins = [];
			data.champions = [];
			data.mentors = [];
			data.dojos = [];
			data.user = {username: user.username, fullname: user.fullname, email: user.email};
        	users.find({roll: {$ne: "ninja"}}).catch(console.error).then(all_users => {
        		for(var i = 0; i < all_users.length; i++){
            		var u = all_users[i];
            		if (u.username == user.username) continue;
            		if (u.roll == "mentor") data.mentors.push({username: u.username, fullname: u.fullname, email: u.email, 
        																dojos: u.dojos, allDojos: u.allDojos});
            		else if (u.roll == "champion") data.champions.push({username: u.username, fullname: u.fullname, email: u.email, 
        																dojos: u.dojos, allDojos: u.allDojos});
            		else if (u.roll == "admin") data.admins.push({username: u.username, fullname: u.fullname, email: u.email});
				}
            	dojos.find().catch(console.error).then(all_dojos => {
					for(var i = 0; i < all_dojos.length; i++){
            			data.dojos.push({dojoname: all_dojos[i].dojoname, name: all_dojos[i].name, email: all_dojos[i].email, location: all_dojos[i].location});
					}
					socket.emit("admin.fullDatabase", data);
            	});
        	});
		}
        emitFullDatabase();
    	socket.on("admin.fullDatabase", emitFullDatabase);

		// This function entirely trusts the admin and champion. Checks may be added here and to the admin/champion pages as required
		var addUserFields = function(data, roll) {
			return new Promise((resolve, reject) => {
				var allDojos = false;
				if (data.dojos && Array.isArray(data.dojos) && data.dojos.indexOf("all") !== -1) {
					allDojos = true;
					data.dojos.splice(data.dojos.indexOf("all"),1);
				}
				if (data.user === "") { //new user?
            		if(!data.firstname && data.fullname) data.firstname = data.fullname.trim().split(" ")[0] || "";
            		if(!data.lastname && data.fullname) data.lastname = data.fullname.replace(data.firstname, "").trim() || "";
            		users.newUser(data.username, data.password, data.email, data.firstname, data.lastname, data.dojos, roll).catch(reject).then(resolve);
				} else {
                	users.findByUsername( data.user, (err, changee) => {
                    	if(err) return reject(err);
                    	if(!changee) return resolve([null, {general: "Unknown user attempting to update, try refreshing your page."}]);
						// Modify each field if it was not left blank
						changee.update(data).catch(reject).then(resolve);
                    });
				}
            });
		}

		socket.on("admin.adminEdit", function(data){
			addUserFields(data, "admin").catch(console.error).then(([changee, msgs]) =>{
            	if(changee){
                	socket.emit('general.genalert', "success", true, "Changes were successfully made!");
                	return emitFullDatabase(); //change to single user update here for more efficency
                }
				if(msgs) socket.emit('general.genalert', "danger", true, getvalues(msgs).join('<br>'));
            });
		});

		socket.on("admin.championEdit", function(data){
			addUserFields(data, "champion").catch(console.error).then(([changee, msgs]) =>{
            	if(changee){
                	socket.emit('general.genalert', "success", true, "Changes were successfully made!");
                	return emitFullDatabase(); //change to single user update here for more efficency
                }
				if(msgs) socket.emit('general.genalert', "danger", true, getvalues(msgs).join('<br>'));
            });
		});

		socket.on("admin.mentorEdit", function(data){
			addUserFields(data, "mentor").catch(console.error).then(([changee, msgs]) =>{
            	if(changee){
                	socket.emit('general.genalert', "success", true, "Changes were successfully made!");
                	return emitFullDatabase(); //change to single user update here for more efficency
                }
				if(msgs) socket.emit('general.genalert', "danger", true, getvalues(msgs).join('<br>'));
            });
		});

		socket.on("admin.dojoEdit", function(data){
			if (data.user === "") {
            	dojos.newDojo(data.dojoname, data.password, data.email, data.name, data.location).catch(console.error).then(([newdojo, msgs])=>{
                	if(newdojo){
                    	socket.emit('general.genalert', "success", true, "A new dojo was successfully made!");
                    	user.addDojo(newdojo.dojoname);
                    	user.save().catch(console.error).then(emitFullDatabase);
                    }
                	else if(msgs) socket.emit('general.genalert', "danger", true, getvalues(msgs).join('<br>'));
                });
			} else {
            	if(user.dojos.indexOf(data.user))
            	dojos.findByDojoName(data.user, (err, dojo) =>{
                	if(err) return console.error(err);
                	if(!dojo) return socket.emit('general.genalert', "danger", true, "Unknown dojo attempting to update, try refreshing your page.");
                	dojo.update(data).catch(console.error).then(([changee, msgs]) =>{
            			if(changee){
                			socket.emit('general.genalert', "success", true, "Changes were successfully made!");
                			return emitFullDatabase(); //change to single user update here for more efficency
                		}
						if(msgs) socket.emit('general.genalert', "danger", true, getvalues(msgs).join('<br>'));
            		});
                });
			}
		});

		socket.on("champion.deleteUser", function(data){
        	if(data.type === "dojo"){
            	dojos.findByDojoName( data.uid || data.dojo || data.dojoname, (err, changee) => {
            		if(err) return console.error(err);
                	if(!changee) return socket.emit('general.genalert', "danger", true, "Unknown dojo attempting to delete, try refreshing your page.");
					removeDojo(changee.dojoname).catch(console.error).then(() => {
                    	socket.emit('general.genalert', "success", true, "Dojo was successfully removed.");
                    	emitFullDatabase();
                    });
            	});
            } else {
        		users.findByUsername( data.uid || data.user || data.username, (err, changee) => {
            		if(err) return console.error(err);
                	if(!changee) return socket.emit('general.genalert', "danger", true, "Unknown user attempting to delete, try refreshing your page.");
					removeUser(changee.username).catch(console.error).then(() => {
                    	socket.emit('general.genalert', "success", true, "User was successfully removed.");
                    	emitFullDatabase();
                    });
            	});
            }
		});
	}

	//Helper function to end a current chat
	var stopChat = function(){
		stok = nmsessions_getuser(socket.user);
		if(stok && nmsessions[stok].mentor){ //check that the user is actually in a chat
			mainio.to(stok).emit("general.stopChat"); // tell them to stop
			nmsessions[stok].ninja.leave(stok);//make them leave the socket.io room
			nmsessions[stok].mentor.leave(stok);
        	users.findByUsername(nmsessions[stok].mentor.user, (err, mentor) =>{
            	if(err) return console.error(err);
            	if(!mentor) return;
				updateStatus("available",mentor); //update the mentor's status
            });
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
});
}, true, "/main");});

var removeUser = function(uid){
	return new Promise((resolve, reject) => {
		if(typeof uid !== "string") return;
		for(let s in io.of("/main").connected){
			if(io.of("/main").connected[s].user && io.of("/main").connected[s].user == uid){
        		io.of("/main").connected[s].emit("general.disconnect", "Your user session has expired. <a class='btn btn-success' href='/' style='position:absolute;top:10px;right:25px;'><i class='fa fa-refresh'></i></a>");
				io.of("/main").connected[s].disconnect();
			}
		}
		users.remove({username: uid}).catch(reject).then(resolve);
    });
};

var removeDojo = function(uid){
	return new Promise((resolve, reject) => {
		if(typeof uid !== "string") return;
		dojos.remove({dojoname: uid}).catch(reject).then(resolve);
    });
};

//check that expires expired users
var checkExpired = function(){
	users.find({expire: {$gt: new Date(0)}}).catch(console.error).then(expiring_users => {
		let t = new Date();
		for(let j=0; j < expiring_users.length; j++){
			let u = expiring_users[j];
			if(u.expire <= t){
				removeUser(u.username);
			} else {
				setTimeout(removeUser, u.expire.getTime() - t.getTime(), u.username);
			}
		}
    });
	dojos.find({expire: {$gt: new Date(0)}}).catch(console.error).then(expiring_dojos => {
		let t = new Date();
		for(let j=0; j < expiring_dojos.length; j++){
			let d = expiring_dojos[j];
			if(d.expire <= t){
				removeUser(d.dojoname);
			} else {
				setTimeout(removeUser, d.expire.getTime() - t.getTime(), d.dojoname);
			}
		}
    });
};
checkExpired();

users.count({roll: "admin"}).catch(console.error).then(count=>{
	if(count > 0) return;
	let pass = token(16);
	users.newUser("superadmin", pass, "superadmin@example.com", "Super", "Admin", [], "admin").catch(console.error).then(([admin, msgs]) =>{
    	if(msgs) return console.error(msgs);
    	if(!admin) return console.error("superadmi wasn't made?");
    	console.log("Super Admin created:\n username: superadmin\n password: " + pass);
    });
});

mongoose.connect(mongouri);
server.listen(config.serverPort); // start main server
console.log("Server Started on port: " + config.serverPort);

//exports for testing
//exports.testing = {app: app};
//exports.testing.functions = {tempUser: tempUser, ipverification: ipverification};
//exports.testing.vars = {ipaddresses: ipaddresses, users: users, dojos: dojos};
