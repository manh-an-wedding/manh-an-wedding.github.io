import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const outputDir = join('dist', 'manhan-web', 'browser');
const rootDocument = await readFile(join(outputDir, 'index.html'), 'utf8');
const vietnamesePreviewUrl =
  'https://manh-an-wedding.github.io/assets/img/share-invitation.png';
const englishPreviewUrl =
  'https://manh-an-wedding.github.io/assets/img/share-invitation-en.png';
const vietnamesePreviewAlt = 'content="Thư mời cưới Nhật An và Duy Mạnh"';
const englishPreviewAlt = 'content="Wedding invitation for Nhật An and Duy Mạnh"';
if (!rootDocument.includes('lang="vi"')
    || !rootDocument.includes(vietnamesePreviewUrl)
    || !rootDocument.includes(vietnamesePreviewAlt)
    || !rootDocument.includes(
      'content="Trân trọng kính mời bạn đến chung vui — Lễ Vu Quy"',
    )) {
  throw new Error('Built index metadata no longer matches the static-route transformer');
}

const englishDocument = rootDocument
  .replace('lang="vi"', 'lang="en"')
  .replace(
    'content="Trân trọng kính mời bạn đến chung vui — Lễ Vu Quy"',
    'content="You are cordially invited to celebrate Manh &amp; An’s wedding"',
  )
  .replaceAll(vietnamesePreviewUrl, englishPreviewUrl)
  .replace(vietnamesePreviewAlt, englishPreviewAlt);

const passthroughRoutes = [
  join('admin'),
  join('view', 'tien-buoc'),
];

await Promise.all([
  mkdir(join(outputDir, 'en'), { recursive: true }),
  ...passthroughRoutes.map(route => mkdir(join(outputDir, route), { recursive: true })),
]);
await Promise.all([
  writeFile(join(outputDir, 'en', 'index.html'), englishDocument),
  ...passthroughRoutes.map(route => (
    writeFile(join(outputDir, route, 'index.html'), rootDocument)
  )),
  writeFile(join(outputDir, 'view', 'tienbuoc.index.html'), rootDocument),
  writeFile(join(outputDir, '404.html'), rootDocument),
]);
