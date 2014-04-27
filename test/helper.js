global._catch = function(done, fn) {
  try {
    fn()
    done()
  } catch (e) {
    done(e)
  }
}