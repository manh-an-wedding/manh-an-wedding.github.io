import { buildXlsx, crc32 } from './xlsx-writer';

describe('xlsx-writer', () => {
  const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

  it('computes the standard CRC-32 check value', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });

  it('produces a zip with the workbook parts', () => {
    const bytes = buildXlsx('Danh sách', [['Tên'], ['An']]);
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
    const content = text(bytes);
    for (const part of ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/styles.xml', 'xl/worksheets/sheet1.xml']) {
      expect(content).toContain(part);
    }
    expect(content).toContain('<sheet name="Danh sách" sheetId="1" r:id="rId1"/>');
  });

  it('stores every cell as escaped text with a bold header row and column widths', () => {
    const content = text(buildXlsx('S', [['Tên', 'SĐT'], ['A & B <c>', '0964124330']], { columnWidths: [20, 12] }));
    expect(content).toContain('<c r="A1" t="inlineStr" s="1"><is><t xml:space="preserve">Tên</t></is></c>');
    expect(content).toContain('<c r="A2" t="inlineStr" s="0"><is><t xml:space="preserve">A &amp; B &lt;c&gt;</t></is></c>');
    expect(content).toContain('<c r="B2" t="inlineStr" s="0"><is><t xml:space="preserve">0964124330</t></is></c>');
    expect(content).toContain('<col min="2" max="2" width="12" customWidth="1"/>');
  });

  it('sanitizes characters Excel forbids in sheet names', () => {
    expect(text(buildXlsx('a/b:c', [['x']]))).toContain('<sheet name="a b c"');
  });
});
