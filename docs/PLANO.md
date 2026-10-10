# Babel: Plano do Projeto

> Documento vivo. Ele muda conforme o projeto avança. Decisões tomadas viram registros em `docs/decisoes/`.

---

## 0. Como um desenvolvedor sênior pensa antes de codar

Antes de escrever a primeira linha, um dev experiente responde a estas perguntas. O resto deste documento é a resposta a cada uma delas para o Babel.

| Pergunta                                        | Por que importa                                                                                                                                            |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Qual é o objetivo e para quem?**              | Define o que é "pronto". Aqui o objetivo é um portfólio jogável com código exemplar, não um produto com milhões de usuários.                               |
| **O que NÃO vamos fazer?**                      | Escopo sem limite nunca termina. Dizer "não" é tão importante quanto dizer "sim".                                                                          |
| **Onde estão as incertezas e os riscos?**       | Ataque primeiro o que é mais incerto (lista de palavras, multiplayer). Deixar o difícil para o fim é o jeito clássico de um projeto morrer.                |
| **O que é difícil de mudar depois?**            | Formato dos dados, protocolo de rede e estrutura de pastas são caros de mudar, então merecem atenção agora. Cor de botão é barato, então decidimos depois. |
| **Como separo as responsabilidades?**           | Regra do jogo ≠ tela ≠ rede. Se estiverem misturadas, mudar uma quebra as outras.                                                                          |
| **Como sei que funciona?**                      | Testes automatizados desde o dia 1, principalmente na parte mais crítica (as regras).                                                                      |
| **Como entrego aos poucos?**                    | Cada fase termina com algo **funcionando de ponta a ponta**, mesmo que pequeno.                                                                            |
| **Como adio decisões que ainda não sei tomar?** | Isolando-as atrás de uma interface. Exemplo: a regra de "quem ganha" no multiplayer vira uma função trocável.                                              |

Três princípios que vamos repetir o projeto inteiro:

1. **Separe o que muda do que não muda.** As regras do Termo quase nunca mudam. A interface muda o tempo todo.
2. **Funções puras onde der.** Mesma entrada → mesma saída, sem efeitos colaterais. São fáceis de testar e de reutilizar no front e no back.
3. **Faça funcionar, depois deixe bonito, depois deixe rápido.** Nessa ordem.

---

## 1. Visão do produto

**Babel** é um jogo de adivinhar palavras em português, inspirado no Termo, com modos próprios e multiplayer.

### Modos de jogo

| Modo                | Descrição                                                    | Config.                       |
| ------------------- | ------------------------------------------------------------ | ----------------------------- |
| **Clássico**        | 1 palavra                                                    | 4, 5, 6 ou 7 letras           |
| **Dueto**           | 2 palavras ao mesmo tempo                                    | 4, 5, 6 ou 7 letras           |
| **Quarteto**        | 4 palavras ao mesmo tempo                                    | 4, 5, 6 ou 7 letras           |
| **Tamanho Oculto**  | tamanho sorteado; feedback `−` / `+` / `=`                   | faixa a definir (ex.: 4–7)    |
| **Sala com amigos** | link compartilhável, mesmas palavras para todos, competitivo | definido pelo criador da sala |

Cada modo solo terá **palavra do dia** (igual para todo mundo) e **modo livre** (palavras aleatórias, jogue quantas quiser).

### Identidade: a Torre de Babel

- O tabuleiro cresce **de baixo para cima**: cada tentativa é um novo andar da torre.
- Ao chegar no limite de tentativas sem acertar, a torre **desmorona** e as letras se "confundem", em referência ao mito em que as línguas foram embaralhadas.
- Detalhes (animações, textos, trocadilhos) serão definidos na Fase 5.
- Nome técnico interno dos pacotes: `@torre/*` (o nome `@babel` já pertence a uma ferramenta famosa do npm).

### Fora do escopo (por enquanto)

- Contas de usuário / login
- Ranking global
- App nativo (Android/iOS). Em vez disso faremos o site instalável (PWA).
- Outros idiomas

### Glossário (a "linguagem do projeto")

