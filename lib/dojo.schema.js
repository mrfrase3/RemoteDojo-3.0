const {Schema} = require('mongoose');
const crypto = require('crypto');
const animals = require('../common/animal_icons/animals.json');

var passhist = [
	{iterations: 10000, keylen: 512, digest: 'sha512'}
];
var passReg = /^[\s]*[\S]{8,}[\s]*$/;

var geterrs = (errors) => {
	var msgs = {};
	for(var i in errors) msgs[i] = errors[i].message;
	return msgs;
}

//==-- Schema --==//

//dojos.add(tok, {dojoname: tok, name:"A Demo Dojo", password: "temp", location: "temp", email: "temp", expire: Date.now() + expire});

var DojoSchema = new Schema({
	dojoname: {
    	type: String,
    	match: [/^[\s]*[\S]{3,}[\s]*$/, 'Invalid user name provided, must be 3 or more non-space charaters.'],
    	required: [true, 'A unique dojo name is required.'],
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
    	type: String,
    	match: [/^[\s]*.{2,}[\s]*$/, 'Invalid first name provided, must have 2 or more non-space charaters.'],
    	required: [true, 'A proper name is required.'],
    	trim: true,
    	lowercase: true
    },
	_location: { //support for geo-locating near-by dojos in the future
    	readable: {
    		type: String,
    		match: [/^[\s]*.{2,}[\s]*$/, 'Invalid first name provided, must have 2 or more non-space charaters.'],
    		required: [true, 'A first name is required.'],
    		trim: true,
    		lowercase: true
        },
    	geo: {
        	type: { type: String },
        	coordinates: []
        }
    },
	animals: [{
    	type: String,
    	enum: animals
    }],
	expire: {
    	type: Date,
    	default: new Date(0)
    }
}, {timestamps: {}});

class Dojo {

	//==-- Virtuals --==//
	
	get location(){return this._location.readable}

	set location(v){this._location.readable = v}

	get coords(){return this._location.geo} //needs further implementation

	//==-- Methods --==//

	setPassword(v){
    	return new Promise((resolve, reject) => {
        	if(typeof v !== "string" || !passReg.test(v.trim())) return resolve(false);
    		let salt = crypto.randomBytes(256).toString('hex');
        	crypto.pbkdf2(v, salt, passhist[0].iterations, passhist[0].keylen, passhist[0].digest, (err, hash) => {
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
    		if(this._password.version === 0){ //future-proofing
            	crypto.pbkdf2(v, this._password.salt, passhist[0].iterations, passhist[0].keylen, passhist[0].digest, (err, hash) => {
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

	update(data){
    	return new Promise((resolve, reject) => {
        	var old = {};
    		if(data.email){ 
            	old.email = this.email;
            	this.email = data.email;
            }
			if(data.name){
            	old.name = this.name;
            	this.name = data.name;
            }
        	if(data.location){
            	old.location = this.location;
            	this.location = data.location;
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

DojoSchema.loadClass(Dojo);

DojoSchema.index({ "_location.geo": "2dsphere" });

//==-- Statics --==//

DojoSchema.statics.findByDojoName = function(name, cb) {
  return this.findOne({ dojoname: new RegExp(name, 'i') }, cb);
};

DojoSchema.statics.tempDojo = function(expire=0){
	return new Promise((resolve, reject) => {
		var token = 'temp-dojo-'+ crypto.randomBytes(8).toString('hex');
    	this.findByDojoName(token, (err, dup) => {
        	if(err) return reject(err);
        	if(dup) return this.tempDojo(expire).then(resolve).catch(reject);
    		expire = new Date(expire);
        	if(isNaN(expire.valueOf())) expire = new Date(0);
        	var dojo = new this({
				dojoname: token,
				email: token+"@example.com",
				name: "Temp Dojo",
				_location: {
    				readable: "Temp Location",
    				geo: {
        				type: "Point",
        				coordinates: [0,0]
        			}
    			},
				animals: [],
				expire
			});
            dojo.save().catch(reject).then(()=>{
                resolve(dojo);
            });
        });
    });
}

DojoSchema.statics.getExpired = function(){
	return new Promise((resolve, reject) => {
		this.find({expire: {$gt: new Date(0), $lte: new Date()}}).catch(reject).then(resolve);
    });
}

DojoSchema.statics.newDojo = function(dojoname, password, email, name, location, expire=0){
	return new Promise((resolve, reject) => {
    	this.findByDojoName(dojoname, (err, dup) => {
        	if(err) return reject(err);
        	if(dup) return resolve([null, {dojoname: "The dojo name already exists"}]);
    		expire = new Date(expire);
        	if(isNaN(expire.valueOf())) expire = new Date(0);
        	var dojo = new this({
				dojoname,
				email,
				name,
				_location: {
    				readable: location,
    				geo: {
        				type: "Point",
        				coordinates: [0,0]
        			}
    			},
				animals: [],
				expire
			});
            var error = dojo.validateSync();
        	if(error && error.errors && error.errors.length > 0) return resolve([null, geterrs(error.errors)]);
            dojo.setPassword(password).catch(reject).then(()=>{
                dojo.save().catch(reject).then(()=>{
                	resolve([dojo]);
                });
            });
        });
    });
}

module.exports = DojoSchema; 









