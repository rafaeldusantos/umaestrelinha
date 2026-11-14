## 06 · [apps/store] O desconto em ouro no Black Friday, e as sombras soltas no perfil

**Status:** done

`RN-01 · RN-03 · CA-01 · CA-04` — 100

**Objetivo.** o selo "-X%" do cartão e da página do produto, o chip de desconto da sacola e a barra do frete grátis usam o papel de desconto (ouro no Black Friday, como hoje no Padrão), e as três sombras soltas acompanham o perfil.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › Comandos · Alias de import · O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines; `apps/store/CLAUDE.md` › Design system · Carrinho, chrome e checkout · Frete grátis. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §5 · spec.md — Código (e §8 Decisões, H2, H3, H4, R6). É o rastreio da tarefa até a costura: quem executa abre esta seção quando precisa do contexto que a tarefa não repete.

**Depende de.** 02 — os tokens `estrelinha-sale`, `estrelinha-on-sale`, `estrelinha-sale-bar` e a sombra por `--estrelinha-shadow-rgb`. Confira que existe antes de começar.

### Critérios de aceite

- **RN-01 · O perfil é um conjunto de valores dos MESMOS tokens**, com uma exceção desenhada no protótipo: no Black
  Friday o selo de desconto do cartão, o chip de desconto da sacola e a barra do frete grátis passam a ouro, para o
  desconto continuar se distinguindo dos outros selos. Fora esses três, nenhum componente muda de papel. Quem
  declara os perfis é um dono só (no molde de `packages/ui/src/tokens/estrelinha.ts`), e a loja os aplica como
  variáveis CSS. As classes do Tailwind passam a ler `var(--estrelinha-*)` no formato que preserva a opacidade
  (`/80`, `/70` continuam funcionando).
- **RN-03 · Os dois perfis passam pelos pisos de legibilidade**: todo texto continua legível sobre os fundos claros e
  escuros em cada perfil, e um perfil que reprova um piso não entra. As regras de uso do ouro ("o ouro forte nunca é
  texto", "o texto sobre o ouro é o escuro de texto") valem nos dois perfis pelo uso, e não reprovam um perfil só porque
  nele o par mede melhor.

- **CA-01** Com o perfil Padrão, a loja é idêntica à de hoje, medida por captura em 390 e 1440 nas telas de RN-08.
- **CA-04** Os guardas de contraste e de ouro passam nos dois perfis; um valor reprovado reprova a suíte.

### Design — o que a tela faz

No Black Friday: selo de oferta do cartão fundo accent, texto ink; chip de desconto da sacola fundo accent, texto ink; preenchimento da barra do frete grátis accent-strong. No Padrão, os três ficam como hoje (fundo primary, texto branco).

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `apps/store/src/entities/product/ui/ProductCard.tsx:39-47 › CardBadge` (tom `jam`) | JÁ EXISTE. Passa a `bg-estrelinha-sale text-estrelinha-on-sale` | — | — |
| `apps/store/src/pages/ProductPage.tsx:249-253` (o selo da galeria) | JÁ EXISTE. Idem | — | — |
| `apps/store/src/widgets/cart-drawer/ui/CartDrawer.tsx:200-213` (o preenchimento da barra) | JÁ EXISTE. Passa a `bg-estrelinha-sale-bar` | — | — |
| o chip de desconto da sacola | JÁ EXISTE (localizar — H4) | — | — |
| `InstagramInviteSheet.tsx:35` | JÁ EXISTE. A sombra (hoje `rgba(52,73,94,0.16)`) passa a ler `--estrelinha-shadow-rgb` com a mesma opacidade | — | — |
| `CookieNotice.tsx:59` | JÁ EXISTE. A sombra usa o ink (`rgba(35,48,58,0.08)`), não a ardósia: passa a ler `--estrelinha-ink-rgb` com a mesma opacidade, para o Padrão ficar idêntico (CA-01) | — | — |

Só o que ESTA tarefa cria ou consome. `JÁ EXISTE` é afirmação a conferir no código.

### Decisões já tomadas

- H2, H3, H4 do `spec.md` › Decisões, verbatim lá. O chip (H4): o elemento da sacola que mostra o desconto aplicado com fundo `primary` (candidatos `CartDrawer.tsx:267`, `features/apply-coupon/ui/CouponInput.tsx:80-93`); se nenhum tiver fundo `primary`, nada muda e o retorno diz isso.
- Os outros selos ("Novo", "Últimas", "Destaque") não mudam de papel.

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| o selo do cartão | `apps/store/src/entities/product/ui/ProductCard.tsx:39-47 — CardBadge` |

Abra o arquivo antes de escrever o seu.

### Testes

- Componente: o selo "-X%" do cartão e o da página do produto usam `bg-estrelinha-sale` e `text-estrelinha-on-sale` (token exato), e os selos "Novo"/"Últimas" não (`ProductCardSurface.test.tsx:185-199` reescrito com vizinha).
- Componente: o preenchimento da barra do frete grátis usa `bg-estrelinha-sale-bar`.
- Componente: o chip de desconto da sacola usa o papel de desconto (se existir — H4).
- Guarda (`accentText.test.ts`): o texto sobre o papel de desconto é `on-sale` sólido, nunca com opacidade.

Escrever estes testes é parte da tarefa.

### Obrigações

- Texto sobre ouro é escuro sólido, nunca com opacidade (`accentText.test.ts`).
- Não use cor arbitrária de texto (`arbitraryTextColor.test.ts`): use o token com nome.
- Rode a suíte inteira da loja e `npx tsc --noEmit -p apps/store/tsconfig.app.json`; `eslint` da loja sem erro novo.

### Não faça

- Não toque em tokens, `tailwind.config.ts` ou `App.css` (tarefa 02).
- Não mude o selo da campanha (WI 102) nem a faixa de avisos (WI 101).

### Pronto quando

- [ ] no Padrão o selo, o chip e a barra pintam exatamente como hoje (os tokens valem o primary e o branco)
- [ ] no BF eles pintam ouro (garantido pelos valores da 02 e pela classe desta)
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
