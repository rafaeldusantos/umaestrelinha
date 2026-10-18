## T01 · [apps/store] Home · convite para o Instagram

`C-01 · C-02 · C-03 · C-04 · C-05 · C-06 · C-07` — 65-convite-instagram-na-home

**Objetivo.** Na primeira visita à Home, a cliente vê, uma vez só, um convite para conhecer o trabalho da Adri e seguir o perfil no Instagram, com um botão para o perfil e duas formas de fechar.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md › Convenções que valem em todo o repositório`, `CLAUDE.md › Os guardas — o que trava o quê`, `CLAUDE.md › Baselines — o gate de qualquer feature`, `CLAUDE.md › O "defeito 01": dois donos do mesmo dado`, `CLAUDE.md › Feature-Sliced Design (dentro de cada app)`; `apps/store/CLAUDE.md › Design system`, `› Mobile — o que quebra e não grita`, `› Ícones e marca`, `› A home não salta enquanto carrega (feature 40)`, `› A Home é dado (feature 24)`, `› Modo prévia (feature 25)`, `› Carrinho, chrome e checkout`; `DESIGN.md`; `packages/ui/CLAUDE.md`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §5 · plan.md — Código — apps/store (com §2 Comportamentos, §4 Design e §8 Perguntas e respostas).

### Critérios de aceite

- **C-01** — Na primeira visita à Home, aparece um convite para conhecer o trabalho e seguir a Uma Estrelinha no Instagram — folha presa ao rodapé no celular, cartão central de 480px no computador, sobre um véu que escurece a Home.
- **C-02** — O convite aparece uma vez só por navegador: depois de aberto uma vez, não volta nas visitas seguintes, nem ao recarregar. Sem `localStorage` disponível (aba privada, bloqueio), nada quebra e o convite não se repete na mesma sessão.
- **C-03** — O botão "Ver o perfil no Instagram" abre https://www.instagram.com/umaestrelinha.adri numa nova aba (`target="_blank"`, `rel` com `noopener`) e fecha o convite.
- **C-04** — O convite fecha pelo X, por "Agora não", pela tecla Esc e pelo toque no véu. X, "Agora não" e o botão primário têm alvo de toque ≥44px. O diálogo tem nome acessível (o título) e descrição (o texto), e o foco entra nele ao abrir.
- **C-05** — O convite mostra, literalmente: o rótulo "NO INSTAGRAM" com o fio ouro, o título "Acompanhe de perto o meu trabalho", o texto "Lá eu mostro cada joia sendo feita, do material que chega até a peça pronta. Se quiser acompanhar, vai ser um carinho ter você por lá.", o "@umaestrelinha.adri" e as duas ações.
- **C-06** — O convite não aparece fora da Home, nem na prévia da Home do painel (modo prévia / iframe).
- **C-07** — O convite não atrapalha o carregamento da Home nem briga com outros avisos: só abre depois de a Home resolver (fora do esqueleto), só quando o aviso de cookies não está pendente, e não entra no chunk inicial da Home.

### Design — o que a tela faz

O conteúdo e a ordem são os mesmos nas duas larguras.

1. **Véu** cobrindo a Home inteira, inclusive o header, em `ink` a 55% (`bg-estrelinha-ink/55`).
2. **Contêiner:**
   - **Celular (abaixo de `md`):** folha presa à borda de baixo, com a largura toda, raio 20 só no topo, padding 12/24/32, gap 24 e sombra soft voltada para cima.
   - **A partir de `md` (768):** cartão de 480px centralizado nos dois eixos, raio 20 em todos os cantos, padding 40 e `shadow-estrelinha-lift`.
3. **Puxador:** traço de 40×4 em `line`, raio pílula, centralizado no topo. Aparece só no celular, é decorativo e não arrasta.
4. **X:** fica no canto superior direito, com alvo de 44×44 e ícone de 20px em traço `ink`. Rótulo acessível em português.
5. **Texto:** o bloco reserva uma folga à direita para não colidir com o X.
   - Rótulo "NO INSTAGRAM": Outfit 12px medium, tracking 0.18em, `ink-soft`, precedido de um fio `accent` de 24×1.
   - Título: Libre Baskerville 700, tracking −0.02em, `ink`, em duas linhas ("…de perto / o meu trabalho"). Tem 28/34 no celular e 32/40 a partir de `md`.
   - Corpo: Outfit 17/27, `ink-soft`.
6. **Perfil:** "@umaestrelinha.adri" em Outfit 14 medium, `ink`. **A fileira de três fotos do desenho NÃO entra** (decisão 3).
7. **Ações:**
   - Botão primário com a largura toda, 52px de altura, raio 6, fundo `primary`, texto `on-primary` em Outfit 17 medium e o ícone `Instagram` do lucide em traço à esquerda: "Ver o perfil no Instagram".
   - Abaixo, "Agora não": texto `primary` 15 medium, centralizado, com área de 44px.

O desenho mostra só o estado aberto. Não há estado de carregamento nem de erro.

### Contrato

| Item | Dono | Entra | Sai |
| --- | --- | --- | --- |
| `apps/store/src/shared/config/instagram.ts` › handle e URL do perfil | VOCÊ CRIA | — | `INSTAGRAM_HANDLE` (`umaestrelinha.adri` ou com `@`, na forma que o rodapé já usa) e `INSTAGRAM_URL = 'https://www.instagram.com/umaestrelinha.adri'` |
| `apps/store/src/widgets/instagram-invite/` (barrel `index.ts`) | VOCÊ CRIA | — | o componente do convite, consumido só pela `HomePage` |
| `localStorage` › `estrelinha-instagram-invite` | VOCÊ CRIA | — | marca de "já visto", gravada ao abrir |
| `widgets/footer/ui/InstagramStrip.tsx` › `INSTAGRAM_HANDLE`, `INSTAGRAM_URL` | JÁ EXISTE. Mude: as constantes saem daqui para `shared/config/instagram.ts`; o rodapé importa de lá | — | — |
| `entities/cookie-consent/model/cookieConsentStore.ts` | JÁ EXISTE. Consuma; não altere. | — | o estado "o aviso ainda está pendente?" |
| `entities/home/model/useHomePreview.ts` › `useHomePreview` | JÁ EXISTE. Consuma; não altere. | — | `preview` |
| `@estrelinha/ui/sheet` › `Sheet`, `SheetPortal`, `SheetOverlay`, `SheetTitle`, `SheetDescription` | JÁ EXISTE. Consuma; não altere. | — | — |

### Decisões já tomadas

1. **Uma grafia de URL só:** `https://www.instagram.com/umaestrelinha.adri`, no rodapé e no convite. O rodapé muda junto.
2. **Origem do handle:** vem da constante, movida para `shared/config/instagram.ts`. Não lê `store_settings.general.instagram`.
3. **Fotos:** a fileira de três fotos não entra. O convite mostra o @ sem as fotos.
4. **Cookies:** o convite só abre quando o aviso de cookies não está pendente. Ele assina o store do consentimento, e assim que o aviso é respondido o convite abre, se a pessoa ainda estiver na Home.
5. **Momento:** o convite abre depois de a Home resolver (fora do `HomeSkeleton`) e de um atraso de cerca de 3 s. O valor fica numa constante nomeada do widget.
6. **Carga:** o widget é carregado com `lazy`, fora do chunk inicial da Home.
7. **Montagem:** na `HomePage`, no ramo `!preview`, como sobreposição. Não vira tipo de seção nem passa pelo `HomeRenderer`.
8. **Primitivo:** um só, o `Sheet`. A composição é `SheetPortal` + `SheetOverlay className="bg-estrelinha-ink/55"` + o conteúdo, com o X próprio, na forma de `CookiePreferencesSheet`. Fica preso ao rodapé no celular e centralizado a partir de `md`. `packages/ui` não muda, e `DialogContent` não é usado (ele impõe um X próprio).
9. **"Visto":** a marca é gravada **ao abrir**. Sem `localStorage`, o fallback em memória vale para a sessão.
10. **Puxador:** decorativo, sem arrastar.
11. **Fechar:** o X, "Agora não", o Esc e o véu fecham, e o botão do perfil também.

