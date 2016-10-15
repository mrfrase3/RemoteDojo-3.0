/*global describe, it*/

var app = require("../app.js");
//var assert = require("chai").assert;
var expect = require("chai").expect;

var names = ["Ninja", "Mentor", "Champion", "Admin"];
var token;

describe("User timeout 3 seconds", function(){
	it("creates user ninja", function(done){
		token = app.testing.functions.tempUser("UWA", names[0], 3000); //new ninja
		expect(app.testing.vars.users[token]).to.exist;
		done();
	});
	it("Deletes User after expiry",function(done){
		this.timeout(5000);
		setTimeout(function(){
			expect(app.testing.vars.users[token]).to.not.exist;
			app.testing.vars.users.save();
			done();
		}, 4000);
	});
});
