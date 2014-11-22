require('./helper')

describe('sleep', function(){
  it('should sleep for ms', function(done) {
    starx(function *() {
      var now = Date.now()
      yield starx.sleep(50)
      expect(Date.now() - now).to.not.be.below(50)
    })(done)
  })
})