// A seção Cliente da montagem (feature 89, `MON-02`, `MON-03`).
//
// Dois caminhos, com o mesmo peso na tela: **buscar** quem já comprou ou se cadastrou (inclusive a
// convidada, que só existe em `customer_list`) e **cadastrar** uma cliente nova. A busca é a da
// listagem de Clientes (`useCustomerSearch` → `buildCustomerSearchCondition`), com o mesmo atraso de
// digitação (`CUSTOMER_SEARCH_DEBOUNCE_MS`).
//
// **`MON-03`: nunca duas fichas para o mesmo e-mail.** Ao digitar o e-mail da cliente nova, a seção
// confere o diretório (`useCustomerByEmail`, comparação exata sem caixa) e, havendo ficha, oferece-a
// NO LUGAR de criar outra. O servidor tem a mesma trava (a RPC não cria segunda ficha), mas é aqui que
// a Adri descobre que a "cliente nova" já comprou — e passa a ver os endereços dela.

import { useEffect, useId, useState } from 'react'
import { Search, UserPlus, Users } from 'lucide-react'
import { Input } from '@estrelinha/ui/input'
import { cn } from '@estrelinha/ui/lib/utils'
import { maskCpf, maskPhone } from '@estrelinha/core/validators'
import { CUSTOMER_SEARCH_DEBOUNCE_MS } from '@estrelinha/core/customers'
import { useCustomerByEmail, useCustomerSearch, type ClienteEncontrada } from '@/entities/customer'
import { FieldGroup, FormCard, InfoBanner } from '@/shared/ui'
import type { DraftCustomer } from '../model/draft'
import { clienteParaRascunho } from '../model/customer'

export interface CustomerSectionProps {
  customer: DraftCustomer
  onChange: (patch: Partial<DraftCustomer>) => void
}

// `min-w-0` + `[overflow-wrap:anywhere]` e o `flex-wrap` do grupo: com a fonte do sistema a 200 % os
// dois não cabiam lado a lado em 390 e o segundo saía da tela (prova em navegador da T27).
const BOTAO_SEGMENTO =
  'inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-center text-sm font-medium [overflow-wrap:anywhere] transition-colors motion-reduce:transition-none'

