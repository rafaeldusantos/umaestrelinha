// A seção Endereço da montagem (feature 89, `MON-02`, `MON-04`).
//
// - **Endereços salvos** da ficha aparecem primeiro, com o padrão já escolhido quando o rascunho
//   ainda não tem endereço (`MON-02`). A convidada não tem endereço salvo.
// - **O CEP completa o resto** pelo MESMO serviço da loja (`useCepLookup`, em `core/hooks`) e com a
//   mesma máscara (`maskCep`, `MON-04`). O preenchimento só acontece para o CEP DIGITADO: escolher um
//   endereço salvo não deixa a resposta do serviço sobrescrever a rua que a cliente cadastrou.
// - **"Salvar no cadastro da cliente"** fica no rascunho; quem grava em `addresses` é a página,
//   depois de a proposta existir (a ficha da cliente nova nasce no save).
// - **Endereço é opcional** (`MON-12`): a cliente pode preencher no link, e a seção diz isso.

import { useEffect, useId, useRef } from 'react'
import { Input } from '@estrelinha/ui/input'
import { cn } from '@estrelinha/ui/lib/utils'
import { maskCep, stripCep } from '@estrelinha/core/validators'
import { useCepLookup } from '@estrelinha/core/hooks/useCepLookup'
import { useCustomerAddresses, type EnderecoSalvo } from '@/entities/customer'
import { FieldGroup, FormCard } from '@/shared/ui'
import { SELO } from './estilos'
import type { DraftAddress, DraftCustomer } from '../model/draft'

export interface AddressSectionProps {
  address: DraftAddress
  customer: DraftCustomer
  onChange: (patch: Partial<DraftAddress>) => void
}

const paraRascunho = (e: EnderecoSalvo): Partial<DraftAddress> => ({
  savedId: e.id,
  zip: maskCep(e.cep ?? ''),
  street: e.street ?? '',
  number: e.number ?? '',
  complement: e.complement ?? '',
  neighborhood: e.neighborhood ?? '',
  city: e.city ?? '',
  state: e.state ?? '',
  saveToCustomer: false,
})

const linhaDoEndereco = (e: EnderecoSalvo): string =>
  [e.neighborhood, `${e.city}/${e.state}`, maskCep(e.cep ?? '')].filter(Boolean).join(' · ')

const VAZIO: Partial<DraftAddress> = {
  zip: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  saveToCustomer: true,
}