Usar sempre os mesmos nomes evita confusão. **O código fica em inglês, a interface em português.** Esse é o padrão de mercado, e quem ler o repositório vai entender.

| Português               | No código                        | Significado                                          |
| ----------------------- | -------------------------------- | ---------------------------------------------------- |
| Palavra secreta         | `answer`                         | a palavra a ser descoberta                           |
| Tentativa / chute       | `guess`                          | palavra que o jogador envia                          |
| Tabuleiro               | `board`                          | grade de tentativas de UMA palavra secreta           |
| Partida                 | `game`                           | um ou mais tabuleiros jogados juntos                 |
| Feedback                | `evaluation`                     | resultado de uma tentativa (cores + dica de tamanho) |
| Verde / Amarelo / Cinza | `correct` / `present` / `absent` | estado de cada letra                                 |
| Dica de tamanho         | `lengthHint`                     | `shorter` (−) / `longer` (+) / `equal` (=)           |
| Sala                    | `room`                           | partida multiplayer                                  |

---

## 2. Requisitos

### Funcionais (o que o sistema faz)

- Validar se a tentativa é uma palavra existente do tamanho permitido.
- Calcular as cores corretamente, **inclusive com letras repetidas** (ver §4.2).
- Aceitar digitação sem acento e exibir a palavra acentuada (`acao` → `AÇÃO`).
- Teclado virtual que mostra o estado de cada letra; suporte ao teclado físico.
- Salvar o progresso: se o jogador fechar a aba, ao voltar a partida continua.
- Estatísticas por modo (jogos, vitórias, sequência, distribuição de tentativas).
- Compartilhar o resultado em emojis (🟩🟨⬛) sem revelar a palavra.
- Multiplayer: criar sala, configurar, entrar por link, jogar ao mesmo tempo, ver o progresso dos outros, ver o resultado final.

### Não funcionais (como o sistema deve ser)

- **Mobile first:** a maioria vai jogar no celular.
- **Rápido:** a resposta a cada tentativa no modo solo é instantânea (calculada no navegador).
- **Acessível:** modo de alto contraste (para daltônicos), leitores de tela, navegação por teclado.
- **Justo no multiplayer:** a palavra secreta **nunca** é enviada ao navegador antes do fim. Toda tentativa é validada no servidor.
- **Código de portfólio:** tipado, testado, documentado, com CI.

---

## 3. Arquitetura

### 3.1 Visão geral

```
                ┌────────────────────────────────────┐
                │        packages/engine             │
                │  regras puras do jogo (TypeScript) │
                │  sem React, sem rede, sem tela     │
                └───────────────┬────────────────────┘
                     usado por  │  usado por
               ┌────────────────┴──────────────┐
               ▼                               ▼
┌──────────────────────────┐      ┌──────────────────────────┐
│        apps/web          │      │       apps/server        │
│  React (navegador)       │◄────►│  Node + Socket.IO        │
│  modos solo: tudo local  │ WS   │  salas multiplayer       │
│  multiplayer: via server │      │  é a "autoridade"        │
└──────────────────────────┘      └──────────────────────────┘
               ▲                               ▲
               └──────── packages/protocol ────┘
                 tipos das mensagens trocadas
```

**Ideia central:** o `engine` não sabe que existe tela nem internet. Ele recebe dados e devolve dados. Por isso:

- dá para testar sem abrir o navegador;
- o front e o back usam **exatamente a mesma regra**;
- dá até para jogar no terminal (a Fase 1 faz isso, como homenagem à versão original).

### 3.2 Por que monorepo?

Um repositório com várias "partes" (workspaces). Vantagens: mudar uma regra no `engine` e ver o efeito no front e no back no mesmo commit; um só lugar para issues, CI e documentação. Usaremos **npm workspaces** (já vem com o Node, nenhuma ferramenta extra para aprender).

### 3.3 Stack e justificativas

