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
`@estrelinha/ui/button` funciona sem cada componente estar listado.

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
