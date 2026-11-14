## 02 · [apps/store] O ⓘ da loja (`InfoTip`)

**Status:** done

`M-03; CA-22 (o comportamento)` — 99

**Objetivo.** A loja ganha um botão ⓘ com balão informativo que abre com o ponteiro e com o toque, para a faixa do frete
grátis (e, depois, para outros avisos).

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › "Convenções que valem em todo o
repositório", "Os guardas — o que trava o quê"; `apps/store/CLAUDE.md` › "Design system", "Mobile — o que quebra e não
grita". Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §3 · spec.md — Design (O ⓘ) e §7 Decisões D-09.

**Habilita.** A tarefa 08 (a faixa v2) usa este componente.

### Critérios de aceite

PRD 99 (verbatim):
- **M-03 · O ⓘ.** Abre ao passar o ponteiro (computador) e ao tocar (celular); fecha ao tocar fora e com Esc; é
  botão com rótulo acessível ("Sobre o frete grátis") e alvo de 44 px (pseudo-elemento, como o `TAP_44`). O balão fica
  sobre a lista, dentro da largura da gaveta.
- **CA-22** O ⓘ abre com o ponteiro e com o toque, fecha com toque fora e com Esc, tem rótulo acessível e alvo de
  44 px; em 390×844 o balão não passa da largura da gaveta.
  — Nesta tarefa: tudo menos a medida "em 390×844 o balão não passa da largura da gaveta", que é provada em navegador
  na Validation do WI (thread principal), sobre a gaveta da tarefa 09, onde o balão mora.

### Design — o que a tela faz

Botão: círculo de 17px, contorno de 1,5px na cor do texto ao redor (`currentColor`), letra "i" de 10,5px em 700, 6px
depois do texto, alinhado à linha; área de toque ampliada a ≥ 44px por pseudo-elemento; rótulo acessível vindo de prop
(na faixa, "Sobre o frete grátis"); `aria-expanded`. Abre ao passar o ponteiro (mouse) e fecha ao sair; clique de mouse
mantém aberto; toque alterna aberto/fechado; abre ao receber foco e fecha ao perder; Esc fecha; toque ou clique fora
fecha. Balão `role="tooltip"`, fundo `ink`, texto `on-primary`, 12,5px/18 em 400, raio md, padding 10px 12px, sombra
`shadow-ink`; entra em 150ms subindo 4px, só sem "menos movimento". Conteúdo do balão vem de prop (texto ou nó).

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `apps/store/src/shared/ui/InfoTip.tsx` | VOCÊ CRIA | `label` (rótulo acessível), `children` (conteúdo do balão), opcionalmente `className` do botão e um alvo de colisão | o botão ⓘ e o balão |
| `@estrelinha/ui/popover` (`packages/ui/src/popover.tsx`) | JÁ EXISTE. Consuma; não altere. | — | Popover do Radix em Portal |
| `TAP_44` (`apps/store/src/shared/lib/touchTarget.ts`) | JÁ EXISTE. Consuma; não altere. | — | a classe do alvo de 44px |

### Decisões já tomadas

- D-09: `InfoTip` sobre o `Popover` do `@estrelinha/ui`, controlado: abre em `pointerenter` com `pointerType === 'mouse'`,
  fecha em `pointerleave` com mouse; clique/toque alterna; foco abre, perda de foco fecha; Esc e clique fora fecham
  (do Radix); `collisionPadding={16}`; largura `w-[min(18rem,calc(100vw-32px))]`; cores com tokens `estrelinha-*`
  (o `bg-popover` do primitivo não é medido pelo `contrast.test`); `TAP_44` sem `absolute` no mesmo elemento.
- Aceite um alvo de colisão opcional (`collisionBoundary`), para a tarefa 09 limitar o balão à gaveta.

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| ⓘ com Popover, 44×44, movimento | `apps/backoffice/src/widgets/store-movement/ui/StoreMovement.tsx` › `InfoVisitas` e `apps/backoffice/src/widgets/store-movement/ui/__tests__/infoGutter.test.tsx` |
| alvo de toque | `apps/store/src/shared/lib/touchTarget.ts` › `TAP_44` |

### Testes

- componente: abre com o ponteiro do mouse e fecha ao sair; o toque alterna; clique de mouse mantém aberto.
- componente: Esc fecha; clique fora fecha; foco abre.
- componente: o botão tem o rótulo acessível recebido e `aria-expanded` acompanha o estado; o balão tem `role="tooltip"`
  e o conteúdo recebido.
- componente: o botão usa `TAP_44` (token exato) e não carrega `absolute`; o conteúdo leva `collisionPadding` 16 e a
  largura limitada (token exato); a entrada do balão tem par `motion-reduce:`.

### Obrigações

- `touchTarget.test.ts` e `alvoDeToqueNaoRoubaPosicao.test.ts` (`apps/store/src/shared/lib/__tests__`) continuam verdes.
- `contrast.test.ts`, `arbitraryTextColor.test.ts`: só tokens, nada de `text-[#…]`.
- Sem barril em `shared/ui`: importe pelo caminho do arquivo.

### Não faça

- Não use o componente em nenhuma tela ainda (a faixa é da tarefa 08).
- Não altere `packages/ui/src/popover.tsx` nem `tooltip.tsx`.

### Pronto quando

- [ ] o ⓘ abre e fecha pelos seis gestos do Design
- [ ] rótulo acessível, `aria-expanded`, `role="tooltip"` e alvo de 44px provados
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu
- [ ] testes dos arquivos que você alterou, passando — só deles
- [ ] a verificação mínima de fechar unidade de trabalho do arquivo de instruções de cada repositório

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
