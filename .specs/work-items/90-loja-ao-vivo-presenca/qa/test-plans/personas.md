# Personas — 90 · Loja ao vivo, Fases 2 e 3

| ID     | Nome                     | Arquétipo                       | Conta              | Jornadas               | Charters                 |
| ------ | ------------------------ | ------------------------------- | ------------------ | ---------------------- | ------------------------ |
| PER-01 | Adri                     | Usuário avançado                | `admin-atelie`     | J-01, J-02, J-03, J-06 | CH-01, CH-04, CH-05, CH-06, CH-09 |
| PER-02 | Adri à noite, fonte 200 % | Usuário de tecnologia assistiva | `admin-atelie`     | J-01, J-02 (secundária) | CH-08                   |
| PER-03 | Lúcia                    | Novo usuário (mobile)           | `anonima`          | J-01, J-02, J-05 (secundária em J-01/J-02) | CH-03 |
| PER-04 | Helena                   | Novo usuário, permissão restrita (recusou estatística) | `anonima` | J-04 | CH-02          |
| PER-05 | Marina                   | Permissão restrita (acesso ao ateliê retirado) | `admin-secundaria` | J-06 (secundária) | CH-07 |

**Não cobertas:** usuário ocasional — a Adri é a única dona e usa o app todo dia; usuário em recuperação — o
Work Item não corrige bug anterior; leitor de tela real (TalkBack) e o Android real — fora do browser da
sessão, simulados pela árvore de acessibilidade e pela emulação de fonte.

