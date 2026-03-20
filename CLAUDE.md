# CLAUDE.md — Contexto y reglas del proyecto Unko App

## Stack

- **Framework:** Next.js 15 App Router (server components por defecto)
- **Base de datos:** PostgreSQL + Prisma ORM
- **Auth:** NextAuth v5 (`src/auth.ts`, Google provider)
- **Estilos:** Tailwind CSS v4
- **Uploads:** Cloudinary
- **Toasts:** Sonner (`toast.success/error()`)
- **UI interactiva:** driver.js (tutoriales), sonner

## Arquitectura — Feature-Driven (módulos)

La app está organizada en `src/modules/`. Cada módulo tiene su propia carpeta con `components/`, `lib/`, `actions/`, `types/` según lo que necesite.

```
src/
├── app/                  ← Solo routing + thin data fetching. Sin lógica UI compleja.
│   └── api/              ← API routes (sin cambios estructurales)
├── modules/
│   ├── gallery/
│   ├── notifications/
│   ├── share/
│   ├── dashboard/
│   ├── trips/
│   ├── expenses/
│   ├── itinerario/
│   └── proposals/
├── components/
│   └── ui/               ← SOLO componentes UI puros y reutilizables
├── providers/            ← Context providers globales (theme, currency, notifications)
├── lib/                  ← Utilidades agnósticas (prisma, cloudinary, env, constants, logger, maps-url)
└── types/                ← Solo next-auth.d.ts (tipos cross-cutting)
```

### Reglas de arquitectura

- Los `page.tsx` deben ser **thin**: solo obtienen params, hacen fetch de datos y renderizan un componente contenedor. Sin lógica de UI compleja.
- Los componentes van en su módulo correspondiente. Si es reutilizable y agnóstico → `components/ui/`.
- Los providers globales van en `src/providers/`.
- Las server actions van en `src/modules/{feature}/actions/`.
- Los tipos específicos de un feature van en `src/modules/{feature}/types/`.
- Tipos compartidos entre features → `src/types/`.

### Imports — paths correctos

| Qué importar | Desde |
|---|---|
| Componentes UI puros | `@/components/ui/nombre` |
| Componentes de feature | `@/modules/{feature}/components/nombre` |
| Providers | `@/providers/nombre` |
| Lib de feature | `@/modules/{feature}/lib/nombre` |
| Lib global | `@/lib/nombre` |
| Server actions de feature | `@/modules/{feature}/actions/nombre` |
| Tipos de feature | `@/modules/{feature}/types/nombre` |

## Dark mode

- Implementado con `next-themes`, `attribute="class"` en el html.
- Tailwind v4: `@custom-variant dark (&:is(.dark *))` en `globals.css`.
- Siempre agregar clases `dark:` al escribir estilos.
- Mapeo de colores:
  - `bg-white` → `dark:bg-zinc-900`
  - `bg-zinc-50` → `dark:bg-zinc-950`
  - `border-zinc-100/200` → `dark:border-zinc-800/700`
  - `text-zinc-900` → `dark:text-zinc-100`
  - `text-zinc-500` → `dark:text-zinc-400`
- Botones primarios: `bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900`
- Headers: fondo sólido `bg-white dark:bg-zinc-900` — **nunca usar `backdrop-blur` en headers sticky** porque rompe `position: fixed` de hijos (drawers, bottom nav, overlays).

## Responsive / Mobile

- Breakpoint principal: `md` (768px). Bajo = mobile, sobre = tablet/desktop.
- Navegación mobile: hamburger drawer (`TripMobileMenu`, `DashboardMobileMenu`).
- Tabs del viaje: `hidden md:flex` — en mobile se usan desde el drawer.
- Padding de página: `px-4 py-6 md:px-6 md:py-8`.
- Botones de acción secundarios en secciones: `hidden md:block` si tienen equivalente en cards mobile.
- El tutorial (`TutorialButton`) solo se muestra en desktop: `hidden md:flex`.
- **Nunca agregar `backdrop-filter` a elementos `sticky`** — rompe el containing block de elementos `fixed`.

## Patrones de componentes

- **Server components** para fetch de datos; **client components** para interactividad (modales, formularios).
- Los modales se manejan con estado local (`useState`) dentro del componente — sin librerías de modal externas.
- El patrón de slots (`React.ReactNode` como props) se usa para pasar server actions a client drawers (ej: `signOutSlot`, `editSlot`).
- Confirmaciones de acciones destructivas: `toast("msg", { action, cancel })` de sonner.
- No usar `backdrop-blur` en ningún elemento padre de elementos `fixed`.

## Componentes UI reutilizables (`components/ui/`)

| Componente | Descripción |
|---|---|
| `date-picker.tsx` | Calendar custom. Props: `name`, `value/onChange`, `defaultValue`, `min/max`, `placeholder`. Lunes primero, español. |
| `location-input.tsx` | Input con Google Maps autocomplete. |
| `upload-photo.tsx` | Upload a Cloudinary con preview. |
| `photo-thumbnail.tsx` | Lightbox para fotos de check-in. |
| `currency-selector.tsx` | Selector de moneda, usa `useCurrency` del provider. |
| `converted-amount.tsx` | Muestra monto convertido a moneda preferida. |
| `auto-refresh.tsx` | Refresca la página en segundo plano. |
| `user-menu.tsx` | Menú de usuario con avatar, currency selector y theme toggle. |
| `theme-toggle.tsx` | Botón 🌙/☀️ para cambiar tema. |
| `tutorial-button.tsx` | Botón `?` que lanza tutoriales driver.js. Solo visible en `md+`. |

## Notificaciones

- `NotificationsProvider` en `src/providers/` (vía `src/app/layout.tsx`) — polling cada 5 min.
- Hook: `useNotifications()` desde `@/modules/notifications/components/notifications-provider`.
- Helpers server-side: `createNotification()` y `createNotificationMany()` desde `@/modules/notifications/lib/notifications`.

## Prisma

- Cliente en `@/lib/prisma`.
- Tipos generados en `src/generated/prisma/` (ignorado en git).
- Importar enums y tipos desde `@/generated/prisma/client`.

## Convenciones generales

- Nombres de archivos: `kebab-case.tsx`.
- Nombres de componentes: `PascalCase`.
- No agregar comentarios salvo que la lógica no sea evidente.
- No agregar manejo de errores para escenarios imposibles.
- No agregar features ni refactors no solicitados.
- Preferir editar archivos existentes sobre crear nuevos.
