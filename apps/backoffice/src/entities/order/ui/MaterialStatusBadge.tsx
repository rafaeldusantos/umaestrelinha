import { MATERIAL_STATUS_LABELS, toMaterialStatus } from '@estrelinha/core/material'

/**
 * O selo do estado do material na listagem de pedidos (`MAT-10`).
 *
 * **`nao_aplicavel` não ganha selo.** A maioria dos pedidos não espera material, e um selo "Sem
 * material" em cada linha viraria ruído — o normal não se anuncia. Quem precisa aparecer é a fila.
 *
 * **As cores separam remédios diferentes**, na mesma régua de `Expirado` × `Esgotado` nos cupons:
 * `Aguardando material` é o que ACUMULA (ninguém pode fazer nada até chegar); `Material a caminho` é
 * espera com prazo; `Material recebido` e `Em produção` são trabalho da Adri, não fila.
 *
 * ⚠️ **Por dois meses este arquivo não cumpriu o parágrafo acima** (`PED-01`). `estrelinha-admin-amber`
 * e `estrelinha-admin-emerald` não existiam — nem em `styles.css`, nem no preset —, e o Tailwind não
 * emite classe para token inexistente: as duas PONTAS da régua, justamente o que acumula e o que já
 * está pronto, saíam sem fundo, sem borda e com a cor herdada. Build, `tsc` e teste de componente
 * passavam com o defeito de pé, porque `className` é string.
 *
 * A feature 34 criou os dois tokens **e** `adminTokens.test.ts`, que varre este diretório e reprova
 * toda classe `estrelinha-admin-*` sem token. Acrescentar os dois sem o guarda deixaria a próxima
 * classe inventada falhar do mesmo jeito silencioso.
 */
const TONE: Record<string, string> = {
  aguardando_material:
    'bg-estrelinha-admin-amber/10 text-estrelinha-admin-amber border-estrelinha-admin-amber/20',
  material_enviado:
    'bg-estrelinha-admin-violet/10 text-estrelinha-admin-violet border-estrelinha-admin-violet/20',
  material_recebido:
    'bg-estrelinha-admin-emerald/10 text-estrelinha-admin-emerald border-estrelinha-admin-emerald/20',
  em_producao: 'bg-muted text-muted-foreground border-border',
}

const MaterialStatusBadge = ({ status }: { status: string | null | undefined }) => {
  const value = toMaterialStatus(status)
  if (value === 'nao_aplicavel') return <span className="text-muted-foreground">—</span>

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
        TONE[value] ?? 'bg-muted text-muted-foreground border-border'
      }`}
    >
      {MATERIAL_STATUS_LABELS[value]}
    </span>
  )
}

export default MaterialStatusBadge
