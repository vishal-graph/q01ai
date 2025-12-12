import { getCharacter, listCharacters } from '../src/engine/characterRegistry';

describe('characterRegistry', () => {
  it('loads aadhya character', () => {
    const ch = getCharacter('aadhya');
    expect(ch).toBeDefined();
    expect(ch?.name).toMatch(/Aadhya/i);
    expect(ch?.datapoints?.length).toBeGreaterThan(5);
  });

  it('lists characters', () => {
    const list = listCharacters();
    expect(list.length).toBeGreaterThan(0);
  });
});

