## 02 · [packages/ui, apps/store] A paleta da loja por perfil (tokens, Tailwind por variável, blocos do App.css e guardas)

**Status:** done

`RN-01 · RN-02 · RN-03 · CA-01 · CA-04 · CA-05` — 100

**Objetivo.** a loja passa a pintar as cores pela variável do perfil em vigor (`html[data-perfil="black-friday"]` troca para o Black Friday), com o Padrão idêntico ao de hoje e os dois perfis medidos pelos guardas.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › Comandos · Alias de import · O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines; `apps/store/CLAUDE.md` › Design system · Ícones e marca; `packages/ui/CLAUDE.md`; `DESIGN.md`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §5 · spec.md — Código (e §8 Decisões, C2, R1, R4, R5, R6, R7, R8, H2). É o rastreio da tarefa até a costura: quem executa abre esta seção quando precisa do contexto que a tarefa não repete.

**Depende de.** 01 — o tipo `StyleProfile` em `packages/core/src/appearance/types.ts`. Confira que existe antes de começar.
**Habilita.** a 06 usa os tokens de desconto (`estrelinha-sale`, `estrelinha-on-sale`, `estrelinha-sale-bar`) e a sombra por variável; a 07 lê `ESTRELINHA_PROFILES` para as amostras do card.

### Critérios de aceite

- **RN-01 · O perfil é um conjunto de valores dos MESMOS tokens**, com uma exceção desenhada no protótipo: no Black
  Friday o selo de desconto do cartão, o chip de desconto da sacola e a barra do frete grátis passam a ouro, para o
  desconto continuar se distinguindo dos outros selos. Fora esses três, nenhum componente muda de papel. Quem
  declara os perfis é um dono só (no molde de `packages/ui/src/tokens/estrelinha.ts`), e a loja os aplica como
  variáveis CSS. As classes do Tailwind passam a ler `var(--estrelinha-*)` no formato que preserva a opacidade
  (`/80`, `/70` continuam funcionando).
- **RN-02 · Só a loja.** O painel (`--estrelinha-admin-*`), o app do ateliê (`apps/mobile-adm`) e os e-mails não
  mudam. O app do ateliê lê o mesmo objeto de tokens hoje (`palette.test.ts`, desde a `72`): continua com o Padrão.
