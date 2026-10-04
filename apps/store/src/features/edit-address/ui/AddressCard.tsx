// "Endereço de entrega" — o cartão de "Meus dados" (feature 59, `DAD-07..09`).
//
// A conta edita UM endereço: o padrão (`is_default = true`), que é o que o caixa lê para abrir
// preenchido (`useDefaultAddress`). Pedido já feito não muda — o endereço dele é snapshot nas
// colunas do próprio pedido. "No máximo um padrão por cliente" é do banco (índice único parcial
// `addresses_one_default`, migration da `59`); quem grava é `useSaveAddress`, que atualiza o padrão
// existente em vez de criar outro.
//
// SPEC_DEVIATION: DAD-07 pede "o formulário de endereço do checkout"; este é um formulário próprio
// com os mesmos campos, máscara e consulta de CEP.
// Reason: o do checkout é acoplado ao checkoutStore (rascunho do caixa).
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { maskCep, stripCep } from '@estrelinha/core/validators'
import {
  DEFAULT_ADDRESS_KEY,
  useCepLookup,
  useDefaultAddress,
  useSaveAddress,
  type AddressFields,
} from '@/entities/address'
import { addressLines } from '@/entities/order'
import { ENDERECO_NAO_SALVO, addressRefusal, type AddressRefusal } from '../model/addressRefusal'

export interface AddressCardProps {
  /** `customers.id` da cliente logada. */
  customerId: string | null | undefined
}

const VAZIO: AddressFields = {
  cep: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
}

const ERRO = 'text-[13px] text-estrelinha-alert'
const CAMPO = 'h-12 border-estrelinha-field text-[15px]'
const BOTAO_TEXTO =
  'flex min-h-11 items-center text-sm font-semibold text-estrelinha-primary underline underline-offset-4'
const BOTAO_CHEIO =
  'flex h-12 items-center justify-center rounded-sm bg-estrelinha-primary px-6 text-[15px] font-semibold text-white transition-opacity hover:opacity-95 disabled:opacity-60 motion-reduce:transition-none'
const BOTAO_CONTORNO =
  'flex h-12 items-center justify-center rounded-sm border border-estrelinha-field px-6 text-[15px] font-semibold text-estrelinha-ink transition-colors hover:bg-estrelinha-ground-deep motion-reduce:transition-none'

const Campo = ({
  id,
  rotulo,
  erro,
  children,
}: {
  id: string
  rotulo: string
  erro?: string | null
  children: ReactNode
}) => (
  <div className="flex min-w-0 flex-col gap-[7px]">
    <Label htmlFor={id} className="text-[13px] font-semibold text-estrelinha-ink">
      {rotulo}
    </Label>
    {children}
    {erro && (
      <p id={`${id}-erro`} className={ERRO}>
        {erro}
      </p>
    )}
  </div>
)

/** As props de acessibilidade de um campo com veredito. */
const invalido = (id: string, erro: string | null | undefined) => ({
  'aria-invalid': erro ? true : undefined,
  'aria-describedby': erro ? `${id}-erro` : undefined,
})

