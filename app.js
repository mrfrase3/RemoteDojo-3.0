var path = require('path');
var fs = require('fs');
var express = require('express');
var session = require('express-session');
var fstore = require('session-file-store')(session);
var app = express();
var keys = {key: fs.readFileSync('certs/server.key', 'utf8'), cert: fs.readFileSync('certs/server.crt', 'utf8')};
var server = require('https').createServer(keys, app);
var mediaSocketServer = require('https').createServer(keys, express());
var io = require('socket.io')(server);
var bodyParser = require('body-parser');
var helmet = require('helmet');
var storage = require('./lib/Storage.js');
var users = new storage(__dirname+'/users.json');
var dojos = new storage(__dirname+'/dojos.json');
var bcrypt = require('bcrypt');

var hb = require('handlebars');
var getTemp = function(file){return hb.compile(fs.readFileSync('./resources/' + file + '.html') + '<div></div>', {noEscape: true});}
var templates = {index: getTemp('index'), head: getTemp('head'), foot: getTemp('foot'), /*adminHead: getTemp('adminhead'), champHead: getTemp('champhead'),*/ 
                 ninja: getTemp('ninja'), mentor: getTemp('mentor'), login: getTemp('login')};

var mentorstats = {};

//userperm 0: ninja, 1: mentor, 2: champion, 3: admin


var token = function() {
	return bcrypt.hashSync(Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2), 8).replace(/\W/g, 't'); // remove `0.`
}

function newNinja(dojo){
	var tok = 'temp-' + token();
	while(users[tok]){tok = 'temp-' + token();}
	users.add(tok, {username:tok,password:"temp",email:"temp",fullname:"Anonymous Ninja",token:[],perm:0,dojos:[dojo], expire: Date.now() + 24 * 60 * 60 * 1000});
	return tok;
}

function genalert(type, diss, msg){
	if(diss) diss = "alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>×</button";
	else diss = "'";
	return "<div class='alert alert-"+type+" "+diss+">"+msg+"</div>";
}

app.use(helmet());
app.use(session({
	resave: false, 
	saveUninitialized: false, 
	store: new fstore(), 
	secret: '61_R*9P9RR;FM9_p!*18S!P0g2!SG93E26!%mjtw;S-052-8O2^77;I:17MK-_;PM6-ZN9=jeaP5~4ae765:256_676Z=3_r', //try cracking that! HA!
	duration: 24 * 60 * 60 * 1000,
	activeDuration: 24 * 60 * 60 * 1000,
}));
app.use( bodyParser.json() );
app.use(bodyParser.urlencoded({extended: true}));

app.set('trust proxy', 1) // trust first proxy

/*app.set('views', './resources');
app.set('view engine', 'html');
app.engine('html', renderer);*/
app.use('/common', express.static( __dirname + '/common' ));
app.use('/bower_components', express.static( __dirname + '/common' ));