### Siga a forma de

| O que você vai escrever | Imite |
| --- | --- |
| A folha que vira cartão em `md`, com X próprio, puxador, título e descrição | `widgets/cookie-notice/ui/CookiePreferencesSheet.tsx:57-76` — o `Sheet side="bottom" hideClose` com `md:` |
| A composição do véu com classe própria | `packages/ui/src/sheet.tsx:104-115` — os exports `SheetPortal` e `SheetOverlay` (leia também `sheet.tsx:22`, o véu padrão) |
| O "já visto" persistido com `try/catch` | `entities/cookie-consent/model/cookieConsentStore.ts:19-49` — `ler`/`gravar`, e o comentário de `:12-14` |
| A carga preguiçosa do overlay | `widgets/store-layout/ui/StoreLayout.tsx:27-43` — `lazy` com o latch `useAbertoAlgumaVez` |
| O link externo com o ícone | `widgets/footer/ui/InstagramStrip.tsx:19-33` |
| Os testes do aviso: fechar, persistir e a chave | `widgets/cookie-notice/ui/__tests__/CookieNotice.test.tsx` |
| O storage que lança | `entities/cookie-consent/model/__tests__/cookieConsentStore.test.ts` (ou o teste vizinho do store) |
| Simular a prévia (iframe e `?preview=1`) | `pages/__tests__/homePreview.test.tsx:43-77` |

### Testes

Unidade (jsdom), num arquivo novo do widget e num arquivo novo de fiação. `homeComposition.test.tsx` **não** é editado.

