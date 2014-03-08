;(function() {
  if (typeof module !== 'undefined' && module.exports) module.exports = starx
  else window.starx = starx

  /**
   * Creates an executor for the provided `generator`
   */
  function starx(generator) {
    if (!isFunction(generator)) throw new TypeError()
    return function executor(done) {
      var iterator = generator()
      next()
      function next(err, value) {
        var res = err ? iterator.throw(err) : iterator.next(value)
        wrap(res.value)(res.done ? (done || noop) : next)
      }
    }
  }

  /** 
   * Wraps a `yieldable` into a function that accepts a callback(err, val)
   * Yieldables are one of these
   * 1. Functions whose only argument is a callback accepting (err, val), see @starx.`()
   * 2. Executors created by starx
   * 3. Promises
   * 4. Values (primitives/objects/null)
   * 5. Arrays of the aboves (nesting okay)
   */
  function wrap(yieldable) {
    if (isFunction(yieldable)) return yieldable    

    if (yieldable && isFunction(yieldable.then)) {
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
            wrap(yieldable[i])(function(err, value) {
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
    if (!isFunction(fn)) throw new TypeError()
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

  function noop() {}
  // Badass DRY
  var fns = ['Array', 'Function', 'String', 'Number', 'Boolean'],
      template = (function is$(o) { return Object.prototype.toString.call(o) === '[object $]' }).toString()
  for (var i = 0; fns[i]; i++) eval(template.replace(/\$/g, fns[i]))
})()