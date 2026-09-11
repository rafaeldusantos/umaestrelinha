// Feature 22 / T5 — o cadastro que determina o material afetivo da peça (MAT-02, MAT-03).
//
// A primeira redação da spec punha a escolha do material na página do produto, para a cliente. A
// medição do catálogo real derrubou isso: **zero** das 3.356 variações tem eixo de material, e o
// material está no NOME do produto — 169 dizem "leite", 127 "cinzas", 85 "cabelo", 51 "coto". Pedir
// que a cliente escolha seria pedir que ela repita o que já escolheu ao clicar no produto. Pior:
// existe peça que exige DOIS materiais, e ali "escolha o material" não é incompleto — é errado.
//
// Então o material é propriedade do PRODUTO, e é aqui que ele se decide.
//
// **A lista "Quais materiais" saiu deste card**, e com ela o segundo dado. O motivo é o `BL-015`:
// `material_kinds` diz menos que a descrição — há peça com `{cinzas}` gravado cuja descrição enumera
// cinco materiais, peça com `requires_material = false` que manda enviar coto e cabelo, e material
// na descrição (`sangue`) que nem existe no enum. A coluna continua no banco e continua sendo lida
// (o checkout a congela no `order_items`, a confirmação e a fila do painel a mostram), mas não é
// mais editada aqui, e a página do produto deixou de anunciá-la.

import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { DEFAULT_ENGRAVING_MAX_CHARS } from '@estrelinha/core/material'
import { FormCard, ToggleField } from '@/shared/ui'

interface Props {
  /** `null` = ninguém decidiu ainda. É o marcador que protege a curadoria da semente do importador. */
  requiresMaterial: boolean | null
  engravingMaxChars: number | null
  /** O produto oferece o eixo `Com gravação` em alguma variação? Vem de `hasEngravingAxis`. */
  offersEngraving: boolean
  onChange: (patch: {
    requires_material?: boolean | null
    engraving_max_chars?: number | null
  }) => void
}

/**
 * **Um interruptor, e ele decide operação — não texto de vitrine.**
 *
 * Ligado, o pedido pago nasce com `material_status` preenchido: a cliente vê na confirmação o pedido
 * para enviar e registrar o rastreio, o pedido entra na fila de material do painel, aparece no filtro
 * de `/admin/clientes`, ganha o botão de cobrança por WhatsApp e sai impresso na folha de separação.
 * Nada disso depende de saber QUAL material — e é por isso que a lista pôde sair sem levar a fila
 * junto.
 */
const MaterialCard = ({
  requiresMaterial,
  engravingMaxChars,
  offersEngraving,
  onChange,
}: Props) => {
  const exige = requiresMaterial === true

  return (
    <FormCard
      title="Material afetivo"
      description="Se esta peça só pode ser feita com material que a cliente envia pelo correio."
    >
      <ToggleField
        label="Esta peça exige material da cliente"
        checked={exige}
        onChange={valor =>
          // `false` explícito é decisão registrada — deixa de ser `null`, então o importador para de
          // semear esta linha.
          onChange({ requires_material: valor })
        }
      />

      <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
        Ligado, o pedido entra na <strong>fila de material</strong>: a cliente recebe na confirmação o
        pedido para enviar e registrar o rastreio, e o pedido aparece na fila do painel, no filtro de
        clientes, na cobrança por WhatsApp e na folha de separação.{' '}
        <strong>Qual</strong> material a cliente envia é combinado com ela — a loja não anuncia isso
        na página do produto.
      </p>

      {/*
        O limite de gravação só aparece para quem OFERECE gravação. São 35 produtos de 689: mostrar o
        campo nos outros 654 é ruído num formulário que já tem ~30 campos.

        E não existe liga/desliga de gravação aqui, de propósito: o eixo `Com gravação` já é variação
        (626 linhas, o terceiro maior do catálogo) e 33 dos 35 produtos COBRAM a mais por ele. Um
        segundo controle para o mesmo dado seria o "defeito 01" — e o que precifica é a variação.
      */}
      {offersEngraving && (
        <div className="space-y-1.5 border-t pt-4">
          <Label htmlFor="engraving-max">Limite de caracteres da gravação</Label>
          <Input
            id="engraving-max"
            data-field="engraving_max_chars"
            type="number"
            min={1}
            max={200}
            value={engravingMaxChars ?? ''}
            placeholder={String(DEFAULT_ENGRAVING_MAX_CHARS)}
            onChange={e => {
              const cru = e.target.value.trim()
              // Vazio grava `null`, e `null` cai no default de 20 — nunca `0`, que o banco recusa e
              // que se leria como "sem gravação".
              onChange({ engraving_max_chars: cru === '' ? null : Number(cru) })
            }}
            className="max-w-[160px]"
          />
          <p className="text-xs text-muted-foreground">
            Quanto cabe nesta peça. Um pingente não comporta o mesmo que uma pulseira. Vazio usa{' '}
            {DEFAULT_ENGRAVING_MAX_CHARS} caracteres.
          </p>
        </div>
      )}
    </FormCard>
  )
}

export default MaterialCard
