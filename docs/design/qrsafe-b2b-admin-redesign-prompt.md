# Prompt maestro: rediseño B2B Admin de QRSafe

## Uso

Usar este prompt para continuar el diseño en Pencil o implementar el panel en `apps/admin`. Este documento reemplaza, para el panel administrativo, la dirección visual oscura descrita en la sección 7 de `qrsafe-pen-dev-master-prompt.md`. No modifica la landing pública B2C ni incluye una landing pública de Empresas en esta fase.

## Prompt

Rediseñá el panel B2B de QRSafe como una aplicación operativa responsive, en español y de alta fidelidad. Tomá la landing B2C ya aprobada como autoridad de marca, pero no copies su composición de marketing. Trasladá su claridad, su jerarquía editorial y su forma de presentar evidencia a una interfaz de trabajo más densa.

### Objetivo del producto

QRSafe registra una relación verificable entre:

`Organización → Punto de cobro → QR autorizado`

El panel debe permitir que una organización complete el flujo MVP actual:

1. Crear una cuenta o iniciar sesión con email y contraseña.
2. Registrar nombre comercial, CUIT y persona responsable.
3. Enviar la identidad a revisión manual.
4. Mostrar revisión pendiente, aprobada o rechazada.
5. Crear y seleccionar un punto de cobro.
6. Subir una imagen PNG, JPG o WEBP de un QR estático.
7. Mostrar la lectura previa del QR y toda la evidencia relevante disponible.
8. Pedir confirmación explícita de que el destino detectado está autorizado por la organización.
9. Activar el binding.
10. Mostrar un recibo con organización, punto, fingerprint y estado activo.
11. Mostrar los bindings registrados del punto seleccionado.

No agregues edición, eliminación, revocación, alertas, analítica, equipos, roles, APIs bancarias ni otras capacidades que el producto todavía no tiene.

### Verdad y lenguaje

- QRSafe prueba cobertura de registro y autorización declarada por la organización.
- No afirma que un pago sea seguro.
- No acredita titularidad bancaria.
- No llama fraudulento a un QR desconocido.
- Usá `organización`, `punto de cobro`, `QR autorizado`, `binding activo`, `registrado` y `autorizado por la organización`.
- Evitá `merchant`, `flight strip`, `radar`, `pago seguro` y promesas amplias.
- Cada resultado positivo debe mantener visibles la organización, el punto y el código.

### Dirección visual

Construí un **registro operativo de cobertura**:

- Lienzo principal blanco o verde muy pálido.
- Navegación lateral verde profundo en desktop y barra superior compacta verde profundo en mobile.
- Verde profundo también para instrumentos de evidencia, recibos técnicos y encabezados de consola.
- Verde de marca para acciones primarias, selección y estados positivos.
- Verde menta sólo como señal sobre fondos oscuros.
- Ámbar para revisión pendiente.
- Rojo para rechazo o error.
- No uses color semántico como decoración.

Reutilizá las variables existentes del documento Pencil: `qr-bg`, `qr-surface`, `qr-ink`, `qr-brand`, `qr-deep`, `qr-signal`, `qr-border`, `qr-muted`, `qr-amber`, `qr-red`, `qr-font-display` y `qr-font-body`. No dupliques tokens.

Usá:

- Barlow Condensed para títulos de operación.
- Manrope para interfaz, formularios y explicaciones.
- Roboto Mono únicamente para fingerprints, payloads, destinos, estados técnicos y fechas tabulares.

No conviertas el panel en una cuadrícula de tarjetas o métricas. Cada pantalla debe tener una región dominante, una pregunta principal y una acción primaria. Separá estructura con superficies, ritmo y divisores continuos antes que con sombras o contenedores anidados.

### Arquitectura de la interfaz

#### Desktop

- Frame de referencia: `1440 × 1024`.
- Sidebar fija de aproximadamente `240 px`.
- Barra superior clara con nombre de pantalla, contexto y estado de verificación.
- Progreso horizontal de cuatro etapas: `Organización`, `Revisión`, `Punto de cobro`, `QR autorizado`.
- Área de trabajo única y dominante debajo del progreso.
- El primer viewport debe mostrar el estado actual y la siguiente acción sin scroll.

#### Mobile

- Frame de referencia: `390 × 844`, soportando conceptualmente desde `320 px`.
- Reemplazá la sidebar por una barra compacta con marca y cierre de sesión.
- Mostrá el progreso como cuatro controles pequeños, legibles y no desplazables.
- Apilá contexto, evidencia y acción en una sola columna.
- Convertí tablas en filas apiladas.
- Controles principales de al menos `44 px`.

### Pantallas y estados requeridos

Diseñá como frames de primer nivel:

1. `B2B Admin / Acceso` en desktop y mobile.
2. `B2B Admin / Registrar organización` en desktop y mobile.
3. `B2B Admin / Enviar a revisión`.
4. `B2B Admin / Revisión pendiente`.
5. `B2B Admin / Revisión rechazada`.
6. `B2B Admin / Crear punto de cobro`.
7. `B2B Admin / Cargar QR`.
8. `B2B Admin / Confirmar QR` en desktop y mobile.
9. `B2B Admin / Binding activo` en desktop y mobile.

