const {Schema} = require('mongoose');
const crypto = require('crypto');
const animals = require('../common/animal_icons/animals.json');

var passhist = [
	{iterations: 10000, keylen: 512, digest: 'sha512'}
];
var passReg = /^[\s]*[\S]{8,}[\s]*$/;

var rolls = ["ninja", "mentor", "champion", "admin"];
var animal_index = 0;
var next_animal = function(){
	var animal = animals[animal_index];
	animal_index++;
	if(animal_index == animals.length) animal_index = 0;
	return animal;
}

var geterrs = (errors) => {
	var msgs = {};
	for(var i in errors) msgs[i] = errors[i].message;
	return msgs;
}

//==-- Schema --==//

var UserSchema = new Schema({
	username: {
    	type: String,
    	match: [/^[\s]*[\S]{3,}[\s]*$/, 'Invalid user name provided, must be 3 or more non-space charaters.'],
    	required: [true, 'A user name is required.'],
    	trim: true,
    	index: true,
    	unique: true
    },
	_password: {
    	hash: {type: String, default: ""},
    	salt: {type: String, default: ""},
    	lastChanged: {type: Date, default: new Date(0)},
    	version: {type: Number, default: 0}
    },
	email: {
    	type: String,
    	required: true,
    	match: [/^.+@.+[.].+$/, 'Invalid email provided.'],
    	trim: true,
    	lowercase: true
    },
	name: {
    	first: {
    		type: String,
    		match: [/^[\s]*.{2,}[\s]*$/, 'Invalid first name provided, must be 2 or more non-space charaters.'],
    		required: [true, 'A first name is required.'],
    		trim: true,
    		lowercase: true
    	},
    	last: {
    		type: String,
    		match: [/^[\s]*.{2,}[\s]*$/, 'Invalid last name provided, must be 2 or more non-space charaters.'],
    		required: [true, 'A last name is required.'],
    		trim: true,
    		lowercase: true
    	}
    },
	_tokens: [{
        token: {type: String, required: true},
        purpose: {type: String, required: true, enum: ["sockauth", "emailvalid", "demoauth"]},
        used: {type: Boolean, default: false, required: true},
        expires: {type: Date, default: ()=>{return new Date(Date.now()+24*60*60*1000);}, required: true}
    }],
	roll: {
    	type: String,
    	enum: rolls
    },
	dojos: [{
    	type: String
    }],
	allDojos: {
    	type: Boolean,
    	default: false
    },
	expire: {
    	type: Date,
    	default: new Date(0)
    }
}, {timestamps: {}});

class User {

	//==-- Virtuals --==//

	get fullname(){
		return this.name.first + ' ' + this.name.last;
	}
	set fullname(v) {
    	console.log("Warning! setting fullname is deprecated, attempting to guess the first/last name division. Please switch to setting firstname and lastname instead.")
        const firstSpace = v.indexOf(' ');
        this.name.first = v.split(' ')[0];
        this.name.last = firstSpace === -1 ? '' : v.substr(firstSpace + 1);
    }

	get firstname(){
  		return this.name.first;
	}
	set firstname(v){
  		this.name.first = v;
	}

	get lastname(){
  		return this.name.last;
	}
	set lastname(v){
  		this.name.last = v;
	}
	get perm(){
    	return rolls.indexOf(this.roll);
    }

	//==-- Methods --==//

	setPassword(v){
    	return new Promise((resolve, reject) => {
        	if(typeof v !== "string" || !passReg.test(v.trim())) return resolve(false);
    		let salt = crypto.randomBytes(256).toString('hex');
        	crypto.pbkdf2(v.trim(), salt, passhist[0].iterations, passhist[0].keylen, passhist[0].digest, (err, hash) => {
        		if(err) return reject(err);
        		this._password.salt = salt;
        		this._password.hash = hash;
            	this._password.version = 0;
        		this._password.lastChanged = new Date();
        		this.markModified('_password.lastChanged');
        		resolve(true);
        	});
        });
    }
	
	checkPassword(v){
    	return new Promise((resolve, reject) => {
        	if(typeof v !== "string") return resolve(false);
    		if(this._password.version === 0){ //future-proofing
            	crypto.pbkdf2(v.trim(), this._password.salt, passhist[0].iterations, passhist[0].keylen, passhist[0].digest, (err, hash) => {
                	if(err) return reject(err);
                	resolve(hash == this._password.hash);
                });
            } else {
            	reject(new Error("Invalid password version"));
            }
        });
    }

