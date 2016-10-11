/*global describe, it*/

var storage = require("./lib/storage.js");
var file = new storage(__dirname+"/testFile.json");
var expect = require("chai").expect;
var assert = require("chai").assert;
var fs = require("fs");

describe("Storage Suite", function(){
	describe("Writing to file", function(){
		it("add * to the json object", function(done){
			file.add("xyz", {number: 600, letter: "abc"});
			done();
		});
		it("can access * from json objoect", function(done){
			expect(file["xyz"]).to.exist;
			expect(file["xyz"]).to.contain({number: 600, letter: "abc"});
			done();
		});
		it("saves json object to file", function(done){
			file.save();
			setTimeout(function(){
				done();
			},1000);
		});
		describe("Reads From File", function(){
			it("reads * from file", function(done){
				fs.readFile(__dirname+"/testFile.json", "utf8", function(err, data){
					if(err){
						assert.fail("Error thrown on readFile Read");
					}
					expect(data).to.contain("xyz", {number: 600, letter: "abc"});
					done();
				});
			});
		});
		describe("Deletes from File", function(){
			it("* is removed from json object", function(done){
				var file = new storage(__dirname+"/testFile.json");
				file.remove("xyz");
				expect(file["xyz"]).to.not.exist;
				setTimeout(function(){
					file.save();
					done();
				}, 100);
			});
			it("removed from file", function(done){
				fs.readFile(__dirname+"/testFile.json", "utf8", function(err, data){
					if(err){
						assert.fail("Error thrown on readFile Delete");
					}
					expect(data).to.not.contain("xyz", {number: 600, letter: "abc"});
					done();
				});
			});
		});
	});
});
