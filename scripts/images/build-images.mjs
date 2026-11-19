// Image pipeline for demon portraits.
//
//   node scripts/images/build-images.mjs [--only ares,kappa] [--refresh] [--cache <dir>] [--prune]
//
// Reads scripts/images/manifest.json (id -> entry), downloads each entry's `imageUrl`
// (descriptive User-Agent, retries with backoff on 429/5xx, honours Retry-After), crops,
// resizes to at most `maxHeight` px tall (default 512, never upscaled unless `upscale: true`),
// optionally cuts out the background, and writes assets/demons/<id>.webp plus
// assets/credits.json (one entry per manifest id whose image exists).
//   --only     build just these ids (credits are still written for every id with an image)
//   --refresh  re-download even if the source is cached
//   --prune    delete assets/demons/*.webp files whose id is no longer in the manifest
//
// Downloads are cached outside the repo (default: <os tmp>/demongame-img-cache, override with
// --cache or IMG_CACHE). They are untrusted data: only decoded as images, never executed.
//
// Manifest entry fields:
//   imageUrl, sourceUrl, title, artist, date, source   (strings, required)
//   license     "Public domain" | "CC0"  (anything else is refused)
//   treatment   "cutout" (background made transparent) | "portrait" (plain crop, opaque)
//   crop        optional {left, top, width, height} on the downloaded image. Values <= 1 are
//               fractions of the image size, larger values are pixels.
//   maxHeight   optional, default 512.        upscale  optional, default false.
//   paper       optional ["#ink", "#paper"]: re-tone a black-on-white print as ink on old paper.
//   cutout      optional tuning for treatment "cutout":
//     tolerance   colour distance (0-441) from the background model that still counts as
//                 background. Default 48. Raise for textured paper, lower for low contrast.
//     close       px (at output size) to bridge gaps in outlines so the fill can't leak
//                 into the figure. Default 2.
//     sides       which crop edges sample the background, default all four. Drop an edge the
//                 figure covers (e.g. a bust cut off at the bottom: ["top","left","right"]).
//     seedSides   which edges the background fill starts from (default = sides).
//     minPart     keep separate pieces at least this fraction of the largest piece. Default 0.02.
//     shrink      px to erode the figure edge before feathering (kills halos). Default 0.
//     flat        true = model the background as one colour (median of the sampled edges) instead
//                 of a gradient plane. Use for clean paper when the figure fills most edges.
//     feather     blur sigma for the alpha edge. Default 0.8.
//     blur        blur sigma (px at output size) applied to a copy used only to decide what is
//                 background, for hatched/engraved backgrounds. Default 0 (off).
//
// The cutout keeps paper/background colour that is enclosed by the figure (so line art stays
// readable on dark backgrounds); only background connected to the crop edges is removed.
import sharp from 'sharp';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

