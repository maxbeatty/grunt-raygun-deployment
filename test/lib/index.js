"use strict";

var Lab = require("lab");
var assert = require("assert");
var proxyquire = require("proxyquire");
var sinon = require("sinon");

var gruntStub = {
  fatal: sinon.stub(),
  log: {
    writeln: sinon.stub()
  }
};

var childProcessStub = {
  exec: sinon.stub()
};

var httpsStub = {
  request: sinon.stub()
};

var task = proxyquire("../../tasks/lib/", {
  "child_process": childProcessStub,
  https: httpsStub,
  grunt: gruntStub
});

var lab = exports.lab = Lab.script();

lab.experiment("raygun-deployment lib", function() {

  var s;

  var createMockTask = function(done) {
    return {
      async: function() {
        return done;
      }
    };
  };

  lab.beforeEach(function(done) {
    s = sinon.sandbox.create();

    done();
  });

  lab.afterEach(function(done) {
    s.restore();

    done();
  });

  lab.experiment("registerWithGrunt", function() {
    lab.test("runs once registered", function(done) {

      s.stub(task, "run", function() {
        done();
      });

      task.registerWithGrunt({
        registerTask: function(name, description, runner) {
          assert.equal(name, "raygun-deployment");
          assert(/Raygun\.io/.test(description));

          runner(); // calls stub which finishes the test
        }
      });
    });
  });

  lab.experiment("run", function() {

    lab.beforeEach(function(done) {
      process.env.RAYGUN_DEPLOY_TOKEN = "user";
      process.env.RAYGUN_DEPLOY_KEY = "app";

      done();
    });

    lab.afterEach(function(done) {
      delete process.env.RAYGUN_DEPLOY_TOKEN;
      delete process.env.RAYGUN_DEPLOY_KEY;

      done();
    });

    lab.test("fails if RAYGUN_DEPLOY_TOKEN missing", function(done) {
      delete process.env.RAYGUN_DEPLOY_TOKEN;

      task.run(createMockTask());

      assert(gruntStub.fatal.calledWith(sinon.match("RAYGUN_DEPLOY_TOKEN")));

      done();
    });

    lab.test("fails if RAYGUN_DEPLOY_KEY missing", function(done) {
      delete process.env.RAYGUN_DEPLOY_KEY;

      task.run(createMockTask());

      assert(gruntStub.fatal.calledWith(sinon.match("RAYGUN_DEPLOY_KEY")));

      done();
    });

    lab.test("gets tag, then hash, then creates deployment", function(done) {
      var tag = "v1.0.0";
      var hash = "r4nD0m";
      s.stub(task, "getTag").yields(tag);
      s.stub(task, "getHash").yields(hash);
      s.stub(task, "createDeployment").yields();

      task.run(createMockTask(function() {
        assert(task.getTag.called);
        assert(task.getHash.called);
        assert(task.createDeployment.calledWith(tag, hash));

        done();
      }));
    });

  });

  lab.experiment("exec", function() {
    lab.test("executes child process command", function(done) {
      var cmd = "ls";

      childProcessStub.exec.callsArgWith(1, null, "stdout\n");

      task.exec(cmd, function(out) {
        assert.equal(out, "stdout");
        assert(childProcessStub.exec.calledWith(cmd));

        done();
      });
    });

    lab.test("fatals if error executing command", function(done) {
      var testErr = new Error("test");

      childProcessStub.exec.callsArgWith(1, testErr);

      task.exec("ls", function() {
        done(new Error("failed to fatal"));
      });

      assert(gruntStub.fatal.calledWithExactly(testErr));
      done();
    });

    lab.test("fatals if no response from command", function(done) {
      childProcessStub.exec.callsArgWith(1, null, " ");

      task.exec("ls", function() {
        done(new Error("failed to fatal"));
      });

      assert(gruntStub.fatal.calledWith(sinon.match.instanceOf(Error)));
      done();
    });
  });

  lab.experiment("getTag", function() {
    lab.test("executes git tag command", function(done) {
      var tag = "v1.0.0";
      s.stub(task, "exec").yields(tag);

      task.getTag(function(gitTag) {
        assert.equal(gitTag, tag);

        done();
      });
    });
  });

  lab.experiment("getHash", function() {
    lab.test("executes git hash command", function(done) {
      var hash = "r4nD0m";
      s.stub(task, "exec").yields(hash);

      task.getHash("v1.0.0", function(gitHash) {
        assert.equal(gitHash, hash);

        done();
      });
    });
  });

  lab.experiment("createDeployment", function() {
    var token = "user";
    var key = "app";
    var version;
    var scmIdentifier;
    var onStub;
    var writeStub;
    var endMock;

    lab.before(function(done) {
      process.env.RAYGUN_DEPLOY_TOKEN = token;
      process.env.RAYGUN_DEPLOY_KEY = key;

      done();
    });

    lab.beforeEach(function(done) {

      version = "v1.0.0";
      scmIdentifier = "r4nD0m";
      onStub = s.stub();
      writeStub = s.stub();
      endMock = function() {};

      httpsStub.request.returns({
        on: onStub,
        write: writeStub,
        end: endMock
      });

      done();

    });

    lab.test("fatals on request errors", function(done) {
      task.createDeployment(version, scmIdentifier);

      assert(onStub.calledWith("error", gruntStub.fatal));

      done();
    });

    lab.test("writes JSON to request", function(done) {
      task.createDeployment(version, scmIdentifier);

      assert(writeStub.calledWithExactly(JSON.stringify({
        apiKey: key,
        version: version,
        scmIdentifier: scmIdentifier
      })));

      done();
    });

    lab.test("calls back if successful API call", function(done) {
      httpsStub.request.yields({
        statusCode: 200
      });

      task.createDeployment(version, scmIdentifier, function() {
        var reqOptions = httpsStub.request.args[0][0];

        // request called properly
        assert.equal(reqOptions.hostname, "app.raygun.io", "hostname");
        assert.equal(reqOptions.port, 443, "port");
        assert.equal(reqOptions.path, "/deployments?authToken=" + token, "path");
        assert.equal(reqOptions.method, "POST", "method");
        assert.equal(reqOptions.headers["Content-Type"], "application/json", "json header");

        done();
      });

    });

    lab.test("fatals if API key invalid", function(done) {
      httpsStub.request.yields({
        statusCode: 403
      });

      task.createDeployment(version, scmIdentifier);

      assert(gruntStub.fatal.calledWith(sinon.match("raygunApiKey")));

      done();
    });

    lab.test("fatails if auth token invalid", function(done) {
      httpsStub.request.yields({
        statusCode: 401
      });

      task.createDeployment(version, scmIdentifier);

      assert(gruntStub.fatal.calledWith(sinon.match("raygunAuthToken")));

      done();
    });

    lab.test("fatals if other API error", function(done) {
      var code = 500;
      httpsStub.request.yields({
        statusCode: code
      });

      task.createDeployment(version, scmIdentifier);

      assert(gruntStub.fatal.calledWith(sinon.match(code.toString())));

      done();
    });
  });
});
