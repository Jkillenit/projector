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
