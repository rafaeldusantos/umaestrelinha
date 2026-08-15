// Feature 22 / T5 — o cadastro que determina o material afetivo da peça (MAT-02, MAT-03).
//
// A primeira redação da spec punha a escolha do material na página do produto, para a cliente. A
// medição do catálogo real derrubou isso: **zero** das 3.356 variações tem eixo de material, e o
// material está no NOME do produto — 169 dizem "leite", 127 "cinzas", 85 "cabelo", 51 "coto". Pedir
// que a cliente escolha seria pedir que ela repita o que já escolheu ao clicar no produto. Pior:
// existe peça que exige DOIS materiais, e ali "escolha o material" não é incompleto — é errado.
//
// Então o material é propriedade do PRODUTO, e é aqui que ele se decide.

import { Checkbox } from '@estrelinha/ui/checkbox'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import {
  DEFAULT_ENGRAVING_MAX_CHARS,
  MATERIAL_KINDS,
  MATERIAL_KIND_LABELS,
  type MaterialKind,
} from '@estrelinha/core/material'
import { FormCard, ToggleField } from '@/shared/ui'

interface Props {
  /** `null` = ninguém decidiu ainda. É o marcador que protege a curadoria da semente do importador. */
  requiresMaterial: boolean | null
  materialKinds: MaterialKind[]
  engravingMaxChars: number | null
  /** O produto oferece o eixo `Com gravação` em alguma variação? Vem de `hasEngravingAxis`. */
  offersEngraving: boolean
  onChange: (patch: {
    requires_material?: boolean | null
    material_kinds?: MaterialKind[]
    engraving_max_chars?: number | null
  }) => void
}

/**
 * **Dois controles, porque são dois dados.**
 *
 * "Exige material" e "quais materiais" não podem ser o mesmo campo. A leitura preguiçosa seria
 * "lista vazia ⇒ não exige", e ela apaga justamente a peça de material livre: a que exige, entra na
 * fila, e ainda não sabe qual — porque a escolha acontece no WhatsApp, fora da loja. Por isso o
 * switch ligado com a lista vazia é estado **válido**, e a tela diz o que ele significa em vez de
 * cobrar uma escolha.
 */
const MaterialCard = ({
  requiresMaterial,
  materialKinds,
  engravingMaxChars,
  offersEngraving,
  onChange,
}: Props) => {
  const exige = requiresMaterial === true

  const toggleKind = (kind: MaterialKind, marcado: boolean) => {
    // A ordem gravada é a de `MATERIAL_KINDS`, não a de clique: assim "cabelo e coto umbilical" sai
    // sempre igual, e o rótulo do pedido não muda entre dois saves.
    const proximos = marcado
      ? MATERIAL_KINDS.filter(k => k === kind || materialKinds.includes(k))
      : materialKinds.filter(k => k !== kind)
    onChange({ material_kinds: [...proximos] })
  }

  return (
    <FormCard
      title="Material afetivo"
      description="O que a cliente precisa enviar pelo correio para esta peça ser feita."
    >
      <ToggleField
        label="Esta peça exige material da cliente"
        checked={exige}
        onChange={valor =>
          // Desligar NÃO apaga a lista: quem desligou por engano reencontra o que tinha escolhido.
          // E `false` explícito é decisão registrada — deixa de ser `null`, então o importador para
          // de semear esta linha.
          onChange({ requires_material: valor })
        }
      />

      <fieldset disabled={!exige} className="space-y-3 disabled:opacity-50">
        <legend className="text-sm font-medium">Quais materiais</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" data-field="material_kinds">
          {MATERIAL_KINDS.map(kind => (
            <label
              key={kind}
              className="flex items-center gap-2 text-sm"
              /* 44px de altura na largura do próprio rótulo — texto em fluxo pede `TAP_ROW`, não um
                 quadrado centrado que deixaria as pontas do rótulo fora do alvo. */
              style={{ minHeight: 44 }}
            >
              <Checkbox
                checked={materialKinds.includes(kind)}
                disabled={!exige}
                onCheckedChange={valor => toggleKind(kind, valor === true)}
                aria-label={MATERIAL_KIND_LABELS[kind]}
              />
              <span>{MATERIAL_KIND_LABELS[kind]}</span>
            </label>
          ))}
        </div>

        {exige && materialKinds.length === 0 && (
          <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
            Nenhum material marcado. A loja vai dizer que <strong>o material será combinado com
            você</strong> — e o pedido entra na fila normalmente. Marque acima só se a peça já sabe o
            que espera.
          </p>
        )}
      </fieldset>

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
