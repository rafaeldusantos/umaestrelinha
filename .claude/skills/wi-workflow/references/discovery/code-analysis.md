# Code Analysis Tools

Análise de código é **local** (ferramentas do IDE e da linha de comando), usada como grounding. Use graceful degradation. Não há índice remoto: toda evidência sai do disco, com `caminho:linha`.

## Usage by Phase

| Fase             | Uso                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------- |
| Lookup (com PRD) | **Obrigatório**, e é o subagent `wi-code-lookup` que o faz — um por repositório           |
| Lookup (sem PRD) | **Obrigatório** — o mesmo subagent, para achar o ponto do ajuste e os testes existentes   |
| Descoberta       | **Obrigatório** — o `wi-discovery` levanta o que já existe no domínio do pedido           |
| PRD Tech Review  | **Obrigatório** — exploração `thorough` do codebase que o PRD tangencia                   |
| Corrida da fila  | Do subagent, não da thread principal — quem lê código é `wi-impl-task` e `wi-impl-review` |

## Minimum Evidence (Work Item + PRD)

Antes de concluir o `spec.md`, coletar evidências técnicas mínimas:

- Código: caminho + símbolo (componente, hook, serviço, função, edge function)
- Banco: tabela/coluna/constraint/FK/índice/enum envolvidos
- Domínio: nomenclatura adotada e alinhamento com o sistema existente

Se não houver evidência local para um requisito do PRD, marcar explicitamente como item **novo** na spec (sem presumir existência).

## Tool Priority

1. **ast-grep** (`sg`) - Structural pattern-based search
2. **ripgrep** (`rg`) - Fast context-aware text search
3. **grep** - Standard text search (always available)

## Detection

Check tool availability before use:

```bash
# Check for ast-grep
if command -v sg >/dev/null 2>&1; then
  # Use ast-grep for structural search
elif command -v rg >/dev/null 2>&1; then
  # Fall back to ripgrep
else
  # Use standard grep as final fallback
fi
```

## Usage Examples

**Finding function definitions:**

```bash
# ast-grep (best — structural)
sg -p 'function $NAME($$$) { $$$ }'

# ripgrep (fallback — fast text)
rg '^function\s+\w+\(' --type-add 'source:*.[extension]' -t source

# grep (last resort — basic)
grep -r '^function ' --include="*.[extension]"
```

**Finding imports/requires:**

```bash
# ast-grep
sg -p 'import { $$$ } from "$MODULE"'

# ripgrep
rg '^import .* from' --type-add 'source:*.[extension]' -t source

# grep
grep -r '^import ' --include="*.[extension]"
```

**Finding class/component definitions:**

```bash
# ast-grep
sg -p 'class $NAME { $$$ }'

# ripgrep
rg '^(class|export class)\s+\w+' --type-add 'source:*.[extension]' -t source

# grep
grep -r '^class ' --include="*.[extension]"
```

## Search Scope

**Best practices:**

- Limit to source file extensions relevant to project
- Exclude directories: `node_modules`, `vendor`, `dist`, `build`, `.git`
- Focus on source directories: `src`, `lib`, `app`
- Use file type filters when available

**Performance tips:**

- Use specific patterns over broad searches
- Limit directory depth with `--max-depth` (ripgrep/grep)
- Cache results for repeated queries

## Fallback Notice

If ast-grep unavailable, display once per session:

```
⚠️ ast-grep not detected. Install for more precise structural code analysis.
   https://ast-grep.github.io/guide/quick-start.html
```

## When to Use

- Finding usage patterns across codebase
- Identifying code structure and organization
- Locating function/class/component definitions
- Analyzing import/dependency patterns
- Refactoring impact analysis
- Code navigation in unfamiliar codebases
- Grounding PRD-derived specs with technical references (Work Item + PRD)