También contemplá en componentes o anotaciones: carga inicial, acción ocupada, error contextual, estado vacío, foco, hover y disabled.

### Requisitos por pantalla

#### Acceso

- Composición dividida en desktop: propuesta B2B oscura a la izquierda y formulario claro a la derecha.
- La propuesta debe visualizar la cadena `Organización → Punto → QR`, no una ilustración genérica de seguridad.
- Selector claro entre crear cuenta e iniciar sesión.
- Email laboral, contraseña y explicación de la revisión manual.
- En mobile, resumí la propuesta y priorizá el formulario.

#### Organización

- Presentá la identidad como la evidencia que aparecerá en consultas futuras.
- Campos con labels reales: nombre comercial, CUIT y persona responsable.
- Acción dominante: `Guardar y continuar`.
- No uses placeholders genéricos en el diseño aprobado.

#### Revisión

- Antes de enviar, mostrale a la persona un dossier legible con todos los datos.
- Acción dominante: `Enviar a verificación`.
- En estado pendiente, no inventes polling, tiempos de aprobación ni controles que el API no ofrece.
- En estado rechazado, no inventes un motivo específico. Explicá que la presentación requiere una nueva revisión y ofrecé `Volver a enviar`.
- Mostrá que puntos y QR permanecen bloqueados hasta la aprobación.

#### Punto de cobro

- Explicá que el punto vincula un QR con una ubicación reconocible.
- Campos: nombre y dirección opcional.
- Acción dominante: `Crear punto`.
- Luego de crearlo, mantené el punto seleccionado visible antes de cargar el QR.

#### Carga y lectura del QR

- Mantené visible la organización y el punto seleccionados.
- Aceptá visualmente PNG, JPG o WEBP hasta 20 MB.
- Durante la lectura usá copy específico: `Leyendo el código…`.
- En la lectura previa mostrá como mínimo tipo, país, moneda, todos los destinos detectados, esquema, método o intentos de lectura y una representación truncada del payload exacto.
- No muestres ramas imposibles si el API ya rechaza esas condiciones antes de devolver el preview.
- Si el API devuelve detalles estructurados de error, ubicálos junto al instrumento de carga o lectura que falló.

#### Confirmación

- La confirmación del destino es obligatoria y no puede estar preseleccionada en producción.
- Copy: `Confirmo que este destino está autorizado por mi organización.`
- Explicá que QRSafe registra el payload exacto sin recortarlo ni normalizarlo.
- Acción dominante: `Activar binding`.

#### Binding activo

- El recibo debe mostrar organización, punto, fingerprint completo y estado.
- El título debe nombrar el punto: `QR autorizado para [punto].`
- La lista inferior debe estar filtrada por el punto seleccionado o indicar su alcance de forma inequívoca.
- Nunca muestres como recibo principal el último binding de otro punto.
- Acción secundaria: `Registrar otro QR`.

### Componentes

- Marca QRSafe con `ScanLine`, sin tratamientos de logo alternativos.
- Navegación estable para `Operación`, `Puntos de cobro` y `QR registrados`.
- Badge de verificación con icono y texto, nunca sólo color.
- Progreso de cuatro pasos con estado completo, actual y bloqueado.
- Campos, botones y zonas de carga con foco visible.
- Instrumentos de relación para organización, punto y QR.
- Recibo activo y registro técnico con valores monoespaciados.
- Mensajes de error junto a la tarea que falló.

### Accesibilidad y comportamiento

- Contraste WCAG AA.
- Texto de cuerpo de `14 px` como base en producción; metadatos técnicos pueden ser menores si conservan contraste y legibilidad.
- Labels reales y mensajes asociados a los campos.
- Foco visible en todos los controles.
- Estados comunicados con icono, texto y color.
- Radiogroups con navegación de teclado o controles nativos equivalentes.
- Toggles con `aria-expanded` y `aria-controls` cuando revelan formularios.
- `role="alert"` para errores y regiones live apropiadas para lectura, confirmación y binding activo.
- `prefers-reduced-motion` debe eliminar cualquier transición no esencial.
- Evitá animaciones perpetuas; reservá movimiento para lectura real, confirmación y cambios de estado.

### Criterios de aceptación

- El flujo MVP completo puede recorrerse visualmente de acceso a binding activo.
- Desktop y mobile son composiciones deliberadas, no escalas proporcionales.
- La interfaz pertenece a la misma marca que la landing sin parecer una landing dentro del panel.
- La siguiente acción es evidente en cada pantalla.
- No hay métricas, clientes, integraciones ni capacidades inventadas.
- Organización, punto y QR permanecen asociados en toda lectura o resultado.
- Ningún contenido queda cortado, colapsado o fuera del frame.
- Las capas y componentes tienen nombres comprensibles para continuar el trabajo o implementar React desde el `.pen` aprobado.

## Referencia en Pencil

La primera versión de esta dirección quedó representada en los frames `10 — B2B Admin / Acceso` a `23 — B2B Admin / Binding activo móvil`, junto con el componente reusable `B2B Component / Sidebar`.
