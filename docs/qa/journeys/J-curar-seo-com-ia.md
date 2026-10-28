# J-curar-seo-com-ia: curar o SEO de uma peça com "Sugerir com IA"

Feature `84` (`SIA-10`..`SIA-25`). Superfície: aba SEO de `/admin/produtos/:id/editar` (e de `/novo`), a
edge function `seo-suggest`. Área `PNL`. Persona: Adri cadastrando peças.

```yaml
journey:
  id: J-curar-seo-com-ia
  entry: [/admin/produtos/:id/editar → aba SEO]
  goal: título e descrição curados no tom da loja, revisados por ela, gravados só no Salvar
  exit: reabrir a peça mostra os dois campos com o texto aceito, sem selo "automático"
  side_effects: [POST functions/v1/seo-suggest (não grava), products.seo_title/seo_description no Salvar]
```

```mermaid
flowchart TD
    A[Aba SEO] --> B{Nome preenchido?}
    B -->|não| B1[Botão desabilitado + Preencha o nome do produto primeiro.]
    B -->|sim| C[Sugerir com IA]
    C --> D[Sugerindo… desabilitado]
    D -->|200| E[Campos preenchidos, prévia atualiza, Desfazer se havia texto]
    D -->|503| F1[Sugestão por IA não está configurada. — botão desabilitado até recarregar]
    D -->|429| F2[Muitas sugestões seguidas…]
    D -->|502 / rede| F3[A sugestão não veio desta vez…]
    D -->|422| F4[off_rules / refusal / truncated]
    D -->|digita no SEO| F5[Resposta descartada + mantive o seu texto]
    D -->|troca de aba| F6[Resposta descartada, sem frase]
    D -->|Salvar no voo| F7[Pedido cancelado; grava o que está nos campos]
    E -->|Desfazer| G[Textos anteriores voltam]
    E -->|edita| H[Ajusta à mão; Desfazer some]
    E --> I[Salvar]
    G --> I
    H --> I
    F1 & F2 & F3 & F4 --> J[Campos intocados, salvar liberado, escreve à mão]
    J --> I
    I --> K[FIM VERDADEIRO: reabrir mostra o texto aceito, sem selo]
    E -.->|sai sem salvar| X1[Abandono: nada gravado; rascunho local oferece restaurar]
```

Dimensões: caminho feliz (sugerir, desfazer, salvar), erro (503 real, 429/502/422 interceptados, rede
abortada), concorrência (digitar, trocar de aba, salvar com o pedido no ar, toque duplo), acesso (região
`aria-live`, foco depois de Desfazer, teclado, fonte 200 % — D1/D2), dado (texto curado substituído e
devolvido; sugestão longa).