| Camada                 | Escolha                                       | Por quê                                                              | Alternativas descartadas                              |
| ---------------------- | --------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------- |
| Linguagem              | **TypeScript** (modo `strict`)                | mesma linguagem no front e no back; tipos pegam erros antes de rodar | Python no back: duplicaria as regras                  |
| Testes                 | **Vitest**                                    | rápido, integrado ao Vite, sintaxe simples                           | Jest (mais lento e mais configuração)                 |
| Front                  | **React + Vite**                              | mais usado no mercado; Vite é o build mais simples hoje              | Next.js (complexidade de servidor desnecessária aqui) |
| Estilo                 | **CSS Modules + variáveis CSS**               | aprender CSS de verdade antes de abstrações                          | Tailwind (pode vir depois)                            |
| Rotas                  | **React Router**                              | padrão do ecossistema                                                |                                                       |
| Back                   | **Node.js + Socket.IO**                       | tempo real com reconexão automática pronta                           | WebSocket puro (mais trabalho manual)                 |
| Validação de mensagens | **Zod**                                       | o servidor nunca confia no que o cliente manda                       |                                                       |
| Qualidade              | **ESLint + Prettier**                         | padroniza estilo e pega erros comuns                                 |                                                       |
| E2E (depois)           | **Playwright**                                | testa o jogo "clicando" como um usuário                              |                                                       |
| CI/CD                  | **GitHub Actions**                            | roda testes a cada push e publica o site                             |                                                       |
| Deploy                 | **Vercel** (web) + **Render/Fly.io** (server) | têm plano gratuito                                                   |                                                       |

Cada linha dessa tabela vira um registro curto em `docs/decisoes/` (ver §7).

---

## 4. O motor do jogo (`packages/engine`), a parte mais importante

### 4.1 Tipos principais (rascunho)

```ts
type LetterState = 'correct' | 'present' | 'absent';
type LengthHint = 'shorter' | 'equal' | 'longer';

interface Evaluation {
  guess: string; // como o jogador digitou, normalizado
  letters: LetterState[]; // uma cor por letra
  lengthHint?: LengthHint; // só no modo Tamanho Oculto
}

interface GameConfig {
  wordLength: number | { min: number; max: number }; // faixa = Tamanho Oculto
  boardCount: 1 | 2 | 4; // Clássico, Dueto, Quarteto
  maxAttempts: number;
}

interface BoardState {
  answer: string;
  evaluations: Evaluation[];
  solved: boolean;
}

interface GameState {
  config: GameConfig;
  boards: BoardState[];
  status: 'playing' | 'won' | 'lost';
}
```

Repare: **um "modo" é só uma configuração.** Dueto de 6 letras = `{ wordLength: 6, boardCount: 2, maxAttempts: 7 }`. Não existe código especial para cada modo. Esse é o tipo de generalização que separa um código fácil de crescer de um código que vira `if/else` infinito.

### 4.2 O algoritmo das cores (com letras repetidas)

O erro mais comum em clones de Termo: palavra secreta `CASAL`, tentativa `SALSA`.
A resposta tem só **um** `S` na posição 3. O primeiro `S` da tentativa não pode ficar amarelo se o segundo `S` já é verde.

Algoritmo em **duas passadas**:

1. **Verdes primeiro:** marca as letras na posição exata e "gasta" essas letras da resposta.
2. **Amarelos depois:** para cada letra restante, se ainda sobrar aquela letra na resposta, marca amarelo e gasta uma; senão, cinza.

Esse caso e vários outros viram **testes automatizados em tabela** (entrada → saída esperada).

### 4.3 Acentos

- Toda palavra tem uma **forma normalizada** (sem acento, minúscula): `ação` → `acao`.
- O jogador digita e comparamos pela forma normalizada.
- Para exibir, buscamos a forma acentuada no dicionário.
- ⚠️ Colisões: `sábia`/`sabia`/`sabiá` viram todas `sabia`. Regra: o dicionário guarda uma forma de exibição por chave normalizada (a mais comum).

### 4.4 Tamanho Oculto (proposta)

- Tamanho errado → mostra `+` ou `−` e só **amarelo/cinza** (a letra existe ou não), **sem verde**.
- Tamanho certo → mostra `=` e as cores normais.
- Mais tentativas que o clássico (proposta: 8).

### 4.5 Palavra do dia

