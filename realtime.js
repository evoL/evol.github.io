// Generated by CoffeeScript 1.3.3
(function() {
  var GRIDHEIGHT, GRIDWIDTH, Grid, Histogram, Renderer, SlicePlot, canvas, drawMousePosition, histogram, render, renderer, rendering, worker;

  GRIDWIDTH = 800;

  GRIDHEIGHT = 600;

  Grid = (function() {

    function Grid(width, height) {
      this.width = width;
      this.height = height;
      this.view = new Float32Array(this.width * this.height);
      this.min = 0;
      this.max = 0;
    }

    Grid.prototype.add = function(x, y, val) {
      var index;
      if (val == null) {
        val = 1;
      }
      index = ~~y * this.width + ~~x;
      this.view[index] += val;
      if (this.min > this.view[index]) {
        this.min = this.view[index];
      }
      if (this.max < this.view[index]) {
        return this.max = this.view[index];
      }
    };

    Grid.prototype.get = function(x, y) {
      return this.view[~~y * this.width + ~~x];
    };

    Grid.prototype.avg = function() {
      var cell, filled, sum, _i, _len, _ref;
      sum = 0;
      filled = this.width * this.height;
      _ref = this.view;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        cell = _ref[_i];
        sum += cell;
        if (cell === 0) {
          filled--;
        }
      }
      return sum / filled;
    };

    return Grid;

  })();

  Renderer = (function() {

    function Renderer(canvas) {
      this.element = canvas;
      this.context = canvas.getContext('2d');
    }

    Renderer.prototype.render = function(grid) {
      var avg, cell, i, pixels, val, _i, _len, _ref;
      pixels = this.context.getImageData(0, 0, grid.width, grid.height);
      avg = 8 * grid.avg();
      _ref = grid.view;
      for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
        cell = _ref[i];
        val = cell > avg ? 255 : ~~(cell / avg * 255);
        pixels.data[4 * i] = val;
        pixels.data[4 * i + 1] = val;
        pixels.data[4 * i + 2] = val;
        pixels.data[4 * i + 3] = 255;
      }
      return this.context.putImageData(pixels, 0, 0);
    };

    return Renderer;

  })();

  Histogram = (function() {

    function Histogram(canvas) {
      this.element = canvas;
      this.context = canvas.getContext('2d');
    }

    Histogram.prototype.render = function(grid) {
      var barWidth, bars, cell, cellint, height, i, max, x, _i, _len, _ref, _results;
      this.context.clearRect(0, 0, GRIDWIDTH, 800);
      barWidth = GRIDWIDTH / (grid.max - grid.min);
      bars = new Array(grid.max - grid.min);
      max = 0;
      bars[0] = 0;
      _ref = grid.view;
      for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
        cell = _ref[i];
        cellint = Math.round(cell);
        if (cellint > 0) {
          bars[cellint] = (~~bars[cellint]) + 1;
          if (max < bars[cellint]) {
            max = bars[cellint];
          }
        }
      }
      this.context.fillStyle = '#00f';
      x = 0;
      _results = [];
      while (x < GRIDWIDTH) {
        height = bars[Math.round(x / barWidth)] / max * 800;
        this.context.fillRect(x, 800 - height, barWidth, height);
        _results.push(x += barWidth);
      }
      return _results;
    };

    return Histogram;

  })();

  SlicePlot = (function() {

    function SlicePlot(canvas) {
      this.element = canvas;
      this.context = canvas.getContext('2d');
    }

    SlicePlot.prototype.render = function(grid, x, y) {
      var b, bar, height, i, max, xBarWidth, xBars, yBarWidth, yBars;
      this.context.clearRect(0, GRIDHEIGHT, GRIDWIDTH, 200);
      this.context.font = '16px sans-serif';
      xBarWidth = 1;
      yBarWidth = GRIDWIDTH / GRIDHEIGHT;
      xBars = (function() {
        var _i, _results;
        _results = [];
        for (i = _i = 0; 0 <= GRIDWIDTH ? _i < GRIDWIDTH : _i > GRIDWIDTH; i = 0 <= GRIDWIDTH ? ++_i : --_i) {
          _results.push(grid.get(i, y));
        }
        return _results;
      })();
      yBars = (function() {
        var _i, _results;
        _results = [];
        for (i = _i = 0; 0 <= GRIDHEIGHT ? _i < GRIDHEIGHT : _i > GRIDHEIGHT; i = 0 <= GRIDHEIGHT ? ++_i : --_i) {
          _results.push(grid.get(x, i));
        }
        return _results;
      })();
      max = Math.log(grid.max) / Math.LN10;
      this.context.fillStyle = '#f00';
      b = 0;
      bar = 0;
      while (b < GRIDWIDTH) {
        height = Math.log(xBars[bar]) / (Math.LN10 * max) * 100;
        this.context.fillRect(b, 700 - height, xBarWidth, height);
        b += xBarWidth;
        bar++;
      }
      this.context.fillStyle = 'rgba(0,0,0,0.5)';
      this.context.fillText('horizontal slice plot', 10, 690);
      this.context.fillStyle = '#00f';
      b = 0;
      bar = 0;
      while (b < GRIDWIDTH) {
        height = Math.log(yBars[bar]) / (Math.LN10 * max) * 100;
        this.context.fillRect(b, 800 - height, yBarWidth, height);
        b += yBarWidth;
        bar++;
      }
      this.context.fillStyle = 'rgba(0,0,0,0.5)';
      return this.context.fillText('vertical slice plot', 10, 790);
    };

    return SlicePlot;

  })();

  canvas = document.getElementById('C');

  this.grid = new Grid(GRIDWIDTH, GRIDHEIGHT);

  renderer = new Renderer(canvas);

  histogram = new Histogram(canvas);

  this.slicePlot = new SlicePlot(canvas);

  rendering = true;

  worker = new Worker('realtime-worker.js');

  worker.addEventListener('message', function(event) {
    var p, x, y;
    switch (event.data.message) {
      case 'particle':
        p = event.data.particle;
        x = (p.x + 2) / 4 * GRIDWIDTH;
        y = (p.y + 2) / 4 * GRIDHEIGHT;
        return grid.add(x, y);
      case 'finish':
        rendering = false;
        return document.getElementsByTagName('h1')[0].innerText = 'Done!';
    }
  });

  worker.postMessage({
    message: 'start',
    params: [-1.471219182014465332, 1.205960392951965332, 0.516781568527221680, 1.920655012130737305]
  });

  this.mousePosition = {
    x: 0,
    y: 0
  };

  drawMousePosition = function() {
    var context;
    context = canvas.getContext('2d');
    context.strokeStyle = 'rgba(255,255,255,0.5)';
    context.beginPath();
    context.moveTo(mousePosition.x, 0);
    context.lineTo(mousePosition.x, GRIDHEIGHT);
    context.stroke();
    context.beginPath();
    context.moveTo(0, mousePosition.y);
    context.lineTo(GRIDWIDTH, mousePosition.y);
    return context.stroke();
  };

  render = function() {
    renderer.render(grid);
    slicePlot.render(grid, mousePosition.x, mousePosition.y);
    drawMousePosition();
    if (rendering) {
      return requestAnimationFrame(render);
    }
  };

  canvas.onmousemove = function(e) {
    var rect;
    rect = canvas.getBoundingClientRect();
    mousePosition.x = e.clientX - rect.left;
    mousePosition.y = e.clientY - rect.top;
    return requestAnimationFrame(render);
  };

  render();

}).call(this);
