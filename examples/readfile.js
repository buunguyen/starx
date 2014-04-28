starx    = require('../lib')
readFile = starx.yieldable(require('fs').readFile)

starx(function*() {
  var content = yield readFile(__filename, 'utf8')
  console.log(content)
})()