require('./helper')
starx   = require('../index')
request = starx.yieldable(require('request'))

starx(function*() {
  var c1 = yield request("https://www.google.com/")
  var c2 = yield request("https://www.bing.com/")
  var c3 = yield request("https://www.yahoo.com/")
  console.log(size([c1, c2, c3]), "bytes")
})()