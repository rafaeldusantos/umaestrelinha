// O formulário do grupo de filtro — feature 66 (`FLT-02`..`FLT-04`, `FLT-10`).
//
// Nome e "Endereço no filtro". O endereço nasce do nome (`filterSlug`, de `core`) enquanto ninguém
// mexer nele, e a partir daí é da dona. Quem recusa é a régua de `core`, chamada pelo hook ANTES da
// rede; esta tela só mostra a frase que volta e **mantém o que foi digitado** — falha nunca apaga o
// rascunho, e nada aparece como salvo (`FLT-10`).

import { useState } from 'react'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { FILTER_NAME_MAX, filterSlug } from '@estrelinha/core/filters'
import { CharCounter, FieldGroup } from '@/shared/ui'

export interface GroupDraft {
  name: string
  slug: string
}

interface Props {
  /** O grupo em edição; ausente ⇒ grupo novo. */
  initial?: GroupDraft | null
  /** Grava. Devolve a frase da recusa/erro, ou `null` quando deu certo. */
  onSave: (draft: GroupDraft) => Promise<string | null>
  onCancel?: () => void
}

/**
 * Quem troca de grupo REMONTA o formulário (`key={grupo.id}` no chamador): o rascunho é estado
 * local, e um efeito que o recarregasse a cada render apagaria o que a dona digitou na primeira
 * releitura do catálogo.
 */
const GroupForm = ({ initial, onSave, onCancel }: Props) => {
  const novo = !initial
  const [nome, setNome] = useState(initial?.name ?? '')
  const [endereco, setEndereco] = useState(initial?.slug ?? '')
  // Grupo novo: o endereço acompanha o nome até a dona digitar nele. Grupo existente: nunca
  // acompanha — mudar o endereço quebra link, e isso não pode acontecer por efeito colateral de um
  // ajuste de grafia no nome.
  const [enderecoTocado, setEnderecoTocado] = useState(!novo)
  const [salvando, setSalvando] = useState(false)
  const [recusa, setRecusa] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)

  const mudouEndereco = !novo && endereco.trim() !== initial?.slug

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    setSalvo(false)
    const motivo = await onSave({ name: nome, slug: endereco })
    setSalvando(false)
    setRecusa(motivo)
    if (!motivo) setSalvo(true)
  }

  return (
    <form onSubmit={salvar} className="space-y-4" aria-label={novo ? 'Novo grupo' : 'Editar grupo'}>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <FieldGroup
          label="Nome do grupo"
          htmlFor="filtro-grupo-nome"
          hint="É o título do bloco no filtro da loja."
          counter={<CharCounter value={nome} limit={FILTER_NAME_MAX} />}
        >
          <Input
            id="filtro-grupo-nome"
            value={nome}
            onChange={e => {
              const valor = e.target.value
              setNome(valor)
              setSalvo(false)
              if (!enderecoTocado) setEndereco(filterSlug(valor))
            }}
            placeholder="Ex.: Acabamento"
          />
        </FieldGroup>
        <FieldGroup
          label="Endereço no filtro"
          htmlFor="filtro-grupo-endereco"
          hint={
            novo
              ? 'É como o filtro aparece no endereço da página. Nasce do nome.'
              : 'Mudar quebra links já compartilhados com este filtro.'
          }
        >
          <Input
            id="filtro-grupo-endereco"
            value={endereco}
            onChange={e => {
              setEndereco(e.target.value)
              setEnderecoTocado(true)
              setSalvo(false)
            }}
          />
        </FieldGroup>
      </div>

      {mudouEndereco && (
        <p className="text-xs font-medium text-foreground" data-testid="aviso-endereco">
          Links antigos com “{initial?.slug}” vão abrir a categoria sem este filtro.
        </p>
      )}

      {recusa && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {recusa}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" className="h-11" disabled={salvando}>
          {salvando ? 'Salvando…' : novo ? 'Criar grupo' : 'Salvar grupo'}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" className="h-11" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        {salvo && (
          <span role="status" className="text-xs font-medium text-muted-foreground">
            Salvo
          </span>
        )}
      </div>
    </form>
  )
}

export default GroupForm
