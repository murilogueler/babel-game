import { describe, expect, it } from 'vitest';
import { GAME_NAME, greet } from './index';

describe('engine (teste de fumaça)', () => {
  it('exporta o nome do jogo', () => {
    expect(GAME_NAME).toBe('Babel');
  });

  it('cumprimenta o jogador pelo nome', () => {
    expect(greet('Murilo')).toBe('Bem-vindo à torre de Babel, Murilo!');
  });
});
