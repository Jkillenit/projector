// Ground textures made in code (#121): no image files. Each is a light gray tile that the material's color (a --map-* token)
// tints, so light and dark themes both work. worldUV is pure; the painters need a DOM canvas and run only in the scene.

/** Meters one tile covers. Tiles repeat by world size, so a big lawn is not stretched. */
export const TILE = { grass: 32, asphalt: 12, concrete: 6, water: 40, roof: 10 };

/** One brick tile is one window bay wide and one floor tall (3.5 m, the floor height heightOf uses), so windows sit in rows by floor. */
export const BRICK = { bay: 4, floor: 3.5 };

/** UVs for flat shapes from their x and z: one tile every `tile` meters. positions is [x, y, z, ...]. */
export function worldUV(positions, tile) {
  const uv = new Float32Array((positions.length / 3) * 2);
  for (let i = 0, j = 0; i < positions.length; i += 3, j += 2) {
    uv[j] = positions[i] / tile;
    uv[j + 1] = positions[i + 2] / tile;
  }
  return uv;
}

const SIZE = 256;

// The same pattern every time, so the map never flickers between visits.
function seeded(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Gray per pixel between lo and hi (0 to 255). Noise has no edges, so it tiles.
function noise(ctx, rand, lo, hi) {
  const img = ctx.createImageData(SIZE, SIZE);
  for (let i = 0; i < img.data.length; i += 4) {
    const g = lo + rand() * (hi - lo);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = g;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

// Draws fn at the tile and its wrapped copies, so marks crossing an edge come back on the other side.
const wrapped = (ctx, fn) => {
  for (const dx of [-SIZE, 0, SIZE]) for (const dy of [-SIZE, 0, SIZE]) {
    ctx.save();
    ctx.translate(dx, dy);
    fn();
    ctx.restore();
  }
};

const PAINT = {
  grass(ctx, rand) {
    noise(ctx, rand, 222, 255);
    // Soft darker and lighter patches, big enough to read from above.
    const patches = [];
    for (let i = 0; i < 16; i++) patches.push([rand() * SIZE, rand() * SIZE, 25 + rand() * 45, rand() < 0.5 ? 0 : 255]);
    const blades = [];
    for (let i = 0; i < 3500; i++) blades.push([rand() * SIZE, rand() * SIZE, 150 + rand() * 70, rand() * 3 + 1]);
    wrapped(ctx, () => {
      for (const [x, y, r, g] of patches) {
        const fill = ctx.createRadialGradient(x, y, 0, x, y, r);
        fill.addColorStop(0, `rgba(${g},${g},${g},0.12)`);
        fill.addColorStop(1, `rgba(${g},${g},${g},0)`);
        ctx.fillStyle = fill;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      for (const [x, y, g, h] of blades) {
        ctx.fillStyle = `rgb(${g},${g},${g})`;
        ctx.fillRect(x, y, 1, h);
      }
    });
  },
  asphalt(ctx, rand) {
    noise(ctx, rand, 215, 255);
  },
  concrete(ctx, rand) {
    noise(ctx, rand, 236, 255);
    // Slabs 1.5 m wide: four across a 6 m tile. Joints on the tile edge line up with the next tile.
    ctx.fillStyle = "rgb(200,200,200)";
    for (let k = 0; k < SIZE; k += SIZE / 4) {
      ctx.fillRect(k, 0, 2, SIZE);
      ctx.fillRect(0, k, SIZE, 2);
    }
  },
  water(ctx, rand) {
    noise(ctx, rand, 238, 255);
    // Soft ripples. Whole waves across the tile, so it tiles.
    for (let y = 0; y < SIZE; y += 2) {
      const g = 236 + 14 * Math.sin((y / SIZE) * Math.PI * 16);
      ctx.fillStyle = `rgba(${g},${g},${g},0.6)`;
      for (let x = 0; x < SIZE; x += 8) ctx.fillRect(x, y + 2 * Math.sin((x / SIZE) * Math.PI * 4), 8, 2);
    }
  },
  brick(ctx, rand) {
    // Courses 8 px tall, bricks 32 px long, every other course offset half a brick. 256 divides evenly, so it tiles.
    ctx.fillStyle = "rgb(250,250,250)";
    ctx.fillRect(0, 0, SIZE, SIZE);
    for (let y = 0; y < SIZE; y += 8) {
      const shift = (y / 8) % 2 ? 16 : 0;
      for (let x = -16; x < SIZE; x += 32) {
        const g = 195 + rand() * 45;
        ctx.fillStyle = `rgb(${g},${g},${g})`;
        ctx.fillRect(x + shift, y, 30, 6);
      }
    }
    // One window per bay: light frame, dark glass, a cross of mullions, a sill.
    const [wx, wy, ww, wh] = [88, 44, 80, 124];
    ctx.fillStyle = "rgb(245,245,245)";
    ctx.fillRect(wx - 6, wy - 6, ww + 12, wh + 12);
    ctx.fillRect(wx - 10, wy + wh + 6, ww + 20, 6);
    const glass = ctx.createLinearGradient(0, wy, 0, wy + wh);
    glass.addColorStop(0, "rgb(110,110,110)");
    glass.addColorStop(1, "rgb(60,60,60)");
    ctx.fillStyle = glass;
    ctx.fillRect(wx, wy, ww, wh);
    ctx.fillStyle = "rgb(245,245,245)";
    ctx.fillRect(wx + ww / 2 - 2, wy, 4, wh);
    ctx.fillRect(wx, wy + wh / 3, ww, 4);
  },
  roof(ctx, rand) {
    noise(ctx, rand, 222, 255);
    ctx.fillStyle = "rgba(190,190,190,0.7)";
    for (let k = 0; k < SIZE; k += SIZE / 8) ctx.fillRect(k, 0, 2, SIZE);
  },
};

const canvases = {};
/** The tile for one kind, painted once and kept for every later scene. */
export function textureCanvas(kind) {
  if (!canvases[kind]) {
    const c = document.createElement("canvas");
    c.width = c.height = SIZE;
    PAINT[kind](c.getContext("2d"), seeded(kind.length * 7919));
    canvases[kind] = c;
  }
  return canvases[kind];
}

/** Field textures (#150), painted in the theme's colors: { pitch, stripe, line, dirt, track }. Not cached, so a theme change repaints. */
const FIELD_SIZE = { football: [512, 256], soccer: [512, 256], diamond: [512, 512], court: [256, 128], track: [64, 256], dirt: [8, 8] };
const PAINT_FIELD = {
  football(ctx, w, h, c) {
    const yd = w / 120; // 120 yards, end zones included
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = i === 0 || i === 11 ? c.stripe : i % 2 ? c.pitch : c.stripe;
      ctx.fillRect(i * 10 * yd, 0, 10 * yd, h);
    }
    ctx.fillStyle = c.line;
    for (let y = 10; y <= 110; y += 5) ctx.fillRect(y * yd - 1, 6, y % 10 ? 1.5 : 2.5, h - 12);
    ctx.lineWidth = 3;
    ctx.strokeStyle = c.line;
    ctx.strokeRect(4, 4, w - 8, h - 8);
  },
  soccer(ctx, w, h, c) {
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = i % 2 ? c.pitch : c.stripe;
      ctx.fillRect((i * w) / 12, 0, w / 12 + 1, h);
    }
    const [mx, my] = [w / 105, h / 68]; // px per meter on a 105 by 68 m field
    ctx.strokeStyle = c.line;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.beginPath();
    ctx.moveTo(w / 2, 4);
    ctx.lineTo(w / 2, h - 4);
    ctx.ellipse(w / 2, h / 2, 9.15 * mx, 9.15 * my, 0, 0, Math.PI * 2);
    ctx.stroke();
    for (const x of [4, w - 4 - 16.5 * mx]) ctx.strokeRect(x, h / 2 - 20.15 * my, 16.5 * mx, 40.3 * my);
    for (const x of [4, w - 4 - 5.5 * mx]) ctx.strokeRect(x, h / 2 - 9.15 * my, 5.5 * mx, 18.3 * my);
  },
  diamond(ctx, w, h, c) {
    // Home plate near one end, the diamond pointing down the field. shortcut: home is always at the u = 0 end; OSM does not say which end it is.
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = i % 2 ? c.pitch : c.stripe;
      ctx.fillRect((i * w) / 10, 0, w / 10 + 1, h);
    }
    const m = w / 110; // px per meter on a 110 m field
    const [hx, hy] = [w * 0.08, h / 2];
    const base = 27.4 * m;
    const d = base / Math.SQRT2;
    ctx.fillStyle = c.dirt;
    ctx.beginPath();
    ctx.arc(hx + 18.4 * m, hy, 29 * m, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.pitch;
    ctx.beginPath();
    ctx.moveTo(hx + 3 * m, hy);
    ctx.lineTo(hx + d, hy - d + 3 * m);
    ctx.lineTo(hx + 2 * d - 3 * m, hy);
    ctx.lineTo(hx + d, hy + d - 3 * m);
    ctx.fill();
    ctx.strokeStyle = c.line;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(w, hy - (w - hx));
    ctx.lineTo(hx, hy);
    ctx.lineTo(w, hy + (w - hx));
    ctx.stroke();
  },
  court(ctx, w, h, c) {
    ctx.fillStyle = c.stripe;
    ctx.fillRect(0, 0, w, h);
    const m = w / 36.6;
    const [x0, y0, cw, ch] = [(w - 23.77 * m) / 2, (h - 10.97 * m) / 2, 23.77 * m, 10.97 * m];
    ctx.fillStyle = c.pitch;
    ctx.fillRect(x0, y0, cw, ch);
    ctx.strokeStyle = c.line;
    ctx.lineWidth = 2;
    ctx.strokeRect(x0, y0, cw, ch);
    const s = 1.37 * m; // doubles alley
    ctx.strokeRect(x0, y0 + s, cw, ch - 2 * s);
    ctx.beginPath();
    for (const x of [w / 2 - 6.4 * m, w / 2 + 6.4 * m]) { ctx.moveTo(x, y0 + s); ctx.lineTo(x, y0 + ch - s); }
    ctx.moveTo(w / 2 - 6.4 * m, h / 2);
    ctx.lineTo(w / 2 + 6.4 * m, h / 2);
    ctx.moveTo(w / 2, y0 - 4);
    ctx.lineTo(w / 2, y0 + ch + 4);
    ctx.stroke();
  },
  track(ctx, w, h, c) {
    ctx.fillStyle = c.track;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = c.line;
    for (let y = 0; y < h; y += h / 8) ctx.fillRect(0, y, w, 2);
  },
  dirt(ctx, w, h, c) {
    ctx.fillStyle = c.dirt;
    ctx.fillRect(0, 0, w, h);
  },
};
export const FIELD_LOOKS = Object.keys(PAINT_FIELD);

export function fieldCanvas(look, colors) {
  const c = document.createElement("canvas");
  [c.width, c.height] = FIELD_SIZE[look];
  PAINT_FIELD[look](c.getContext("2d"), c.width, c.height, colors);
  return c;
}
