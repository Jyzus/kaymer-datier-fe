# Datier — Guía de diseño

Datier es un editor visual de bases de datos (fork de erd-editor) con persistencia
real e IA integrada. Esta guía documenta el sistema de diseño de la **capa de
aplicación** (`packages/app`): el dashboard, el sidebar y los diálogos que envuelven
al web component del editor.

## Principios

1. **El motor es identidad, no configuración volátil.** El motor de base de datos se
   elige al crear el esquema y se mantiene fijo. Por eso lo tratamos como un atributo
   estable y reconocible: se muestra siempre (badge), define los tipos disponibles y
   solo se cambia desde una acción deliberada con advertencia.
2. **Utilidad primero, con una firma.** Es una herramienta de trabajo: prioriza
   claridad, densidad cómoda y jerarquía. La única pieza "de marca" es el **badge de
   identidad de motor**; todo lo demás se mantiene tranquilo y consistente.
3. **Rigidez blanda.** Guiamos sin bloquear. La validación de tipos avisa (subrayado
   + tooltip) pero nunca impide escribir; los motores no soportados no se ocultan, se
   marcan.
4. **Español, voz activa.** La interfaz está en español, en minúsculas de oración,
   verbos directos ("Crear esquema", "Convertir aquí"). Una acción conserva su nombre
   en todo el flujo.

## Color

Los colores de superficie, texto y acento se toman de los **tokens de Radix Themes**
(`--gray-*`, `--accent-*`), por lo que el tema claro/oscuro y el color de acento son
configurables sin tocar CSS.

| Rol | Token | Uso |
|---|---|---|
| Fondo del sidebar | `--gray-2` | Panel lateral |
| Borde / divisor | `--gray-6` | Borde derecho del sidebar |
| Hover de fila | `--gray-4` | Fila de esquema en hover (si no está seleccionada) |
| Fila seleccionada | `--accent-4` + barra `--accent-9` | Esquema activo (barra de acento a la izquierda) |
| Texto primario | `--gray-12` | Nombres de esquema |
| Texto secundario | `--gray-10` / `--gray-11` | Etiquetas de sección, meta, contadores |
| Acción primaria | `--accent-*` (solid) | Botón "Crear esquema" |
| Aviso (validación) | `--red-9` | Subrayado de tipo de dato no reconocido |

### Paleta de identidad de motores

Cada motor tiene un color y un monograma. Los colores buscan **tonos distintos** entre
sí; el significado nunca depende solo del color: el monograma y el tooltip cargan la
identidad (accesible para daltonismo). Definidos en
`packages/app/src/utils/databaseVendor.ts`.

| Motor | Monograma | Color | Nota |
|---|---|---|---|
| PostgreSQL | `PG` | `#336791` | Azul acero |
| MySQL | `MY` | `#E48E00` | Ámbar |
| MariaDB | `MA` | `#955A3E` | Marrón |
| SQL Server (MSSQL) | `MS` | `#7A1F2B` | Carmesí oscuro |
| Oracle | `OR` | `#E4342B` | Rojo |
| SQLite | `SL` | `#2AA0D6` | Azul cielo |
| — (sin definir) | `DB` | `#6B7280` | Esquemas creados antes del campo `database` |

## Tipografía

Se hereda la tipografía de Radix Themes (sistema/Inter). No se cambia la familia
global; la personalidad se logra con **escala, peso y espaciado**:

| Elemento | Tamaño | Peso | Notas |
|---|---|---|---|
| Nombre de esquema | `size="2"` | regular | Truncado con elipsis + `title` completo |
| Etiqueta de sección ("ESQUEMAS") | 11px | 600 | Mayúsculas, `letter-spacing: 0.06em`, `--gray-10` |
| Contador | 11px | 600 | `tabular-nums`, `--gray-9` |
| Monograma del badge | 50% del tamaño del badge | 700 | Blanco sobre color de marca |
| Título de diálogo | `Dialog.Title` | — | Radix |

## Espaciado y layout

- **Sidebar**: ancho fijo `260px`, fondo `--gray-2`, borde derecho `--gray-6`.
- **Estructura vertical**: cabecera (volver a Proyectos + "Crear esquema") →
  etiqueta de sección con contador → lista desplazable de esquemas.
- **Fila de esquema**: alto `34px`, `radius-2`, `gap: 8px` entre badge, nombre y
  acciones. Iconos de acción (menú, colaboración) ocultos hasta hover.
- **Ritmo**: separación de `4px` (`gap="1"`) entre filas; padding horizontal `12px`
  en la lista, `16px` en la etiqueta de sección.

## Componentes

### Badge de identidad de motor — la firma
`packages/app/src/components/database-badge/DatabaseBadge.tsx`

Cuadrado redondeado (radio 5px) con el color de marca del motor y el monograma en
blanco. Acepta `size` (18px por defecto en el sidebar, 16px en el selector). Incluye
`title`/`aria-label` con el nombre completo del motor. Un borde interior translúcido
(`inset ... rgba(255,255,255,.14)`) mantiene el contraste en claro y oscuro.

Se usa en: cada fila del sidebar, cada opción del selector de motor al crear un
esquema. (Extensible al dashboard y a la cabecera del editor.)

### Fila de esquema (SidebarItem)
`badge · nombre (elipsis) · [colaboración] · [menú ⋯]`. Estados:
- **Hover** (no seleccionada): fondo `--gray-4`; aparecen iconos de acción.
- **Seleccionada**: fondo `--accent-4` + barra de acento `--accent-9` a la izquierda
  (`box-shadow: inset 2px 0 0`). El hover no enmascara la selección
  (`:not([data-selected='true']):hover`).
- **Renombrar**: doble clic o menú → input en línea.

### Diálogo de creación de esquema
`packages/app/src/components/sidebar/Sidebar.tsx`. Modal (`Dialog.Root`) con
formulario: **nombre** (requerido) + **motor** (requerido, sin preselección, con badge
en cada opción). "Crear esquema" queda deshabilitado hasta completar ambos. Mismo
patrón que "Nuevo Proyecto" del dashboard.

### Campo de tipo de dato (rigidez blanda)
`packages/erd-editor/.../column-data-type/ColumnDataType.ts`. Autocompletado acotado
al motor del esquema (`threshold: 0.3`), con catálogo completo al enfocar vacío. Si el
tipo base no se reconoce para el motor, se marca con subrayado `--red-9` + tooltip,
sin bloquear.

## Estados vacíos y errores

- **Sin esquemas**: mensaje en `--gray-10` que invita a la acción ("Aún no hay
  esquemas. Crea el primero…"), no un vacío mudo.
- **Errores/validación**: describen el problema en la voz de la interfaz, sin
  disculpas ni ambigüedad.

## Localización

La interfaz de la app está en **español**. Nombres de acciones consistentes de
principio a fin (el botón "Crear esquema" abre el diálogo "Crear esquema"). Los
identificadores técnicos (nombres de motores, tipos SQL) se mantienen en su forma
canónica.

## Pendientes / ideas

- Llevar el badge de motor al dashboard (tarjetas de proyecto) y a la cabecera del
  editor.
- Filtro/orden de esquemas por motor cuando la lista crezca.
- Íconos de marca reales (SVG) como evolución del monograma, manteniendo el color.
