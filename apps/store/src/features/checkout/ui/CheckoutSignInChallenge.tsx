// `IDN-02`/`IDN-03` — o e-mail já tem conta, e o código é pedido **aqui**, dentro do bloco Contato.
//
// Abrir o `AuthOverlay` devolveria à cliente exatamente a parede modal que a feature `49` removeu —
// só que mais tarde no fluxo, depois de ela já ter digitado nome e telefone. O desafio é legítimo
// (ninguém deve fechar compra no e-mail de outra pessoa), a interrupção não precisa ser.
//
// **`AuthCodeStep` é reusado inteiro**, e não reescrito: ele já traz o reenvio com cooldown de 60s
// e o tratamento de código errado e expirado. Um segundo campo de 6 dígitos nesta loja seria duas máquinas de estado de
// login divergindo no primeiro ajuste — e `desafioDeCodigoUnico` recusa que ele nasça.
//
// **E o overlay NÃO abre.** O desafio abria o overlay junto (por `authUiStore.open`), e as duas
// superfícies pediam o mesmo código ao mesmo tempo; pior, fechar o overlay zerava o e-mail do store
// e o código digitado aqui era verificado contra e-mail vazio. O alvo agora é explícito
// (`InlineCodeTarget`) e o store do overlay não é tocado.
import { useEffect, useMemo, useRef } from 'react'
import { AlertCircle } from 'lucide-react'
import { useAuthFlow, type InlineCodeTarget } from '@/features/auth/model/useAuthFlow'
import AuthCodeStep from '@/features/auth/ui/steps/AuthCodeStep'

interface Props {
  /** O e-mail que a consulta (ou o servidor) disse já ter cadastro. */
  email: string
  /** "Usar outro e-mail": devolve a pessoa ao campo de e-mail do bloco Contato. */
  onUseOtherEmail: () => void
}

/**
 * `returnTo` no próprio checkout é o que faz concluir o código **não navegar**: `finish()` compara
 * com `window.location.pathname` e só fecha. Navegar remontaria a página inteira.
 */
export const CHECKOUT_RETURN_TO = '/checkout'

const CheckoutSignInChallenge = ({ email, onUseOtherEmail }: Props) => {
  const { sendCode } = useAuthFlow()
  const target = useMemo<InlineCodeTarget>(
    () => ({ email, returnTo: CHECKOUT_RETURN_TO }),
    [email],
  )

  /**
   * O código é enviado **uma vez**, ao montar.
   *
   * Sem o `ref`, qualquer re-render do bloco Contato (uma tecla no campo de telefone, por exemplo)
   * dispararia outro envio — e o GoTrue tem teto de e-mail por hora: a cliente ficaria sem receber
   * o código por ter digitado o próprio telefone.
   */
  const enviado = useRef('')
  useEffect(() => {
    if (enviado.current === email) return
    enviado.current = email
    void sendCode(email, target)
  }, [email, sendCode, target])

  return (
    <div
      // Região própria, para o leitor de tela anunciar a mudança de assunto dentro do bloco.
      role="group"
      aria-label="Confirme que este e-mail é seu"
      className="flex flex-col gap-4 rounded-lg border border-estrelinha-field bg-estrelinha-ground-deep p-4"
    >
      <div className="flex items-start gap-3">
        <AlertCircle
          className="mt-[2px] h-[18px] w-[18px] shrink-0 text-estrelinha-ink-soft"
          aria-hidden
        />
        <div className="flex flex-col gap-1">
          <p className="text-[15px] font-semibold text-estrelinha-ink">
            Este e-mail já tem cadastro na loja
          </p>
          {/* Sem culpa e sem alarme: a pessoa não errou nada, e a loja está checando algo que é
              dela. O motivo em si tem dono único em `checkoutIdentityRefusal`, que é o mesmo texto
              do 409 do servidor — aqui a frase é a explicação do passo, não o veredito. */}
          <p className="text-[13px] leading-snug text-estrelinha-ink-soft">
            Um código foi enviado para <strong className="font-semibold">{email}</strong>. Digite-o
            para continuar com seus dados salvos.
          </p>
        </div>
      </div>

      <AuthCodeStep target={target} onUseOtherEmail={onUseOtherEmail} />
    </div>
  )
}

export default CheckoutSignInChallenge
