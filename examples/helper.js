global.size = function(responses) {
  return responses.reduce(function(a, c) {
    return a + c.body.length
  }, 0)
}