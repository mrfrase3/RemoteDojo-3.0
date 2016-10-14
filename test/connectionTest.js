var app = require("../app.js");
var config = require("../config.json");
var dojos = app.testing.vars.dojos;
var users = app.testing.vars.users;
//var should = require("chai").should;

var chai = require('chai');
var chaiHttp = require('chai-http');
var should = chai.should();
var expect = chai.expect;
chai.use(chaiHttp);
//var supertest = require("supertest");
var ninja, mentor;


var server = app.testing.app;

describe("connection testing",function(){
  it("app has started", function(done){
    chai.request(server)
    .get("/")
    .end(function(err, res){
      res.should.have.status(200);
      done();
    })
    //done();
  });
  if(config.demoDuration){
    describe("Demo mode", function(){
      var numberDojos = dojos._indexes.length;
      var numberUsers = users._indexes.length;

      it("pressing demo button POST /", function(done){
        chai.request(server)
        .post("/")
        .end(function(err, res){
          res.should.have.status(200);
          done();
        })
      });
      it("generates demo dojo", function(done){
        expect(dojos._indexes.length).to.be.equal(numberDojos + 1);
        done();
      });
      describe("generates demo users", function(){
        it("2 users", function(done){
          expect(users._indexes.length).to.be.equal(numberUsers + 2);
          done();
        });
        it("1x ninja", function(done){
          ninja = users._indexes[numberUsers + 1];
          expect(users[ninja].perm).to.be.equal(0);
          done();
        });
        it("1x mentor", function(done){
          mentor = users._indexes[numberUsers];
          expect(users[mentor].perm).to.be.equal(1);
          done();
        });
      });
      describe("links work", function(){
        it("ninja link", function(done){
          chai.request(server)
          .post("/?u=" + users[ninja].authtok)
          .end(function(err, res){
            res.should.have.status(200);
            done();
          })
        });
        it("mentor link", function(done){
          chai.request(server)
          .post("/?u=" + users[mentor].authtok)
          .end(function(err, res){
            res.should.have.status(200);
            done();
          })
        });
      });
      describe("logout", function(){
        it("ninja logout", function(done){
          chai.request(server)
          .post("/?u=" + users[ninja].authtok + "/logout")
          .end(function(err, res){
            res.should.have.status(200);
            done();
          })
        });
        it("mentor logout", function(done){
          chai.request(server)
          .post("/?u=" + users[mentor].authtok + "/logout")
          .end(function(err, res){
            res.should.have.status(200);
            done();
          })
        });
      });
    });
  }
});

/*
it("", function(done){
  done();
});
*/
