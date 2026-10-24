# BUG-20261024-linha-do-cliente-quebra-palavra-e-pilula-a-200: a 200 % de fonte a linha da lista parte uma palavra do nome e a pílula "Em aberto" em duas linhas

- **Status:** verified (2026-10-24, reteste-3: 130 % e 200 % sem palavra partida e com a pílula numa linha)
- **Impact (user-side):** Friction
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Equipe com TalkBack / fonte do sistema grande
- **Journey Step:** J-achar-uma-cliente, ler a lista
- **Scenarios:** MAD-clientes-com-leitor-de-tela
- **Found:** 2026-10-24 · **Report:** reports/2026-10-24-mobile-adm-clientes-reteste-2.md

## Summary

Em 390×844 a 200 %, a linha da fixtura de nome longo (70 caracteres) mostra "Albuquerqu / e de", partindo a
palavra no meio, e a pílula "Em aberto" ocupa duas linhas ("Em / aberto"). É a mesma classe que B07 corrigiu no
título da ficha (palavra partida a 200 %), agora na linha da lista, que B07 não alcançou. Nome de 70 caracteres
é extremo; a pílula em duas linhas vale para qualquer cliente em aberto a 200 %.

## Reproduction

1. Fonte do sistema a 200 %, 390×844, /clientes, buscar `p76`.
2. Ler a primeira linha (fixtura `P76 Marina Albuquerque de Vasconcelos…`, 22 compras, em aberto).

**Expected:** nenhuma palavra partida; a pílula numa linha (ou sem pílula embrulhada).
**Actual:** ver imagem. A matriz de layout (`matriz.cjs`, 60 medidas) não pega: mede rolagem horizontal e
sobreposição, não palavra partida nem pílula em duas linhas.

## Evidence

- `docs/qa/evidence/2026-10-24-mobile-adm-clientes-reteste-2/N02-linha-do-cliente-200.png`

## Verified (2026-10-24, reteste-3)

200 %: a inicial fica numa linha, o bloco de texto desce e ganha a largura inteira; altura da pílula 32 px (uma linha, 130 %: 21 px); scrollWidth 390; 'Albuquerque' e 'Vasconcelos' inteiras. Evidência: evidence/2026-10-24-mobile-adm-clientes-reteste-3/B17-primeira-linha-200.png.
