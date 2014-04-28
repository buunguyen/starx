require('./helper')

describe('yieldable', function(){
  var spy, TOKEN = function() {}

  beforeEach(function() {
    spy = sinon.spy()
  })

  it('throws error for non-function argument', function(){
    expect(function() {
      y(null)
    }).to.throw(TypeError)
  })

  it('returns a function otherwise', function() {
    expect(y(spy)).to.be.a('function')
  })

  it('invokes the original function as soon as the yieldable is invoked', function() {
    y(spy)()
    expect(spy.calledOnce).to.be.true
  })

  it('passes through arguments to the original function', function() {
    y(spy)(TOKEN, TOKEN)
    expect(spy.withArgs(TOKEN, TOKEN).calledOnce).to.be.true
  })

  describe('callback', function() {
    it('returns a function accepting a callback...', function() {
      var fn = y(spy)()
      expect(fn).to.be.a('function')
    })

    it('has the callback invoked when it is registered AFTER the original function finishes', function() {
      var syncFn = function(arg, cb) {
        cb(arg)
      }
      var fn = y(syncFn)(TOKEN)
      fn(spy)
      expect(spy.withArgs(TOKEN).calledOnce).to.be.true
    })

    it('has the callback invoked when it is registered BEFORE the original function finishes', function(done) {
      var asyncFn = function(arg, cb) {
        process.nextTick(function() {
          cb(arg)
        })
      }
      var fn = y(asyncFn)(TOKEN)
      fn(function(res) {
        _catch(done, function() {
          expect(res).to.equal(TOKEN)
        })
      })
    })

    describe('trim', function() {
      it('passes through as-is if argCount is not supplied', function() {
        function fn(arg, cb) {
          expect(cb).to.be.a('number') // cb is actually the index
        }
        // map -> invoke fn(item, index, array)
        [1, 2, 3].map(y(fn))
      })
      it('trims passthrough arguments based on function definition when argCount is true', function() {
        function fn(arg, cb) {
          expect(cb).to.be.a('function')
        }
        [1, 2, 3].map(y(fn, true))
      })
      it('trims passthrough arguments based on value of argCount', function() {
        function fn(arg, cb) {
          expect(cb).to.be.a('function')
        }
        [1, 2, 3].map(y(fn, 2))
      })
    })
  })
})