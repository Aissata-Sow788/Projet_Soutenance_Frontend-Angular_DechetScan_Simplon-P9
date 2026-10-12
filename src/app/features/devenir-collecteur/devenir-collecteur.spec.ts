import { TELEPHONE_PROFESSIONNEL_PATTERN } from './devenir-collecteur';

describe('TELEPHONE_PROFESSIONNEL_PATTERN', () => {
  it('accepts Senegalese fixed-line numbers with the +221 prefix', () => {
    expect(TELEPHONE_PROFESSIONNEL_PATTERN.test('+221 33 827 00 47')).toBe(true);
  });

  it('accepts fixed-line numbers without the country prefix', () => {
    expect(TELEPHONE_PROFESSIONNEL_PATTERN.test('33 827 00 47')).toBe(true);
  });

  it('continues to accept Senegalese mobile numbers', () => {
    expect(TELEPHONE_PROFESSIONNEL_PATTERN.test('+221 77 000 00 00')).toBe(true);
    expect(TELEPHONE_PROFESSIONNEL_PATTERN.test('770000000')).toBe(true);
  });

  it('rejects fixed-line numbers without the Senegalese area code', () => {
    expect(TELEPHONE_PROFESSIONNEL_PATTERN.test('+221 32 827 00 47')).toBe(false);
  });
});
