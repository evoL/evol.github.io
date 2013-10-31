GRIDWIDTH = 800
GRIDHEIGHT = 600

class Grid
  constructor: (@width, @height) ->
    @view = new Float32Array(@width * @height)
    @min = 0
    @max = 0

  add: (x, y, val = 1) ->
    index = ~~y * @width + ~~x

    @view[index] += val
    @min = @view[index] if @min > @view[index]
    @max = @view[index] if @max < @view[index]

  get: (x, y) ->
    @view[~~y * @width + ~~x]

  avg: ->
    sum = 0
    filled = @width * @height
    for cell in @view
      sum += cell
      filled-- if cell == 0

    sum / filled

class Renderer
  constructor: (canvas) ->
    @element = canvas
    @context = canvas.getContext('2d')

  render: (grid) ->
    pixels = @context.getImageData(0, 0, grid.width, grid.height)
    avg = 8 * grid.avg()

    for cell, i in grid.view
      val = if cell > avg then 255 else ~~(cell / avg * 255)
      pixels.data[4*i  ] = val
      pixels.data[4*i+1] = val
      pixels.data[4*i+2] = val
      pixels.data[4*i+3] = 255

    @context.putImageData(pixels, 0, 0)

class Histogram
  constructor: (canvas) ->
    @element = canvas
    @context = canvas.getContext('2d')

  render: (grid) ->
    @context.clearRect(0, 0, GRIDWIDTH, 800)

    barWidth = GRIDWIDTH / (grid.max - grid.min)
    bars = new Array(grid.max - grid.min)

    max = 0
    bars[0] = 0
    for cell, i in grid.view
      cellint = Math.round(cell)

      if cellint > 0
        bars[cellint] = (~~bars[cellint]) + 1
        max = bars[cellint] if max < bars[cellint]

    @context.fillStyle = '#00f'

    x = 0
    while x < GRIDWIDTH
      height = bars[Math.round(x / barWidth)] / max * 800
      @context.fillRect(x, 800 - height, barWidth, height)
      x += barWidth

class SlicePlot
  constructor: (canvas) ->
    @element = canvas
    @context = canvas.getContext('2d')

  render: (grid, x, y) ->
    # console.log 'begin', x, y

    @context.clearRect(0, GRIDHEIGHT, GRIDWIDTH, 200)
    @context.font = '16px sans-serif'

    xBarWidth = 1
    yBarWidth = GRIDWIDTH / GRIDHEIGHT

    xBars = (grid.get(i, y) for i in [0...GRIDWIDTH])
    yBars = (grid.get(x, i) for i in [0...GRIDHEIGHT])

    max = Math.log(grid.max) / Math.LN10

    @context.fillStyle = '#f00'

    b = 0
    bar = 0
    while b < GRIDWIDTH
      # height = xBars[bar] / grid.max * 100 # lin
      height = Math.log(xBars[bar]) / (Math.LN10 * max) * 100 # log
      @context.fillRect(b, 700 - height, xBarWidth, height)
      b += xBarWidth
      bar++

    @context.fillStyle = 'rgba(0,0,0,0.5)'
    @context.fillText('horizontal slice plot', 10, 690)

    @context.fillStyle = '#00f'

    b = 0
    bar = 0
    while b < GRIDWIDTH
      # height = yBars[bar] / grid.max * 100 # lin
      height = Math.log(yBars[bar]) / (Math.LN10 * max) * 100 # log
      # console.log 'y', b, bar, yBars[bar], height
      @context.fillRect(b, 800 - height, yBarWidth, height)
      b += yBarWidth
      bar++

    @context.fillStyle = 'rgba(0,0,0,0.5)'
    @context.fillText('vertical slice plot', 10, 790)

canvas = document.getElementById('C')

@grid = new Grid(GRIDWIDTH, GRIDHEIGHT)
renderer = new Renderer(canvas)
histogram = new Histogram(canvas)
@slicePlot = new SlicePlot(canvas)
rendering = true

worker = new Worker('realtime-worker.js')
worker.addEventListener 'message', (event) ->
  switch event.data.message
    when 'particle'
      p = event.data.particle
      x = (p.x + 2) / 4 * GRIDWIDTH
      y = (p.y + 2) / 4 * GRIDHEIGHT

      grid.add x, y
    when 'finish'
      rendering = false
      document.getElementsByTagName('h1')[0].innerText = 'Done!'

worker.postMessage
  message: 'start'
  params: [
    -1.471219182014465332,
    1.205960392951965332,
    0.516781568527221680,
    1.920655012130737305
  ]

@mousePosition = {x:0, y:0}

drawMousePosition = ->
  context = canvas.getContext('2d')
  context.strokeStyle = 'rgba(255,255,255,0.5)'

  context.beginPath()
  context.moveTo(mousePosition.x, 0)
  context.lineTo(mousePosition.x, GRIDHEIGHT)
  context.stroke()

  context.beginPath()
  context.moveTo(0, mousePosition.y)
  context.lineTo(GRIDWIDTH, mousePosition.y)
  context.stroke()

render = ->
  renderer.render(grid)
  slicePlot.render(grid, mousePosition.x, mousePosition.y)

  drawMousePosition()

  if rendering
    requestAnimationFrame(render)

canvas.onmousemove = (e) ->
  rect = canvas.getBoundingClientRect()
  mousePosition.x = e.clientX - rect.left
  mousePosition.y = e.clientY - rect.top

  requestAnimationFrame(render)

render()