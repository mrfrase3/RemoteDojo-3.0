/*global describe, it*/

var assert = require("assert");
describe("Array", function() {
	describe("#indexOf()", function() {
		it("Should return 2 when taking the index of 3 in [1,2,3]", function(done) {
			assert.equal(2, [1,2,3].indexOf(3));
			done();
		});
		it("Should return 0 when taking the index of 1 in [1,2,3]", function(done) {
			assert.equal(0, [1,2,3].indexOf(1));
			done();
		});
	});
	describe("#pop()",function() {
		it("Should return 3 when popping	[1,2,3]", function(done) {
			assert.equal(3, [1,2,3].pop());
			done();
		});
		it("Should return 2 when popping	[1,2]", function(done) {
			assert.equal(2, [1,2].pop());
			done();
		});
	});
});
