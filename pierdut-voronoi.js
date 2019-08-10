function dejong({ x, y }, [a, b, c, d]) {
  return {
    x: Math.sin(a * y) - Math.cos(b * x),
    y: Math.sin(c * x) - Math.cos(d * y)
  };
}

function drain({ x, y }, [a, b, c, d]) {
  return {
    x: y + a * Math.sign(x) * Math.sqrt(Math.abs(b * x - c)),
    y: d - x
  };
}

const NUM_POINTS = 10000;
const TTL = 30;
const BOUNDS = {
  top: -4,
  left: -4,
  bottom: 4,
  right: 4
};
const VIEW_BOUNDS = {
  top: -3,
  left: -3,
  bottom: 3,
  right: 3
};
const PARAMS = {
  dejong: [
    Math.random() * 4 - 2,
    Math.random() * 4 - 2,
    Math.random() * 4 - 2,
    Math.random() * 4 - 2
  ],
  drain: [
    Math.random() * 4 - 2,
    Math.random() * 4 - 2,
    Math.random() * 4 - 2,
    Math.random() * 4 - 2
  ],
  points: {
    dejong: {
      x:
        Math.random() * (VIEW_BOUNDS.right - VIEW_BOUNDS.left) +
        VIEW_BOUNDS.left,
      y:
        Math.random() * (VIEW_BOUNDS.bottom - VIEW_BOUNDS.top) + VIEW_BOUNDS.top
    },
    drain: {
      x:
        Math.random() * (VIEW_BOUNDS.right - VIEW_BOUNDS.left) +
        VIEW_BOUNDS.left,
      y:
        Math.random() * (VIEW_BOUNDS.bottom - VIEW_BOUNDS.top) + VIEW_BOUNDS.top
    }
  },
  weight: Math.random()
};

const PROCESSORS = {
  dejong: point => dejong(point, PARAMS.dejong),
  drain: point => drain(point, PARAMS.drain),
  weighted: point => {
    if (Math.random() < PARAMS.weight) {
      return drain(point, PARAMS.drain);
    } else {
      return dejong(point, PARAMS.dejong);
    }
  },
  voronoi: point => {
    const differenceDejong = {
      x: point.x - PARAMS.points.dejong.x,
      y: point.y - PARAMS.points.dejong.y
    };
    const differenceDrain = {
      x: point.x - PARAMS.points.drain.x,
      y: point.y - PARAMS.points.drain.y
    };
    const distanceDejongSquared =
      differenceDejong.x * differenceDejong.x +
      differenceDejong.y * differenceDejong.y;
    const distanceDrainSquared =
      differenceDrain.x * differenceDrain.x +
      differenceDrain.y * differenceDrain.y;
    if (distanceDejongSquared < distanceDrainSquared) {
      return dejong(point, PARAMS.dejong);
    } else {
      return drain(point, PARAMS.drain);
    }
  }
};

let process = PROCESSORS.dejong;

function randomPoint() {
  return {
    x: Math.random() * (BOUNDS.right - BOUNDS.left) + BOUNDS.left,
    y: Math.random() * (BOUNDS.bottom - BOUNDS.top) + BOUNDS.top,
    ttl: (Math.random() * TTL) | 0
  };
}

class Generator {
  constructor() {
    this.points = new Array(NUM_POINTS);
    this.reset();
  }

  reset() {
    for (let i = 0; i < NUM_POINTS; i++) {
      this.points[i] = randomPoint();
    }
  }

  step() {
    for (let i = 0; i < NUM_POINTS; i++) {
      if (this.points[i].ttl === 0) {
        this.points[i] = { ...randomPoint(), ttl: TTL };
      }

      Object.assign(this.points[i], process(this.points[i]));
      this.points[i].ttl--;
    }
  }
}

function scalePoint(point) {
  return {
    x:
      (((point.x - VIEW_BOUNDS.left) / (VIEW_BOUNDS.right - VIEW_BOUNDS.left)) *
        width) |
      0,
    y:
      (((point.y - VIEW_BOUNDS.top) / (VIEW_BOUNDS.bottom - VIEW_BOUNDS.top)) *
        height) |
      0
  };
}

class Grid {
  constructor(width, height) {
    this.array = new Float32Array(width * height);
    this.width = width;
    this.height = height;
  }

  add(point) {
    if (
      point.x >= VIEW_BOUNDS.left &&
      point.x < VIEW_BOUNDS.right &&
      point.y >= VIEW_BOUNDS.top &&
      point.y < VIEW_BOUNDS.bottom
    ) {
      const scaled = scalePoint(point);
      const index = scaled.y * this.width + scaled.x;

      this.array[index]++;
    }
  }

  clear() {
    this.array.fill(0);
  }

  [Symbol.iterator]() {
    return this.array[Symbol.iterator]();
  }
}

const canvas = document.querySelector("canvas");
const { width, height } = canvas;
const ctx = canvas.getContext("2d");
const data = ctx.getImageData(0, 0, width, height);
const pixbuf = new ArrayBuffer(data.data.length);
const pixelGrid = new Int32Array(pixbuf);
const pixel8 = new Uint8ClampedArray(pixbuf);

function logmap(count) {
  return 255 - Math.min(255, Math.pow(Math.log10(count + 1) * 4, 2.2) | 0);
}

function render(grid) {
  let i = 0;
  for (const count of grid) {
    const log = logmap(count);
    pixelGrid[i] = (255 << 24) | (log << 16) | (log << 8) | log;
    i++;
  }
  data.data.set(pixel8);
  ctx.putImageData(data, 0, 0);
}

