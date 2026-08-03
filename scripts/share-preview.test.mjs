import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const expectedVietnameseUrl =
  'https://manh-an-wedding.github.io/assets/img/share-invitation.png';
const expectedEnglishUrl =
  'https://manh-an-wedding.github.io/assets/img/share-invitation-en.png';

test('publishes a 1200x630 invitation image for social link previews', async () => {
  const [indexHtml, svg, png] = await Promise.all([
    readFile('src/index.html', 'utf8'),
    readFile('public/assets/img/share-invitation.svg', 'utf8'),
    readFile('public/assets/img/share-invitation.png'),
  ]);

  assert.match(indexHtml, new RegExp(
    `<meta property="og:image" content="${expectedVietnameseUrl}"\\s*/>`,
  ));
  assert.match(indexHtml, /<meta property="og:image:width" content="1200"\s*\/>/);
  assert.match(indexHtml, /<meta property="og:image:height" content="630"\s*\/>/);
  assert.match(indexHtml, /<meta property="og:image:alt" content="Thư mời cưới Nhật An và Duy Mạnh"\s*\/>/);

  assert.match(svg, />THƯ MỜI</);
  assert.match(svg, />Nhật An &amp; Duy Mạnh</);
  assert.match(svg, />11:00 · Thứ 7 - 17.10.2026</);
  assert.match(svg, />Vạn Phát Riverside, Cần Thơ</);

  assert.equal(png.toString('ascii', 1, 4), 'PNG');
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
});

test('publishes a 1200x630 English invitation image', async () => {
  const svgPath = 'public/assets/img/share-invitation-en.svg';
  const pngPath = 'public/assets/img/share-invitation-en.png';

  assert.equal(existsSync(svgPath), true, 'missing English SVG preview');
  assert.equal(existsSync(pngPath), true, 'missing English PNG preview');

  const [svg, png] = await Promise.all([
    readFile(svgPath, 'utf8'),
    readFile(pngPath),
  ]);

  assert.match(svg, />INVITATION</);
  assert.match(svg, />Nhật An &amp; Duy Mạnh</);
  assert.match(svg, />11:00 · Saturday - 17.10.2026</);
  assert.match(svg, />Van Phat Riverside, Can Tho</);
  assert.match(svg, />\s*We cordially invite you to celebrate with our family\s*</);
  assert.equal(png.toString('ascii', 1, 4), 'PNG');
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
});

test('emits English social metadata for the direct /en/ route', async () => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'manhan-preview-'));
  const browserOutput = join(temporaryRoot, 'dist', 'manhan-web', 'browser');
  const sourceIndex = await readFile('src/index.html', 'utf8');

  try {
    await mkdir(browserOutput, { recursive: true });
    await writeFile(join(browserOutput, 'index.html'), sourceIndex);

    const result = spawnSync(
      process.execPath,
      [resolve('scripts/create-static-routes.mjs')],
      { cwd: temporaryRoot, encoding: 'utf8' },
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const englishHtml = await readFile(join(browserOutput, 'en', 'index.html'), 'utf8');
    assert.match(englishHtml, /<html lang="en">/);
    assert.match(englishHtml, new RegExp(
      `<meta property="og:image" content="${expectedEnglishUrl}"\\s*/>`,
    ));
    assert.match(englishHtml, new RegExp(
      `<meta name="twitter:image" content="${expectedEnglishUrl}"\\s*/>`,
    ));
    assert.match(
      englishHtml,
      /<meta property="og:image:alt" content="Wedding invitation for Nhật An and Duy Mạnh"\s*\/>/,
    );
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