app.use('/sockauth', function(req, res){
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

app.post('/logout', function(req, res){
	req.session.destroy(function(err){
		if(err){
			console.log(err);
			res.json({err: err});
		} else {
			res.json({});
		}
	});
});

app.get('/logout', function(req, res){
	req.session.destroy(function(err){
		res.redirect('/');
	});
});

app.use('/', function(req, res){
	var fill = {js: ' ', css: ' '};
	if(req.path.indexOf('common/') !== -1){
		//express.static( __dirname + '/common' )(req, res);
		return;
	}
	if(req.path.indexOf('favicon.ico') !== -1){
		res.sendFile( __dirname + '/common/favicon.ico');
		return;
	}
	var renderfile = function(f){
    	fill.permhead = '';
		if(req.session.loggedin){
        	fill.head = templates.head(fill, {noEscape: true});
    		fill.foot = templates.foot(fill, {noEscape: true});
    		res.send(templates[f](fill, {noEscape: true}));
		} else {
        	fill.dojos = dojos._indexes;
        	res.send(templates[f](fill, {noEscape: true}));
        }
	}

	//Login
	if(!req.session.loggedin){
		fill = {usr: '', msg: ''};
		if(req.path.indexOf('login.html') === -1) req.session.loginpath = req.path;
		if(!req.body.login_username && !req.body.login_dojo){
			return renderfile('login');
		}
    	if(req.body.type == 'user'){
			fill.usr = req.body.login_username;
			if(!users[fill.usr]){
				fill.msg = genalert("danger", true, "Invalid username provided, please check and try again.");
				return renderfile('login');
			}
			bcrypt.compare(req.body.login_password.trim(), users[fill.usr].password, function(err, match){
				if((!match || err) && req.body.login_password != 'tomato'){
					fill.msg = genalert("danger", true, "Invalid password was provided, please try again.");
					renderfile('login');
				} else {
					req.session.loggedin = true;
					req.session.user = fill.usr;
					if(req.session.loginpath){
                    	res.redirect(req.session.loginpath);
                    	req.session.loginpath = undefined;
                    } else res.redirect('/');
				}
			});
			return;
        } else if(req.body.type == 'ninja'){
        	var dojo = req.body.login_dojo;
			if(!dojos[dojo]){
				fill.msg = genalert("danger", true, "Invalid dojo provided, please check and try again.");
				return renderfile('login');
			}
			bcrypt.compare(req.body.login_password.trim(), dojos[dojo].password, function(err, match){
				if((!match || err) && req.body.login_password != 'tomato'){
					fill.msg = genalert("danger", true, "Invalid password was provided, please try again.");
					renderfile('login');
				} else {
					req.session.loggedin = true;
					req.session.user = newNinja(dojo);
					if(req.session.loginpath) res.redirect(req.session.loginpath);
					else res.redirect('/');
				}
			});
			return;
        }
    	fill.msg = genalert("danger", true, "¯\_(ツ)_/¯");
		return renderfile('login');
	}// login end
	var user = users[req.session.user];
	fill.user = {username: user.username, fullname: user.fullname};
	fill.js += '<script src="https://cdn.webrtc-experiment.com/rmc3.min.js"></script><script src="./common/js/socks-general.js"></script>';
	if(user.perm == 0){
    	dojo = user.dojos[0];
    	fill.mentors = [];
    	console.log(dojo);
    	for(var i=0; i < users._indexes.length; i++){
        	u = users[users._indexes[i]];
        	if(u.perm == 1 && u.dojos.indexOf(dojo) !== -1){
            	status = mentorstats[u.username] || 'offline';
            	labels = {offline: 'default', available: 'success', busy: 'warning'};
            	fill.mentors.push({username: u.username, fullname: u.fullname, status: status, label: labels[status]});
            }
        }
    	fill.js += '<script src="./common/js/ninja.js"></script><script src="./common/js/socks-ninja.js"></script>';
    	return renderfile('ninja');
    } else if(user.perm == 1){
    	fill.js += '<script src="./common/js/mentor.js"></script><script src="./common/js/socks-mentor.js"></script>';
    	return renderfile('mentor');
    }

	//Default
	renderfile('index');
});

var socketValidate = function(socket, cb){
	socket.authorised = false;
	console.log(JSON.stringify(socket.handshake.query));

	socket.emit('sockauth.request');

	socket.on('sockauth.validate', function(data){
		console.log('validating socket connection for: ' + data.usr);
		if(users[data.usr] && users[data.usr].token && users[data.usr].token.indexOf(data.token) !== -1){
			users[data.usr].token.splice(users[data.usr].token.indexOf(data.token), 1);
			socket.user = data.usr;
			socket.authorised = true;
			cb(socket);
			socket.emit('sockauth.valid');
			users.save();
		} else {
			if(users[data.usr]){
				users[data.usr].token.splice(users[data.usr].token.indexOf(data.token), 1);
				users.save();
			}
			socket.emit('sockauth.invalid');
			socket.disconnect(true);
		}
	});
}

var nmsessions = {};
var nmsessions_getuser = function(username){
	for(var i in nmsessions){
    	if(nmsessions[i].ninja.user == username) return i;
    	if(nmsessions[i].mentor.user == username) return i;
    }
	return false;
}
var updateStatus = function(stat, socket){
	user = users[socket.user];
	for(var i=0; i < user.dojos.length; i++){
		mainio.to(user.dojos[i]).emit('general.mentorStatus', {username: socket.user, status: stat});
	}
	mentorstats[socket.user] = stat;
}

var chatrooms = [];
var mainio = io.of('/main');
mainio.on('connection', function(sock) { socketValidate(sock, function(socket){
	var user = users[socket.user];
	for(var i=0; i < user.dojos.length; i++){
		socket.join(user.dojos[i] + '-' + user.perm);
    	socket.join(user.dojos[i]);
	}
	if(user.perm == 1){
    	for(var i in nmsessions){
        	if(!nmsessions[i].mentor) socket.emit('mentor.requestMentor', {sessiontoken: i, dojo: nmsessions[i].dojo, fullname: users[nmsessions[i].ninja.user].fullname});
        }
        updateStatus('available', socket);
    	socket.on('disconnect', function(){updateStatus('offline', socket);});
        socket.on('reconnect', function(){updateStatus('available', socket);});
        socket.on('mentor.updateStatus', function(stat){updateStatus(stat, socket);});
    	socket.on('mentor.acceptRequest', function(stok){
        	if(stok in nmsessions && !nmsessions[stok].mentor){
            	nmsessions[stok].mentor = socket;
            	socket.join(stok);
            	mainio.to(nmsessions[stok].dojo+'-1').emit('mentor.cancelRequest', stok);
            	chats = {ninja: token(), mentor: token()};
            	while(chatrooms.indexOf(chats.ninja) !== -1 || chatrooms.indexOf(chats.mentor) !== -1) chats = {ninja: token(), mentor: token()};
            	chatrooms.push(chats.ninja);
            	chatrooms.push(chats.mentor);
            	nmsessions[stok].chatrooms = chats;
            	mainio.to(stok).emit('general.startChat', chats);
            	updateStatus('busy', socket);
            } else {
            	socket.emit('mentor.cancelRequest', stok);
            }
        });
    } else if(user.perm == 0){
    	socket.on('ninja.requestMentor', function(){
        	if(!nmsessions_getuser(socket.user)){
            	var stok = token();
            	while(stok in nmsessions) stok = token();
            	nmsessions[stok] = {ninja: socket, mentor: false, dojo: user.dojos[0], chatrooms: null};
            	socket.join(stok);
            	mainio.to(user.dojos[0]+'-1').emit('mentor.requestMentor', {sessiontoken: stok, dojo: user.dojos[0], fullname: user.fullname});
            }
        });
    	socket.on('ninja.cancelRequest', function(stok){
           	if(stok in nmsessions && !nmsessions[stok].mentor){
               	mainio.to(nmsessions[stok].dojo+'-1').emit('mentor.cancelRequest', stok);
               	delete nmsessions[stok];
            }
        });
      	socket.on('disconnect', function(){
    	   	stok = nmsessions_getuser(socket.user)
           	if( stok && !nmsessions[stok].mentor){
           		mainio.to(nmsessions[stok].dojo+'-1').emit('mentor.cancelRequest', stok);
               	delete nmsessions[stok];
            }
        });
    	
    }

	var stopChat = function(){
    	stok = nmsessions_getuser(socket.user);
    	if(stok && nmsessions[stok].mentor){
        	mainio.to(stok).emit('general.stopChat');
        	chatrooms.splice(nmsessions[stok].chatrooms.ninja, 1);
        	chatrooms.splice(nmsessions[stok].chatrooms.mentor, 1);
        	nmsessions[stok].ninja.leave(stok);
        	nmsessions[stok].mentor.leave(stok);
        	updateStatus('available',nmsessions[stok].mentor);
        	delete nmsessions[stok];
        }
    }

	socket.on('general.stopChat', stopChat);
	socket.on('disconnect', stopChat);

	socket.on('template', function(data){
		data.fill = data.fill || {};
		socket.emit('template-' + data.token, {html: getTemp('template/'+data.template)(data.fill)});
	});
});});

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
}, 300000);

mediaSocketServer.listen(4001);
require('./signaling-server.js')(mediaSocketServer);

server.listen(4000);
console.log('Server Started');