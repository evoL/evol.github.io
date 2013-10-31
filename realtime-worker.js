// Generated by CoffeeScript 1.3.3
(function() {
  var cos, formula, generate, random, sin;

  sin = Math.sin;

  cos = Math.cos;

  random = Math.random;

  formula = function(params, p) {
    var x, y;
    x = sin(params[0] * p.y) - cos(params[1] * p.x);
    y = sin(params[2] * p.x) - cos(params[3] * p.y);
    return {
      x: x,
      y: y
    };
  };

  generate = function(params) {
    var i, newp, p, particles, _i, _j, _len;
    particles = (function() {
      var _i, _results;
      _results = [];
      for (i = _i = 1; _i <= 10000; i = ++_i) {
        _results.push({
          x: random() * 4 - 2,
          y: random() * 4 - 2,
          ttl: 20
        });
      }
      return _results;
    })();
    for (i = _i = 1; _i <= 100; i = ++_i) {
      for (_j = 0, _len = particles.length; _j < _len; _j++) {
        p = particles[_j];
        newp = formula(params, p);
        p.x = newp.x;
        p.y = newp.y;
        p.ttl--;
        this.postMessage({
          message: 'particle',
          particle: p
        });
        if (p.ttl === 0) {
          p.x = random() * 4 - 2;
          p.y = random() * 4 - 2;
          p.ttl = 20;
        }
      }
    }
    return this.postMessage({
      message: 'finish'
    });
  };

  this.onmessage = function(event) {
    if (event.data.message === 'start') {
      return generate(event.data.params);
    }
  };

}).call(this);