	changePassword(oldp, newp){
    	return new Promise((resolve, reject) => {
        	this.checkPassword(oldp).catch(reject).then(success=>{
            	if(!success) resolve(false);
            	this.setPassword(newp).catch(reject).then(resolve);
            });
        });
    }

	genToken(purpose, expires, length=128){
    	return new Promise((resolve, reject) => {
        	expires = new Date(expires);
            if(isNaN(expires.valueOf())) expires = new Date(0);
        	var token = crypto.randomBytes(length).toString('hex');
        	this._tokens.push({token, used: false, purpose, expires});
        	this._checkTokensExpires().catch(reject).then(()=>{
        		resolve(token);
            });
        });
    }

	useToken(purpose, token, spend=true){
    	return new Promise((resolve, reject) => {
        	this._checkTokensExpires().catch(reject).then(()=>{
            	let found = false;
            	for(let i = 0; i < this._tokens.length; i++){
                	if(
                    	this._tokens[i].token == token &&
                    	this._tokens[i].purpose == purpose &&
                    	!this._tokens[i].used
                    ){
                    	found = true;
                    	if(spend) this._tokens[i].used = true;
                    	break;
                    }
                }
        		resolve(found);
            });
        });
    }

	_checkTokensExpires(){
    	return new Promise((resolve, reject) => {
        	let removes = [];
        	for(let i = 0; i < this._tokens.length; i++){
            	if((new Date(this._tokens[i].expires)).getTime() <  Date.now()) removes.push(i);
            }
        	for(let i = removes.length-1; i >= 0; i--) this._tokens.splice(removes[i], 1);
        	resolve();
        });
    }

	hasDojo(dojoname){
    	return this.dojos.indexOf(dojoname) !== -1;
    }

	addDojo(dojoname){
    	if(this.dojos.indexOf(dojoname) === -1) this.dojos.push(dojoname);
    }

	removeDojo(dojoname){
    	if(this.dojos.indexOf(dojoname) !== -1) this.dojos.splice(this.dojos.indexOf(dojoname), 1);
    }

	update(data){
    	return new Promise((resolve, reject) => {
        	var old = {};
    		if(data.email){ 
            	old.email = this.email;
            	this.email = data.email;
            }
			if(data.fullname){
            	old.fullname = this.fullname;
            	this.fullname = data.fullname;
            }
        	if(data.dojos){
            	old.dojos = this.dojos;
            	this.dojos = data.dojos;
            }
        	if(data.allDojos || data.allDojos === false){
            	old.allDojos = this.allDojos;
            	this.allDojos = data.allDojos;
            }
			if(data.password){ 
        		this.setPassword(data.password).catch(reject).then(changed =>{
        	    	if(!changed) return resolve([null, {password: "Password was not set, please make sure it is valid and try again."}]);
        	    	let error = this.validateSync();
        			if(error && error.errors){
                    	for(let i in old) this[i] = old[i];
                    	return resolve([null, geterrs(error.errors)]);
                    }
        	    	this.save().catch(reject).then(()=>{resolve([this]);});
        		});
        	} else {
        		let error = this.validateSync();
        		if(error && error.errors){
                   	for(let i in old) this[i] = old[i];
                   	return resolve([null, geterrs(error.errors)]);
                }
        	    this.save().catch(reject).then(()=>{resolve([this]);});
        	}
        });
    }

}

UserSchema.loadClass(User);



//==-- Statics --==//

UserSchema.statics.findByUsername = function(name, cb) {
  return this.findOne({ username: new RegExp(name, 'i') }, cb);
};

UserSchema.statics.tempUser = function(dojoname, roll, expire=0, demo=false, animal){
	return new Promise((resolve, reject) => {
    	if(typeof roll === 'number') roll = rolls[roll]; //legacy
		var token = 'temp-' + roll +'-'+ crypto.randomBytes(8).toString('hex');
    	this.findByUsername(token, (err, dup) => {
        	if(err) return reject(err);
        	if(dup) return this.tempUser(dojo, roll, expire, demo, animal).then(resolve).catch(reject);
    		expire = new Date(expire);
        	if(isNaN(expire.valueOf())) expire = new Date(0);
        	if(!animal) animal = next_animal();
        	var user = new this({
				username: token,
				email: token+"@example.com",
				name: {
    				first: "anonymous",
    				last: animal
    			},
				_tokens: [],
				roll,
				dojos: [dojoname],
				expire
			});
        	if(demo){
            	user.genToken("demoauth", Date.now() + 7*24*60*60*1000, 12).catch(reject).then(token=>{
                	user.save().catch(reject).then(()=>{
                		resolve([user, token]);
                    });
                });
            } else {
            	user.save().catch(reject).then(()=>{
                	resolve(user);
                });
            }
        });
    });
}