- **RN-03 · Os dois perfis passam pelos pisos de legibilidade**: todo texto continua legível sobre os fundos claros e
  escuros em cada perfil, e um perfil que reprova um piso não entra. As regras de uso do ouro ("o ouro forte nunca é
  texto", "o texto sobre o ouro é o escuro de texto") valem nos dois perfis pelo uso, e não reprovam um perfil só porque
  nele o par mede melhor.

- **CA-01** Com o perfil Padrão, a loja é idêntica à de hoje, medida por captura em 390 e 1440 nas telas de RN-08.
- **CA-04** Os guardas de contraste e de ouro passam nos dois perfis; um valor reprovado reprova a suíte.
- **CA-05** O painel e o app do ateliê não mudam de cor com o perfil ligado.

### Design — o que a tela faz

Valores do Black Friday (do protótipo; Padrão entre parênteses): ink #161514 (#23303A) · ink-soft #57524B (#54616B) · primary #1C1A18 (#34495E) · primary-strong #0D0C0B (#283A4A) · accent #C2A063 (#B8945F) · accent-strong #9A7A45 (#A07E4C) · line #E4DDD0 (#E6DFD4) · ground-deep #F0EADF (#F1EBE1) · field #857A6C (#8C8073). Iguais nos dois: ground, surface, on-primary, serenity, whatsapp, os pares de situação, stock-in, os véus on-ink. Desconto (H2): sale #34495E / #C2A063 · on-sale #FFFFFF / #161514 · sale-bar #34495E / #9A7A45. Sombra: Padrão `52 73 94`, Black Friday `22 21 20`.

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `ESTRELINHA_PROFILES` e a sombra por perfil em `packages/ui/src/tokens/` | VOCÊ CRIA | `StyleProfile` (import type de `core`) | o contrato C2 do `spec.md` |
| `ESTRELINHA_COLORS` | JÁ EXISTE. Acrescente os três tokens de desconto com os valores do Padrão; a referência continua a mesma (o ateliê a lê por identidade) | — | — |
| `apps/store/tailwind.config.ts › colors.estrelinha` e `boxShadow` | JÁ EXISTE. Passa a `rgb(var(--estrelinha-<t>-rgb) / <alpha-value>)` e sombra por `--estrelinha-shadow-rgb` | — | — |
| `apps/store/src/app/App.css` | JÁ EXISTE. `:root` com o Padrão (hex, `-rgb`, HSL do shadcn, sombra) e `html[data-perfil="black-friday"]` com o BF; `.glow-*` lê a variável de sombra | — | — |
| `apps/mobile-adm/tailwind.config.ts` | JÁ EXISTE. Consuma; não altere | — | — |

Só o que ESTA tarefa cria ou consome. `JÁ EXISTE` é afirmação a conferir no código.

### Decisões já tomadas

- R4: `--estrelinha-<token>` continua hex (leitores diretos: `CardPaymentBrick.tsx › corDaMarca`, `GuideHeroArt.tsx`, `ICON_ACCENT`, regras do `App.css`); nasce `--estrelinha-<token>-rgb` só para o Tailwind.
- R5: a camada HSL do shadcn (`App.css:173-215`: primary, primary-foreground, ring, input, border, foreground, card/popover-foreground, muted-foreground, accent-foreground) é redefinida no bloco do BF a partir dos mesmos valores, com guarda que a compara aos tokens de cada perfil. No Padrão, os valores HSL de hoje não mudam (CA-01).
- R6: sombra da loja por `--estrelinha-shadow-rgb` (Padrão `52 73 94`, igual a hoje); o ateliê segue com `ESTRELINHA_SHADOW` por identidade (`palette.test.ts:182-220` continua exigindo `toBe` no config do ateliê).
- R7: o leitor da paleta (`apps/store/src/test/paletteFromSource.ts`) recebe o perfil e recorta o bloco dele, com âncora por perfil e sensor de que o bloco do BF não vaza para o Padrão; `contrast.test.ts` e `fieldBorder.test.ts` iteram os dois perfis; `accentText` e `arbitraryTextColor` ficam como estão.
- R1: os pisos valem nos dois perfis; os tetos de "nunca texto" de `contrast.test.ts:107-124` continuam no Padrão e não se aplicam ao BF (o uso é guardado por `accentText`) — sensor: um valor BF que reprova um piso reprova a suíte.
- R8: cópia deliberada — as variáveis ficam escritas no `App.css` (um bloco por perfil) e `palette.test.ts` compara cada bloco (hex, `-rgb`, HSL, sombra) com `ESTRELINHA_PROFILES`. Não gere por plugin `addBase`.
- H2: os pares de desconto entram em `contrast.test.ts`: `on-sale` sobre `sale` ≥ 4,5:1 e `sale-bar` sobre `#FFFFFF` ≥ 3:1, em cada perfil.
- H6: o seletor do BF é `html[data-perfil="black-friday"]`.
- Guarda de dono único (nasce aqui): os hex exclusivos do BF só em `packages/ui/src/tokens/**` e `apps/store/src/app/App.css`, e o literal do atributo do perfil só no `App.css` entre os arquivos de produção de `apps/**` (o resto importa `STYLE_PROFILE_ATTRIBUTE`). Varre só produção.

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| o dono dos tokens | `packages/ui/src/tokens/estrelinha.ts:38-81 — ESTRELINHA_COLORS`, `:115-119 — ESTRELINHA_SHADOW` |
| guarda de paleta lida do disco | `apps/store/src/shared/lib/__tests__/palette.test.ts` e `apps/store/src/test/paletteFromSource.ts` |
| guarda de dono único que varre `apps/**` | `apps/store/src/shared/lib/__tests__/freeShippingSingleOwner.test.ts` (âncora dupla, removedor de comentário com CRLF/LF) |

Abra o arquivo antes de escrever o seu.

### Testes

- Guarda: a paleta lida do `App.css`, bloco a bloco, é igual a `ESTRELINHA_PROFILES[perfil]` em hex, `-rgb` e HSL, nos dois perfis; sensor: um hex do BF trocado no CSS sintético reprova.
- Guarda: o Padrão no `App.css` tem os mesmos hex e HSL de hoje (CA-01).
- Guarda: cada perfil passa nos pisos de texto (`contrast.test.ts`) e de borda de campo (`fieldBorder.test.ts`); os tetos de "nunca texto" valem só no Padrão; os pares de desconto passam; sensor de valor reprovado.
- Guarda: o config do ateliê continua entregando `ESTRELINHA_COLORS` e `ESTRELINHA_SHADOW` por identidade (`toBe`); o da loja deixa de ser identidade e passa a "as variáveis são as do dono".
- Guarda: `importOrder.test.ts` continua verde (o `App.css` depois de `@estrelinha/ui/styles.css`); `brandAssets.test.ts:523-532` lê o `theme-color` contra o dono, não contra o hex literal do `App.css`.
- Guarda: dono único dos hex do BF e do literal do atributo (com sensor e inverso).

Escrever estes testes é parte da tarefa.

### Obrigações

- Classes com opacidade (`/80`, `/[0.06]`, `/40`) continuam funcionando: é o formato `rgb(var(...-rgb) / <alpha-value>)` do Tailwind 3.4.
- Tailwind de `apps/store` só; não toque no do painel nem no do ateliê.
- Asserção de guarda não se afrouxa: reescreva com vizinha (`CLAUDE.md` › Os guardas). Comentário que explica a forma proibida a descreve, não a escreve.
- Rode a suíte inteira da loja (os guardas de outros apps varrem `apps/**`) e `npx tsc --noEmit -p apps/store/tsconfig.app.json`, `-p apps/mobile-adm/tsconfig.app.json` e `-p packages/core/tsconfig.json`.

### Não faça

- Não toque em `BrandSvg.tsx` (tarefa 03), em `ProductCard.tsx`, `ProductPage.tsx`, `CartDrawer.tsx`, `InstagramInviteSheet.tsx`, `CookieNotice.tsx` e `accentText.test.ts` (tarefa 06), em `packages/core/**` (tarefas 01 e 04), em `apps/store/src/app/App.tsx` e no aplicador (tarefa 05), em `apps/backoffice/**` (tarefa 07).
- Não mude `theme-color`, favicon nem imagem de compartilhamento (RN-06).
- Não troque fonte, raio nem imagem por perfil.

### Pronto quando

- [ ] com `data-perfil` ausente ou `padrao`, o CSS gerado da loja tem os mesmos valores de hoje (provado pelo guarda do Padrão)
- [ ] com `html[data-perfil="black-friday"]`, as variáveis valem os do BF e os guardas medem os dois perfis
- [ ] `pnpm --filter @estrelinha/store build` verde
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu
- [ ] testes dos arquivos que você alterou, passando — só deles
- [ ] a verificação mínima de fechar unidade de trabalho do arquivo de instruções de cada repositório (`CLAUDE.md` › Comandos e `.specs/project/PROJECT.md` › Comandos de verificação): o `tsc` de cada projeto tocado sem erro novo contra a baseline e a suíte do workspace tocado

---

### Confira cada citação desta tarefa quando for usá-la

Todo `caminho:linha` daqui — `Siga a forma de`, `Contrato`, `Obrigações`, `Design` — foi
escrito antes de qualquer tarefa rodar, e as tarefas anteriores mexeram na mesma árvore. Abra
cada um no momento em que ele é usado — o exemplar antes de escrever o artefato, o contrato
quando a fatia o consome —, e nenhuma linha se escreve apoiada em citação não conferida: a
linha deslocou, relocalize pelo alvo que a citação nomeia e siga, registrando no retorno; o
arquivo não está mais lá, é `citação morta` — a regra abaixo manda concluir e propagar sempre
que dê para concluir, e o histórico do Git ainda serve de exemplar.

### Se algo aqui não bater com o repositório

A rota `JÁ EXISTE` não está lá, o exemplar sumiu, a tabela tem outra forma. Dá para concluir
mesmo assim: siga, feche e propague. Não dá: pare e relate até onde chegou. Não conserte
contrato por conta, não improvise, não crie o que era de outra tarefa.

**Propagar** é corrigir, nos arquivos seguintes de `tasks/`, cada afirmação que a sua descoberta
tornou falsa — só a afirmação, e nada mais do arquivo. Feito isso, a divergência está resolvida:
ela vai no seu retorno como registro, não como pendência para alguém decidir.

**Propagar é só para frente.** Afirmação de tarefa de número MENOR, já fechada, que a sua
mudança tornou falsa **não se reescreve**: reescrever o `Pronto quando` de tarefa encerrada
apaga o registro do que de fato foi verificado quando ela fechou. Registre a caducidade na
linha `Caducou` do seu retorno — a tarefa, a afirmação e o que a tornou falsa — e siga.

### Se a verificação não fechar

Leia o erro, corrija, rode de novo. Continuando sem passar, não declare pronto: relate o que
falha, com a saída. Nunca desative teste, marque skip, afrouxe asserção, ignore lint ou
silencie erro de tipo.

### O que devolver no fim

```
Tarefa: <nn>
Caso: fechou limpo | fechou com divergência | parou
Instruções lidas: <os caminhos, raiz e módulos>
Testes escritos: <um por comportamento do bloco `Testes`, com o arquivo; o que ficou sem
  cobertura, e por quê>
Verificações: <o que rodou, e o resultado>
Árvore de trabalho: <o que você alterou; nada é commitado por você>
Citações conferidas: <quantas você abriu ao usá-las; a que deslocou, e a que estava morta>
Propagado: <a tarefa, e o que você corrigiu no arquivo dela>   (só se houve divergência)
Caducou: <tarefa já fechada · a afirmação dela que ficou falsa · o que a tornou falsa>
                                                               (só se houve; não se reescreve)
Bloqueio: <motivo · até onde você chegou>                      (só se parou)
```
