var expect = require('chai').expect
var assert = require('chai').assert
var sinon  = require('sinon')
var Q      = require('q')
var starx  = require('../index')

describe('starx', function() {
  var spy,
      TOKEN = {}, 
      ERROR = new Error(),
      SIM_GEN = function*() {
        spy()
      }

  beforeEach(function() {
    spy = sinon.spy()
  })

  it('throws if argument is not a generator or iterator', function() {
    expect(function() {
      starx()
    }).to.throw(TypeError)

    expect(function() {
      starx('whatever')
    }).to.throw(TypeError)

    expect(function() {
      starx(function() {})
    }).to.throw(TypeError)
  })

  it('returns an executor when invoked with a generator or iterator', function() {
    expect(starx(function*() {})).to.be.a('function')
    expect(starx((function*() {})())).to.be.a('function')
  })

  describe('executor', function() {
    var niceGuy = function(cb) {
      cb(null, TOKEN)
    }
    var throwGuy = function(cb) {
      cb(ERROR)
    }
    var asyncNiceGuy = function(cb) {
      setTimeout(function() {
        setImmediate(function() {
          process.nextTick(function() {
            cb(null, TOKEN)
          })
        })
      })
    }
    var asyncThrowGuy = function() {
      setTimeout(function() {
        setImmediate(function() {
          process.nextTick(function() {
            throw ERROR
          })
        })
      })
    }

    describe('when executor is invoked', function() {
      it('runs generator', function(done) {
        starx(SIM_GEN)(function() {
          _catch(done, function() {
            expect(spy.calledOnce).to.be.true
          })
        })
      })

      it('runs iterator', function(done) {
        starx(SIM_GEN())(function() {
          _catch(done, function() {
            expect(spy.calledOnce).to.be.true
          })
        })
      })

      it('allows generator to be reused', function(done) {
        var count = 0
        starx(SIM_GEN)(check)
        starx(SIM_GEN)(check)
        function check() {
          if (++count < 2) return;
          _catch(done, function() {
            expect(spy.calledTwice).to.be.true
          })
        }
      })
    })

    describe('when generator throws', function() {
      it('handles exception', function(done) {
        starx(function *() {
          throw ERROR
        })(function(err) {
          _catch(done, function() {
            expect(err).to.equal(ERROR)
          })
        })
      })

      it('handles asynchronous exception if the iterator has not completed', function(done) {
        starx(function *() {
          setTimeout(function() {
            throw ERROR
          }, 10)
          yield function(cb) {}
        })(function(err) {
          _catch(done, function() {
            expect(err).to.equal(ERROR)
          })
        })
      })
    })

    describe('when yieldable is a function(args..., cb)', function() {
      it('sends value of previous call into the generator', function(done) {
        starx(function*() {
          var res = yield niceGuy
          expect(res).to.equal(TOKEN)
        })(done)
      })

      it('keeps sending values into the generator', function(done) {
        starx(function*() {
          for (var i = 0; i < 10; i++) {
            spy(yield niceGuy)
          }
        })(function() {
          _catch(done, function() {
            expect(spy.alwaysCalledWith(TOKEN)).to.be.true
            expect(spy.callCount).to.equal(10)
          })
        })
      })

      it('injects error into the generator', function(done) {
        starx(function*() {
          try {
            yield throwGuy
            assert(false, 'should not come here')
          } catch(e) {
            expect(e).to.be.equal(ERROR)
          }
        })(function(err) {
          _catch(done, function() {
            expect(err).to.be.null
          })
        })
      })

      it('waits until async call is completed', function(done) {
        var _done = function() {
          _catch(done, function() {
            expect(spy.alwaysCalledWith(TOKEN)).to.be.true
            expect(spy.callCount).to.equal(10)
          })
        }
        starx(function*() {
          for (var i = 0; i < 10; i++) {
            spy(yield asyncNiceGuy)
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
      it('executes all functions in the array', function(done) {
        starx(function*() {
          spy(yield [niceGuy, niceGuy])
        })(function() {
          _catch(done, function() {
            expect(spy.withArgs([TOKEN, TOKEN]).calledOnce).to.be.true
          })
        })
      })
      
      it('supports nested arrays', function(done) {
        starx(function*() {
          spy(yield [niceGuy, [niceGuy, [niceGuy, niceGuy]]])
        })(function() {
          _catch(done, function() {
            expect(spy.withArgs([TOKEN, [TOKEN, [TOKEN, TOKEN]]]).calledOnce).to.be.true
          })
        })
      })
      
      it('supports mixing different yieldables', function(done) {
        starx(function*() {
          spy(yield [TOKEN, [niceGuy, 1]])
        })(function() {
          _catch(done, function() {
            expect(spy.withArgs([TOKEN, [TOKEN, 1]]).calledOnce).to.be.true
          })
        })
      })
    })  

    describe('when yieldable is an executor', function() {
      it('executes the executor\'s return value as a yieldable', function(done) {
        var g1 = starx(function*() {
          return niceGuy
        })
        var g2 = starx(function*() {
          return [niceGuy, niceGuy]
        })
        starx(function*() {
          var a = yield [g1, g2]
          spy(a)
        })(function() {
          _catch(done, function() {
            expect(spy.withArgs([TOKEN, [TOKEN, TOKEN]]).calledOnce).to.be.true
          })
        })
      })
    })  

    describe('when yieldable is a iterator or generator', function() {
      var g1 = function*() {
        spy(yield niceGuy)
        return niceGuy
      }

      it('dives into the iterator', function(done) {
        starx(function*() {
          spy(yield g1())
          spy(yield g1())
        })(function() {
          _catch(done, function() {
            expect(spy.withArgs(TOKEN).callCount).equal(4)
          })
        })
      })

      it('dives into the generator', function(done) {
        starx(function*() {
          spy(yield g1)
          spy(yield g1)
        })(function() {
          _catch(done, function() {
            expect(spy.withArgs(TOKEN).callCount).equal(4)
          })
        })
      })

      it('injects error thrown in nested generator', function(done) {
        starx(function*() {
          try {
            yield function *() {
              throw ERROR
            }
            assert(false, 'should not come here')
          } catch(e) {
            _catch(done, function() {
              expect(e).to.be.equal(ERROR) 
            })
          }
        })()
      })

      it('injects async error thrown in nested generator', function(done) {
        starx(function*() {
          try {
            yield function *() {
              yield asyncThrowGuy
            }
            assert(false, 'should not come here')
          } catch(e) {
            _catch(done, function() {
              expect(e).to.be.equal(ERROR) 
            })
          }
        })()
      })
    })   

    describe('when yieldable is anything else', function() {
      it('returns value directly', function(done) {
        starx(function*() {
          spy(yield TOKEN)
          spy(yield 1)
          var res = yield
          spy(res)
        })(function() {
          _catch(done, function() {
            expect(spy.firstCall.calledWithExactly(TOKEN)).to.be.true
            expect(spy.secondCall.calledWithExactly(1)).to.be.true
            expect(spy.thirdCall.calledWithExactly(undefined)).to.be.true
          })
        })
      })
    })


    describe('when yieldable throws', function() {
      it('supports unhandled error in yieldable', function(done) {
        starx(function*() {
          try {
            yield function(cb) {
              throw ERROR
            }
          } catch (e) {
            expect(e).to.be.equal(ERROR)
            spy(TOKEN)
          }
        })(function(e) {
          _catch(done, function() {
            expect(spy.withArgs(TOKEN).callCount).equal(1)
          })
        })
      })

      it('supports unhandled asynchronous error in yieldable', function(done) {
        starx(function*() {
          try {
            yield asyncThrowGuy
          } catch (e) {
            expect(e).to.be.equal(ERROR)
            spy(TOKEN)
          }
          assert(false, 'should not come here')
        })(function(e) {
          _catch(done, function() {
            expect(spy.withArgs(TOKEN).callCount).equal(1)
          })
        })
      })
    })
  })
})