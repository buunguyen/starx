require('./helper')
starx   = require('../lib')
request = starx.yieldable(require('request'))

starx(function*() {
  var r1 = request("https://www.google.com/")
  var r2 = request("https://www.bing.com/")
  var r3 = request("https://www.yahoo.com/")
  var res = yield [[r1, r2], r3]
  console.log(size([res[0][0], res[0][1], res[1]]), "bytes")
})()