As personas de cliente (PER-03, PER-04) usam a **loja** (http://localhost:8082); as da Adri e da Marina usam
o **app do ateliê** (http://localhost:8084). Nos charters da Adri, a loja aberta num segundo contexto do browser
é o estímulo que gera presença, não uma segunda persona.

---

## PER-01 · Adri — usuário avançado

**Objetivo:** saber, pelo celular, se tem alguém na loja agora, o que essa pessoa está fazendo e quais joias
estão sendo vistas — sem que a tela a apresse.

**Contexto:** dona e única artesã do ateliê em Porto Alegre. Abre o app do ateliê várias vezes ao dia entre uma
peça e outra, em pé na bancada, com uma mão. Conhece de cor o Início e a seção Acessos (feature 83). Volta à
tela depois de postar no Instagram para ver se alguém chegou.

| Atributo      | Valor                                              |
| ------------- | -------------------------------------------------- |
| Familiaridade | diária                                             |
| Dispositivo   | celular (390 × 844); 1440 como adaptação           |
| Rede          | rápida no ateliê, instável quando sai              |
| Modalidade    | toque                                              |
| Locale        | pt-BR, fuso de Brasília                            |
| Paciência     | 20 s até desistir de um número                     |
| Conta         | `admin-atelie` · credencial `QA_ADMIN_ATELIE_USUARIO` / `QA_ADMIN_ATELIE_SENHA` (o admin local do `seed.sql`) |

**O que pode atrapalhá-la:**

1. O número do cartão do Início e o da Loja ao vivo divergirem por alguns segundos, ou a barra de "agora" não
   bater com o número grande — ela passa a desconfiar dos dois
2. O funil somar mais que o total (a mesma cliente em "Com joia na sacola" e em "No checkout")
3. A tela ficar presa em "Atualizado há 90 s" sem ela saber que a rede caiu

**Superfícies:** Início › cartão "Agora na loja"; `/ao-vivo` blocos A–E e Acessos.

## PER-02 · Adri à noite, com a fonte do sistema a 200 % — tecnologia assistiva

**Objetivo:** conferir à noite, cansada e com a fonte do celular no máximo, quantas pessoas estão na loja e o que
fazem, sem perder número nem rolar de lado.

**Contexto:** a mesma Adri, à noite, com os óculos longe; usa a fonte do sistema grande e, às vezes, deixa o
celular ler a tela em voz alta.

| Atributo      | Valor                                              |
| ------------- | -------------------------------------------------- |
| Familiaridade | diária                                             |
| Dispositivo   | celular (390 × 844) a 130 % e 200 % de fonte       |
| Rede          | rápida                                             |
| Modalidade    | toque e leitor-de-tela (simulado pela árvore de acessibilidade) |
| Locale        | pt-BR                                              |
| Paciência     | 30 s                                               |
| Conta         | `admin-atelie` · `QA_ADMIN_ATELIE_USUARIO` / `QA_ADMIN_ATELIE_SENHA` |

**O que pode atrapalhá-la:**

1. Os números da grade de "De onde vieram" e de Acessos sobrepostos ou espremidos a 200 %
2. O cartão do Início ler só "Agora na loja" sem o número, ou o número sem a palavra "pessoas"
3. As barras animando a largura com "reduzir movimento" ligado

**Superfícies:** Início › cartão; `/ao-vivo` inteira.

## PER-03 · Lúcia — novo usuário, celular

**Objetivo:** escolher uma joia com as cinzas do pai, vinda de um post do Instagram, e deixá-la na sacola para
decidir depois — com a loja fluindo como sempre e contada só porque aceitou estatística.

**Contexto:** primeira vez na loja; chegou por um link do Instagram, no celular, de noite. Aceita os cookies
de estatística. Olha duas ou três joias, abre o Guia de envio do material, põe uma na sacola, fecha a aba e
volta no dia seguinte.

| Atributo      | Valor                                              |
| ------------- | -------------------------------------------------- |
| Familiaridade | nenhuma                                            |
| Dispositivo   | celular (390 × 844)                                |
| Rede          | lenta                                              |
| Modalidade    | toque                                              |
| Locale        | pt-BR                                              |
| Paciência     | 60 s                                               |
| Conta         | `anonima` — aceita cookies de estatística          |

**O que pode atrapalhá-la:**

1. A loja ficar mais lenta ou travar na troca de página por causa do aviso de presença
2. A sacola guardada de ontem sumir ou não ser reconhecida quando ela volta
3. O checkout engasgar ao mudar a sacola (cada mudança dispara um aviso)

**Superfícies:** loja: joia, categoria, Guia de envio do material, sacola, checkout, pedido montado.

## PER-04 · Helena — novo usuário que recusou estatística

**Objetivo:** olhar joias em paz, sem ser contada em nada, porque recusou os cookies de estatística — e
conferir na Política o que a loja guarda.

**Contexto:** perdeu a mãe há pouco; desconfia de rastreio. Recusa "Estatísticas" na folha de cookies logo na
entrada, abre a Política de Privacidade, depois olha joias em duas abas.

| Atributo      | Valor                                              |
| ------------- | -------------------------------------------------- |
| Familiaridade | nenhuma                                            |
| Dispositivo   | celular (390 × 844)                                |
| Rede          | rápida                                             |
| Modalidade    | toque                                              |
| Locale        | pt-BR                                              |
| Paciência     | 60 s                                               |
| Conta         | `anonima` — recusa cookies de estatística          |

**O que pode atrapalhá-la:**

1. Recusar numa aba e a outra aba, já aberta, continuar avisando que ela está na loja
2. A Política dizer menos do que a loja faz (presença por minuto, sacola por 14 dias)
3. A folha de cookies não mostrar "Estatísticas" e ela não ter como recusar

**Superfícies:** loja: folha de cookies, `/politica-de-privacidade`, joias.

## PER-05 · Marina — acesso ao ateliê retirado

**Objetivo:** abrir a Loja ao vivo pelo app do ateliê — e, sem acesso, não ver número nenhum da loja.

**Contexto:** ajudou a Adri numa temporada e tinha acesso ao painel; a Adri a tirou do painel. O app ainda está
instalado no celular dela, com a Loja ao vivo aberta.

| Atributo      | Valor                                              |
| ------------- | -------------------------------------------------- |
| Familiaridade | ocasional                                          |
| Dispositivo   | celular (390 × 844)                                |
| Rede          | rápida                                             |
| Modalidade    | toque                                              |
| Locale        | pt-BR                                              |
| Paciência     | 30 s                                               |
| Conta         | `admin-secundaria` · `QA_ADMIN_SECUNDARIA_USUARIO` / `QA_ADMIN_SECUNDARIA_SENHA` — criada em `/admin/usuarios` como massa e depois removida do painel |

**O que pode atrapalhá-la:**

1. A tela mostrar por um instante o número de pessoas antes da recusa
2. O cartão do Início continuar com o último número depois de o acesso cair
3. Voltar pelo navegador e reencontrar a tela com dado velho

**Superfícies:** app do ateliê: Início, `/ao-vivo`, a tela de recusa do app.