- Um **gerador pseudoaleatório com semente** (_seeded PRNG_): a mesma semente sempre gera a mesma sequência.
- Semente = data no fuso de Brasília + modo. Assim todos no mundo recebem a mesma palavra no mesmo dia, **sem precisar de servidor**.

### 4.6 API pública do engine (funções puras)

```ts
normalize(word): string
evaluateGuess(guess, answer): Evaluation
createGame(config, rng): GameState
submitGuess(state, guess, dictionary): GameState | GuessError
dailySeed(date, modeId): number
pickAnswers(config, seed, wordLists): string[]
```

`submitGuess` **não altera** o estado antigo: devolve um novo. Isso se chama **imutabilidade** e combina perfeitamente com React e com o servidor.

---

## 5. Front-end (`apps/web`)

### 5.1 Telas (rotas)

| Rota           | Tela                                    |
| -------------- | --------------------------------------- |
| `/`            | Menu: escolha de modo                   |
| `/jogar/:modo` | Partida solo (diária ou livre)          |
| `/sala/nova`   | Configurar sala multiplayer             |
| `/sala/:id`    | Lobby → partida → resultado             |
| (modais)       | Como jogar, Estatísticas, Configurações |

### 5.2 Organização por **funcionalidade** (não por tipo de arquivo)

```
apps/web/src/
├── main.tsx                 ← ponto de entrada
├── App.tsx                  ← rotas
├── components/              ← peças visuais reutilizáveis, "burras"
│   ├── Tile/                ← um quadradinho com letra
│   ├── Row/                 ← uma linha de Tiles
│   ├── Board/               ← um tabuleiro (várias Rows)
│   ├── Keyboard/            ← teclado virtual
│   ├── LengthHint/          ← o sinal − / + / =
│   ├── Modal/  Toast/  Button/
├── features/                ← lógica + telas de cada funcionalidade
│   ├── game/                ← useGame (hook que usa o engine), GamePage
│   ├── stats/               ← cálculo e tela de estatísticas
│   ├── settings/            ← tema, alto contraste, modo difícil
│   ├── share/               ← gera o texto com emojis
│   └── multiplayer/         ← conexão com o servidor, telas da sala
├── lib/
│   ├── storage.ts           ← salvar/ler localStorage (com versão!)
│   └── words.ts             ← carrega as listas de palavras
└── styles/
    ├── tokens.css           ← cores, espaçamentos, fontes (variáveis)
    └── global.css
```

**Componentes "burros"** só recebem dados e desenham. **Features** têm a lógica. Um `Tile` não sabe o que é uma partida, só sabe se pintar de verde.

### 5.3 Estado

- O estado da partida é o `GameState` do engine, guardado com `useReducer` do React.
- Sem Redux ou outras bibliotecas de estado: o projeto não precisa.
- O progresso é salvo no `localStorage` com um **número de versão no formato**. Se um dia mudarmos o formato, sabemos migrar os dados antigos em vez de quebrar o jogo de quem já jogava.

---

## 6. Back-end (`apps/server`) e multiplayer

### 6.1 Princípio: o servidor é a autoridade

O navegador **pede**, o servidor **decide**. O cliente manda "tentei `PRATO`". O servidor valida, calcula as cores com o mesmo `engine` e responde. As palavras secretas ficam só no servidor.

### 6.2 Ciclo de vida de uma sala

```
 criada ──► lobby ──(host inicia)──► jogando ──(todos terminam ou tempo acaba)──► finalizada ──► expira
             ▲  jogadores entram pelo link
```

### 6.3 Estrutura

```
apps/server/src/
├── index.ts               ← sobe o servidor HTTP + Socket.IO
├── rooms/
│   ├── Room.ts            ← estado e regras de UMA sala
│   ├── RoomManager.ts     ← cria, encontra e expira salas
│   └── scoring.ts         ← quem ganha? (função trocável, decisão pendente)
├── handlers/              ← trata cada mensagem recebida
└── config.ts              ← porta, limites, tempo de expiração
```

```
packages/protocol/src/
├── events.ts              ← nomes e formatos das mensagens cliente↔servidor
└── schemas.ts             ← validação Zod dessas mensagens
```

