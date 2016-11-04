/*global describe, it*/

var app = require("../app.js");
var expect = require("chai").expect;
var tokNinja, tokMentor, tokChamp, tokAdmin;

describe("User Creation multiple at a time", function(){
	it("creates user ninja", function(done){
		tokNinja = app.testing.functions.tempUser("UWA", 0, 60000); //new ninja
		expect(app.testing.vars.users[tokNinja]).to.exist;
		done();
	});
	it("creates user Mentor", function(done){
		tokMentor = app.testing.functions.tempUser("UWA", 1, 60000); //new ninja
		expect(app.testing.vars.users[tokMentor]).to.exist;
		done();
	});
	it("creates user Champion", function(done){
		tokChamp = app.testing.functions.tempUser("UWA", 2, 60000); //new ninja
		expect(app.testing.vars.users[tokChamp]).to.exist;
		done();
	});
	it("creates user Admin", function(done){
		tokAdmin = app.testing.functions.tempUser("UWA", 3, 60000); //new ninja
		expect(app.testing.vars.users[tokAdmin]).to.exist;
		done();
	});

	it("ninja has ninja permissions", function(done){
		expect(app.testing.vars.users[tokNinja].perm).to.equal(0);
		done();
	});
	it("mentor has mentor permissions", function(done){
		expect(app.testing.vars.users[tokMentor].perm).to.equal(1);
		done();
	});
	it("champion has Champion permissions", function(done){
		expect(app.testing.vars.users[tokChamp].perm).to.equal(2);
		done();
	});
	it("has Champion permissions", function(done){
		expect(app.testing.vars.users[tokAdmin].perm).to.equal(3);
		done();
	});
	it("removes a user ninja",function(done){
		app.testing.vars.users.remove(tokNinja);
		expect(app.testing.vars.users[tokNinja]).to.not.exist;
		setTimeout(function(){
			app.testing.vars.users.save();
			done();
		},1000);
	});
	it("removes a user Mentor",function(done){
		app.testing.vars.users.remove(tokMentor);
		expect(app.testing.vars.users[tokMentor]).to.not.exist;
		setTimeout(function(){
			app.testing.vars.users.save();
			done();
		},1000);
	});
	it("removes a user Champion",function(done){
		app.testing.vars.users.remove(tokChamp);
		expect(app.testing.vars.users[tokChamp]).to.not.exist;
		setTimeout(function(){
			app.testing.vars.users.save();
			done();
		},1000);
	});
	it("removes a user Admin",function(done){
		app.testing.vars.users.remove(tokAdmin);
		expect(app.testing.vars.users[tokAdmin]).to.not.exist;
		setTimeout(function(){
			app.testing.vars.users.save();
			done();
		},1000);
	});
});
