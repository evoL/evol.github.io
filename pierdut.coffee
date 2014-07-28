class Size
  constructor: (@width, @height) ->
    @area = @width * @height

  contains: (x, y) ->
    x >= 0 && x < @width && y >= 0 && y < @height

class Bounds
  constructor: (@left, @right, @top, @bottom) ->
    @width = right - left
    @height = bottom - top

  contain: (x, y) ->
    x >= @left && x <= @right && y >= @top && y <= @bottom

class Grid
  constructor: (@size) ->
    @view = new Float32Array(size.area)
    
    @max = 0
    @logmax = 0

  clear: ->
    for i in [0...@size.area]
      @view[i] = 0

    @max = 0
    @logmax = 0

    return @

  forEach: (fn) ->
    for i in [0...@size.area]
      fn(@view[i], i, @view)

    return @

  index: (x, y) -> (y|0) * @size.width + (x|0)
  
  setIndex: (index, value) ->
    @view[index] = value
    
    if value > @max
      @max = value
      @logmax = Math.log(value)

    return @

  addIndex: (index, step = 1) -> @setIndex(index, @view[index] + step)

  setXY: (x, y, value) -> 
    return unless @size.contains(x, y)
    @setIndex(@index(x, y), value)
  addXY: (x, y, step = 1) ->
    return unless @size.contains(x, y)
    @addIndex(@index(x, y), step)

class Renderer
  constructor: (@size, @context) ->
    @imageData = context.getImageData(0, 0, @size.width, @size.height)

    pixbuf = new ArrayBuffer(@imageData.data.length)
    @pixelGrid = new Int32Array(pixbuf)
    @pixel8 = new Uint8ClampedArray(pixbuf)

  render: (pixelMapper) ->
    for i in [0...@size.area]
      value = pixelMapper(i)

      @pixelGrid[i] = (255 << 24) | (value.b << 16) | (value.g << 8) | value.r

    @imageData.data.set(@pixel8)
    @context.putImageData(@imageData, 0, 0)

GridMapper =
  Zero: -> 0
  One: -> 1
  Binary: (grid) -> 
    return (index) -> (grid.view[index] > 0) ? 1 : 0
  Linear: (grid) ->
    return (index) -> grid.view[index] / grid.max
  Logarithmic: (grid) ->
    return (index) ->
      return 0 if grid.view[index] == 0
      Math.log(grid.view[index]) / grid.logmax
  Corrected: (gridMapper, curve) ->
    return (index) ->
      curve(gridMapper(index))

PixelMapper =
  Monochrome: (gridMapper) ->
    return (index) ->
      value = gridMapper(index) * 255

      r: value
      g: value
      b: value
  Green: (gridMapper) ->
    return (index) ->
      value = gridMapper(index) * 255

      r: 0
      g: value
      b: 0
  RGB: (r, g, b) ->
    return (index) ->
      r: r(index) * 255
      g: g(index) * 255
      b: b(index) * 255
  Inverse: (pixelMapper) ->
    return (index) ->
      result = pixelMapper(index)

      r: 255 - result.r
      g: 255 - result.g
      b: 255 - result.b

StandardCurve = (a, b, c) ->
  return (x) ->
    return 0 if x < 0
    return 1 if x > 1

    if x <= 0.25
      e = 1.1428571428571429 - 38.857142857142857 * a + 27.428571428571429 * b - 6.857142857142857 * c
      f = 0
      g = -0.07142857142857143 + 6.428571428571429 * a - 1.7142857142857143 * b + 0.42857142857142857 * c
      h = 0
    else if x <= 0.5
      h = 0.10714285714285714 - 1.6428571428571429 * a + 1.5714285714285714 * b - 0.6428571428571429 * c
      g = -1.3571428571428571 + 26.142857142857143 * a - 20.571428571428571 * b + 8.142857142857143 * c
      f = 5.142857142857143 - 78.85714285714286 * a + 75.42857142857143 * b - 30.857142857142857 * c
      e = -5.714285714285714 + 66.28571428571429 * a - 73.14285714285714 * b + 34.285714285714286 * c
    else if x <= 0.75
      h = -3.3214285714285714 + 10.928571428571429 * a - 16.714285714285714 * b + 11.928571428571429 * c
      g = 19.214285714285714 - 49.28571428571429 * a + 89.14285714285714 * b - 67.28571428571429 * c
      f = -36 + 72 * a - 144 * b + 120 * c
      e = 21.714285714285714 - 34.285714285714286 * a + 73.14285714285714 * b - 66.28571428571429 * c
    else
      h = 13.071428571428571 - 6.428571428571429 * a + 25.714285714285714 * b - 32.428571428571429 * c
      g = -46.357142857142857 + 20.142857142857143 * a - 80.57142857142857 * b + 110.14285714285714 * c
      f = 51.42857142857143 - 20.571428571428571 * a + 82.28571428571429 * b - 116.57142857142857 * c
      e = -17.142857142857143 + 6.857142857142857 * a - 27.428571428571429 * b + 38.857142857142857 * c
      
    # ex^3 + fx^2 + gx + h
    value = h + x * (g + x * (f + x * e))
    return 0 if value < 0
    return 1 if value > 1
    value

