var expect = require('chai').expect
var assert = require('chai').assert
var sinon  = require('sinon')
var Q      = require('q')
var starx  = require('../index')

describe('starx', function() {
  var spy,
      TOKEN = {}, 
      ERROR = new Error()

  beforeEach(function() {
    spy = sinon.spy()
  })

  it('throws if argument is not a function', function() {
    expect(function() {
      starx()
    }).to.throw(TypeError)
  })

  it('returns an executor when invoked with a generator', function() {
    expect(starx(function*() {})).to.be.a('function')
  })

  describe('executor', function() {
    var niceGuy = function(cb) {
      cb(null, TOKEN)
    }
    var throwGuy = function(cb) {
      cb(ERROR)
    }
    var asyncGuy = function(cb) {
      process.nextTick(function() {
        cb(null, TOKEN)
      })
    }

    it('runs generator when invoked', function() {
      starx(function*() {
        spy()
      })()
      expect(spy.calledOnce).to.be.true
    })

    it('allows generator to be reused', function() {
      var g = function*() {
        spy()
      }
      starx(g)()
      starx(g)()
      expect(spy.calledTwice).to.be.true
    })

    describe('when yieldable is a function(args..., cb)', function() {
      it('invokes the yielded function automatically', function() {
        starx(function*() {
          yield spy
        })()
        expect(spy.calledOnce).to.be.true
      })

      it('sends value of previous call into the generator', function() {
        starx(function*() {
          var res = yield niceGuy
          expect(res).to.equal(TOKEN)
        })()
      })

      it('keeps sending values into the generator', function() {
        starx(function*() {
          for (var i = 0; i < 10; i++) {
            spy(yield niceGuy)
          }
        })()
        expect(spy.alwaysCalledWith(TOKEN)).to.be.true
        expect(spy.callCount).to.equal(10)
      })

      it('throws error into the generator', function() {
        starx(function*() {
          try {
            yield throwGuy
            assert(false, 'should not come here')
          } catch(e) {
            expect(e).to.be.equal(ERROR)
            var res = yield niceGuy
            expect(res).to.equal(TOKEN)
          }
        })()
      })

      it('waits until async call is completed', function(done) {
        var _done = function() {
          _catch(done, function() {
            expect(spy.alwaysCalledWith(TOKEN)).to.be.true
            expect(spy.callCount).to.equal(10)
            done()
          })
        }
        starx(function*() {
          for (var i = 0; i < 10; i++) {
            spy(yield asyncGuy)
            if (i === 9) _done()
          }
        })()
      })
    })

    describe('when yieldable is a promise', function() {
      var ff = Q.fcall(function() {
        return TOKEN
      })
      var rj = Q.fcall(function() {
        throw ERROR
      })

      it('sends fulfilled value into the generator', function(done) {
        var _done = function() {
          _catch(done, function() {
            expect(spy.alwaysCalledWith(TOKEN)).to.be.true
            expect(spy.callCount).to.equal(10)
            done()    
          })
        }
        starx(function*() {
          for (var i = 0; i < 10; i++) {
            spy(yield ff)
            if (i === 9) _done()
          }
        })()
      })

      it('sends rejected error into the generator', function(done) {
        var _done = function() {
          _catch(done, function() {
            expect(spy.alwaysCalledWith(ERROR)).to.be.true
            expect(spy.callCount).to.equal(10)
            done()
          })
        }
        starx(function*() {
          for (var i = 0; i < 10; i++) {
            try {
              yield rj
            } catch (e) {
              spy(e)
              if (i === 9) done()
            }         
          }
        })()
      })
    })

    describe('when yieldable is an array', function() {
      it('executes all functions in the array', function() {
        starx(function*() {
          spy(yield [niceGuy, niceGuy])
        })()
        expect(spy.withArgs([TOKEN, TOKEN]).calledOnce).to.be.true
      })
      
      it('supports nested arrays', function() {
        starx(function*() {
          spy(yield [niceGuy, [niceGuy, [niceGuy, niceGuy]]])
        })()
        expect(spy.withArgs([TOKEN, [TOKEN, [TOKEN, TOKEN]]]).calledOnce).to.be.true
      })
      
      it('supports mixing different yieldables', function() {
        starx(function*() {
          spy(yield [TOKEN, [niceGuy, 1]])
        })()
        expect(spy.withArgs([TOKEN, [TOKEN, 1]]).calledOnce).to.be.true
      })
    })  

    describe('when yieldable is an executor', function() {
      it('executes the executor\'s return value as a yieldable', function() {
        var g1 = starx(function*() {
          return niceGuy
        })
        var g2 = starx(function*() {
          return [niceGuy, niceGuy]
        })
        starx(function*() {
          spy(yield [g1, g2])
        })()
        expect(spy.withArgs([TOKEN, [TOKEN, TOKEN]]).calledOnce).to.be.true
      })
    })  

    describe('when yieldable is anything thing else', function() {
      it('returns value directly', function() {
        starx(function*() {
          spy(yield TOKEN)
          spy(yield 1)
          var res = yield
          spy(res)
        })()
        expect(spy.firstCall.calledWithExactly(TOKEN)).to.be.true
        expect(spy.secondCall.calledWithExactly(1)).to.be.true
        expect(spy.thirdCall.calledWithExactly(undefined)).to.be.true
      })
    })
  })
})