require('./helper')
starx   = require('../index')
request = starx.yieldable(require('request'))

starx(function*() {
  var r1 = { body: { length: 1000000 } }
  var r2 = request("https://www.google.com/")
  var res = yield [r1, r2, { body: { length: 1000000 } }]
  console.log(size(res), "bytes")
})()
