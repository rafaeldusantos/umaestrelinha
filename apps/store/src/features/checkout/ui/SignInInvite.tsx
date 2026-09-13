// `ENT-01` … `ENT-07` — o convite para entrar, **dentro** do checkout.
//
// É a contrapartida do portão removido: tirar a obrigação não pode tirar a opção. Quem já comprou
// aqui entra e a loja preenche o que já sabe; quem não quer entrar simplesmente não vê parede
// nenhuma.
//
// Desenho do board `EWX-0` (Paper), com **dois desvios declarados**:
//
//   1. **O ícone não é a marca do Google.** O board lidera com o "G", mas o botão abre o
//      `AuthOverlay` **inteiro** — código por e-mail, senha e Google. Marca de provedor prometeria
//      um caminho só, e a loja identifica por código.
//   2. **A copy não promete tempo.** O board diz "finaliza em 20 segundos". Esta loja vende joia
//      feita à mão com o material de quem a cliente perdeu; pressa não é argumento aqui, e o
//      `CLAUDE.md` proíbe urgência fabricada como restrição de produto.
import { LogIn } from 'lucide-react'
import { useAuthContext } from '@estrelinha/auth'
import { useAuthUiStore } from '@/features/auth'

const SignInInvite = () => {
  const { user } = useAuthContext()
  const openAuth = useAuthUiStore((s) => s.open)

  // `ENT-04`: com sessão não há o que convidar.
  if (user) return null

  return (
    <section
      aria-label="Já tem conta"
      // `ENT-07`: em 390px as duas linhas embrulham e o botão desce — `flex-wrap` em vez de uma
      // linha que estoura. Nenhuma largura fixa, nenhum `min-w` maior que a tela.
      className="flex flex-wrap items-center gap-3 rounded-lg bg-estrelinha-ground-deep px-4 py-4 sm:px-[22px]"
    >
      <LogIn className="h-[22px] w-[22px] shrink-0 text-estrelinha-ink-soft" aria-hidden />
      <div className="flex min-w-0 grow flex-col gap-[2px]">
        <span className="text-[15px] font-semibold leading-tight text-estrelinha-ink">
          Já comprou aqui?
        </span>
        <span className="text-[13px] leading-snug text-estrelinha-ink-soft">
          Entre e preenchemos seus dados de contato e entrega
        </span>
      </div>
      {/* Contorno de tinta, não geleia: `CHK-04` reserva a única pílula sólida da tela para o CTA de
          pagar. `min-h-11` são os 44px da premissa mobile — sem `TAP_44`, porque o próprio botão já
          tem essa altura e o auxiliar traria um `relative` que este layout não precisa. */}
      <button
        type="button"
        onClick={() => openAuth({ returnTo: '/checkout' })}
        className="min-h-11 shrink-0 rounded-sm border-2 border-estrelinha-ink px-6 text-sm font-semibold text-estrelinha-ink transition-colors hover:bg-estrelinha-ground"
      >
        Entrar
      </button>
    </section>
  )
}

export default SignInInvite
