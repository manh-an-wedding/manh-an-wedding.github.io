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

await mkdir(join(outputDir, 'en'), { recursive: true });
await Promise.all([
  writeFile(join(outputDir, 'en', 'index.html'), englishDocument),
  writeFile(join(outputDir, '404.html'), rootDocument),
]);
