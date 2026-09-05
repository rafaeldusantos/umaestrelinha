export { default as PageHeader } from './PageHeader'
export { default as FormCard } from './FormCard'
export { default as StatCard } from './StatCard'
export { default as AdminTable, type AdminColumn } from './AdminTable'
export { default as Pagination } from './Pagination'
export { getPageItems } from './paginationItems'
export { default as EmptyState } from './EmptyState'
export { TableSkeleton, CardSkeleton } from './Skeletons'
export { FieldGroup, ToggleField } from './FieldGroup'
// Feature 18: as duas peças que as telas de formulário do grupo `Descontos` compartilham.
export { default as DateField } from './DateField'
export { default as FormPageHeader } from './FormPageHeader'
// Feature 34: o cabeçalho das telas de REGISTRO (pedido e ficha) — trilha, selos em linha com o
// título, e ações livres. Nem `PageHeader` (sem trilha, sem selo) nem `FormPageHeader` (exige save).
export { default as RecordPageHeader } from './RecordPageHeader'
// Inputs mascarados pt-BR (07/T27). Em `shared/ui` porque são consumidos pelo formulário (11),
// pela edição inline da listagem e pela grade rápida (13) — `AD-010`.
export { MoneyInput, WeightInput, DimensionInput } from './inputs'
