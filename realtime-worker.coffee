sin = Math.sin
cos = Math.cos
random = Math.random

formula = (params, p) ->
  x = sin(params[0] * p.y) - cos(params[1] * p.x)
  y = sin(params[2] * p.x) - cos(params[3] * p.y)

  {x:x, y:y}

generate = (params) ->
  particles = ({x: random() * 4 - 2, y: random() * 4 - 2, ttl: 20} for i in [1..10000])

  for i in [1..100]
    for p in particles
      newp = formula(params, p)
      p.x = newp.x
      p.y = newp.y
      p.ttl--

      @postMessage
        message: 'particle'
        particle: p

      if p.ttl == 0
        p.x = random() * 4 - 2
        p.y = random() * 4 - 2
        p.ttl = 20

  @postMessage
    message: 'finish'

@onmessage = (event) ->
  generate(event.data.params) if event.data.message == 'start'
