// Ground textures made in code (#121): no image files. Each is a light gray tile that the material's color (a --map-* token)
// tints, so light and dark themes both work. worldUV is pure; the painters need a DOM canvas and run only in the scene.

/** Meters one tile covers. Tiles repeat by world size, so a big lawn is not stretched. */
export const TILE = { grass: 32, asphalt: 12, concrete: 6, water: 40, roof: 10 };

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
