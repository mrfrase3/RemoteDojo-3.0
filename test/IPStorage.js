/*global describe, it*/

var assert = require("assert");
describe("Test to ensure IP's are logged and limited.", function() {
	describe("Can log one IP - ", function() {
		it("Create one IP and ensure it has been stored to JSON file - Should pass by reading JSON File", function(done) {
			done();
		});
		it("Simulate multiple accesses from one IP address - Should pass without throwing any errors", function(done) {
			done();
		});
		it("Revoke access after * accesses - Should pass by catching any permission denied like errors", function(done) {
			done();
		});
	});
	describe("Can log multiple IPs - ",function() {
		it("Creates multiple IPs and ensure that it has been stored to JSON file - Should pass by reading JSON File", function(done) {
			done();
		});
		it("Simulate multiple accesses over multiple IP address, with different values - Should pass without throwing any errors", function(done) {

			done();
		});
		it("Revoke IPs with values over the defined threshold - Should pass by catching any permission denied like errors", function(done) {
			done();
		});
	});
});
