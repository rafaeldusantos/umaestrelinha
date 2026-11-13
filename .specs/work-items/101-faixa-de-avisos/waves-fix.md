ONDAS: 05 | 06
- 05 posse: apps/store/src/widgets/announcement-bar/ (model/useAnnouncementBar.ts, ui/AnnouncementBar.tsx e os testes do widget)
- 06 posse: packages/core/src/announcements/ (refusals.ts e __tests__), apps/backoffice/src/features/announcement-bar/, apps/backoffice/src/pages/admin/AdminAnnouncementsPage.tsx (e o teste dela)
- 05 antes, 06 sozinha depois: a 06 pode mexer na recusa de `core/announcements`, contrato compartilhado que `announcementBarExists` usa e que o widget da 05 (e a função api/page) consomem. Sem arquivo em comum, mas contrato compartilhado vai em onda própria; a 05 vem primeiro pela ordem do Gate 3 (BUG-002 primeiro, as duas high).
