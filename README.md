# 🗼 Babel

> Jogo de adivinhar palavras em português, inspirado no [Termo](https://term.ooo), com modos próprios e multiplayer. Cada chute é um andar da torre. Acerte a palavra antes que ela desmorone.

🚧 **Em desenvolvimento.** Acompanhe o progresso pelo [plano do projeto](docs/PLANO.md).

## Origem

Esse projeto tem o objetivo de refazer um trabalho que eu tinha feito no primeiro semestre quando entrei na Escola Politécnica da USP. Fiz esse projeto imitando o jogo TERMO de maneira bem simples e resumida, sem lógicas muito complexas e sem interfaces para jogar. Agora, como já adquiri muitas outras habilidades, vou refazer esse jogo com novas lógicas e de maneira mais bonita para o usuário, além de uma simples jogatina no terminal.

## Modos planejados

- **Clássico**: 1 palavra, de 4 a 7 letras
- **Dueto / Quarteto**: 2 ou 4 palavras ao mesmo tempo
- **Tamanho Oculto**: descubra também quantas letras a palavra tem (dicas `−` / `+` / `=`)
- **Sala com amigos**: partidas competitivas por link, com regras definidas pelo criador da sala

## Stack

TypeScript · React · Vite · Node.js · Socket.IO · Vitest · GitHub Actions

## Rodando localmente

Requer [Node.js](https://nodejs.org) 24 ou superior.

```bash
npm install     # instala as dependências
npm test        # roda os testes
npm run check   # formatação + lint + tipos + testes (o mesmo que o CI roda)
```

## Licença

[MIT](LICENSE)
