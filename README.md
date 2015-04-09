# grunt-raygun-deployment [![Build Status](https://secure.travis-ci.org/maxbeatty/grunt-raygun-deployment.png?branch=master)](http://travis-ci.org/maxbeatty/grunt-raygun-deployment) [![Code Climate](https://codeclimate.com/github/maxbeatty/grunt-raygun-deployment/badges/gpa.svg)](https://codeclimate.com/github/maxbeatty/grunt-raygun-deployment) [![Test Coverage](https://codeclimate.com/github/maxbeatty/grunt-raygun-deployment/badges/coverage.svg)](https://codeclimate.com/github/maxbeatty/grunt-raygun-deployment)

This plugin makes it easy to notify Raygun of your deployments using a grunt task.

## Install

```bash
npm install maxbeatty/grunt-raygun-deployment --save-dev
```

## Use

Load the task in your Gruntfile:

```js
grunt.loadNpmTasks('grunt-raygun-deployment')
```

### Environment Variables

#### RAYGUN_DEPLOY_KEY

`RAYGUN_DEPLOY_KEY` should be set to your Raygun API Key from "Application Settings".

#### RAYGUN_DEPLOY_TOKEN

`RAYGUN_DEPLOY_TOKEN` should be set to your External Auth Token from ["My Settings"](https://app.raygun.io/user).

```bash
RAYGUN_DEPLOY_KEY=fR0mApp RAYGUN_DEPLOY_TOKEN=uS3r grunt raygun-deployment
```

_You could use something like [dotenv](https://www.npmjs.com/package/dotenv) in your Gruntfile to avoid specifying environment variables before calling `grunt`._

## Fork Differences

- no yaml file declaring release details
- no declaring sensitive information in your Gruntfile
- convention of using latest git tag for `version`
- convention of using latest git tag commit for `scmIdentifier`
- not setting any other deployment fields
