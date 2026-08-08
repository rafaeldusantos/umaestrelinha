# Store Login UX — Decisões (context)

Decisões do usuário capturadas na fase Specify (discuss). Fonte da verdade para Design/Tasks.

| # | Gray area | Decisão | Notas |
|---|-----------|---------|-------|
| D1 | Superfície da tela de login | **Modal (desktop) + bottom sheet (mobile), contextual.** Acionado do ícone de conta e de ações que exigem login (checkout, favoritar). `/entrar` mantido como rota de fallback/deep-link que abre o mesmo componente. | Alinha com "acesso mais rápido e fácil". |
| D2 | Criação de conta / método passwordless | **OTP por e-mail (código numérico), NÃO magic link.** Código substitui o "link de acesso" do Paper. Cadastro é unificado no fluxo OTP (sem aba "Criar Conta", sem campo nome no início). Senha vira apenas login de quem já tem senha. | Requer **redesenho dos fluxos no Paper** para refletir entrada de código + captura de nome. |
| D3 | Coleta de nome | **Acesso por e-mail/OTP:** no **primeiro acesso**, após validar o código, pedir o nome (passo de cadastro) antes de liberar. **Google:** nome já vem do provedor, sem passo extra. | Distinguir 1º acesso por `customers.name` vazio. |
| D4 | Pós-login | **Voltar à origem + preservar carrinho.** Retoma checkout/favoritos de onde o usuário estava; quando aberto como modal contextual, fecha sem navegar. | Substitui o redirect fixo atual para `/conta`. |

## Implicações técnicas confirmadas

- **Edge functions:** nenhuma nova. OTP (`signInWithOtp` + `verifyOtp` type `email`), Google (`signInWithOAuth`), reset de senha (`resetPasswordForEmail`) são nativos do Supabase Auth (GoTrue). Criação de `customers` já é feita pelo trigger `handle_new_customer`.
- **Config de backend (não-código):** template de e-mail de OTP deve usar `{{ .Token }}` (código) em vez de `{{ .ConfirmationURL }}`; ajustar expiração do OTP e rate limit de reenvio no painel Supabase; garantir redirect URLs para Google OAuth.
- **Redesenho Paper:** artboards atuais (24B-0, 254-0, 25W-0, 26Q-0, 285-0) usam "link mágico". Precisam virar fluxo OTP: Entrada (e-mail → "Enviar código") → Digite o código (input de 6 dígitos + reenviar) → Nome (1º acesso) → sucesso. Mobile + Desktop.
