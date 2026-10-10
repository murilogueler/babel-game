/**
 * Ponto de entrada do motor do jogo.
 * Tudo que outras partes do projeto (web, servidor) podem usar é exportado daqui.
 */

export const GAME_NAME = 'Babel';

export function greet(name: string): string {
  return `Bem-vindo à torre de ${GAME_NAME}, ${name}!`;
}