const AddressSection = ({ address, customer, onChange }: AddressSectionProps) => {
  const base = useId()
  const { enderecos, erro } = useCustomerAddresses(customer.mode === 'existente' ? customer.fichaId : null)
  const cepDigitado = useRef<string | null>(null)
  const cep = stripCep(address.zip)
  const { data: consulta } = useCepLookup(cep.length === 8 ? cep : null)

  // MON-02: com o rascunho sem endereço, o salvo PADRÃO (o primeiro da lista) entra sozinho.
  // Uma vez por ficha: apagar os campos depois não traz o padrão de volta.
  const vazio = address.zip === '' && address.street === '' && address.savedId === null
  const padrao = enderecos[0]
  const padraoAplicadoPara = useRef<string | null>(null)
  useEffect(() => {
    if (!padrao || padraoAplicadoPara.current === customer.fichaId) return
    padraoAplicadoPara.current = customer.fichaId
    if (vazio) onChange(paraRascunho(padrao))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [padrao?.id, customer.fichaId])

  // MON-04: o CEP digitado completa rua, bairro, cidade e UF.
  useEffect(() => {
    if (!consulta || consulta.manual) return
    if (cepDigitado.current !== cep) return
    cepDigitado.current = null
    onChange({
      street: consulta.street || address.street,
      neighborhood: consulta.neighborhood || address.neighborhood,
      city: consulta.city || address.city,
      state: consulta.state || address.state,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consulta, cep])

  const cepNaoAchado = cep.length === 8 && consulta?.manual === true
  const podeSalvar = customer.mode !== 'nenhuma' && address.savedId === null
  const salvoEscolhido = enderecos.some((e) => e.id === address.savedId)
  const mostrarCampos = enderecos.length === 0 || !salvoEscolhido
  // Cidade e UF vêm do CEP e ficam só leitura (o protótipo junta as duas num campo). Se o serviço
  // não achar o CEP, ou se a leitura deixar alguma em branco com o CEP completo, elas abrem para
  // digitar — senão a Adri ficaria sem como preencher.
  const cidadeLivre = cepNaoAchado || (cep.length === 8 && consulta !== undefined && (!address.city || !address.state))

  const campo = (chave: keyof DraftAddress, rotulo: string, extra: Partial<React.ComponentProps<typeof Input>> = {}) => (
    <FieldGroup label={rotulo} htmlFor={`${base}-${chave}`}>
      <Input
        id={`${base}-${chave}`}
        className="h-11"
        value={String(address[chave] ?? '')}
        onChange={(e) => onChange({ [chave]: e.target.value, savedId: null } as Partial<DraftAddress>)}
        {...extra}
      />
    </FieldGroup>
  )

  return (
    <FormCard
      title="Endereço de entrega"
      action={<span className="text-xs text-muted-foreground">Opcional — ela pode preencher no link</span>}
    >
      {erro !== null && (
        <p role="alert" className="text-sm text-destructive">
          Não consegui ler os endereços salvos. {erro}
        </p>
      )}

      {enderecos.length > 0 && (
        <div role="radiogroup" aria-label="Endereços salvos" className="space-y-2">
          {enderecos.map((e) => {
            const marcado = address.savedId === e.id
            return (
              <label
                key={e.id}
                className={cn(
                  'flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors motion-reduce:transition-none',
                  marcado ? 'border-primary/50 bg-primary/5' : 'border-border hover:bg-muted/40',
                )}
              >
                <input
                  type="radio"
                  name={`${base}-endereco`}
                  className="h-[18px] w-[18px] shrink-0 accent-primary"
                  checked={marcado}
                  onChange={() => onChange(paraRascunho(e))}
                />
                <span className="min-w-0 flex-1">
                  <span className="block break-words font-semibold text-foreground">
                    {`${e.street}, ${e.number}`}
                    {e.complement ? ` · ${e.complement}` : ''}
                  </span>
                  <span className="block break-words text-xs text-muted-foreground">{linhaDoEndereco(e)}</span>
                </span>
                {e.is_default && <span className={cn(SELO, 'shrink-0')}>Padrão</span>}
              </label>
            )
          })}
          <label
            className={cn(
              'flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors motion-reduce:transition-none',
              !salvoEscolhido ? 'border-primary/50 bg-primary/5' : 'border-border hover:bg-muted/40',
            )}
          >
            <input
              type="radio"
              name={`${base}-endereco`}
              className="h-[18px] w-[18px] shrink-0 accent-primary"
              checked={!salvoEscolhido}
              onChange={() => onChange({ ...VAZIO, savedId: null })}
            />
            <span className="font-semibold text-foreground">Outro endereço</span>
          </label>
        </div>
      )}

      {mostrarCampos && (
        <div className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,150px)_minmax(0,1fr)_minmax(0,10rem)]">
          <div className="col-span-2 lg:col-span-1">
            <FieldGroup label="CEP" htmlFor={`${base}-zip`} hint={cepNaoAchado ? 'Não achei este CEP. Preencha o endereço.' : undefined}>
              <Input
                id={`${base}-zip`}
                inputMode="numeric"
                className="h-11"
                value={address.zip}
                onChange={(e) => {
                  const mascarado = maskCep(e.target.value)
                  cepDigitado.current = stripCep(mascarado)
                  onChange({ zip: mascarado, savedId: null })
                }}
                placeholder="00000-000"
              />
            </FieldGroup>
          </div>
          <div className="col-span-2 lg:col-span-1">{campo('street', 'Rua')}</div>
          {campo('number', 'Número')}
          <div className="lg:col-span-1">{campo('complement', 'Complemento')}</div>
          <div className="col-span-2 lg:col-span-1">{campo('neighborhood', 'Bairro')}</div>
          {cidadeLivre ? (
            <>
              {campo('city', 'Cidade')}
              {campo('state', 'UF', { maxLength: 2 })}
            </>
          ) : (
            <div className="col-span-2 lg:col-span-1">
            <FieldGroup label="Cidade / UF" htmlFor={`${base}-cidade`}>
              <Input
                id={`${base}-cidade`}
                className="h-11 bg-muted/40"
                readOnly
                value={address.city ? `${address.city} / ${address.state}` : ''}
                placeholder="Vem do CEP"
              />
            </FieldGroup>
            </div>
          )}
          {podeSalvar && (
            <label className="col-span-full flex min-h-11 cursor-pointer items-center gap-3 text-sm text-foreground">
              <input
                type="checkbox"
                className="h-[18px] w-[18px] shrink-0 accent-primary"
                checked={address.saveToCustomer}
                onChange={(e) => onChange({ saveToCustomer: e.target.checked })}
              />
              Salvar no cadastro da cliente
            </label>
          )}
        </div>
      )}
    </FormCard>
  )
}

export default AddressSection