- Com o storage vazio e o aviso de cookies respondido, o convite abre na Home depois de ela resolver e do atraso.
- Com a marca gravada, o convite não abre. A marca é gravada ao abrir, e ao remontar ele não reabre.
- O X, "Agora não", o Esc e o véu fecham o convite.
- O botão do perfil aponta para a URL com `www`, com `target="_blank"` e `rel` com `noopener`, e fecha o convite ao ser acionado.
- Com o `localStorage` lançando na leitura e na escrita, nada quebra e o convite não reabre na mesma sessão.
- O diálogo tem nome acessível igual ao título e descrição igual ao texto, e o foco está dentro dele ao abrir.
- O rótulo, o título, o texto e o @ saem literais, e não existe fileira de fotos.
- Não abre em modo prévia (iframe e `?preview=1`), não abre enquanto a Home está no esqueleto, e não abre com o aviso de cookies pendente. Quando o aviso é respondido, o convite abre.
- Fiação pela `HomePage` real: a página monta o convite. Não monte a árvore no teste.
- O rodapé e o convite leem a mesma constante: o rodapé passa a mostrar a URL com `www`, e `Footer.test.tsx:93` é ajustado para ela.
- `homeComposition.test.tsx` e `homePreview.test.tsx` seguem verdes **sem edição**.

### Obrigações

- **X posicionado:** use `h-11 w-11` direto, **sem** `TAP_44`, porque `alvoDeToqueNaoRoubaPosicao.test.ts` reprova `TAP_44`/`TAP_ROW` juntos com `absolute`. A outra saída é deixar o X em fluxo, como em `CookiePreferencesSheet.tsx:65-76`.
- **"Agora não":** é `<button>` com `TAP_ROW` (`shared/lib/touchTarget`). O botão primário usa `shared/ui/Button` (piso `min-h-11`), com altura de 52px.
- **Fio ouro:** é `bg-estrelinha-accent`, nunca `text-estrelinha-accent` (`accentText.test.ts`).
- **Ações:** em `rounded-sm`, nunca `rounded-pill` (`buttonShape.test.ts`).
- **Cores:** só tokens, sem `text-[…]` arbitrário (`arbitraryTextColor.test.ts`).
- **Toaster:** sem `useToast` e sem `<Toaster>` (`toasterUnico.test.ts`).
- **Marca anterior:** nenhuma ocorrência, nem em fixture (`brandScan.test.ts`).
- **Chave nova:** acrescente `estrelinha-instagram-invite` à lista "Chaves em uso hoje" em `CLAUDE.md › Convenções que valem em todo o repositório`. Acrescente também uma seção curta sobre o convite em `apps/store/CLAUDE.md` (onde mora, quando abre, a chave e por que não é seção).
- **FSD:** o convite não importa do widget do rodapé; os dois importam de `shared/config` (`AD-033`). Novo código importa do barrel do slice.
- **Copy:** sem exclamação e sem urgência, na primeira pessoa da Adri.

### Não faça

- Não altere `packages/ui` (`sheet.tsx`, `dialog.tsx`, `drawer.tsx`).
- Não edite `pages/__tests__/homeComposition.test.tsx`.
- Não crie tipo de seção, migration nem entrada em `home_sections`.
- Não leia `store_settings.general.instagram`, nem chame `useGeneralSettings` no convite.
- Não ponha a fileira de três fotos nem placeholder de foto.
- Não crie evento GA4 nem chame `track`.
- Não implemente o arrastar da folha.
- Não monte o convite no `StoreLayout`, no `App.tsx` nem em outra rota.
- Não altere o `CookieNotice`, o `WhatsAppFloat` nem o `MobileNav`.

### Pronto quando

- [ ] na Home, com storage vazio e o aviso de cookies respondido, o convite abre uma vez e não volta
- [ ] o botão do perfil abre `https://www.instagram.com/umaestrelinha.adri` em nova aba, e o rodapé usa a mesma constante
- [ ] o X, "Agora não", o Esc e o véu fecham, com alvos ≥44px e nome acessível
- [ ] o convite não abre em prévia, no esqueleto nem com o aviso de cookies pendente
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu
- [ ] testes dos arquivos que você alterou, passando — só deles
- [ ] a verificação mínima de fechar unidade de trabalho de cada repositório

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
Tarefa: T<nn>
Caso: fechou limpo | fechou com divergência | parou
Instruções lidas: <os caminhos, raiz e módulos — e as seções, no arquivo lido por seção>
Testes escritos: <um por comportamento do bloco `Testes`, com o arquivo; o que ficou sem
  cobertura, e por quê>
Verificações: <o que rodou, de onde veio o comando, e o resultado>
Árvore de trabalho: <o que você alterou; nada é commitado por você>
Citações conferidas: <quantas você abriu ao usá-las; a que deslocou, e a que estava morta>
Propagado: <a tarefa, e o que você corrigiu no arquivo dela>   (só se houve divergência)
Caducou: <tarefa já fechada · a afirmação dela que ficou falsa · o que a tornou falsa>
                                                               (só se houve; não se reescreve)
Bloqueio: <motivo · até onde você chegou>                      (só se parou)
```
