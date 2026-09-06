# packages/ui — shadcn, preset e os tokens do painel

`@estrelinha/ui`. Componentes shadcn/ui, o preset Tailwind compartilhado e a folha de tokens. Leia
[`../../CLAUDE.md`](../../CLAUDE.md) antes deste arquivo.

**Consumido como source**, via alias do Vite/tsconfig — **sem build step**. Não há `dist/`, e mexer
aqui reflete nos dois apps no próximo reload.

## Como se importa

```ts
import { Button } from '@estrelinha/ui/button'      // um subpath por componente
import { cn } from '@estrelinha/ui/lib/utils'
import { useToast } from '@estrelinha/ui/hooks/use-toast'
import '@estrelinha/ui/styles.css'                  // no main.tsx, ANTES do App.css da loja
```

O `exports` do `package.json` tem um curinga `./*` que resolve `./src/*.tsx` — por isso
`@estrelinha/ui/button` funciona sem cada componente estar listado. `./icons` é subpath **declarado**,
porque aponta para um diretório com barrel e não para um arquivo.

## `@estrelinha/ui/icons` — a biblioteca de ícones (feature `39`)

**Ela morava em `apps/store/src/shared/ui/icons` e mudou de casa por uma razão de produto, não de
arrumação**: o seletor de ícone de `/admin/menu` tem de desenhar o **mesmo** glifo que a cliente vê na
barra, e `apps/backoffice` **não importa de `apps/store`** (`previaUnica.test.ts` derruba a suíte se
importar). Sem a mudança, a alternativa real não era reusar — era **copiar**, e a dona escolheria um
desenho na tela e a loja mostraria outro.

- **O barrel antigo NÃO ficou reexportando.** Dois caminhos para o mesmo ícone é o "defeito 01"; a
  loja tem **zero** ocorrências de `shared/ui/icons`, e `menuIconCatalog.test.ts` guarda isso.
- **A chave e o desenho são de donos diferentes, de propósito.** `MENU_ICON_KEYS` vive em
  `@estrelinha/core/menu` (é **dado** — vem de `categories.icon`, roda em Node e em Deno) e
  `MENU_ICON_COMPONENTS` vive aqui (é **React**). `Record<MenuIconKey, …>` prova a cobertura em
  compilação; `menuIconCatalog.test.ts` fecha o sentido inverso. **Não traga a chave para cá**:
  `core/menu/__tests__/purity.test.ts` reprova qualquer import de `@estrelinha/ui` lá dentro, porque
  isso quebraria a edge function do sitemap.
- **Uma grade e um traço**: `viewBox="0 0 24 24"`, traço **efetivo 1,5**. Desenho de outra grade entra
  num `<g transform="scale(…)">` com o traço compensado — **escala × traço = 1,5**, sempre.
- **`icons.test.ts` e `paths.test.ts` NÃO vieram junto, e isso é decisão declarada.** Este pacote não
  tem script `test` nem `vitest.config.ts`: um teste aqui dentro **nunca rodaria**, e guarda que não
  roda é pior que guarda nenhum, porque parece estar de pé. `icons.test.ts` ficou na suíte da loja
  (`shared/lib/__tests__`) varrendo `packages/ui/src/icons` — a mesma solução que `materialTransitions`
  e `vercelRedirects` já usam para ler migrations e o `vercel.json`. Ao acrescentar um ícone, rode
  `pnpm --filter @estrelinha/store test`.

## Os tokens daqui são os do PAINEL, não os da loja

`src/styles.css` + `tailwind.preset.ts` declaram **`--estrelinha-admin-*`** — o roxo/rosa/navy herdado
da loja anterior, com **valores inalterados**. O sufixo `admin` existe para deixar claro que aquele
namespace **não é a marca da Uma Estrelinha**. Re-skin do painel está fora de escopo (`C-05`): painel
interno não carrega marca.

**A loja usa `--estrelinha-*`**, declarados em `apps/store/src/app/App.css` +
`apps/store/tailwind.config.ts`.

### A separação depende da ORDEM de dois imports

Em `apps/store/src/main.tsx`, `App.css` vem **depois** de `@estrelinha/ui/styles.css`. **Inverter
devolve a loja inteira à paleta do painel sem quebrar nada** — nenhum build, tipo ou teste de
componente acusa. `importOrder.test.ts` guarda isso.

É também por esse motivo que a prévia de `/admin/home` é um **iframe** e não um componente montado
dentro do painel: renderizar widget da loja no documento do painel traria `--estrelinha-*` para o
documento de `--estrelinha-admin-*`. Outro documento, outra folha.

## Ao mexer aqui

- **Este pacote não passa por ESLint** (`BL-002`) — não tem script `lint`, e `pnpm lint` é
  `turbo run lint`.
- **`@tailwindcss/typography` está no preset mas a loja não usa `prose`**: o plugin traz a própria
  paleta (`--tw-prose-*`), que `contrast.test.ts` não mede. Seletor de filho explícito mantém toda cor
  em token auditável.
- **Componente novo do shadcn entra como arquivo em `src/`**, no molde dos vizinhos. Não há barrel
  central a atualizar — o curinga do `exports` resolve.
- **Mudar um valor de token do painel é mudar a cara do painel inteiro**, nos dois sentidos: não há
  segunda folha para compensar. A loja é que tem guarda de paleta (`palette.test.ts`, que compara
  `App.css` com `tailwind.config.ts`); aqui a folha é a única fonte.
- **Contraste continua valendo.** O painel não tem `contrast.test.ts` próprio, mas é uma ferramenta de
  trabalho diário: texto abaixo de 4,5:1 e contorno de controle abaixo de 3:1 são defeito aqui também,
  só que sem teste para pegar.