#########################################################################################

Formula =
  Blut: (params, x, y) ->
    x: params[8] * (Math.sin(params[0] * y) + params[2] * Math.cos(params[0] * x)) + (1 - params[8]) * (y + params[4] * (x >= 0 ? 1 : -1) * Math.sqrt(Math.abs(params[5] * x - params[6]))),
    y: params[8] * (Math.sin(params[1] * x) + params[3] * Math.cos(params[1] * y)) + (1 - params[8]) * (params[7] - x)

Attractor = (formula, params) ->
  return (x, y) -> formula(params, x, y)

class Reactor
  constructor: (@attractor, options = {}) ->
    @bounds = options.bounds || new Bounds(-2, 2, -2, 2)
    @count = options.count || 10000
    @ttl = options.ttl || 20
    @cache = null

    @onparticlemove = (particle, reactor) ->

    @reset()

  reset: ->
    @system = for i in [0...@count]
      position: 
        x: Math.random() * @bounds.width + @bounds.left
        y: Math.random() * @bounds.height + @bounds.top
      velocity:
        x: 0
        y: 0
      acceleration:
        x: 0
        y: 0
      ttl: (Math.random() * @ttl) | 0

  step: ->
    for particle, i in @system
      if !@bounds.contain(particle.position.x, particle.position.y) || particle.ttl == 0
        result = {
          position: 
            x: Math.random() * @bounds.width + @bounds.left
            y: Math.random() * @bounds.height + @bounds.top
          velocity:
            x: 0
            y: 0
          acceleration:
            x: 0
            y: 0
          ttl: @ttl
        }
      else
        position = @attractor(particle.position.x, particle.position.y)
        velocity = {
          x: position.x - particle.position.x
          y: position.y - particle.position.y
        }
        result = {
          position: position
          velocity: velocity
          acceleration:
            x: velocity.x - particle.velocity.x
            y: velocity.y - particle.velocity.y
          ttl: particle.ttl - 1
        }
      
      @onparticlemove(result, @)
      @system[i] = result

#########################################################################################

$ = (id) -> document.getElementById(id)

canvas = $('Canvas')
ctx = canvas.getContext('2d')
size = new Size(canvas.width|0, canvas.height|0)

positionGrid = new Grid(size)
velocityGrid = new Grid(size)
accelerationGrid = new Grid(size)
renderer = new Renderer(size, ctx)

params = [0,0,0,0,0,0,0,0,1].map (p) -> if p == 1 then Math.random() else Math.random() * 4 - 2
# params = [0.07955073192715645, 1.9680727636441588, 0.11604494880884886, -0.26281140837818384, 0.7441467931494117, -0.49899573624134064, -1.586816594004631, -0.6013841619715095, 0.024278108729049563]
attractor = Attractor(Formula.Blut, params)

zoomLevel = 2.0
viewZoomLevel = 2.0
centerPoint = 
  x: 0
  y: 0
viewCenterPoint =
  x: 0
  y: 0

viewBounds = new Bounds(-viewZoomLevel + viewCenterPoint.x, viewZoomLevel + viewCenterPoint.x, -viewZoomLevel + viewCenterPoint.y, viewZoomLevel + viewCenterPoint.y)

reactor = new Reactor(attractor, {count: 50000, ttl: 80})
reactor.onparticlemove = (particle, reactor) ->
  pos = particle.position
  vel = particle.velocity
  accel = particle.acceleration

  x = (pos.x - viewBounds.left) / viewBounds.width * positionGrid.size.width
  y = (pos.y - viewBounds.top) / viewBounds.height * positionGrid.size.height

  positionGrid.addXY(x|0, y|0)
  velocityGrid.addXY(x|0, y|0, Math.sqrt(vel.x * vel.x + vel.y * vel.y))
  accelerationGrid.addXY(x|0, y|0, Math.sqrt(accel.x * accel.x + accel.y * accel.y))

correctionCurve = StandardCurve(0.25, 0.5, 0.75)

gridMappers =
  position: GridMapper.Logarithmic(positionGrid)
  velocity: GridMapper.Logarithmic(velocityGrid)
  acceleration: GridMapper.Logarithmic(accelerationGrid)