// Node's built-in fetch ignores HTTPS_PROXY unless NODE_USE_ENV_PROXY is set at startup.
if (isMain && (process.env.HTTPS_PROXY || process.env.https_proxy) && !process.env.NODE_USE_ENV_PROXY) {
  const r = spawnSync(process.execPath, [...process.execArgv, ...process.argv.slice(1)], {
    stdio: 'inherit',
    env: { ...process.env, NODE_USE_ENV_PROXY: '1', NODE_NO_WARNINGS: '1' },
  });
  process.exit(r.status ?? 1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const manifestPath = path.join(root, 'scripts/images/manifest.json');
const outDir = path.join(root, 'assets/demons');
const creditsPath = path.join(root, 'assets/credits.json');

const USER_AGENT = 'DemonGamePrototype/0.1 (game prototype asset fetch)';
const LICENSES = new Set(['Public domain', 'CC0']);
const TREATMENTS = new Set(['cutout', 'portrait']);
const MAX_DOWNLOAD_BYTES = 80 * 1024 * 1024;
const MAX_WAIT_S = 15 * 60;

function parseArgs(argv) {
  const args = { only: null, refresh: false, cache: process.env.IMG_CACHE || path.join(os.tmpdir(), 'demongame-img-cache'), prune: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--only') args.only = new Set(argv[++i].split(',').map((s) => s.trim()).filter(Boolean));
    else if (a === '--refresh') args.refresh = true;
    else if (a === '--cache') args.cache = path.resolve(argv[++i]);
    else if (a === '--prune') args.prune = true;
    else throw new Error(`unknown argument ${a}`);
  }
  return args;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function retryAfterSeconds(res, attempt) {
  const h = res.headers.get('retry-after');
  let s = NaN;
  if (h) s = /^\d+$/.test(h.trim()) ? Number(h) : (Date.parse(h) - Date.now()) / 1000;
  if (!Number.isFinite(s) || s <= 0) s = Math.min(5 * 2 ** attempt, 300);
  return Math.min(s, MAX_WAIT_S);
}

// Downloads url into the cache (keyed by URL hash) and returns the local path.
async function download(url, cacheDir, refresh) {
  const file = path.join(cacheDir, createHash('sha256').update(url).digest('hex').slice(0, 24) + '.img');
  if (!refresh && existsSync(file)) return file;
  for (let attempt = 0; attempt < 8; attempt++) {
    let res;
    try {
      res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'AIC-User-Agent': USER_AGENT, Accept: 'image/*' }, redirect: 'follow' });
    } catch (err) {
      const wait = Math.min(5 * 2 ** attempt, 120);
      console.warn(`  network error (${err.cause?.code || err.message}); retrying in ${wait}s`);
      await sleep(wait * 1000);
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      const wait = retryAfterSeconds(res, attempt);
      console.warn(`  HTTP ${res.status}; retrying in ${Math.round(wait)}s`);
      await res.body?.cancel();
      await sleep(wait * 1000);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const type = res.headers.get('content-type') || '';
    if (!type.startsWith('image/')) {
      // Bot walls answer 200 with an HTML page; treat as transient.
      await res.body?.cancel();
      const wait = Math.min(30 * 2 ** attempt, 600);
      console.warn(`  got ${type || 'no content-type'} instead of an image; retrying in ${wait}s`);
      await sleep(wait * 1000);
      continue;
    }
    const len = Number(res.headers.get('content-length') || 0);
    if (len > MAX_DOWNLOAD_BYTES) throw new Error(`refusing ${len} byte download from ${url}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_DOWNLOAD_BYTES) throw new Error(`refusing ${buf.length} byte download from ${url}`);
    const meta = await sharp(buf).metadata(); // throws if it is not a decodable image
    if (!['jpeg', 'png', 'webp', 'tiff', 'gif'].includes(meta.format)) throw new Error(`unexpected format ${meta.format} from ${url}`);
    await writeFile(file, buf);
    await sleep(1000); // be polite between downloads
    return file;
  }
  throw new Error(`gave up downloading ${url}`);
}

function resolveCrop(crop, w, h) {
  if (!crop) return null;
  const v = (val, size) => (val <= 1 ? Math.round(val * size) : Math.round(val));
  const left = Math.max(0, v(crop.left ?? 0, w));
  const top = Math.max(0, v(crop.top ?? 0, h));
  const width = Math.min(w - left, v(crop.width ?? 1, w));
  const height = Math.min(h - top, v(crop.height ?? 1, h));
  if (width < 8 || height < 8) throw new Error(`crop ${JSON.stringify(crop)} is empty on a ${w}x${h} image`);
  return { left, top, width, height };
}

// ---------- cutout ----------

// Least-squares plane fit per channel (c = a + b*x + c*y) over the sampled edge pixels, with one
// outlier-rejection pass so a figure touching an edge doesn't skew the background model.
// One flat colour (per-channel median of the edge bands). Steadier than the plane fit when the
// figure covers much of the edges, e.g. an engraving on clean paper that fills its plate.
function flatBackground(px, W, H, sides) {
  const band = Math.max(2, Math.round(Math.min(W, H) * 0.02));
  const vals = [[], [], []];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const onEdge = (y < band && sides.has('top')) || (y >= H - band && sides.has('bottom')) || (x < band && sides.has('left')) || (x >= W - band && sides.has('right'));
      if (onEdge) for (let c = 0; c < 3; c++) vals[c].push(px[(y * W + x) * 3 + c]);
    }
  }
  return vals.map((v) => { v.sort((a, b) => a - b); return [v[Math.floor(v.length / 2)] ?? 255, 0, 0]; });
}

function fitBackground(px, W, H, sides) {
  const band = Math.max(2, Math.round(Math.min(W, H) * 0.02));
  const samples = [];
  const add = (x, y) => samples.push(x, y);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const onTop = y < band, onBottom = y >= H - band, onLeft = x < band, onRight = x >= W - band;
      if ((onTop && sides.has('top')) || (onBottom && sides.has('bottom')) || (onLeft && sides.has('left')) || (onRight && sides.has('right'))) add(x, y);
    }
  }
  const fit = (keep) => {
    const models = [];
    for (let c = 0; c < 3; c++) {
      // normal equations for [1, x, y]
      let n = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sv = 0, sxv = 0, syv = 0;
      for (let i = 0; i < samples.length; i += 2) {
        if (keep && !keep[i / 2]) continue;
        const x = samples[i] / W, y = samples[i + 1] / H, v = px[(samples[i + 1] * W + samples[i]) * 3 + c];
        n++; sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; sv += v; sxv += x * v; syv += y * v;
      }
      const m = [[n, sx, sy], [sx, sxx, sxy], [sy, sxy, syy]];
      const b = [sv, sxv, syv];
      models.push(solve3(m, b) || [sv / Math.max(n, 1), 0, 0]);
    }
    return models;
  };
  let models = fit(null);
  const dists = [];
  for (let i = 0; i < samples.length; i += 2) dists.push(distToModel(px, W, H, models, samples[i], samples[i + 1]));
  const sorted = [...dists].sort((a, b) => a - b);
  const cutoff = Math.max(12, sorted[Math.floor(sorted.length * 0.5)] * 3);
  models = fit(dists.map((d) => d <= cutoff));
  return models;
}

function solve3(m, b) {
  const a = m.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < 3; col++) {
    let piv = col;
    for (let r = col + 1; r < 3; r++) if (Math.abs(a[r][col]) > Math.abs(a[piv][col])) piv = r;
    if (Math.abs(a[piv][col]) < 1e-9) return null;
    [a[col], a[piv]] = [a[piv], a[col]];
    for (let r = 0; r < 3; r++) {
      if (r === col) continue;
      const f = a[r][col] / a[col][col];
      for (let k = col; k < 4; k++) a[r][k] -= f * a[col][k];
    }
  }
  return [a[0][3] / a[0][0], a[1][3] / a[1][1], a[2][3] / a[2][2]];
}

function distToModel(px, W, H, models, x, y) {
  const i = (y * W + x) * 3;
  let d = 0;
  for (let c = 0; c < 3; c++) {
    const [k, bx, by] = models[c];
    const diff = px[i + c] - (k + bx * (x / W) + by * (y / H));
    d += diff * diff;
  }
  return Math.sqrt(d);
}

// Square-structuring-element dilation of a 0/1 mask, separable (rows then columns).
function dilate(mask, W, H, r) {
  if (r <= 0) return mask.slice();
  const tmp = new Uint8Array(W * H), out = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let v = 0;
      for (let k = Math.max(0, x - r), e = Math.min(W - 1, x + r); k <= e && !v; k++) v = mask[y * W + k];
      tmp[y * W + x] = v;
    }
  }
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      let v = 0;
      for (let k = Math.max(0, y - r), e = Math.min(H - 1, y + r); k <= e && !v; k++) v = tmp[k * W + x];
      out[y * W + x] = v;
    }
  }
  return out;
}

const erode = (mask, W, H, r) => invert(dilate(invert(mask), W, H, r));
function invert(mask) {
  const o = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) o[i] = mask[i] ? 0 : 1;
  return o;
}

export function cutoutAlpha(px, W, H, opts = {}) {
  const tolerance = opts.tolerance ?? 48;
  const close = opts.close ?? 2;
  const sides = new Set(opts.sides ?? ['top', 'bottom', 'left', 'right']);
  const seedSides = new Set(opts.seedSides ?? [...sides]);
  const minPart = opts.minPart ?? 0.02;
  const shrink = opts.shrink ?? 0;
  const N = W * H;

  const models = opts.flat ? flatBackground(px, W, H, sides) : fitBackground(px, W, H, sides);
  const isBg = new Uint8Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) isBg[y * W + x] = distToModel(px, W, H, models, x, y) < tolerance ? 1 : 0;

  // Walls = figure pixels, thickened so the fill can't slip through small gaps in outlines.
  const walls = dilate(invert(isBg), W, H, close);
  const outside = new Uint8Array(N);
  const queue = new Int32Array(N);
  let qh = 0, qt = 0;
  const seed = (x, y) => {
    const i = y * W + x;
    if (!walls[i] && !outside[i]) { outside[i] = 1; queue[qt++] = i; }
  };
  for (let x = 0; x < W; x++) { if (seedSides.has('top')) seed(x, 0); if (seedSides.has('bottom')) seed(x, H - 1); }
  for (let y = 0; y < H; y++) { if (seedSides.has('left')) seed(0, y); if (seedSides.has('right')) seed(W - 1, y); }
  const flood = (allowed) => {
    while (qh < qt) {
      const i = queue[qh++], x = i % W, y = (i / W) | 0;
      const visit = (j) => { if (!outside[j] && allowed(j)) { outside[j] = 1; queue[qt++] = j; } };
      if (x > 0) visit(i - 1);
      if (x < W - 1) visit(i + 1);
      if (y > 0) visit(i - W);
      if (y < H - 1) visit(i + W);
    }
  };
  flood((j) => !walls[j]);
  // Give back the band the thickened walls took, but only over background-coloured pixels.
  for (let step = 0; step < close; step++) {
    const grow = dilate(outside, W, H, 1);
    for (let i = 0; i < N; i++) if (grow[i] && isBg[i]) outside[i] = 1;
  }

  let inside = invert(outside);
  inside = keepLargeParts(inside, W, H, minPart);
  if (shrink > 0) inside = erode(inside, W, H, shrink);
  const alpha = new Uint8Array(N);
  for (let i = 0; i < N; i++) alpha[i] = inside[i] ? 255 : 0;
  return alpha;
}

// Drops specks: keeps 8-connected parts at least `minPart` x the largest part's area.
function keepLargeParts(mask, W, H, minPart) {
  const N = W * H;
  const label = new Int32Array(N).fill(-1);
  const sizes = [];
  const queue = new Int32Array(N);
  for (let s = 0; s < N; s++) {
    if (!mask[s] || label[s] !== -1) continue;
    const id = sizes.length;
    let qh = 0, qt = 0, size = 0;
    label[s] = id; queue[qt++] = s;
    while (qh < qt) {
      const i = queue[qh++], x = i % W, y = (i / W) | 0;
      size++;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const j = ny * W + nx;
          if (mask[j] && label[j] === -1) { label[j] = id; queue[qt++] = j; }
        }
      }
    }
    sizes.push(size);
  }
  if (!sizes.length) return mask;
  const largest = Math.max(...sizes);
  const out = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (label[i] >= 0 && sizes[label[i]] >= largest * minPart) out[i] = 1;
  return out;
}

// ---------- per-image build ----------

// Builds one manifest entry from a local source file into `out` (a .webp path).
export async function buildOne(entry, file, out) {
  const meta = await sharp(file).metadata();
  const w = meta.autoOrient?.width ?? meta.width, h = meta.autoOrient?.height ?? meta.height;
  // rotate() = honour EXIF orientation; flatten() puts transparent sources (pre-cut PNGs) on
  // white paper instead of their hidden (often black) RGB.
  let pipe = sharp(file).rotate().flatten({ background: '#ffffff' }).toColourspace('srgb');
  const crop = resolveCrop(entry.crop, w, h);
  if (crop) pipe = pipe.extract(crop);
  const maxHeight = entry.maxHeight ?? 512;
  pipe = pipe.resize({ height: maxHeight, withoutEnlargement: !entry.upscale, kernel: 'lanczos3' });
  const { data, info } = await pipe.raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  // `paper: ["#inkhex", "#paperhex"]` re-tones a stark black-on-white print as ink on old paper (by luminance),
  // so it sits with the other museum scans.
  if (entry.paper) {
    const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
    const [ink, paper] = entry.paper.map(hex);
    for (let i = 0; i < data.length; i += 3) {
      const l = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
      for (let k = 0; k < 3; k++) data[i + k] = Math.round(ink[k] + (paper[k] - ink[k]) * l);
    }
  }
  if (entry.treatment === 'cutout') {
    // Classify on a blurred copy when asked, so hatched/engraved backgrounds read as one flat tone.
    const blur = entry.cutout?.blur ?? 0;
    const classPx = blur > 0
      ? await sharp(data, { raw: { width: W, height: H, channels: 3 } }).blur(Math.max(0.3, blur)).raw().toBuffer()
      : data;
    if (classPx.length !== data.length) throw new Error('blurred copy returned an unexpected buffer');
    let alpha = cutoutAlpha(classPx, W, H, entry.cutout);
    const feather = entry.cutout?.feather ?? 0.8;
    if (feather > 0) {
      const blurred = await sharp(Buffer.from(alpha), { raw: { width: W, height: H, channels: 1 } })
        .blur(Math.max(0.3, feather)).extractChannel(0).raw().toBuffer({ resolveWithObject: true });
      if (blurred.info.channels !== 1 || blurred.data.length !== W * H) throw new Error('alpha blur returned an unexpected buffer');
      alpha = blurred.data;
    }
    const rgba = Buffer.alloc(W * H * 4);
    for (let i = 0; i < W * H; i++) {
      rgba[i * 4] = data[i * 3]; rgba[i * 4 + 1] = data[i * 3 + 1]; rgba[i * 4 + 2] = data[i * 3 + 2]; rgba[i * 4 + 3] = alpha[i];
    }
    // Trim fully transparent margins, keeping a 2px pad.
    const clear = { r: 0, g: 0, b: 0, alpha: 0 };
    let png = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
    try {
      png = await sharp(png).trim({ background: clear, threshold: 1 }).extend({ top: 2, bottom: 2, left: 2, right: 2, background: clear }).png().toBuffer();
    } catch { /* nothing to trim */ }
    // The pad can push an untrimmed cutout past maxHeight; scale it back inside the limit.
    png = await sharp(png).resize({ height: maxHeight, withoutEnlargement: true, kernel: 'lanczos3' }).png().toBuffer();
    await sharp(png).webp({ quality: 88, alphaQuality: 90, effort: 5 }).toFile(out);
  } else {
    await sharp(data, { raw: { width: W, height: H, channels: 3 } }).webp({ quality: 88, effort: 5 }).toFile(out);
  }
  const outMeta = await sharp(out).metadata();
  return { out, width: outMeta.width, height: outMeta.height };
}

function validate(id, e) {
  const problems = [];
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(id)) problems.push('id must be lowercase letters, digits, - or _');
  for (const k of ['imageUrl', 'sourceUrl', 'title', 'artist', 'date', 'source', 'license', 'treatment']) {
    if (typeof e[k] !== 'string' || !e[k].trim()) problems.push(`missing ${k}`);
  }
  if (e.license && !LICENSES.has(e.license)) problems.push(`license "${e.license}" is not allowed (only ${[...LICENSES].join(' / ')})`);
  if (e.treatment && !TREATMENTS.has(e.treatment)) problems.push(`treatment must be cutout or portrait`);
  for (const k of ['imageUrl', 'sourceUrl']) if (e[k] && !/^https:\/\//.test(e[k])) problems.push(`${k} must be https`);
  if (problems.length) throw new Error(`${id}: ${problems.join('; ')}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const ids = Object.keys(manifest);
  for (const id of ids) validate(id, manifest[id]);
  await mkdir(outDir, { recursive: true });
  await mkdir(args.cache, { recursive: true });

  const failures = [];
  for (const id of ids) {
    if (args.only && !args.only.has(id)) continue;
    const entry = manifest[id];
    process.stdout.write(`${id}: `);
    try {
      const file = await download(entry.imageUrl, args.cache, args.refresh);
      const r = await buildOne(entry, file, path.join(outDir, `${id}.webp`));
      console.log(`${entry.treatment} -> ${path.relative(root, r.out)} (${r.width}x${r.height})`);
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
      failures.push(id);
    }
  }

  // Credits are derived from the manifest, for every image that exists on disk.
  const credits = [];
  for (const id of ids) {
    const e = manifest[id];
    const file = `assets/demons/${id}.webp`;
    if (!existsSync(path.join(root, file))) { console.warn(`warning: ${file} missing; left out of credits`); continue; }
    credits.push({ id, file, title: e.title, artist: e.artist, date: e.date, source: e.source, sourceUrl: e.sourceUrl, imageUrl: e.imageUrl, license: e.license, treatment: e.treatment });
  }
  // Keep every credit that isn't a demon portrait (tiles, sounds, music, title art), in its original place after them.
  let others = [];
  try { others = JSON.parse(await readFile(creditsPath, 'utf8')).filter((c) => !manifest[c.id]); } catch { /* first run */ }
  credits.push(...others);
  await writeFile(creditsPath, JSON.stringify(credits, null, 2) + '\n');
  console.log(`credits: ${credits.length} entries -> ${path.relative(root, creditsPath)}`);

  if (args.prune) {
    for (const f of await readdir(outDir)) {
      const id = f.replace(/\.webp$/, '');
      if (f.endsWith('.webp') && !manifest[id]) { await rm(path.join(outDir, f)); console.log(`removed orphan ${f}`); }
    }
  }
  if (failures.length) { console.error(`failed: ${failures.join(', ')}`); process.exit(1); }
}

if (isMain) main().catch((err) => { console.error(err); process.exit(1); });