/** O termo com o atraso de digitação: a busca não sai a cada tecla. */
const useTermoComAtraso = (termo: string): string => {
  const [atrasado, setAtrasado] = useState(termo)
  useEffect(() => {
    const t = setTimeout(() => setAtrasado(termo), CUSTOMER_SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [termo])
  return atrasado
}

const BuscaDeCliente = ({ onEscolher, onNova }: { onEscolher: (c: ClienteEncontrada) => void; onNova: () => void }) => {
  const id = useId()
  const [termo, setTermo] = useState('')
  const atrasado = useTermoComAtraso(termo)
  const { clientes, buscando, erro } = useCustomerSearch(atrasado)
  const temTermo = atrasado.trim() !== ''

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        Buscar cliente
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          id={id}
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="nome, e-mail, telefone ou CPF"
          className="h-11 pl-9"
          autoComplete="off"
        />
      </div>

      {erro !== null ? (
        <p role="alert" data-testid="busca-cliente-erro" className="text-sm text-destructive">
          Não consegui buscar as clientes agora. {erro}
        </p>
      ) : temTermo && !buscando && clientes.length === 0 ? (
        <div data-testid="busca-cliente-vazia" className="space-y-2 rounded-lg bg-muted/40 p-3 text-sm">
          <p className="text-muted-foreground">Nenhuma cliente com “{atrasado.trim()}”.</p>
          <button
            type="button"
            onClick={onNova}
            className="min-h-11 rounded-lg border border-input px-3 py-2 font-medium text-foreground transition-colors motion-reduce:transition-none hover:bg-muted"
          >
            Cadastrar como cliente nova
          </button>
        </div>
      ) : (
        clientes.length > 0 && (
          <ul aria-label="Clientes encontradas" className="space-y-1">
            {clientes.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onEscolher(c)}
                  className="flex min-h-11 w-full flex-col items-start rounded-lg border border-input px-3 py-2 text-left text-sm transition-colors motion-reduce:transition-none hover:bg-muted/50"
                >
                  <span className="break-words font-medium text-foreground">{c.name || c.email}</span>
                  <span className="break-all text-xs text-muted-foreground">{c.email}</span>
                  {c.fichaId === null && (
                    <span className="text-xs text-muted-foreground">Comprou sem cadastro</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  )
}

const CamposDeContato = ({ customer, onChange, novo }: CustomerSectionProps & { novo: boolean }) => {
  const base = useId()
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {novo && (
        <>
          <FieldGroup label="Nome" htmlFor={`${base}-nome`}>
            <Input id={`${base}-nome`} className="h-11" value={customer.name} onChange={(e) => onChange({ name: e.target.value })} autoComplete="off" />
          </FieldGroup>
          <FieldGroup label="E-mail" htmlFor={`${base}-email`}>
            <Input id={`${base}-email`} type="email" className="h-11" value={customer.email} onChange={(e) => onChange({ email: e.target.value })} autoComplete="off" />
          </FieldGroup>
        </>
      )}
      <FieldGroup label="Telefone" htmlFor={`${base}-telefone`}>
        <Input
          id={`${base}-telefone`}
          inputMode="tel"
          className="h-11"
          value={customer.phone}
          onChange={(e) => onChange({ phone: maskPhone(e.target.value) })}
          placeholder="(51) 99999-0000"
        />
      </FieldGroup>
      <FieldGroup label="CPF (opcional)" htmlFor={`${base}-cpf`}>
        <Input
          id={`${base}-cpf`}
          inputMode="numeric"
          className="h-11"
          value={customer.document}
          onChange={(e) => onChange({ document: maskCpf(e.target.value) })}
        />
      </FieldGroup>
    </div>
  )
}

/** `MON-03` — o e-mail da "cliente nova" já tem ficha: oferecer a ficha no lugar de criar outra. */
const FichaExistente = ({ email, onUsar }: { email: string; onUsar: (c: ClienteEncontrada) => void }) => {
  const { existente } = useCustomerByEmail(email)
  if (!existente) return null
  return (
    <InfoBanner
      role="status"
      data-testid="ficha-existente"
      action={
        <button
          type="button"
          onClick={() => onUsar(existente)}
          className="min-h-11 shrink-0 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors motion-reduce:transition-none hover:bg-muted"
        >
          Usar este cadastro
        </button>
      }
    >
      Este e-mail já tem cadastro: {existente.name || existente.email}. Use o cadastro dela em vez de criar outro.
    </InfoBanner>
  )
}

const CustomerSection = ({ customer, onChange }: CustomerSectionProps) => {
  const [buscando, setBuscando] = useState(customer.mode !== 'nova')
  const escolhida = customer.mode === 'existente'

  const escolher = (c: ClienteEncontrada) => {
    onChange(clienteParaRascunho(c))
    setBuscando(true)
  }
  const irParaNova = () => {
    setBuscando(false)
    onChange({ mode: 'nova', fichaId: null })
  }
  const irParaBusca = () => {
    setBuscando(true)
    if (customer.mode === 'nova') onChange({ mode: 'nenhuma', fichaId: null, name: '', email: '', phone: '', document: '' })
  }

  return (
    <FormCard title="Cliente">
      <div role="group" aria-label="Como escolher a cliente" className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={buscando}
          onClick={irParaBusca}
          className={cn(BOTAO_SEGMENTO, buscando ? 'border-primary bg-primary/10 text-foreground' : 'border-input text-muted-foreground hover:bg-muted/50')}
        >
          <Users className="h-4 w-4" aria-hidden />
          Cliente cadastrada
        </button>
        <button
          type="button"
          aria-pressed={!buscando}
          onClick={irParaNova}
          className={cn(BOTAO_SEGMENTO, !buscando ? 'border-primary bg-primary/10 text-foreground' : 'border-input text-muted-foreground hover:bg-muted/50')}
        >
          <UserPlus className="h-4 w-4" aria-hidden />
          Cliente nova
        </button>
      </div>

      {buscando && escolhida && (
        <div data-testid="cliente-escolhida" className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-input bg-muted/30 p-3">
          <div className="min-w-0">
            <p className="break-words text-sm font-semibold text-foreground">{customer.name || customer.email}</p>
            <p className="break-all text-xs text-muted-foreground">{customer.email}</p>
          </div>
          <button
            type="button"
            onClick={() => onChange({ mode: 'nenhuma', fichaId: null, name: '', email: '', phone: '', document: '' })}
            className="min-h-11 rounded-lg px-3 text-sm font-medium text-foreground transition-colors motion-reduce:transition-none hover:bg-muted"
          >
            Trocar cliente
          </button>
        </div>
      )}

      {buscando && !escolhida && <BuscaDeCliente onEscolher={escolher} onNova={irParaNova} />}

      {buscando && escolhida && <CamposDeContato customer={customer} onChange={onChange} novo={false} />}

      {!buscando && (
        <>
          <CamposDeContato customer={customer} onChange={onChange} novo />
          <FichaExistente email={customer.email} onUsar={escolher} />
        </>
      )}
    </FormCard>
  )
}

export default CustomerSection