# gridMapper = GridMapper.Corrected(GridMapper.Logarithmic(positionGrid), correctionCurve)
# gridMapper = GridMapper.Logarithmic(positionGrid)
# pixelMapper = PixelMapper.Inverse(PixelMapper.Monochrome(gridMapper))
pixelMapper = PixelMapper.Inverse(PixelMapper.RGB(gridMappers.position, gridMappers.velocity, gridMappers.acceleration))

running = true
renderingEnabled = true

run = ->
  reactor.step()
  renderer.render(pixelMapper) if renderingEnabled
  requestAnimationFrame(run) if running

requestAnimationFrame(run)

toggle = $('Toggle')
toggle.onclick = ->
  if running
    running = false
    toggle.innerText = 'Start'
  else
    running = true
    toggle.innerText = 'Stop'
    requestAnimationFrame(run)

$('Step').onclick = ->
  running = false
  run()

$('Save').onclick = ->
  window.open(canvas.toDataURL('image/png'))

refreshingOperation = (fn) ->
  reactor.reset()
  positionGrid.clear()
  fn()
  renderer.render(pixelMapper) if renderingEnabled && !running

showState = ->
  $('State').innerText = JSON.stringify
    params: params
    correction:
      enabled: $('Correction').checked
      a: $('CorrectionA').value * 0.01
      b: $('CorrectionB').value * 0.01
      c: $('CorrectionC').value * 0.01

updateMapper = ->
  gridMapper = GridMapper[$('Grid').value]

  gridMappers.position = gridMapper(positionGrid)
  gridMappers.velocity = gridMapper(velocityGrid)
  gridMappers.acceleration = gridMapper(accelerationGrid)

  if $('Correction').checked
    a = $('CorrectionA').value * 0.01
    b = $('CorrectionB').value * 0.01
    c = $('CorrectionC').value * 0.01
    correctionCurve = StandardCurve(a, b, c)

    gridMappers.position = GridMapper.Corrected(gridMappers.position, correctionCurve)
    gridMappers.velocity = GridMapper.Corrected(gridMappers.velocity, correctionCurve)
    gridMappers.acceleration = GridMapper.Corrected(gridMappers.acceleration, correctionCurve)

  pixelMapper = PixelMapper[$('Mapper').value](gridMappers.position, gridMappers.velocity, gridMappers.acceleration)

  if $('Inverted').checked
    pixelMapper = PixelMapper.Inverse(pixelMapper)

  renderer.render(pixelMapper) if renderingEnabled && !running

  showState()

updateBounds = ->
  viewZoomLevel = Math.pow(2, 5 - $('ViewZoom').valueAsNumber * 0.5)
  viewCenterPoint = 
    x: $('ViewX').valueAsNumber
    y: $('ViewY').valueAsNumber

  if $('SyncBounds').checked
    zoomLevel = viewZoomLevel
    centerPoint = viewCenterPoint
  else
    zoomLevel = Math.pow(2, 5 - $('Zoom').valueAsNumber * 0.5)  
    centerPoint = 
      x: $('CenterX').valueAsNumber
      y: $('CenterY').valueAsNumber
  
  refreshingOperation ->
    reactor.bounds = new Bounds(-zoomLevel + centerPoint.x, zoomLevel + centerPoint.x, -zoomLevel + centerPoint.y, zoomLevel + centerPoint.y)
    viewBounds = new Bounds(-viewZoomLevel + viewCenterPoint.x, viewZoomLevel + viewCenterPoint.x, -viewZoomLevel + viewCenterPoint.y, viewZoomLevel + viewCenterPoint.y)

updateBoundsSync = ->
  sync = $('SyncBounds').checked

  $('Zoom').disabled = sync
  $('CenterX').disabled = sync
  $('CenterY').disabled = sync

  updateBounds()

$('Rendering').onchange = ->
  renderingEnabled = $('Rendering').checked

  renderer.render(pixelMapper) if renderingEnabled && !running

$('Grid').onchange = updateMapper
$('Mapper').onchange = updateMapper
$('Inverted').onchange = updateMapper
$('Correction').onchange = updateMapper
$('CorrectionA').onchange = updateMapper
$('CorrectionB').onchange = updateMapper
$('CorrectionC').onchange = updateMapper
$('Zoom').onchange = updateBounds
$('CenterX').onchange = updateBounds
$('CenterY').onchange = updateBounds
$('ViewZoom').onchange = updateBounds
$('ViewX').onchange = updateBounds
$('ViewY').onchange = updateBounds
$('SyncBounds').onchange = updateBoundsSync

showState()
