/*global describe, it*/

var app = require("../app.js");
var expect = require("chai").expect;
var tokNinja, tokMentor, tokChamp, tokAdmin;

describe("User Creation", function(){
	it("creates user ninja", function(done){
		tokNinja = app.tempUser("UWA", 0, 60000); //new ninja
		expect(app.users[tokNinja]).to.exist;
		done();
	});
	it("has ninja permissions", function(done){
		expect(app.users[tokNinja].perm).to.equal(0);
		done();
	});
	it("removes a user ninja",function(done){
		app.users.remove(tokNinja);
		expect(app.users[tokNinja]).to.not.exist;
		setTimeout(function(){
			app.users.save();
			done();
		},1000);
	});

	it("creates user Mentor", function(done){
		tokMentor = app.tempUser("UWA", 1, 60000); //new ninja
		expect(app.users[tokMentor]).to.exist;
		done();
	});
	it("has Mentor permissions", function(done){
		expect(app.users[tokMentor].perm).to.equal(1);
		done();
	});
	it("removes a user Mentor",function(done){
		app.users.remove(tokMentor);
		expect(app.users[tokMentor]).to.not.exist;
		setTimeout(function(){
			app.users.save();
			done();
		},1000);
	});
	it("creates user Champion", function(done){
		tokChamp = app.tempUser("UWA", 2, 60000); //new ninja
		expect(app.users[tokChamp]).to.exist;
		done();
	});
	it("has Champion permissions", function(done){
		expect(app.users[tokChamp].perm).to.equal(2);
		done();
	});
	it("removes a user Champion",function(done){
		app.users.remove(tokChamp);
		expect(app.users[tokChamp]).to.not.exist;
		setTimeout(function(){
			app.users.save();
			done();
		},1000);
	});
	it("creates user Admin", function(done){
		tokAdmin = app.tempUser("UWA", 3, 60000); //new ninja
		expect(app.users[tokAdmin]).to.exist;
		done();
	});
	it("has Admin permissions", function(done){
		expect(app.users[tokAdmin].perm).to.equal(3);
		done();
	});
	it("removes a user Admin",function(done){
		app.users.remove(tokAdmin);
		expect(app.users[tokAdmin]).to.not.exist;
		setTimeout(function(){
			app.users.save();
			done();
		},1000);
	});
});
