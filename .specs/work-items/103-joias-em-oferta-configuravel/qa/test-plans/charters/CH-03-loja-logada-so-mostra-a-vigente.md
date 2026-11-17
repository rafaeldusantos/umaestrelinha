# CH-03 · A loja logada só mostra a campanha em vigência (e a visitante vê o mesmo de antes)

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P0                                                                            |
| Persona      | PER-03 Adri, conferindo a loja                                                |
| Tour         | Feature                                                                       |
| Modo         | por técnica — transição de estado (sem sessão → com sessão de admin → sem sessão) |
| Time-box     | 90 min · orçamento: 70 ações                                                  |
| Mudança      | a loja passa a ler a campanha em vigência e as marcações dela por uma leitura que aplica a vigência no banco, também com sessão de admin; para a visitante, selo, preço, sacola e `/ofertas` não mudam (D-03) — CA-06.1, CA-05.2, RNF-03 |
| Viewport     | 390 × 844                                                                     |
| Massa        | **cria** C-DES ("QA103 Desligada", desligada) e **marca** P-AGE nela (30 %); só lê B-1, C-VIG, C-AGE, C-ENC, M-A; **cria** uma sacola (sem pedido) |
| Driver       | `—`                                                                           |
| Entrada      | painel `/admin/campanhas` (`:8083`) logada como `admin-loja` para criar C-DES; depois a loja `/` (`:8082`) **sem** login |
| Jornadas     | J-05                                                                          |
| TC           | TC-REG-001, TC-SEC-001, TC-SEC-002 — 3 TC em 70 ações                         |

## Missão

Achar qualquer lugar da loja ou da prévia em que a dona, logada, veja desconto de campanha que não está valendo —
"Natal" agendada, "Black Friday" encerrada, "QA103 Desligada" —, e provar que a visitante vê o selo, o preço, a
sacola e `/ofertas` da campanha em vigência exatamente como antes.

## Deve tentar

1. **Preparar C-DES pelo painel:** em `/admin/campanhas`, criar "QA103 Desligada", **desligada**, de 16/11/2026 00:00
   a 30/11/2026 23:59, 30 % (se o cadastro recusar início no passado, começar "agora"); na aba Preço e estoque de
   P-AGE, marcar 30 % em "QA103 Desligada". Não mexer em mais nada no painel
2. **Sem login na loja** (a sessão do painel não vale em `:8082`): anotar o que a Home (bloco B-1), a página de
   P-AGE, a página de M-A e `/ofertas` mostram — selo, preço, preço riscado; pôr M-A na sacola e anotar o preço
   da sacola. É a régua da visitante
3. **Entrar na loja** com `admin-loja` (código pelo Mailpit, ou senha) e refazer o passo 2 tela por tela: tudo
   igual. P-AGE sem selo e com o preço cadastrado; M-A com "Dia das Mães", nunca a "Black Friday"; `/ofertas` sem
   P-AGE
4. **Prévia:** no mesmo browser, abrir `/admin/home` e olhar a prévia (Celular e Computador): o bloco B-1 com os
   percentuais de "Dia das Mães"; nas fileiras, P-AGE e as peças de "Natal" sem selo. Se B-2 (bloco de "Natal")
   já existir, ele não aparece na prévia. Sair da conta na loja no fim

## Edge cases sugeridos

- Recarregar a página da peça logada (o selo não "aparece depois")
- Abrir a peça por link direto, logada
- Mesma URL em duas abas: uma com sessão, outra anônima (janela privada, se o driver tiver)
- Sair em outra aba e voltar à Home
- Voltar do browser depois de sair da conta

## Fora do escopo

- peça despublicada visível com sessão de admin (D-04, dívida registrada para WI próprio) — se vir, anote como
  conhecido, sem achado
- concluir pedido ou pagamento — a sessão para na sacola
- o cadastro de campanhas e a marcação além de criar C-DES e marcar P-AGE
- o editor do bloco (CH-01, CH-04, CH-05)
