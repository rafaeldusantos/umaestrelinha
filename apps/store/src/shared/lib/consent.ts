/**
 * O texto do consentimento de marketing — `POL-13`.
 *
 * **Dois consumidores, um dono.** Quem o mostra é a caixa de seleção do checkout
 * (`features/checkout/ui/ContactBlock`); quem o **cita** é a Política de Privacidade, para dizer à
 * leitora exatamente o que ela autorizou. Escritos separadamente, os dois divergem no primeiro ajuste
 * de copy — e a divergência é a pior possível de detectar: o checkout mostra uma frase, a política
 * declara outra, build e `tsc` passam, e o que fica errado é a **prova de consentimento**.
 *
 * Mora em `shared/lib` porque os dois consumidores estão no mesmo app e em camadas diferentes
 * (`features/` e `pages/`), e `pages` não importa de `features`. É o mesmo raciocínio de `AD-033` uma
 * camada abaixo: a resposta é sempre a camada estritamente inferior às duas.
 */
export const MARKETING_CONSENT_LABEL =
  'Quero receber lembretes e novidades por e-mail. Você pode cancelar quando quiser.'
