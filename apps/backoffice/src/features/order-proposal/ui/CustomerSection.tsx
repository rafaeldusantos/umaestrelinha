// A seção Cliente da montagem (feature 89, `MON-02`, `MON-03`; desenho do protótipo
// `Pedido - Montar.html`, ajuste de 2026-11-01).
//
// Dois caminhos no segmentado "Já é cliente" | "Cliente nova":
//   - **buscar** quem já comprou ou se cadastrou (inclusive a convidada, que só existe em
//     `customer_list`), pela busca da listagem de Clientes (`useCustomerSearch` →
//     `buildCustomerSearchCondition`) e com o mesmo atraso de digitação;
//   - **cadastrar** uma cliente nova: os campos ficam NESTA seção até "Usar estes dados". Só então a
//     cliente entra no rascunho — antes disso "Criar link" diz "Escolha a cliente ou cadastre uma
//     nova", como no protótipo.
//
// Escolhida, a cliente vira um cartão: inicial, nome, contato, selos (tem conta, convidada, ficha
// nova, quantos pedidos) e "Trocar". Sem telefone, o aviso diz o que isso custa (o link não sai pelo
// WhatsApp daqui) e oferece informar o número — a Adri quase sempre o tem, a venda começou no
// WhatsApp.
//
// **`MON-03`: nunca duas fichas para o mesmo e-mail.** Ao digitar o e-mail da cliente nova, a seção
// confere o diretório (`useCustomerByEmail`) e, havendo ficha, oferece-a NO LUGAR de criar outra — e
// "Usar estes dados" fica indisponível. O servidor tem a mesma trava.

