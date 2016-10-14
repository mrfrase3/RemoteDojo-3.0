/*global describe, it*/

var expect = require("chai").expect;
//var app = require("../app.js");
describe("Test to ensure IP's are logged and limited.", function() {
	describe("Can log one IP - ", function() {
		it("Create one IP and ensure it has been stored to relavant array", function(done) {
			var singleIP = "1.1.1.1";
			//app.ipverification(singleIP);
			//expect(app.ipaddress).to.contaian(singleIP);
			done();
		});
		it("Simulate multiple accesses from one IP address - Should pass without throwing any errors", function(done) {
		//	for(i = 0,i<5,i++) { //change 5 to show whatever config file is
		//		app.ipverification(singleIP);
		//	}
		//	expect(app.ipaddress[0].count).to.equal(5);

			done();
		});
		it("Revoke access after * accesses - Should pass by catching any permission denied like errors", function(done) {
			//insert function to deny access to an ip with count exceeding array count
			done();
		});
	});
	describe("Can log multiple IPs - ",function() {
		var multipleIPs = ["1.1.1.1","1.1.1.2","2.1.1.1","100.11.0.51"];
		var accessAmounts = [10000,6,4,0]; //should be "absurdly high", config+1, config-1, 1
		while (app.ipaddresses.size()!=0) {}//put test on hold while waiting for first array to empty out
		it("Creates multiple IPs and ensure that it has been stored to the relevant array", function(done) {
			for(currentIP in multipleIPs){
				/*
				//	app.ipverification(currentIP);
				*/
			}
			for(currentIP in multipleIPs){
				/*
				//expect(app.ipaddress).to.contaian(currentIP);
				*/
			}
			done();
		});
		it("Simulate multiple accesses over multiple IP address, with different values - Should pass without throwing any errors", function(done) {
			for(var i = 0; i < multipleIPs.length();i++){
				currentIP = multipleIPs[i];
				currentAccesses = accessAmounts[i];
				while(app.ipaddress[i].count > currentAccesses){
					/*
					//	app.ipverification(currentIP);
					*/
				}

			}
			for(var i = 0; i < multipleIPs.length();i++){
				//expect(app.ipaddress[i].count).to.equal(accessAmounts[i]);
			}
			done();
		});
		it("Revoke IPs with values over the defined threshold - Should pass by catching any permission denied like errors", function(done) {
			done();
		});
	});
});
