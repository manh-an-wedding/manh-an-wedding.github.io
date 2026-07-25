import { nameNorm } from './name-normalize';

describe('nameNorm', () => {
  it('lowercases, trims, collapses spaces', () => {
    expect(nameNorm('  Nguyễn   Văn  A ')).toBe('nguyen van a');
  });
  it('strips Vietnamese diacritics and maps đ→d', () => {
    expect(nameNorm('Đỗ Thị Hạnh')).toBe('do thi hanh');
    expect(nameNorm('DUY MẠNH')).toBe('duy manh');
  });
});