import { useEffect, useId, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@estrelinha/ui/input'
import { Button } from '@estrelinha/ui/button'
import { cn } from '@estrelinha/ui/lib/utils'
import { isValidEmail, maskCpf, maskPhone, normalizeEmail, stripPhone } from '@estrelinha/core/validators'
import { CUSTOMER_SEARCH_DEBOUNCE_MS } from '@estrelinha/core/customers'
import { useCustomerByEmail, useCustomerSearch, type ClienteEncontrada } from '@/entities/customer'
import { FieldGroup, FormCard } from '@/shared/ui'
import type { DraftCustomer } from '../model/draft'
import { clienteParaRascunho } from '../model/customer'
import {
  AVATAR,
  AVISO_AMBAR,
  LINK_ACAO,
  SEGMENTADO,
  SEGMENTO,
  SEGMENTO_DESLIGADO,
  SEGMENTO_LIGADO,
  SELO,
  SELO_VERDE,
  inicial,
} from './estilos'

export interface CustomerSectionProps {
  customer: DraftCustomer
  onChange: (patch: Partial<DraftCustomer>) => void
}

export const NO_PHONE_WARNING = 'Sem telefone: o link vai poder ser copiado, mas não enviado pelo WhatsApp daqui.'
export const NEW_CUSTOMER_BADGE = 'Ficha nova — a conta nasce quando ela concluir'

const VAZIA: Partial<DraftCustomer> = { mode: 'nenhuma', fichaId: null, name: '', email: '', phone: '', document: '', perfil: null }

/** O termo com o atraso de digitação: a busca não sai a cada tecla. */
const useTermoComAtraso = (termo: string): string => {
  const [atrasado, setAtrasado] = useState(termo)
  useEffect(() => {
    const t = setTimeout(() => setAtrasado(termo), CUSTOMER_SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [termo])
  return atrasado
}

const contato = (email: string, phone: string | null) => [email, phone ? maskPhone(phone) : null].filter(Boolean).join(' · ')

const BuscaDeCliente = ({ onEscolher, onNova }: { onEscolher: (c: ClienteEncontrada) => void; onNova: (nome: string) => void }) => {
  const id = useId()
  const [termo, setTermo] = useState('')
  const atrasado = useTermoComAtraso(termo)
  const { clientes, buscando, erro } = useCustomerSearch(atrasado)
  const temTermo = atrasado.trim() !== ''

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        Buscar por nome, e-mail ou telefone
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          id={id}
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Ex.: Juliana, juliana@…, 51 9981"
          className="h-11 pl-9"
          autoComplete="off"
        />
      </div>

      {erro !== null ? (
        <p role="alert" data-testid="busca-cliente-erro" className="text-sm text-destructive">
          Não consegui buscar as clientes agora. {erro}
        </p>
      ) : temTermo && !buscando && clientes.length === 0 ? (
        <div data-testid="busca-cliente-vazia" className="flex flex-wrap items-center gap-x-2 rounded-xl border border-border p-3 text-sm">
          <span className="text-muted-foreground">Nenhuma cliente com “{atrasado.trim()}”.</span>
          <button type="button" onClick={() => onNova(atrasado.trim())} className={LINK_ACAO}>
            Cadastrar como cliente nova
          </button>
        </div>
      ) : (
        clientes.length > 0 && (
          <ul aria-label="Clientes encontradas" className="max-h-72 space-y-0.5 overflow-y-auto rounded-xl border border-border p-1.5">
            {clientes.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onEscolher(c)}
                  className="flex min-h-[52px] w-full items-center gap-2.5 rounded-lg p-2 text-left text-sm transition-colors motion-reduce:transition-none hover:bg-muted/60"
                >
                  <span aria-hidden className={cn(AVATAR, 'h-[34px] w-[34px] text-sm')}>
                    {inicial(c.name, c.email)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words font-semibold text-foreground">{c.name || c.email}</span>
                    <span className="block break-all text-xs text-muted-foreground">{contato(c.email, c.phone)}</span>
                  </span>
                  <span className={cn(SELO, 'shrink-0')}>{c.fichaId === null ? 'Convidada' : c.temConta ? 'Com conta' : 'Cadastrada'}</span>
                </button>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  )
}

interface DadosNovos {
  name: string
  email: string
  phone: string
  document: string
}

const CadastroNovo = ({
  dados,
  setDados,
  onUsar,
  onUsarFicha,
}: {
  dados: DadosNovos
  setDados: (d: DadosNovos) => void
  onUsar: () => void
  onUsarFicha: (c: ClienteEncontrada) => void
}) => {
  const base = useId()
  const { existente } = useCustomerByEmail(dados.email)
  const pronto = dados.name.trim() !== '' && isValidEmail(normalizeEmail(dados.email.trim())) && !existente
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FieldGroup label="Nome completo" htmlFor={`${base}-nome`}>
          <Input id={`${base}-nome`} className="h-11" value={dados.name} onChange={(e) => setDados({ ...dados, name: e.target.value })} autoComplete="off" />
        </FieldGroup>
      </div>
      <FieldGroup label="E-mail" htmlFor={`${base}-email`}>
        <Input id={`${base}-email`} type="email" className="h-11" value={dados.email} onChange={(e) => setDados({ ...dados, email: e.target.value })} autoComplete="off" />
      </FieldGroup>
      <FieldGroup label="WhatsApp" htmlFor={`${base}-telefone`}>
        <Input
          id={`${base}-telefone`}
          inputMode="tel"
          className="h-11"
          placeholder="(51) 99999-9999"
          value={dados.phone}
          onChange={(e) => setDados({ ...dados, phone: maskPhone(e.target.value) })}
        />
      </FieldGroup>
      <FieldGroup label="CPF (opcional)" htmlFor={`${base}-cpf`}>
        <Input
          id={`${base}-cpf`}
          inputMode="numeric"
          className="h-11"
          value={dados.document}
          onChange={(e) => setDados({ ...dados, document: maskCpf(e.target.value) })}
        />
      </FieldGroup>
      <p className="self-end text-xs text-muted-foreground sm:col-span-2">A cliente confirma o CPF no link, antes de pagar.</p>
      {existente && (
        <div
          role="status"
          data-testid="ficha-existente"
          className={cn(AVISO_AMBAR, 'flex flex-wrap items-center justify-between gap-2 sm:col-span-2')}
        >
          <span>
            <b>{existente.name || existente.email}</b> já está cadastrada com este e-mail.
          </span>
          <Button type="button" variant="outline" className="h-11 bg-card" onClick={() => onUsarFicha(existente)}>
            Usar a ficha dela
          </Button>
        </div>
      )}
      <div className="flex justify-end sm:col-span-2">
        <Button type="button" className="h-11" disabled={!pronto} onClick={onUsar}>
          Usar estes dados
        </Button>
      </div>
    </div>
  )
}

const CartaoDaCliente = ({ customer, onChange }: CustomerSectionProps) => {
  const id = useId()
  const [informando, setInformando] = useState(false)
  const nova = customer.mode === 'nova'
  const perfil = customer.perfil ?? null
  const semTelefone = stripPhone(customer.phone) === ''
  return (
    <div data-testid="cliente-escolhida" className="space-y-3">
      <div className="flex items-start gap-3">
        <span aria-hidden className={cn(AVATAR, 'h-11 w-11 text-lg')}>
          {inicial(customer.name, customer.email)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="break-words text-[15px] font-semibold text-foreground">{customer.name || customer.email}</p>
          <p className="break-all text-sm text-muted-foreground">{contato(customer.email, customer.phone || null)}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {nova ? (
              <span className={SELO_VERDE}>{NEW_CUSTOMER_BADGE}</span>
            ) : (
              <>
                {customer.fichaId === null ? (
                  <span className={SELO}>Comprou como convidada</span>
                ) : perfil?.temConta ? (
                  <span className={SELO}>Tem conta na loja</span>
                ) : perfil ? (
                  <span className={SELO}>Cadastrada, sem conta</span>
                ) : null}
                {perfil && (
                  <span className={SELO}>
                    {perfil.pedidos} {perfil.pedidos === 1 ? 'pedido' : 'pedidos'}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {semTelefone && !informando && (
        <div data-testid="sem-telefone" className={cn(AVISO_AMBAR, 'flex flex-wrap items-center justify-between gap-x-2')}>
          <span>{NO_PHONE_WARNING}</span>
          <button type="button" className={LINK_ACAO} onClick={() => setInformando(true)}>
            Informar o telefone
          </button>
        </div>
      )}
      {informando && (
        <FieldGroup label="WhatsApp" htmlFor={`${id}-telefone`}>
          <Input
            id={`${id}-telefone`}
            inputMode="tel"
            className="h-11"
            placeholder="(51) 99999-9999"
            autoFocus
            value={customer.phone}
            onChange={(e) => onChange({ phone: maskPhone(e.target.value) })}
          />
        </FieldGroup>
      )}
    </div>
  )
}

const DADOS_VAZIOS: DadosNovos = { name: '', email: '', phone: '', document: '' }

const CustomerSection = ({ customer, onChange }: CustomerSectionProps) => {
  const [nova, setNova] = useState(false)
  const [dados, setDados] = useState<DadosNovos>(DADOS_VAZIOS)
  const escolhida = customer.mode !== 'nenhuma'

  const escolher = (c: ClienteEncontrada) => {
    onChange(clienteParaRascunho(c))
    setNova(false)
  }
  const trocar = () => {
    onChange(VAZIA)
    setNova(false)
    setDados(DADOS_VAZIOS)
  }
  const usarDados = () =>
    onChange({
      mode: 'nova',
      fichaId: null,
      name: dados.name.trim(),
      email: dados.email.trim(),
      phone: dados.phone,
      document: dados.document,
      perfil: null,
    })

  return (
    <FormCard
      title="Cliente"
      action={
        escolhida ? (
          <button type="button" onClick={trocar} className={LINK_ACAO} aria-label="Trocar a cliente">
            Trocar
          </button>
        ) : undefined
      }
    >
      {escolhida ? (
        <CartaoDaCliente customer={customer} onChange={onChange} />
      ) : (
        <>
          <div role="group" aria-label="Tipo de cliente" className={SEGMENTADO}>
            <button
              type="button"
              aria-pressed={!nova}
              onClick={() => setNova(false)}
              className={cn(SEGMENTO, !nova ? SEGMENTO_LIGADO : SEGMENTO_DESLIGADO)}
            >
              Já é cliente
            </button>
            <button
              type="button"
              aria-pressed={nova}
              onClick={() => setNova(true)}
              className={cn(SEGMENTO, nova ? SEGMENTO_LIGADO : SEGMENTO_DESLIGADO)}
            >
              Cliente nova
            </button>
          </div>
          {nova ? (
            <CadastroNovo dados={dados} setDados={setDados} onUsar={usarDados} onUsarFicha={escolher} />
          ) : (
            <BuscaDeCliente
              onEscolher={escolher}
              onNova={(nome) => {
                setDados({ ...DADOS_VAZIOS, name: nome })
                setNova(true)
              }}
            />
          )}
        </>
      )}
    </FormCard>
  )
}

export default CustomerSection