let overlayEnabled = false;
let overlayCanBeEnabled = false;
function drawOverlay() {
  const scaledPoints = {
    dejong: scalePoint(PARAMS.points.dejong),
    drain: scalePoint(PARAMS.points.drain)
  };

  const halfpoint = {
    x: (scaledPoints.dejong.x + scaledPoints.drain.x) / 2,
    y: (scaledPoints.dejong.y + scaledPoints.drain.y) / 2
  };
  const dy = scaledPoints.dejong.y - scaledPoints.drain.y;
  const dx = scaledPoints.dejong.x - scaledPoints.drain.x;

  ctx.strokeStyle = "#CDDC39";
  ctx.beginPath();
  if (dx === 0) {
    ctx.moveTo(0, halfpoint.y);
    ctx.lineTo(width, halfpoint.y);
  } else if (dy === 0) {
    ctx.moveTo(halfpoint.x, 0);
    ctx.lineTo(halfpoint.x, height);
  } else {
    const a = -dx / dy;
    const b = halfpoint.y - a * halfpoint.x;
    ctx.moveTo(0, b);
    ctx.lineTo(width, a * width + b);
  }
  ctx.stroke();

  ctx.fillStyle = "#2196F3";
  ctx.beginPath();
  ctx.arc(scaledPoints.dejong.x, scaledPoints.dejong.y, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#FF9800";
  ctx.beginPath();
  ctx.arc(scaledPoints.drain.x, scaledPoints.drain.y, 4, 0, Math.PI * 2);
  ctx.fill();
}

const generator = new Generator();
const grid = new Grid(width, height);

function step() {
  generator.step();
  for (const point of generator.points) {
    grid.add(point);
  }
  render(grid);
  if (overlayCanBeEnabled && overlayEnabled) drawOverlay();
}

function reset() {
  generator.reset();
  grid.clear();
}

function loop() {
  requestAnimationFrame(() => {
    step();
    loop();
  });
}

loop();
// step();

////////////////////////////////////////////////// UI

function show(selector) {
  document.querySelector(selector).classList.remove("hidden");
}
function hide(selector) {
  document.querySelector(selector).classList.add("hidden");
}
function adjustInfoVisibility(processorType) {
  switch (processorType) {
    case "dejong":
      show(".info__panel-dejong");
      hide(".info__panel-drain");
      hide(".info__panel-weighted");
      hide(".info__panel-voronoi");
      overlayCanBeEnabled = false;
      break;
    case "drain":
      hide(".info__panel-dejong");
      show(".info__panel-drain");
      hide(".info__panel-weighted");
      hide(".info__panel-voronoi");
      overlayCanBeEnabled = false;
      break;
    case "weighted":
      show(".info__panel-dejong");
      show(".info__panel-drain");
      show(".info__panel-weighted");
      hide(".info__panel-voronoi");
      overlayCanBeEnabled = false;
      break;
    case "voronoi":
      show(".info__panel-dejong");
      show(".info__panel-drain");
      hide(".info__panel-weighted");
      show(".info__panel-voronoi");
      overlayCanBeEnabled = true;
      break;
  }
}

document.getElementById("params-dejong").textContent = JSON.stringify(
  PARAMS.dejong
);
document.getElementById("params-drain").textContent = JSON.stringify(
  PARAMS.drain
);
document.getElementById("weight-input").value = PARAMS.weight;
document.getElementById("weight").textContent = PARAMS.weight.toFixed(20);
document.getElementById("dejong-x").value = PARAMS.points.dejong.x;
document.getElementById("dejong-y").value = PARAMS.points.dejong.y;
document.getElementById("drain-x").value = PARAMS.points.drain.x;
document.getElementById("drain-y").value = PARAMS.points.drain.y;
document.getElementById("position-dejong").textContent = JSON.stringify(
  PARAMS.points.dejong
);
document.getElementById("position-drain").textContent = JSON.stringify(
  PARAMS.points.drain
);

document.querySelector(".type-control").addEventListener("change", e => {
  const processorType = e.target.value;
  process = PROCESSORS[processorType];
  adjustInfoVisibility(processorType);
  reset();
});

document.getElementById("weight-input").addEventListener("input", e => {
  PARAMS.weight = Number(e.target.value);
  document.getElementById("weight").textContent = e.target.value;
  reset();
});

document.getElementById("dejong-x").addEventListener("input", e => {
  PARAMS.points.dejong.x = Number(e.target.value);
  document.getElementById("position-dejong").textContent = JSON.stringify(
    PARAMS.points.dejong
  );
  reset();
});
document.getElementById("dejong-y").addEventListener("input", e => {
  PARAMS.points.dejong.y = Number(e.target.value);
  document.getElementById("position-dejong").textContent = JSON.stringify(
    PARAMS.points.dejong
  );
  reset();
});
document.getElementById("drain-x").addEventListener("input", e => {
  PARAMS.points.drain.x = Number(e.target.value);
  document.getElementById("position-drain").textContent = JSON.stringify(
    PARAMS.points.drain
  );
  reset();
});
document.getElementById("drain-y").addEventListener("input", e => {
  PARAMS.points.drain.y = Number(e.target.value);
  document.getElementById("position-drain").textContent = JSON.stringify(
    PARAMS.points.drain
  );
  reset();
});
document.getElementById("overlay").addEventListener("change", e => {
  overlayEnabled = e.target.checked;
});
