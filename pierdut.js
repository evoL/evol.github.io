// Generated by CoffeeScript 1.7.1
(function() {
  var $, Attractor, Bounds, Formula, Grid, GridMapper, PixelMapper, Reactor, Renderer, Size, StandardCurve, accelerationGrid, attractor, canvas, centerPoint, correctionCurve, ctx, gridMappers, params, pixelMapper, positionGrid, reactor, refreshingOperation, renderer, renderingEnabled, run, running, showState, size, toggle, updateBounds, updateBoundsSync, updateMapper, velocityGrid, viewBounds, viewCenterPoint, viewZoomLevel, zoomLevel;

  Size = (function() {
    function Size(width, height) {
      this.width = width;
      this.height = height;
      this.area = this.width * this.height;
    }

    Size.prototype.contains = function(x, y) {
      return x >= 0 && x < this.width && y >= 0 && y < this.height;
    };

    return Size;

  })();

  Bounds = (function() {
    function Bounds(left, right, top, bottom) {
      this.left = left;
      this.right = right;
      this.top = top;
      this.bottom = bottom;
      this.width = right - left;
      this.height = bottom - top;
    }

    Bounds.prototype.contain = function(x, y) {
      return x >= this.left && x <= this.right && y >= this.top && y <= this.bottom;
    };

    return Bounds;

  })();

  Grid = (function() {
    function Grid(size) {
      this.size = size;
      this.view = new Float32Array(size.area);
      this.max = 0;
      this.logmax = 0;
    }

    Grid.prototype.clear = function() {
      var i, _i, _ref;
      for (i = _i = 0, _ref = this.size.area; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
        this.view[i] = 0;
      }
      this.max = 0;
      this.logmax = 0;
      return this;
    };

    Grid.prototype.forEach = function(fn) {
      var i, _i, _ref;
      for (i = _i = 0, _ref = this.size.area; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
        fn(this.view[i], i, this.view);
      }
      return this;
    };

    Grid.prototype.index = function(x, y) {
      return (y | 0) * this.size.width + (x | 0);
    };

    Grid.prototype.setIndex = function(index, value) {
      this.view[index] = value;
      if (value > this.max) {
        this.max = value;
        this.logmax = Math.log(value);
      }
      return this;
    };

    Grid.prototype.addIndex = function(index, step) {
      if (step == null) {
        step = 1;
      }
      return this.setIndex(index, this.view[index] + step);
    };

    Grid.prototype.setXY = function(x, y, value) {
      if (!this.size.contains(x, y)) {
        return;
      }
      return this.setIndex(this.index(x, y), value);
    };

    Grid.prototype.addXY = function(x, y, step) {
      if (step == null) {
        step = 1;
      }
      if (!this.size.contains(x, y)) {
        return;
      }
      return this.addIndex(this.index(x, y), step);
    };

    return Grid;

  })();

  Renderer = (function() {
    function Renderer(size, context) {
      var pixbuf;
      this.size = size;
      this.context = context;
      this.imageData = context.getImageData(0, 0, this.size.width, this.size.height);
      pixbuf = new ArrayBuffer(this.imageData.data.length);
      this.pixelGrid = new Int32Array(pixbuf);
      this.pixel8 = new Uint8ClampedArray(pixbuf);
    }

    Renderer.prototype.render = function(pixelMapper) {
      var i, value, _i, _ref;
      for (i = _i = 0, _ref = this.size.area; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
        value = pixelMapper(i);
        this.pixelGrid[i] = (255 << 24) | (value.b << 16) | (value.g << 8) | value.r;
      }
      this.imageData.data.set(this.pixel8);
      return this.context.putImageData(this.imageData, 0, 0);
    };

    return Renderer;

  })();

  GridMapper = {
    Zero: function() {
      return 0;
    },
    One: function() {
      return 1;
    },
    Binary: function(grid) {
      return function(index) {
        var _ref;
        return (_ref = grid.view[index] > 0) != null ? _ref : {
          1: 0
        };
      };
    },
    Linear: function(grid) {
      return function(index) {
        return grid.view[index] / grid.max;
      };
    },
    Logarithmic: function(grid) {
      return function(index) {
        if (grid.view[index] === 0) {
          return 0;
        }
        return Math.log(grid.view[index]) / grid.logmax;
      };
    },
    Corrected: function(gridMapper, curve) {
      return function(index) {
        return curve(gridMapper(index));
      };
    }
  };

  PixelMapper = {
    Monochrome: function(gridMapper) {
      return function(index) {
        var value;
        value = gridMapper(index) * 255;
        return {
          r: value,
          g: value,
          b: value
        };
      };
    },
    Green: function(gridMapper) {
      return function(index) {
        var value;
        value = gridMapper(index) * 255;
        return {
          r: 0,
          g: value,
          b: 0
        };
      };
    },
    RGB: function(r, g, b) {
      return function(index) {
        return {
          r: r(index) * 255,
          g: g(index) * 255,
          b: b(index) * 255
        };
      };
    },
    Inverse: function(pixelMapper) {
      return function(index) {
        var result;
        result = pixelMapper(index);
        return {
          r: 255 - result.r,
          g: 255 - result.g,
          b: 255 - result.b
        };
      };
    }
  };

  StandardCurve = function(a, b, c) {
    return function(x) {
      var e, f, g, h, value;
      if (x < 0) {
        return 0;
      }
      if (x > 1) {
        return 1;
      }
      if (x <= 0.25) {
        e = 1.1428571428571429 - 38.857142857142857 * a + 27.428571428571429 * b - 6.857142857142857 * c;
        f = 0;
        g = -0.07142857142857143 + 6.428571428571429 * a - 1.7142857142857143 * b + 0.42857142857142857 * c;
        h = 0;
      } else if (x <= 0.5) {
        h = 0.10714285714285714 - 1.6428571428571429 * a + 1.5714285714285714 * b - 0.6428571428571429 * c;
        g = -1.3571428571428571 + 26.142857142857143 * a - 20.571428571428571 * b + 8.142857142857143 * c;
        f = 5.142857142857143 - 78.85714285714286 * a + 75.42857142857143 * b - 30.857142857142857 * c;
        e = -5.714285714285714 + 66.28571428571429 * a - 73.14285714285714 * b + 34.285714285714286 * c;
      } else if (x <= 0.75) {
        h = -3.3214285714285714 + 10.928571428571429 * a - 16.714285714285714 * b + 11.928571428571429 * c;
        g = 19.214285714285714 - 49.28571428571429 * a + 89.14285714285714 * b - 67.28571428571429 * c;
        f = -36 + 72 * a - 144 * b + 120 * c;
        e = 21.714285714285714 - 34.285714285714286 * a + 73.14285714285714 * b - 66.28571428571429 * c;
      } else {
        h = 13.071428571428571 - 6.428571428571429 * a + 25.714285714285714 * b - 32.428571428571429 * c;
        g = -46.357142857142857 + 20.142857142857143 * a - 80.57142857142857 * b + 110.14285714285714 * c;
        f = 51.42857142857143 - 20.571428571428571 * a + 82.28571428571429 * b - 116.57142857142857 * c;
        e = -17.142857142857143 + 6.857142857142857 * a - 27.428571428571429 * b + 38.857142857142857 * c;
      }
      value = h + x * (g + x * (f + x * e));
      if (value < 0) {
        return 0;
      }
      if (value > 1) {
        return 1;
      }
      return value;
    };
  };

  Formula = {
    Blut: function(params, x, y) {
      var _ref;
      return {
        x: params[8] * (Math.sin(params[0] * y) + params[2] * Math.cos(params[0] * x)) + (1 - params[8]) * (y + params[4] * ((_ref = x >= 0) != null ? _ref : {
          1: -1
        }) * Math.sqrt(Math.abs(params[5] * x - params[6]))),
        y: params[8] * (Math.sin(params[1] * x) + params[3] * Math.cos(params[1] * y)) + (1 - params[8]) * (params[7] - x)
      };
    }
  };

  Attractor = function(formula, params) {
    return function(x, y) {
      return formula(params, x, y);
    };
  };

  Reactor = (function() {
    function Reactor(attractor, options) {
      this.attractor = attractor;
      if (options == null) {
        options = {};
      }
      this.bounds = options.bounds || new Bounds(-2, 2, -2, 2);
      this.count = options.count || 10000;
      this.ttl = options.ttl || 20;
      this.cache = null;
      this.onparticlemove = function(particle, reactor) {};
      this.reset();
    }

    Reactor.prototype.reset = function() {
      var i;
      return this.system = (function() {
        var _i, _ref, _results;
        _results = [];
        for (i = _i = 0, _ref = this.count; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
          _results.push({
            position: {
              x: Math.random() * this.bounds.width + this.bounds.left,
              y: Math.random() * this.bounds.height + this.bounds.top
            },
            velocity: {
              x: 0,
              y: 0
            },
            acceleration: {
              x: 0,
              y: 0
            },
            ttl: (Math.random() * this.ttl) | 0
          });
        }
        return _results;
      }).call(this);
    };

    Reactor.prototype.step = function() {
      var i, particle, position, result, velocity, _i, _len, _ref, _results;
      _ref = this.system;
      _results = [];
      for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
        particle = _ref[i];
        if (!this.bounds.contain(particle.position.x, particle.position.y) || particle.ttl === 0) {
          result = {
            position: {
              x: Math.random() * this.bounds.width + this.bounds.left,
              y: Math.random() * this.bounds.height + this.bounds.top
            },
            velocity: {
              x: 0,
              y: 0
            },
            acceleration: {
              x: 0,
              y: 0
            },
            ttl: this.ttl
          };
        } else {
          position = this.attractor(particle.position.x, particle.position.y);
          velocity = {
            x: position.x - particle.position.x,
            y: position.y - particle.position.y
          };
          result = {
            position: position,
            velocity: velocity,
            acceleration: {
              x: velocity.x - particle.velocity.x,
              y: velocity.y - particle.velocity.y
            },
            ttl: particle.ttl - 1
          };
        }
        this.onparticlemove(result, this);
        _results.push(this.system[i] = result);
      }
      return _results;
    };

    return Reactor;

  })();

  $ = function(id) {
    return document.getElementById(id);
  };

  canvas = $('Canvas');

  ctx = canvas.getContext('2d');

  size = new Size(canvas.width | 0, canvas.height | 0);

  positionGrid = new Grid(size);

  velocityGrid = new Grid(size);

  accelerationGrid = new Grid(size);

  renderer = new Renderer(size, ctx);

  params = [0, 0, 0, 0, 0, 0, 0, 0, 1].map(function(p) {
    if (p === 1) {
      return Math.random();
    } else {
      return Math.random() * 4 - 2;
    }
  });

  attractor = Attractor(Formula.Blut, params);

  zoomLevel = 2.0;

  viewZoomLevel = 2.0;

  centerPoint = {
    x: 0,
    y: 0
  };

  viewCenterPoint = {
    x: 0,
    y: 0
  };

  viewBounds = new Bounds(-viewZoomLevel + viewCenterPoint.x, viewZoomLevel + viewCenterPoint.x, -viewZoomLevel + viewCenterPoint.y, viewZoomLevel + viewCenterPoint.y);

  reactor = new Reactor(attractor, {
    count: 50000,
    ttl: 80
  });

  reactor.onparticlemove = function(particle, reactor) {
    var accel, pos, vel, x, y;
    pos = particle.position;
    vel = particle.velocity;
    accel = particle.acceleration;
    x = (pos.x - viewBounds.left) / viewBounds.width * positionGrid.size.width;
    y = (pos.y - viewBounds.top) / viewBounds.height * positionGrid.size.height;
    positionGrid.addXY(x | 0, y | 0);
    velocityGrid.addXY(x | 0, y | 0, Math.sqrt(vel.x * vel.x + vel.y * vel.y));
    return accelerationGrid.addXY(x | 0, y | 0, Math.sqrt(accel.x * accel.x + accel.y * accel.y));
  };

  correctionCurve = StandardCurve(0.25, 0.5, 0.75);

  gridMappers = {
    position: GridMapper.Logarithmic(positionGrid),
    velocity: GridMapper.Logarithmic(velocityGrid),
    acceleration: GridMapper.Logarithmic(accelerationGrid)
  };

  pixelMapper = PixelMapper.Inverse(PixelMapper.RGB(gridMappers.position, gridMappers.velocity, gridMappers.acceleration));

  running = true;

  renderingEnabled = true;

  run = function() {
    reactor.step();
    if (renderingEnabled) {
      renderer.render(pixelMapper);
    }
    if (running) {
      return requestAnimationFrame(run);
    }
  };

  requestAnimationFrame(run);

  toggle = $('Toggle');

  toggle.onclick = function() {
    if (running) {
      running = false;
      return toggle.innerText = 'Start';
    } else {
      running = true;
      toggle.innerText = 'Stop';
      return requestAnimationFrame(run);
    }
  };

  $('Step').onclick = function() {
    running = false;
    return run();
  };

  $('Save').onclick = function() {
    return window.open(canvas.toDataURL('image/png'));
  };

  refreshingOperation = function(fn) {
    reactor.reset();
    positionGrid.clear();
    velocityGrid.clear();
    accelerationGrid.clear();
    fn();
    if (renderingEnabled && !running) {
      return renderer.render(pixelMapper);
    }
  };

  showState = function() {
    return $('State').innerText = JSON.stringify({
      params: params,
      correction: {
        enabled: $('Correction').checked,
        a: $('CorrectionA').value * 0.01,
        b: $('CorrectionB').value * 0.01,
        c: $('CorrectionC').value * 0.01
      }
    });
  };

  updateMapper = function() {
    var a, b, c, gridMapper;
    gridMapper = GridMapper[$('Grid').value];
    gridMappers.position = gridMapper(positionGrid);
    gridMappers.velocity = gridMapper(velocityGrid);
    gridMappers.acceleration = gridMapper(accelerationGrid);
    if ($('Correction').checked) {
      a = $('CorrectionA').value * 0.01;
      b = $('CorrectionB').value * 0.01;
      c = $('CorrectionC').value * 0.01;
      correctionCurve = StandardCurve(a, b, c);
      gridMappers.position = GridMapper.Corrected(gridMappers.position, correctionCurve);
      gridMappers.velocity = GridMapper.Corrected(gridMappers.velocity, correctionCurve);
      gridMappers.acceleration = GridMapper.Corrected(gridMappers.acceleration, correctionCurve);
    }
    pixelMapper = PixelMapper[$('Mapper').value](gridMappers.position, gridMappers.velocity, gridMappers.acceleration);
    if ($('Inverted').checked) {
      pixelMapper = PixelMapper.Inverse(pixelMapper);
    }
    if (renderingEnabled && !running) {
      renderer.render(pixelMapper);
    }
    return showState();
  };

  updateBounds = function() {
    viewZoomLevel = Math.pow(2, 5 - $('ViewZoom').valueAsNumber * 0.5);
    viewCenterPoint = {
      x: $('ViewX').valueAsNumber,
      y: $('ViewY').valueAsNumber
    };
    if ($('SyncBounds').checked) {
      zoomLevel = viewZoomLevel;
      centerPoint = viewCenterPoint;
    } else {
      zoomLevel = Math.pow(2, 5 - $('Zoom').valueAsNumber * 0.5);
      centerPoint = {
        x: $('CenterX').valueAsNumber,
        y: $('CenterY').valueAsNumber
      };
    }
    return refreshingOperation(function() {
      reactor.bounds = new Bounds(-zoomLevel + centerPoint.x, zoomLevel + centerPoint.x, -zoomLevel + centerPoint.y, zoomLevel + centerPoint.y);
      return viewBounds = new Bounds(-viewZoomLevel + viewCenterPoint.x, viewZoomLevel + viewCenterPoint.x, -viewZoomLevel + viewCenterPoint.y, viewZoomLevel + viewCenterPoint.y);
    });
  };

  updateBoundsSync = function() {
    var sync;
    sync = $('SyncBounds').checked;
    $('Zoom').disabled = sync;
    $('CenterX').disabled = sync;
    $('CenterY').disabled = sync;
    return updateBounds();
  };

  $('Rendering').onchange = function() {
    renderingEnabled = $('Rendering').checked;
    if (renderingEnabled && !running) {
      return renderer.render(pixelMapper);
    }
  };

  $('Grid').onchange = updateMapper;

  $('Mapper').onchange = updateMapper;

  $('Inverted').onchange = updateMapper;

  $('Correction').onchange = updateMapper;

  $('CorrectionA').onchange = updateMapper;

  $('CorrectionB').onchange = updateMapper;

  $('CorrectionC').onchange = updateMapper;

  $('Zoom').onchange = updateBounds;

  $('CenterX').onchange = updateBounds;

  $('CenterY').onchange = updateBounds;

  $('ViewZoom').onchange = updateBounds;

  $('ViewX').onchange = updateBounds;

  $('ViewY').onchange = updateBounds;

  $('SyncBounds').onchange = updateBoundsSync;

  showState();

}).call(this);

//# sourceMappingURL=pierdut.map
