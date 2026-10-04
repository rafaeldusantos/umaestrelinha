// "Dados pessoais" — o cartão de "Meus dados" (feature 59, `DAD-01..05`, `DAD-09`).
//
// Edita o que pode (nome e WhatsApp) e TRAVA o que não pode, dizendo por quê:
//   · o e-mail é o login — trocá-lo mexe no GoTrue e nos snapshots dos pedidos (`context.md`);
//   · o CPF/CNPJ identifica quem pagou: vazio, preenche-se UMA vez; preenchido, trava.
// Esconder na tela não protege nada: quem recusa é o banco, pelo gatilho `guard_customer_identity`
// (migration da `59`). A tela só não oferece o caminho.
//
// A régua de nome e WhatsApp é `profileRefusal`; quem grava é o contexto de auth
// (`updateCustomerProfile`), recebido por prop — a página é quem tem o contexto.
import { useState, type FormEvent, type ReactNode } from 'react'
import { Lock } from 'lucide-react'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import type { Customer } from '@estrelinha/auth'
import { documentLabel, maskDocument, maskPhone } from '@estrelinha/core/validators'
import { CPF_SAVE_FAILED_MESSAGE, INVALID_CPF_MESSAGE, useSaveCustomerCpf } from '@/entities/customer'
import { profileRefusal, type ProfileRefusal } from '../model/profileRefusal'
import { hiddenDocument } from '../lib/hiddenDocument'

export interface ProfileCardProps {
  customer: Customer | null
  /** O e-mail de acesso (o do login). */
  email: string | null | undefined
  /** `updateCustomerProfile` do contexto: `{ error: null }` quando gravou. */
  onSaveProfile: (profile: { name: string; phone: string }) => Promise<{ error: string | null }>
  /** O documento gravado (só dígitos), para o contexto deixar de mostrar o campo vazio. */
  onDocumentSaved: (cpf: string) => void
}

const ROTULO = 'text-[13px] text-estrelinha-ink-soft'
const VALOR = 'text-[15px] text-estrelinha-ink'
const AJUDA = 'text-[13px] leading-5 text-estrelinha-ink-soft'
const ERRO = 'text-[13px] text-estrelinha-alert'
const CAMPO = 'h-12 border-estrelinha-field text-[15px]'
const BOTAO_TEXTO =
  'flex min-h-11 items-center text-sm font-semibold text-estrelinha-primary underline underline-offset-4'
const BOTAO_CHEIO =
  'flex h-12 items-center justify-center rounded-sm bg-estrelinha-primary px-6 text-[15px] font-semibold text-white transition-opacity hover:opacity-95 disabled:opacity-60 motion-reduce:transition-none'
const BOTAO_CONTORNO =
  'flex h-12 items-center justify-center rounded-sm border border-estrelinha-field px-6 text-[15px] font-semibold text-estrelinha-ink transition-colors hover:bg-estrelinha-ground-deep motion-reduce:transition-none'

/** Uma linha que não se edita: rótulo, valor, cadeado e o porquê. */
const LinhaTravada = ({ rotulo, valor, ajuda }: { rotulo: string; valor: string; ajuda: string }) => (
  <div className="flex flex-col gap-0.5">
    <dt className={ROTULO}>{rotulo}</dt>
    <dd className="flex min-w-0 items-start gap-3">
      <span className={`min-w-0 flex-1 break-all ${VALOR}`}>{valor}</span>
      <span className="flex w-5 shrink-0 justify-center pt-0.5">
        <Lock className="h-4 w-4 text-estrelinha-ink-soft" aria-hidden data-testid="cadeado" />
      </span>
    </dd>
    <dd className={AJUDA}>{ajuda}</dd>
  </div>
)

const Campo = ({
  id,
  rotulo,
  erro,
  children,
}: {
  id: string
  rotulo: string
  erro: string | null
  children: ReactNode
}) => (
  <div className="flex flex-col gap-[7px]">
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

/** O documento vazio: preenche-se uma vez, validado pelo dígito verificador (`DAD-05`). */
const DocumentoUmaVez = ({ customerId, onSaved }: { customerId: string; onSaved: (cpf: string) => void }) => {
  const [valor, setValor] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const salvar = useSaveCustomerCpf()
  const rotulo = documentLabel(valor)

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setErro(null)
    // O dígito verificador é conferido DENTRO de `useSaveCustomerCpf`, antes da rede — documento
    // inválido nunca chega ao banco. Uma segunda conferência aqui seria a mesma régua em dois donos.
    try {
      onSaved(await salvar.mutateAsync({ customerId, cpf: valor }))
    } catch (err) {
      // Erro do PostgREST (inclusive a recusa do gatilho) não vaza cru para a cliente.
      setErro((err as Error)?.message === INVALID_CPF_MESSAGE ? INVALID_CPF_MESSAGE : CPF_SAVE_FAILED_MESSAGE)
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-2">
      <Campo id="perfil-documento" rotulo={rotulo} erro={erro}>
        <Input
          id="perfil-documento"
          inputMode="numeric"
          // 18 = comprimento de `00.000.000/0000-00`; o teto real é de `maskDocument`.
          maxLength={18}
          value={valor}
          onChange={(e) => setValor(maskDocument(e.target.value))}
          placeholder="000.000.000-00"
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? 'perfil-documento-erro' : undefined}
          className={CAMPO}
        />
      </Campo>
      <p className={AJUDA}>Você informa uma vez só. Depois de salvo, para corrigir, fale com a gente.</p>
      <button type="submit" disabled={salvar.isPending} className={`${BOTAO_CONTORNO} self-start`}>
        Salvar {rotulo}
      </button>
    </form>
  )
}

