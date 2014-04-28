require('./helper')
starx   = require('../lib')
request = starx.yieldable(require('request'), true)

starx(function*() {
  var r1 = request("https://www.google.com/")
  var r2 = request("https://www.bing.com/")
  var r3 = request("https://www.yahoo.com/")
  var res = yield [r1, r2, r3]
  console.log(size(res), "bytes")
})()

starx(function*() {
  var res = yield [
    "https://www.google.com/", 
    "https://www.bing.com/", 
    "https://www.yahoo.com/"].map(request)
  console.log(size(res), "bytes")
})()