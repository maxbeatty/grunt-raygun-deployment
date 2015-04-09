"use strict";

var exec = require("child_process").exec;
var https = require("https");

var grunt = require("grunt");

module.exports = {
  registerWithGrunt: function (gruntRunner) {
    var self = this;
    gruntRunner.registerTask(
      "raygun-deployment",
      "Grunt plugin for generating Deployment information for Raygun.io",
      function () {
        // this is grunt.task
        self.run(this);
      }
    );
  },
  run: function(task) {
    var finishedTask = task.async();

    if(!process.env.RAYGUN_DEPLOY_TOKEN){
      grunt.fatal("Required environment variable RAYGUN_DEPLOY_TOKEN is missing");
      return;
    }

    if(!process.env.RAYGUN_DEPLOY_KEY){
      grunt.fatal("Required environment variable RAYGUN_DEPLOY_KEY is missing");
      return;
    }

    var self = this;

    self.getTag(function(gitTag) {
      self.getHash(gitTag, function(gitHash) {
        self.createDeployment(gitTag, gitHash, finishedTask);
      });
    });
  },
  exec: function(cmd, cb) {
    exec(cmd, function(err, stdout) {
      if (err) {
        grunt.fatal(err);
        return;
      }

      cb(stdout.trim());
    });
  },
  getTag: function(cb) {
    this.exec("git tag --sort=version:refname | tail -n 1", cb);
  },
  getHash: function(tag, cb) {
    this.exec("git rev-list " + tag + " | head -n 1", cb);
  },
  createDeployment: function(version, scmIdentifier, cb) {
    var req = https.request({
      hostname: "app.raygun.io",
      port: 443,
      path: "/deployments?authToken=" + process.env.RAYGUN_DEPLOY_TOKEN,
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    }, function(res) {
      if (res.statusCode === 200) {
        grunt.log.writeln("Sent deployment info to Raygun.io");
        cb();
      } else if(res.statusCode === 403) {
        grunt.fatal("Could not send deployment info to Raygun: your raygunApiKey is either wrong or you don't have access to that application");
      } else if(res.statusCode === 401) {
        grunt.fatal("Could not send deployment info to Raygun: your raygunAuthToken is wrong");
      } else {
        grunt.fatal("Could not send deployment info to Raygun: got a " + res.statusCode + " response code");
      }
    });

    req.on("error", grunt.fatal);

    req.write(JSON.stringify({
      apiKey: process.env.RAYGUN_DEPLOY_KEY,
      version: version,
      scmIdentifier: scmIdentifier
    }));

    req.end();
  }
};
