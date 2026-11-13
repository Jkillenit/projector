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
  deck(ctx, rand) {
    // A parking deck (#146), same tile as brick (one bay, one floor): a concrete slab on top, the open dark level under it,
    // a post at the bay edge. Posts sit at both edges in half widths, so the tile repeats.
    noise(ctx, rand, 225, 250);
    const open = ctx.createLinearGradient(0, 80, 0, SIZE);
    open.addColorStop(0, "rgb(40,40,40)");
    open.addColorStop(1, "rgb(85,85,85)");
    ctx.fillStyle = open;
    ctx.fillRect(0, 80, SIZE, SIZE - 80 - 24); // a low wall at the bottom, 24 px
    ctx.fillStyle = "rgb(235,235,235)";
    ctx.fillRect(0, 80, 10, SIZE - 80);
    ctx.fillRect(SIZE - 10, 80, 10, SIZE - 80);
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

/**
 * Field textures (#150), painted in the theme's colors: { pitch, stripe, line, dirt, track, endzone, seat, aisle }.
 * Not cached, so a theme change repaints.
 */
const FIELD_SIZE = { football: [1024, 512], stadium: [1024, 512], soccer: [512, 256], diamond: [1024, 1024], court: [256, 128], stalls: [128, 216], track: [64, 256], dirt: [8, 8], seats: [256, 256] };

// A football field 120 yards with end zones, 53.3 wide: stripes every 5 yards, yard lines, hash marks, numbers.
function gridiron(ctx, w, h, c, endzone) {
  const yd = w / 120;
  for (let i = 0; i < 24; i++) {
    ctx.fillStyle = i % 2 ? c.pitch : c.stripe;
    ctx.fillRect(i * 5 * yd, 0, 5 * yd + 1, h);
  }
  ctx.fillStyle = endzone;
  ctx.fillRect(0, 0, 10 * yd, h);
  ctx.fillRect(110 * yd, 0, 10 * yd, h);
  const edge = h * 0.035; // the white border
  ctx.fillStyle = c.line;
  for (let y = 10; y <= 110; y += 5) ctx.fillRect(y * yd - 1.5, edge, y === 10 || y === 110 ? 5 : 3, h - edge * 2);
  const across = h / 53.3; // px per yard across
  for (let y = 11; y < 110; y++) {
    if (y % 5 === 0) continue;
    for (const at of [edge, h / 2 - 3.1 * across, h / 2 + 3.1 * across - 4, h - edge - 4]) ctx.fillRect(y * yd - 1, at, 2, 4); // hash marks
  }
  ctx.font = `bold ${Math.round(h * 0.07)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let y = 20; y <= 100; y += 10) {
    const label = String(y <= 60 ? y - 10 : 110 - y);
    for (const [at, turn] of [[h * 0.17, Math.PI], [h * 0.83, 0]]) {
      ctx.save();
      ctx.translate(y * yd, at);
      ctx.rotate(turn);
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }
  }
  ctx.strokeStyle = c.line;
  ctx.lineWidth = edge;
  ctx.strokeRect(edge / 2, edge / 2, w - edge, h - edge);
}

const PAINT_FIELD = {
  football(ctx, w, h, c) {
    gridiron(ctx, w, h, c, c.stripe);
  },
  // Saban Field: crimson end zones (#150).
  stadium(ctx, w, h, c) {
    gridiron(ctx, w, h, c, c.endzone);
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
  // A ballpark 130 m square, home plate at the left middle (HOME_U in fields.js), center field to the right.
  // Clay skin around the mound, grass infield, dirt circles at home and the mound, bases, foul lines, mowing checks.
  diamond(ctx, w, h, c) {
    const m = w / 130;
    const [hx, hy] = [5 * m, h / 2];
    const at = (x, y) => [hx + x * m, hy + y * m];
    ctx.fillStyle = c.pitch;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = c.stripe;
    for (let i = 0; i * 8 * m < w; i++) for (let j = 0; j * 8 * m < h; j++) if ((i + j) % 2) ctx.fillRect(i * 8 * m, j * 8 * m, 8 * m + 1, 8 * m + 1);
    const d = 27.43 / Math.SQRT2;
    const circle = ([x, y], r) => {
      ctx.beginPath();
      ctx.arc(x, y, r * m, 0, Math.PI * 2);
      ctx.fill();
    };
    ctx.fillStyle = c.dirt;
    ctx.save();
    ctx.beginPath(); // the skin stays a little past the foul lines
    ctx.moveTo(hx, hy);
    ctx.lineTo(...at(80, -95));
    ctx.lineTo(...at(80, 95));
    ctx.clip();
    circle(at(18.44, 0), 29);
    ctx.restore();
    ctx.fillStyle = c.pitch; // grass infield, inside the base paths
    ctx.beginPath();
    for (const [x, y] of [[3.2, 0], [d, -d + 2.2], [2 * d - 2.2, 0], [d, d - 2.2]]) ctx.lineTo(...at(x, y));
    ctx.fill();
    ctx.fillStyle = c.dirt;
    circle(at(0, 0), 4);
    circle(at(18.44, 0), 2.7);
    ctx.strokeStyle = c.line;
    ctx.lineWidth = Math.max(1.5, 0.15 * m * 2);
    ctx.beginPath();
    for (const s of [-1, 1]) {
      ctx.moveTo(hx, hy);
      ctx.lineTo(...at(130, 130 * s));
    }
    ctx.stroke();
    ctx.fillStyle = c.line;
    for (const [x, y] of [[d, -d], [2 * d, 0], [d, d], [0, 0]]) {
      const [px, py] = at(x, y);
      ctx.fillRect(px - 0.5 * m, py - 0.5 * m, m, m);
    }
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
  // Parking (STALL_TILE in fields.js: 10.8 m along a row, 18.3 m across): only the lines, see-through, over the lot's asphalt.
  // Two rows of 4 stalls, 5.5 m deep, an aisle between; the line at the top edge is where rows meet back to back.
  stalls(ctx, w, h, c) {
    const m = h / 18.3;
    ctx.fillStyle = c.line;
    ctx.fillRect(0, 0, w, 2);
    for (let x = 0; x < w; x += w / 4) {
      ctx.fillRect(x, 0, 2, 5.5 * m);
      ctx.fillRect(x, h - 5.5 * m, 2, 5.5 * m);
    }
  },
  dirt(ctx, w, h, c) {
    ctx.fillStyle = c.dirt;
    ctx.fillRect(0, 0, w, h);
  },
  // Stadium seats (SEATS in fields.js: 16 m along, 8 m up): rows of crimson seats, two aisles per tile.
  seats(ctx, w, h, c) {
    ctx.fillStyle = c.seat;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    for (let y = 0; y < h; y += h / 9) ctx.fillRect(0, y, w, 3); // the step under each row
    ctx.globalAlpha = 0.45; // aisles read up close and fade into the seats from far away
    ctx.fillStyle = c.aisle;
    for (const x of [0, w / 2]) ctx.fillRect(x, 0, 5, h);
    ctx.globalAlpha = 1;
  },
};
export const FIELD_LOOKS = Object.keys(PAINT_FIELD).filter((k) => k !== "seats");

export function fieldCanvas(look, colors) {
  const c = document.createElement("canvas");
  [c.width, c.height] = FIELD_SIZE[look];
  PAINT_FIELD[look](c.getContext("2d"), c.width, c.height, colors);
  return c;
}