const AddressCard = ({ customerId }: AddressCardProps) => {
  const queryClient = useQueryClient()
  const { data: endereco, isLoading } = useDefaultAddress(customerId ?? undefined)
  const salvar = useSaveAddress()

  const [editando, setEditando] = useState(false)
  const [campos, setCampos] = useState<AddressFields>(VAZIO)
  const [erros, setErros] = useState<AddressRefusal | null>(null)
  const [falha, setFalha] = useState<string | null>(null)
  /**
   * O CEP a consultar — só o que a cliente DIGITOU. Abrir o formulário com o endereço salvo não
   * consulta nada: a resposta do ViaCEP sobrescreveria a rua que ela já tinha escrito do jeito dela.
   */
  const [cepDigitado, setCepDigitado] = useState<string | null>(null)
  const consulta = useCepLookup(cepDigitado)

  // CEP resolvido preenche rua, bairro, cidade e UF; os campos continuam editáveis.
  useEffect(() => {
    const r = consulta.data
    if (!r || r.manual) return
    setCampos((c) => ({ ...c, street: r.street, neighborhood: r.neighborhood, city: r.city, state: r.state }))
  }, [consulta.data])

  const muda = (campo: keyof AddressFields, valor: string) => setCampos((c) => ({ ...c, [campo]: valor }))

  const abrir = () => {
    setCampos(endereco ? { ...endereco, cep: maskCep(endereco.cep) } : VAZIO)
    setCepDigitado(null)
    setErros(null)
    setFalha(null)
    setEditando(true)
  }

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    const recusa = addressRefusal(campos)
    setErros(recusa)
    setFalha(null)
    if (recusa || !customerId) return

    const address: AddressFields = {
      cep: stripCep(campos.cep),
      street: campos.street.trim(),
      number: campos.number.trim(),
      complement: campos.complement.trim(),
      neighborhood: campos.neighborhood.trim(),
      city: campos.city.trim(),
      // A UF já chega maiúscula: quem a escreve assim é o próprio campo, ao digitar.
      state: campos.state.trim(),
    }

    let salvo = false
    try {
      salvo = (await salvar.mutateAsync({ customerId, address })).saved
    } catch {
      salvo = false
    }
    // `DAD-09`: falhou, o formulário fica aberto com o que foi digitado.
    if (!salvo) {
      setFalha(ENDERECO_NAO_SALVO)
      return
    }
    // O cache é o mesmo que o caixa lê: a próxima compra já abre com este endereço (`DAD-08`).
    queryClient.setQueryData([DEFAULT_ADDRESS_KEY, customerId], address)
    void queryClient.invalidateQueries({ queryKey: [DEFAULT_ADDRESS_KEY] })
    setEditando(false)
  }

  const naoAchouCep = cepDigitado !== null && stripCep(campos.cep).length === 8 && consulta.data?.manual

  return (
    <section
      aria-label="Endereço de entrega"
      className="flex flex-col gap-4 rounded-md border border-estrelinha-line bg-estrelinha-surface p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-semibold text-estrelinha-ink">Endereço de entrega</h2>
        {!editando && endereco && (
          <button type="button" onClick={abrir} className={BOTAO_TEXTO}>
            Alterar
          </button>
        )}
      </div>

      {editando ? (
        <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
          <div className="sm:max-w-[200px]">
            <Campo id="endereco-cep" rotulo="CEP" erro={erros?.cep}>
              <Input
                id="endereco-cep"
                inputMode="numeric"
                autoComplete="postal-code"
                // 9 = comprimento de `00000-000`; o teto real é de `maskCep`.
                maxLength={9}
                value={campos.cep}
                onChange={(e) => {
                  const cep = maskCep(e.target.value)
                  muda('cep', cep)
                  setCepDigitado(cep)
                }}
                placeholder="00000-000"
                {...invalido('endereco-cep', erros?.cep)}
                className={CAMPO}
              />
            </Campo>
          </div>
          {naoAchouCep && (
            <p role="status" className="text-[13px] text-estrelinha-ink-soft">
              Não localizamos esse CEP. Preencha o endereço à mão.
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
            <Campo id="endereco-rua" rotulo="Rua" erro={erros?.street}>
              <Input
                id="endereco-rua"
                autoComplete="address-line1"
                value={campos.street}
                onChange={(e) => muda('street', e.target.value)}
                {...invalido('endereco-rua', erros?.street)}
                className={CAMPO}
              />
            </Campo>
            <Campo id="endereco-numero" rotulo="Número" erro={erros?.number}>
              <Input
                id="endereco-numero"
                value={campos.number}
                onChange={(e) => muda('number', e.target.value)}
                {...invalido('endereco-numero', erros?.number)}
                className={CAMPO}
              />
            </Campo>
          </div>
          <Campo id="endereco-complemento" rotulo="Complemento">
            <Input
              id="endereco-complemento"
              autoComplete="address-line2"
              value={campos.complement}
              onChange={(e) => muda('complement', e.target.value)}
              placeholder="Apto, bloco, referência (opcional)"
              className={CAMPO}
            />
          </Campo>
          <Campo id="endereco-bairro" rotulo="Bairro" erro={erros?.neighborhood}>
            <Input
              id="endereco-bairro"
              value={campos.neighborhood}
              onChange={(e) => muda('neighborhood', e.target.value)}
              {...invalido('endereco-bairro', erros?.neighborhood)}
              className={CAMPO}
            />
          </Campo>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_80px]">
            <Campo id="endereco-cidade" rotulo="Cidade" erro={erros?.city}>
              <Input
                id="endereco-cidade"
                autoComplete="address-level2"
                value={campos.city}
                onChange={(e) => muda('city', e.target.value)}
                {...invalido('endereco-cidade', erros?.city)}
                className={CAMPO}
              />
            </Campo>
            <Campo id="endereco-uf" rotulo="UF" erro={erros?.state}>
              <Input
                id="endereco-uf"
                autoComplete="address-level1"
                maxLength={2}
                value={campos.state}
                onChange={(e) => muda('state', e.target.value.toUpperCase())}
                {...invalido('endereco-uf', erros?.state)}
                className={CAMPO}
              />
            </Campo>
          </div>
          {falha && (
            <p role="alert" className={ERRO}>
              {falha}
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="submit" disabled={salvar.isPending} className={BOTAO_CHEIO}>
              Salvar
            </button>
            <button type="button" onClick={() => setEditando(false)} className={BOTAO_CONTORNO}>
              Cancelar
            </button>
          </div>
        </form>
      ) : isLoading ? (
        <div
          aria-hidden
          data-testid="address-skeleton"
          className="h-20 animate-pulse rounded-sm bg-estrelinha-ground-deep motion-reduce:animate-none"
        />
      ) : endereco ? (
        <>
          <div className="flex flex-col gap-0.5 text-[15px] text-estrelinha-ink">
            {/* As linhas têm um dono só — o mesmo que desenha o endereço do pedido no detalhe. */}
            {addressLines({
              payment_method: null,
              address_street: endereco.street,
              address_number: endereco.number,
              address_complement: endereco.complement,
              address_neighborhood: endereco.neighborhood,
              address_city: endereco.city,
              address_state: endereco.state,
            }).map((l) => (
              <p key={l} className="break-words">
                {l}
              </p>
            ))}
            <p className="whitespace-nowrap">CEP {maskCep(endereco.cep)}</p>
          </div>
          <p className="rounded-sm bg-estrelinha-ground p-3 text-[13px] leading-5 text-estrelinha-ink-soft">
            Vale para as próximas compras. Pedidos já feitos seguem para o endereço escolhido no caixa.
          </p>
        </>
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p className="text-[15px] text-estrelinha-ink-soft">Nenhum endereço salvo.</p>
          <button type="button" onClick={abrir} className={BOTAO_CONTORNO}>
            Adicionar endereço
          </button>
        </div>
      )}
    </section>
  )
}

export default AddressCard