### 6.4 Preocupações que um sênior levanta desde já

- **Reconexão:** o celular perde sinal e a pessoa não pode ser expulsa. Cada jogador recebe um token guardado no navegador para voltar à sala.
- **Validação:** toda mensagem recebida passa pelo Zod. Nunca confie no cliente.
- **Limite de abuso:** limitar tentativas por segundo e salas por IP.
- **Memória:** as salas ficam em memória (um `Map`). Isso é simples, e reiniciar o servidor apaga as salas. É aceitável para o projeto, e fica **documentado como limitação conhecida**. (Evolução futura: Redis.)
- **Expiração:** salas sem atividade são apagadas depois de X minutos.
- **Privacidade:** os outros jogadores veem só as **cores** do seu progresso, nunca as letras.

### 6.5 Decisão adiada: quem vence?

Possíveis critérios: mais palavras acertadas → menos tentativas → menor tempo. Como ainda não decidimos, `scoring.ts` expõe uma interface única:

```ts
type ScoringRule = (players: PlayerResult[]) => RankedPlayer[];
```

Assim podemos testar várias regras (e até deixar o criador da sala escolher) sem mexer no resto. **Isolar uma decisão incerta é como você ganha tempo para decidir.**

---

## 7. Qualidade, ferramentas e processo

### 7.1 Ferramentas

- **TypeScript `strict`**: o máximo de verificação de tipos.
- **ESLint + Prettier**: estilo automático (ninguém discute vírgula).
- **Vitest**: testes. Meta: o engine com cobertura próxima de 100%.
- **GitHub Actions**: a cada push roda `lint → typecheck → test → build`. Se falhar, não entra na `main`.
- **EditorConfig** e `.nvmrc`: todos (você em outro PC, inclusive) usam a mesma configuração e versão do Node.

### 7.2 Estratégia de testes (pirâmide)

```
        ▲  poucos   E2E (Playwright): "jogar uma partida inteira"
       ▲▲▲          integração: servidor de salas, hooks do React
     ▲▲▲▲▲▲▲ muitos unitários: engine (cores, acentos, sorteio, modos)
```

### 7.3 Git e GitHub

- Branch `main` sempre funcionando. Cada tarefa numa branch (`feat/keyboard`, `fix/duplicate-letters`).
- **Pull Requests mesmo trabalhando sozinho.** O histórico mostra seu processo para quem avaliar o portfólio.
- **Conventional Commits:** `feat: adiciona teclado virtual`, `fix: corrige cor de letra repetida`, `test: ...`, `docs: ...`.
- **Issues + Milestones:** cada fase vira um milestone e cada tarefa uma issue.
- **Versionamento semântico:** `v0.1.0` (Fase 1), ..., `v1.0.0` (primeira versão pública completa).

### 7.4 Documentação

- `README.md`: vitrine com GIF do jogo, link para jogar, funcionalidades, stack, como rodar localmente e arquitetura resumida.
- `docs/PLANO.md`: este arquivo.
- `docs/decisoes/NNNN-titulo.md`: **ADRs** (_Architecture Decision Records_), um arquivo curto por decisão importante, com contexto, decisão, alternativas e consequências. Daqui a 6 meses você vai querer saber _por que_ fez algo.
- `LICENSE` (MIT) e créditos da lista de palavras.

---

## 8. Estrutura completa do repositório

```
babel/
├── .github/workflows/ci.yml        ← pipeline de testes e build
├── .vscode/extensions.json         ← extensões recomendadas
├── apps/
│   ├── web/                        ← site (React + Vite)
│   └── server/                     ← servidor multiplayer
├── packages/
│   ├── engine/                     ← regras do jogo + testes
│   │   ├── src/
│   │   │   ├── types.ts
│   │   │   ├── normalize.ts        (+ normalize.test.ts)
│   │   │   ├── evaluate.ts         (+ evaluate.test.ts)
│   │   │   ├── game.ts             (+ game.test.ts)
│   │   │   ├── random.ts           ← PRNG com semente, palavra do dia
│   │   │   ├── modes.ts            ← configs prontas (Clássico, Dueto...)
│   │   │   └── index.ts            ← o que o pacote exporta
│   │   └── cli.ts                  ← jogar no terminal (Fase 1)
│   ├── protocol/                   ← mensagens cliente↔servidor
│   └── words/                      ← listas de palavras geradas (JSON)
├── scripts/
│   └── build-words.ts              ← processa a fonte bruta → listas limpas
├── docs/
│   ├── PLANO.md
│   └── decisoes/
├── .editorconfig  .gitignore  .nvmrc  .prettierrc
├── eslint.config.js
├── tsconfig.base.json              ← config TS compartilhada
├── package.json                    ← raiz do monorepo (workspaces)
├── LICENSE
└── README.md
```

