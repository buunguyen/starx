global.expect = require('chai').expect
global.assert = require('chai').assert
global.sinon  = require('sinon')
global.Q      = require('q')
global.starx  = require('../lib')
global.y      = starx.yieldable

global._catch = function(done, fn) {
  try {
    fn()
    done()
  } catch (e) {
    done(e)
  }
}