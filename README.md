## Motivation

**starx** allows you to use [ECMAScript 6 generators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_Generators) to perform flow control. (The 'star' in the name is inspired from the declaration of a generator function, i.e. `function*() {...}` while 'x' stands for 'executor'.)

Basically, no more callback hells with cumbersome exception handling...
```javascript
request(url1, function(err, res1) {
  if (err) return print(err)
  request(url2, function(err, res2) {
    if (err) return print(err)
    request(url3, function(err, res3) {
      if (err) return print(err)
      print(size([res1, res2, res3]) + " bytes")
    })
  })
})
```

With **starx**, you can write:
```javascript
starx(function*() {
  try {
    var res1 = yield request(url1)
    var res2 = yield request(url2)
    var res3 = yield request(url3)
    print(size([res1, res2, res3]) + " bytes")
  } catch (err) {
    print(err)
  }
})()
```

## How it works
Invoking `starx()` on a generator returns an executor. You can create multiple executors for the same generator instance. 

This executor, when invoked, keeps calling `generator.next()` until the generator is exhausted. Each call to `generator.next()` returns the next value yielded (or returned) from inside the generator. For `starx` to work, this value must be "yieldable", i.e. one of the followings:

* A functions whose **only argument** is a callback accepting (err, val) (see **yieldable functions**)
* A promise (anything with a then(callback, errback))
* A value (primitive, object, null)
* Another executor created by **starx**
* A generator or iterator
* An array of the aboves (nesting okay)

#### Yieldable functions

If a function takes more than one argument, you can use `starx.yieldable(fn)` to convert it to a compliant form. For example:

If `fn` is `function(arg1, arg2, cb) {...}`, invoking `starx.yieldable(fn)` returns a new function with the following form:
```javascript
var newFn = function(arg1, arg2) { 
    fn(arg1, arg2, fakeCb)
    return function(cb) {...}
}
```
Invoking `newFn(arg1, arg2)` returns a function accepting a callback, which as mentioned, is compliant with `starx` and thus can be yielded, like so:

```javascript
starx(function*() {
    yield newFn(arg1, arg2)
})()
```

Most NodeJS functions (built-in and libraries) can be converted to a yieldable function using this approach.

## Examples
#### Read file
```javascript
starx = require('starx')
readFile = starx.yieldable(require('fs').readFile)

var generator = function*() {
  var content = yield readFile(__filename, 'utf8')
  console.log(content)
}
var executor = starx(generator)
executor()
```

Or simply:
```javascript
starx(function*() {
  var content = yield readFile(__filename, 'utf8')
  console.log(content)
})()
```

#### Serial download
```javascript
starx = require('starx')
request = starx.yieldable(require('request'))

starx(function*() {
  var res1 = yield request("https://www.google.com/")
  var res2 = yield request("https://www.bing.com/")
  var res3 = yield request("https://www.yahoo.com/")
  console.log(size([res1, res2, res3]), "bytes")
})()

function size(responses) {
  return responses.reduce(function(a, c) {
    return a + c.body.length
  }, 0)
}
```

#### Parallel download
```javascript
starx(function*() {
  var r1 = request("https://www.google.com/")
  var r2 = request("https://www.bing.com/")
  var r3 = request("https://www.yahoo.com/")
  var res = yield [r1, r2, r3]
  console.log(size(res), "bytes")
})()
```

A DRYer version
```javascript
starx(function*() {
  var res = yield [urls].map(function(url) {
    return request(url)
  })
  console.log(size(res), "bytes")
})()
```

You might think we could have written:
```javascript
yield [urls].map(request)
```

But that wouldn't work. The reason is `map` invoke `request` with not just the element, but also its index and the original array. Because `yieldable` passes through all arguments by default, `request` would end up being invoked with those 3 arguments while it actually expects the second argument to be 
a callback. 

To make this work, either explicitly invoke `request` with `url` as the previous example or provide a second argument to `yieldable`: `argCount`. If `argCount` is true, `yieldable` limits the number of arguments passed through to be `fn.length-1`. If `argCount` is a number, `yieldable` limits the number of arguments to be `argCount-1`.

We can revise the previous example as follows:

```
request = starx.yieldable(require('request'), true /* argCount */)
starx(function*() {
  var res = yield [urls].map(request)
  console.log(size(res), "bytes")
})()
```

## Install
#### NPM
```
npm install starx
```
#### Bower
```
bower install starx
```

* Node >= 0.11.6 (run with `--harmony` or `--harmony-generators`)
* Chrome >= 28 (turn on experimental flag)
* Firefox >= 27
* Or use [Google Traceur](https://github.com/google/traceur-compiler)