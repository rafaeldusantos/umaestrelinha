// `IDN-02`/`IDN-03` — o e-mail já tem conta, e o código é pedido **aqui**, dentro do bloco Contato.
//
// Abrir o `AuthOverlay` devolveria à cliente exatamente a parede modal que a feature `49` removeu —
// só que mais tarde no fluxo, depois de ela já ter digitado nome e telefone. O desafio é legítimo
// (ninguém deve fechar compra no e-mail de outra pessoa), a interrupção não precisa ser.
//
// **`AuthCodeStep` é reusado inteiro**, e não reescrito: ele lê tudo do `authUiStore` e já traz o
// reenvio com cooldown de 60s, o tratamento de código errado e a transição para o passo de nome de
// quem nunca preencheu. Um segundo campo de 6 dígitos nesta loja seria duas máquinas de estado de
// login divergindo no primeiro ajuste — e `desafioDeCodigoUnico` recusa que ele nasça.
import { useEffect, useRef } from 'react'
import { AlertCircle } from 'lucide-react'
import { useAuthUiStore } from '@/features/auth'
import { useAuthFlow } from '@/features/auth/model/useAuthFlow'
import AuthCodeStep from '@/features/auth/ui/steps/AuthCodeStep'

interface Props {
  /** O e-mail que a consulta (ou o servidor) disse já ter cadastro. */
  email: string
}

const CheckoutSignInChallenge = ({ email }: Props) => {
  const { sendCode } = useAuthFlow()
  const setReturnTo = useAuthUiStore((s) => s.open)

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
    // `returnTo` no próprio checkout é o que faz `finish()` **não navegar** ao concluir: o fluxo
    // compara com `window.location.pathname` e só fecha. Navegar remontaria a página inteira.
    setReturnTo({ returnTo: '/checkout', step: 'code' })
    void sendCode(email)
  }, [email, sendCode, setReturnTo])

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
            Enviamos um código para <strong className="font-semibold">{email}</strong>. Digite-o
            para continuar com seus dados salvos.
          </p>
        </div>
      </div>

      <AuthCodeStep />
    </div>
  )
}

export default CheckoutSignInChallenge