UserSchema.statics.loadUser = function( req, dojos, demo=false ){
	return new Promise((resolve, reject) => {
    	//console.log((req.body.type == 'user') +" "+ (typeof req.body.login_username === 'string') +" "+ (typeof req.body.login_password === 'string'));
    	if(req.session.user && req.session.loggedin){
        	this.findByUsername(req.session.user, (err, user)=>{
            	if(err) return reject(err);
            	resolve([user]);
            });
        } else if(
        	req.body.type == 'user' && 
        	typeof req.body.login_username === 'string' && 
        	typeof req.body.login_password === 'string'
        ){
        	//console.log("validating user")
        	this.findByUsername(req.body.login_username, (err, user)=>{
            	if(err) return reject(err);
            	if(!user) return resolve([null, 'Either username or password were incorrect.']);
            	console.log("its the password");
            	user.checkPassword(req.body.login_password).catch(reject).then(success => {
                	if(!success) return resolve([null, 'Either username or password were incorrect.']);
                	req.session.user = user.username;
                	req.session.loggedin = true;
                	resolve([user]);
                });
            });
        } else if(
        	req.body.type === 'ninja' && 
        	typeof req.body.login_dojo === 'string' && 
        	typeof req.body.login_password === 'string'
        ){
        	dojos.findByDojoName(req.body.login_dojo, (err, dojo) => {
            	if(err) return reject(err);
            	if(!dojo) return resolve([null, 'Unknown dojo provided, please ask a teacher.']);
            	dojo.checkPassword(req.body.login_password).catch(reject).then(success => {
                	if(!success) return resolve([null, 'The dojo password was incorrect, please try again or ask a teacher.']);
                	this.tempUser(dojo.dojoname, 'ninja', Date.now() + 24*60*60*1000).catch(reject).then(user => {
                		req.session.user = user.username;
                		req.session.loggedin = true;
                    	resolve([user]);
                    });
                });
            });
        } else if(
        	demo && 
        	typeof req.query.u === 'string' && 
        	typeof req.query.a === 'string'
        ){
        	this.findByUsername(req.query.u, (err, user)=>{
            	if(err) return reject(err);
            	if(!user) return resolve([null, 'Unknown demo session, the session has probably expired.']);
            	user.useToken("demoauth", req.query.a, false).catch(reject).then(success => {
                	if(!success) return resolve([null, 'Unknown demo session, the session has probably expired.']);
                	req.session.user = user.username;
                	resolve([user]);
                });
            });
        } else {
        	resolve([null]);
        }
    });
}

UserSchema.statics.getExpired = function(){
	return new Promise((resolve, reject) => {
		this.find({expire: {$gt: new Date(0), $lte: new Date()}}).catch(reject).then(resolve);
    });
}

UserSchema.statics.newUser = function(username, password, email, first, last, dojos, roll, expire=0){
	return new Promise((resolve, reject) => {
    	if(typeof roll === 'number') roll = rolls[roll]; //legacy
		if(!Array.isArray(dojos)) dojos = [dojos];
    	this.findByUsername(username, (err, dup) => {
        	if(err) return reject(err);
        	if(dup) return resolve([null, {username: "Username is already taken."}]);
    		expire = new Date(expire);
        	if(isNaN(expire.valueOf())) expire = new Date(0);
        	var user = new this({
				username,
				email,
				name: {
    				first,
    				last
    			},
				_tokens: [],
				roll,
				dojos,
				expire
			});
        	var error = user.validateSync();
        	if(error && error.errors && error.errors.length > 0) return resolve([null, geterrs(error.errors)]);
            user.setPassword(password).catch(reject).then(()=>{
                user.save().catch(reject).then(()=>{
                	resolve([user]);
                });
            });
        });
    });
}

module.exports = UserSchema;

//users.add(tok, {username:tok,password:"temp",email:"temp",fullname:"Anonymous "+names[perm],token:[],perm:perm,dojos:[dojo], expire: Date.now() + expire});









