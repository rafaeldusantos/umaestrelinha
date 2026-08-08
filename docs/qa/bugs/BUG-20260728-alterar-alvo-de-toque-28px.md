# BUG-20260728-alterar-alvo-de-toque-28px: "Alterar" tem 28px de altura no mobile

- **User impact:** Friction
- **Persona affected:** Marina
- **Journey / step:** J-compra-pix-celular — qualquer bloco colapsado
- **Scenarios:** CHK-um-bloco-aberto
- **First seen:** 2026-07-28 · `../reports/2026-07-28-checkout-08-09.md`
- **Status:** **fixed** (retestado em persona)

## Symptom (what the user experiences)

Os botões **"Alterar"** dos blocos colapsados medem **62 × 28 px** em 390×844. Abaixo do mínimo de
**44 px** que a premissa mobile do projeto estabelece (`CLAUDE.md` → Convenções). Com o polegar, em
movimento, o alvo é pequeno o suficiente para errar — e errar aqui significa não conseguir corrigir o
endereço ou o CPF antes de pagar.

## Reproduction (from the persona's entry point)

1. Loja em 390×844, logada, com o rascunho do checkout já preenchido (blocos colapsados).
2. Abrir `/checkout`.
3. Medir os botões "Alterar":

```js
[...document.querySelectorAll('button')].filter(b => b.textContent.trim() === 'Alterar')
  .map(b => { const r = b.getBoundingClientRect(); return [r.width, r.height] })
// → [[62, 28], [62, 28]]
```

## Evidence

Medição direta de `getBoundingClientRect()` em viewport real (iPhone 14 emulado, dpr 3):
`rect: [471, 286, 62, 28]` e `[471, 397, 62, 28]`. `alturaOk: false` nos dois.

Nota: numa primeira tentativa o `agent-browser` **recusou** o clique dizendo que o botão estava coberto
pelo `span.truncate` do resumo. Ao medir a geometria em seguida, `elementFromPoint` no centro devolveu
o próprio botão (`clicavel: true`) — ou seja, a sobreposição era **transitória**, provavelmente durante
o layout logo após o carregamento. Registrado como observação, não como parte do defeito: não
reproduziu.

## Why it matters

É o único achado do ciclo que sai diretamente da premissa que acabou de virar convenção do projeto
(~90% do tráfego é mobile; alvo de toque mínimo de 44 px). E fica no caminho de correção: quem digitou
o CEP errado precisa deste botão.

## Root cause (when known)

O botão usa `px-2 py-1 text-sm` — padding e fonte de um link inline, não de um alvo de toque. A
correção é aumentar a área tocável (padding vertical ou `min-h`) sem mudar a aparência, que está
correta pelo board.


---

## Fix — 2026-07-30

- **O que mudou:** `min-h-11` nos dois blocos colapsados. Medido no browser em 390x844: 28px → 44px.
- **Commit:** `99c90cc`
- **Teste de regressão:** `apps/store/src/features/checkout/ui/__tests__/PaymentBlock.test.tsx` — vermelho antes, verde depois; discriminação provada por mutação.
- **Retestado:** re-caminhada em 390×844 (iPhone 14 emulado) como Marina, sessão fresca com
  `sessionStorage` limpo. Gate completo: **842 testes, 0 falhas** · `pnpm build` 2/2.
