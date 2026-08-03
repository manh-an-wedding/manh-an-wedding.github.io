import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const expectedUrl =
  'https://manh-an-wedding.github.io/assets/img/share-invitation.png';

test('publishes a 1200x630 invitation image for social link previews', async () => {
  const [indexHtml, svg, png] = await Promise.all([
    readFile('src/index.html', 'utf8'),
    readFile('public/assets/img/share-invitation.svg', 'utf8'),
    readFile('public/assets/img/share-invitation.png'),
  ]);

  assert.match(indexHtml, new RegExp(
    `<meta property="og:image" content="${expectedUrl}"\\s*/>`,
  ));
  assert.match(indexHtml, /<meta property="og:image:width" content="1200"\s*\/>/);
  assert.match(indexHtml, /<meta property="og:image:height" content="630"\s*\/>/);
  assert.match(indexHtml, /<meta property="og:image:alt" content="Thư mời cưới Nhật An và Duy Mạnh"\s*\/>/);

  assert.match(svg, />THƯ MỜI</);
  assert.match(svg, />Nhật An &amp; Duy Mạnh</);
  assert.match(svg, />11:00 · 17.10.2026</);
  assert.match(svg, />Vạn Phát Riverside, Cần Thơ</);

  assert.equal(png.toString('ascii', 1, 4), 'PNG');
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
});