const ProfileCard = ({ customer, email, onSaveProfile, onDocumentSaved }: ProfileCardProps) => {
  const [editando, setEditando] = useState(false)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [erros, setErros] = useState<ProfileRefusal | null>(null)
  const [falha, setFalha] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const documento = (customer?.cpf ?? '').trim()

  const abrir = () => {
    setNome(customer?.name ?? '')
    setTelefone(maskPhone(customer?.phone ?? ''))
    setErros(null)
    setFalha(null)
    setEditando(true)
  }

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    const recusa = profileRefusal({ name: nome, phone: telefone })
    setErros(recusa)
    setFalha(null)
    if (recusa) return
    setSalvando(true)
    const { error } = await onSaveProfile({ name: nome, phone: telefone })
    setSalvando(false)
    // `DAD-09`: falhou, o formulário fica aberto com o que foi digitado.
    if (error) {
      setFalha(error)
      return
    }
    setEditando(false)
  }

  return (
    <div className="flex flex-col gap-4 rounded-md border border-estrelinha-line bg-estrelinha-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-semibold text-estrelinha-ink">Dados pessoais</h2>
        {!editando && (
          <button type="button" onClick={abrir} className={BOTAO_TEXTO}>
            Editar
          </button>
        )}
      </div>

      {editando ? (
        <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
          <Campo id="perfil-nome" rotulo="Nome completo" erro={erros?.name ?? null}>
            <Input
              id="perfil-nome"
              autoComplete="name"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              aria-invalid={erros?.name ? true : undefined}
              aria-describedby={erros?.name ? 'perfil-nome-erro' : undefined}
              className={CAMPO}
            />
          </Campo>
          <Campo id="perfil-whatsapp" rotulo="WhatsApp" erro={erros?.phone ?? null}>
            <Input
              id="perfil-whatsapp"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              // 15 = comprimento de `(00) 00000-0000`; o teto real é de `maskPhone`.
              maxLength={15}
              value={telefone}
              onChange={(e) => setTelefone(maskPhone(e.target.value))}
              placeholder="(00) 00000-0000"
              aria-invalid={erros?.phone ? true : undefined}
              aria-describedby={erros?.phone ? 'perfil-whatsapp-erro' : undefined}
              className={CAMPO}
            />
          </Campo>
          {falha && (
            <p role="alert" className={ERRO}>
              {falha}
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="submit" disabled={salvando} className={BOTAO_CHEIO}>
              Salvar
            </button>
            <button type="button" onClick={() => setEditando(false)} className={BOTAO_CONTORNO}>
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <dl className="flex flex-col gap-4">
          <div className="flex flex-col gap-0.5">
            <dt className={ROTULO}>Nome completo</dt>
            <dd className={`break-words ${VALOR}`}>{customer?.name?.trim() || '—'}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className={ROTULO}>WhatsApp</dt>
            <dd className={VALOR}>{customer?.phone ? maskPhone(customer.phone) : 'Não informado'}</dd>
          </div>
        </dl>
      )}

      {/* O que não se edita aparece nos dois modos: a cliente que abre o formulário procurando o
          e-mail precisa encontrar a explicação, não a ausência. */}
      <dl className="flex flex-col gap-4 border-t border-estrelinha-line pt-4">
        <LinhaTravada
          rotulo="E-mail de acesso"
          valor={email ?? ''}
          ajuda="É com ele que você entra na loja. Para trocar, fale com a gente."
        />
        {documento && (
          <LinhaTravada
            rotulo={documentLabel(documento)}
            valor={hiddenDocument(documento)}
            ajuda="Informado na primeira compra, ele identifica quem pagou. Para corrigir, fale com a gente."
          />
        )}
      </dl>
      {!documento && customer?.id && <DocumentoUmaVez customerId={customer.id} onSaved={onDocumentSaved} />}
    </div>
  )
}

export default ProfileCard