---

## 9. Riscos e como lidar

| Risco                                                                        | Impacto              | Mitigação                                                                                                  |
| ---------------------------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Lista de palavras ruim** (palavras estranhas, sem acento, licença incerta) | Alto: estraga o jogo | Investigar fontes **já na Fase 1**; duas listas (aceitas × sorteáveis); script reprodutível; citar a fonte |
| Multiplayer é complexo (rede, reconexão)                                     | Alto                 | Fica para depois do jogo solo estar sólido; engine já pronto e testado reduz o risco                       |
| Escopo crescer sem fim                                                       | Médio                | Este documento + milestones; ideias novas vão para uma lista "depois"                                      |
| Perder motivação no meio                                                     | Médio                | Cada fase entrega algo jogável e publicável                                                                |
| Hospedagem gratuita "dorme" (servidor demora a acordar)                      | Baixo                | Mostrar "conectando..." na interface; documentar                                                           |
| Aprender muitas tecnologias de uma vez                                       | Médio                | Uma por fase: TS → React → Node                                                                            |

---

## 10. Roadmap

Cada fase tem uma **Definição de Pronto**. Só passamos para a próxima quando ela é cumprida.

### Fase 0: Fundação

Configurar o monorepo, TypeScript, ESLint, Prettier, Vitest, Git e repositório no GitHub, CI básico.
**Pronto quando:** `npm test` roda (mesmo com um teste bobo) local e no GitHub Actions.
**Você aprende:** Node/npm, o que é TypeScript, o que é cada arquivo de configuração, Git.

### Fase 1: Motor do jogo + terminal

`normalize`, `evaluateGuess`, `createGame`, `submitGuess`, PRNG, listas de palavras (pesquisa da fonte + script), jogo no terminal.
**Pronto quando:** dá para jogar o Clássico de 5 letras no terminal e todos os testes passam. 🏷️ `v0.1.0`

### Fase 2: Clássico no navegador

Vite + React, componentes Tile/Row/Board/Keyboard, digitação, animações, salvar o progresso.
**Pronto quando:** dá para jogar o Clássico no celular por um link público. 🏷️ `v0.2.0`

### Fase 3: Todos os modos fixos

4/6/7 letras, Dueto, Quarteto, menu de modos, palavra do dia × livre.
**Pronto quando:** os modos jogáveis e testados. 🏷️ `v0.3.0`

### Fase 4: Tamanho Oculto

Regra do `lengthHint`, interface com tabuleiro de largura variável.
🏷️ `v0.4.0`

### Fase 5: Polimento solo

Estatísticas, compartilhar, como jogar, temas claro/escuro, alto contraste, identidade visual, PWA.
🏷️ `v1.0.0`: primeira versão "oficial" divulgável.

### Fase 6: Multiplayer

Protocolo, servidor de salas, telas de lobby/jogo/resultado, decisão de pontuação, deploy do servidor.
🏷️ `v1.1.0`

### Ideias para depois

Solver que sugere jogadas, ranking diário, mais idiomas, modo cooperativo.

---

## 11. Decisões em aberto

- [ ] Fonte da lista de palavras (pesquisar na Fase 1)
- [ ] Faixa de tamanhos e número de tentativas do Tamanho Oculto
- [ ] Tentativas por modo (sugestão: Clássico 6, Dueto 7, Quarteto 9)
- [ ] Critério de vitória no multiplayer
- [ ] Opções configuráveis da sala
- [ ] Nome final e identidade visual
