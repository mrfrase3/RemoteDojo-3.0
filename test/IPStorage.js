/*global describe, it*/

var expect = require("chai").expect;
var app = require("../app.js");
var config = require("../config.json");
var maxAccessesPerDay = config.maxAccessesPerDay;
expect(app.testing.vars.ipaddresses).to.exist;
describe("Test to ensure IP's are logged and limited.", function() {
	describe("Can log one IP", function() {
		var singleIP = "1.1.1.1";
		it("Create one IP and ensure it has been stored to relavant array", function(done) {
			while (app.testing.vars.ipaddresses.length!=0) { //empty out ipaddresses variable for later testing
				app.testing.vars.ipaddresses.pop();
			}
			expect(app.testing.vars.ipaddresses.length).to.equal(0);
			expect(app.testing.functions.ipverification(singleIP,maxAccessesPerDay)).to.equal.true;
			expect(app.testing.vars.ipaddresses.length).to.equal(1);
			expect(app.testing.vars.ipaddresses[0].address).to.equal(singleIP);
			done();
		});
		it("Simulate multiple accesses from one IP address and check it is allowed upto the max allocated by config file", function(done) {
			for(var i = 0;i<maxAccessesPerDay*2;i++) {
				if(i <= maxAccessesPerDay){
					expect(app.testing.functions.ipverification(singleIP,maxAccessesPerDay)).to.equal.true;
				}
				else{
					expect(app.testing.functions.ipverification(singleIP,maxAccessesPerDay)).to.not.equal.true;
				}
			}
			while (app.testing.vars.ipaddresses.length!=0) { //empty out ipaddresses variable for later testing
				app.testing.vars.ipaddresses.pop();
			}
			done();
		});
	});
	describe("Can log multiple IPs",function() {
		var multipleIPs = ["1.1.1.1","1.1.1.2","2.1.1.1","100.11.0.51"];
		var accessAmounts = [10000,maxAccessesPerDay-1,maxAccessesPerDay+1,1]; //should be "absurdly high", config+1, config-1, 1
		while (app.testing.vars.ipaddresses.length!=0) {}//put test on hold while waiting for first array to empty out
		expect(app.testing.vars.ipaddresses.length).to.equal(0);
		it("Creates multiple IPs and ensure that it has been stored to the relevant array", function(done) {
			for(var i = 0; i < multipleIPs.length;i++){
				app.testing.functions.ipverification(multipleIPs[i],maxAccessesPerDay);
			}
			for(var j = 0; j < multipleIPs.length;j++){
				expect(app.testing.vars.ipaddresses[j].address).to.equal(multipleIPs[j]);
			}
			expect(app.testing.vars.ipaddresses.length).to.equal(multipleIPs.length);
			done();
		});
		it("Simulate multiple accesses from multile IP addresses and check it is allowed upto the max allocated by config file", function(done) {
			for(var i = 0; i < multipleIPs.length;i++){
				var currentIP = multipleIPs[i];
				var currentAccesses = accessAmounts[i];
				for(var j = 0;j<currentAccesses;j++) {
					if(j <= maxAccessesPerDay){
						expect(app.testing.functions.ipverification(currentIP,maxAccessesPerDay)).to.equal.true;
					}
					else{
						expect(app.testing.functions.ipverification(currentIP,maxAccessesPerDay)).to.not.equal.true;
					}
				}

			}
			done();
		});
	});
});
