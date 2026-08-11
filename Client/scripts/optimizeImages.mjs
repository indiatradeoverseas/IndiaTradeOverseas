// One-off (re-runnable) image optimization pass over public/images.
// Overwrites files IN PLACE at their existing paths/extensions so no
// component code needs to change. Only ever writes a file back if the
// result is smaller than the original (never makes anything bigger).
//
// - Caps the longest side at 1920px (fit: inside, never upscales) — no
//   web viewport needs more than that.
// - .jpg/.jpeg files are always re-encoded as real JPEG (mozjpeg). Several
//   files in this repo have a .jpeg extension but are actually PNG-encoded
//   bytes internally, which is far less efficient for photographic content
//   — re-encoding fixes that regardless of what the source bytes are.
// - .png files are re-encoded as PNG (compressionLevel 9, adaptive
//   filtering) without palette quantization, to avoid banding risk on
//   photographic PNGs — a conservative pass, not maximum compression.
//
// Usage: node scripts/optimizeImages.mjs
import sharp from 'sharp';
import { readdirSync, statSync, writeFileSync, renameSync } from 'fs';
import { join, extname } from 'path';

const ROOT = join(import.meta.dirname, '..', 'public', 'images');
const MAX_DIMENSION = 1920;

// OneDrive/AV occasionally holds a transient lock right after a file is
// read, causing a spurious write failure a moment later. Retry a few times
// with a short backoff before giving up on a given file.
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function writeWithRetry(file, buffer, attempts = 4) {
  const tmp = `${file}.tmp${process.pid}`;
  for (let i = 0; i < attempts; i += 1) {
    try {
      writeFileSync(tmp, buffer);
      renameSync(tmp, file);
      return;
    } catch (err) {
      if (i === attempts - 1) throw err;
      await sleep(500 * (i + 1));
    }
  }
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (/\.(png|jpe?g)$/i.test(entry)) out.push(full);
  }
  return out;
}

async function optimize(file) {
  const ext = extname(file).toLowerCase();
  const before = statSync(file).size;
  const input = sharp(file).resize({
    width: MAX_DIMENSION,
    height: MAX_DIMENSION,
    fit: 'inside',
    withoutEnlargement: true
  });

  const buffer = ext === '.png'
    ? await input.png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer()
    : await input.jpeg({ quality: 78, mozjpeg: true }).toBuffer();

  if (buffer.length < before) {
    await writeWithRetry(file, buffer);
    return { file, before, after: buffer.length };
  }
  return { file, before, after: before, skipped: true };
}

const files = walk(ROOT);
let totalBefore = 0;
let totalAfter = 0;
const failures = [];

for (const file of files) {
  let result;
  try {
    result = await optimize(file);
  } catch (err) {
    console.error(`${file.replace(ROOT, '')}: FAILED - ${err.message}`);
    failures.push(file);
    totalBefore += statSync(file).size;
    totalAfter += statSync(file).size;
    continue;
  }
  totalBefore += result.before;
  totalAfter += result.after;
  const pct = result.before ? Math.round((1 - result.after / result.before) * 100) : 0;
  const label = result.skipped ? 'skip (already optimal)' : `${pct}% smaller`;
  console.log(`${result.file.replace(ROOT, '')}: ${(result.before / 1024).toFixed(0)}KB -> ${(result.after / 1024).toFixed(0)}KB (${label})`);
}

if (failures.length) {
  console.log(`\n${failures.length} file(s) failed after retries, left untouched:`);
  failures.forEach((f) => console.log(`  ${f.replace(ROOT, '')}`));
}

console.log('\n---');
console.log(`Total: ${(totalBefore / 1024 / 1024).toFixed(1)}MB -> ${(totalAfter / 1024 / 1024).toFixed(1)}MB`);
console.log(`Saved: ${((totalBefore - totalAfter) / 1024 / 1024).toFixed(1)}MB (${Math.round((1 - totalAfter / totalBefore) * 100)}%)`);
