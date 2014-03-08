global._catch = function(done, fn) {
  try {
    fn()
  } catch (e) {
    done(e)
  }
}