"use strict";

var Lab = require("lab");
var assert = require("assert");
var grunt = require("grunt");
var raygunDeployment = require("../tasks/raygun-deployment");

var lab = exports.lab = Lab.script();

var taskName = "raygun-deployment";

lab.experiment(taskName, function() {

  lab.test("task registers", function(done) {

    raygunDeployment(grunt);

    assert(grunt.task.exists(taskName));

    done();
  });
});
