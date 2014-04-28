;(function() {
  var domain = require('domain')

  if (typeof module !== 'undefined' && module.exports) module.exports = starx
  else window.starx = starx

  /**
   * Creates an executor for the provided generator or iterator
   */
  function starx(obj) {
    if (!isGenerator(obj) && !isIterator(obj)) throw new TypeError('obj must be a generator or iterator')

    return function executor(done) {
      var self = this,
          done = once(done || noop),
          iterator = isGenerator(obj) ? obj.call(self) : obj

      process.nextTick(next)
      function next(err, value) {    
        var res, called

        domain.create()
          .on('error', done)
          .run(function() {
            res = err ? iterator.throw(err) : iterator.next(value)
          })
      
        domain.create()
          .on('error', function(err) {
            if (called) return
            called = true

            // I wish there were a better way to check for exhausted iterator
            try {
              next(err)
            } catch (ignored) {
              done(err)
            }
          })
          .run(function() {
            var resFn = wrap.call(self, res.value)
            resFn.call(self, function() {
              if (called) return
              called = true
              var cb = res.done ? done : next
              cb.apply(null, arguments)
            })
          })
      }
    }
  }

  /** 
   * Wraps a `yieldable` into a function that accepts a callback(err, val)
   * Yieldables are one of these
   * 1. Generator or iterator
   * 2. Functions whose only argument is a callback accepting (err, val)
   * 3. Promises
   * 4. Values (primitives/objects/null)
   * 5. Arrays of the aboves (nesting okay)
   */
  function wrap(yieldable) {
    var self = this

    if (isGenerator(yieldable) || isIterator(yieldable)) return starx(yieldable)

    if (isFunction(yieldable)) return yieldable
    
    if (isPromise(yieldable)) {
      return function(cb) {
        yieldable.then(function(value) {          
          cb(null, value)
        }, cb)
      }
    }

    if (isArray(yieldable)) {
      return function(cb) {
        var values = [], remain = yieldable.length
        for (var i = 0; yieldable[i]; i++) {
          (function(i) {
            wrap.call(self, yieldable[i]).call(self, function(err, value) {
              if (err) return cb(err)
              values[i] = value
              if (--remain === 0) cb(null, values)
            })
          })(i)
        }
      }
    }

    return function(cb) {
      return cb(null, yieldable)
    }
  }

  /**
   * Takes fn = function(arg1, arg2, cb) {...}
   * Returns    function(arg1, arg2) { 
   *              fn(arg1, arg2, fakeCb)
   *              return function(cb) {...}
   *            }
   * The result of starx.yieldable(fn)() is a function accepting a callback
   * so that it can be used as a 'yieldable' of starx (see @wrap).
   *
   * @param {fn} the function to be converted to a yieldable 
   * @param {argCount} 
   *   if true, pass through only (fn.length-1) arguments
   *   if number, pass through only (argCount-1) arguments
   *   otherwise, pass through all arguments
   */
  starx.yieldable = function(fn, argCount) {
    if (!isFunction(fn)) throw new TypeError('fn must be a function')
    return function() {
      var end = argCount == null ? arguments.length : (argCount === true ? fn.length : argCount)-1,
          args = [].slice.call(arguments, 0, end), 
          cb, results, called
      args.push(function fake() {
        results = arguments
        if (!called && cb) {
          called = true
          cb.apply(this, results)
        }
      })
      fn.apply(this, args)
      return function(_cb) {
        cb = _cb
        if (!called && results) {
          called = true
          cb.apply(this, results)
        }
      }
    }
  }

  function once(fn) {
    var called = false
    return function() {
      if (called) return
      called = true
      fn.apply(this, arguments)
    }
  }

  function isIterator(obj) {
    return obj && isFunction(obj.next) && isFunction(obj.throw)
  }

  function isGenerator(obj) {
    return obj && obj.constructor && obj.constructor.name === 'GeneratorFunction'
  }

  function isPromise(obj) {
    return obj && isFunction(obj.then)
  }

  function noop() {}
  var fns = ['Array', 'Function', 'String', 'Number', 'Boolean'],
      template = (function is$(o) { return Object.prototype.toString.call(o) === '[object $]' }).toString()
  for (var i = 0; fns[i]; i++) eval(template.replace(/\$/g, fns[i]))
})()