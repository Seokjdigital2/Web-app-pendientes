# Panel de Pendientes — KJ Publicidad

Web app de Next.js que reemplaza el artefacto de Claude. Guarda sus datos en una
base de datos Postgres (Neon), para que los cambios se vean en todos los
dispositivos.

## Pestañas

- **Hoy** — lo que está programado para el día de hoy (incluye proyección de recurrentes).
- **Pendientes** — todos los pendientes activos, con filtros por prioridad.
- **Hechos** — historial de lo completado.
- **Calendario** — vista de mes y vista de matriz (lista de actividades por día).
- **Gantt** — Super Gantt y Gantt por cliente, alimentado por juntas de Tactiq y por los pendientes del panel.

## Desarrollo local

```bash
npm install
npm run dev
```

Sin `DATABASE_URL` configurada, la app corre en modo de solo lectura con los
datos de ejemplo en `seed-data/` (útil para probar la interfaz sin tocar la
base de datos real).

## Conectar la base de datos (Neon en Vercel)

1. En el proyecto de Vercel, pestaña **Storage** → **Create Database** → **Neon (Postgres)**.
   Esto agrega automáticamente la variable `DATABASE_URL` al proyecto.
2. Copia esa misma `DATABASE_URL` a tu `.env.local` (o cópiala de Vercel → Settings → Environment Variables).
3. Corre las migraciones y la carga inicial de datos (una sola vez):

   ```bash
   DATABASE_URL="postgres://..." npm run db:migrate
   DATABASE_URL="postgres://..." npm run db:seed
   ```

   `db:seed` carga los 250 pendientes, los 10 clientes y las 104 tareas de
   Gantt que ya existían en el artefacto original (archivos en `seed-data/`).
   Usa `ON CONFLICT ... DO UPDATE`, así que se puede correr más de una vez sin
   duplicar nada.

## Desplegar en Vercel

1. Sube este repo a GitHub (ya está vinculado a `Seokjdigital2/Web-app-pendientes`).
2. En Vercel: **Add New Project** → importa el repo de GitHub.
3. Conecta la base de datos Neon (paso anterior) antes o después del primer deploy.
4. Deploy. Cada push a `main` vuelve a desplegar automáticamente.

## Estructura

- `app/` — páginas y rutas de API (Next.js App Router).
- `components/` — las 5 pestañas y piezas compartidas (tabla agrupada, modal de día, grid de Gantt).
- `lib/logic.js` — fechas, recurrencias, colores de cliente.
- `lib/gantt.js` — lógica del Gantt (ventana de 5 semanas, filtros por persona, tareas sintéticas desde el panel).
- `lib/store.js` — acceso a datos (Postgres o, si no hay `DATABASE_URL`, los JSON de `seed-data/`).
- `scripts/migrate.mjs` / `scripts/seed.mjs` — crear tablas y cargar los datos iniciales.

## Notas de la migración

- El Gantt ya no sincroniza en vivo con Tactiq (eso vivía dentro de Claude). Los
  datos de juntas que ya existían se migraron tal cual a la tabla `clients`
  (campo `meetings` / `last_meeting`). Para añadir juntas nuevas, hay que
  insertar manualmente en esa tabla (o pedirle a Claude que lo haga por ti
  contra la base de Neon).
