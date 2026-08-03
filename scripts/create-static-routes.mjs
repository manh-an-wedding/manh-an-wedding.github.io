import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const outputDir = join('dist', 'manhan-web', 'browser');
const rootDocument = await readFile(join(outputDir, 'index.html'), 'utf8');
if (!rootDocument.includes('lang="vi"')
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
  );

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
