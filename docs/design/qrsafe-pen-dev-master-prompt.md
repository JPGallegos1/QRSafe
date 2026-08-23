# Prompt maestro para pen.dev: QRSafe

Diseña en el archivo `.pen` abierto la experiencia web completa de QRSafe. Trabaja directamente sobre el canvas y entrega capas editables, variables y componentes reutilizables. En esta fase no generes código ni modifiques el repositorio de React: primero debe quedar resuelto y validado el sistema visual.

## 1. Contexto del producto

QRSafe verifica la relación entre un código QR y el lugar físico o la organización que declara utilizarlo. No intenta determinar si un QR "parece seguro" ni reemplaza a una billetera, un lector QR o una entidad financiera.

El problema inicial ocurre en espacios como estacionamientos: una persona escanea un QR que funciona, abre una página válida y realiza una transferencia, pero el código podría ser una calcomanía falsa colocada sobre el original. El problema no siempre está dentro del QR; puede ser que ese QR no pertenezca al lugar donde está pegado.

La pregunta que QRSafe responde es:

**¿Este código realmente pertenece acá?**

El producto tiene dos partes complementarias:

1. **Personas, B2C:** la persona inicia voluntariamente una conversación con el canal oficial de QRSafe en WhatsApp y envía una fotografía del QR junto con el cartel o contexto donde aparece. La respuesta también llega por WhatsApp.
2. **Empresas, B2B:** una organización valida su identidad, registra puntos de cobro y asocia a cada punto sus QR estáticos autorizados. Este registro es la fuente con la que se contrasta la consulta de la persona.

## 2. Verdad del producto y límites

Todo el diseño y el copy deben respetar estas reglas:

- QRSafe verifica una relación registrada entre organización, punto físico y QR; no garantiza que una transacción sea segura.
- Nunca utilizar afirmaciones amplias como "pago seguro", "QR libre de fraude" o "protección total".
- Un QR desconocido no debe llamarse fraudulento.
- "Fuera de cobertura" significa que no existe información suficiente para confirmar o descartar. No es una alerta.
- "Ilegible" significa que la imagen no pudo procesarse. No dice nada sobre la legitimidad del código.
- "No autorizado" sólo puede utilizarse dentro de un dominio cerrado con inventario conocido, donde la ausencia del código sí constituye evidencia.
- "Anómalo" sólo corresponde cuando existe algo verificablemente incorrecto dentro del código.
- En una respuesta positiva utilizar expresiones como "registrado", "binding activo" y "autorizado por la organización para este punto".
- El bot nunca inicia una conversación.
- El bot no solicita datos personales, no cobra y no procesa pagos dentro de WhatsApp.
- El registro, la habilitación y cualquier pago futuro deben ocurrir en la plataforma web, nunca en el chat.
- El gateway B2C de identidad y suscripción forma parte de la arquitectura de producto, pero todavía no hay precio ni checkout definidos. No inventar planes, precios ni una compra funcional.
- No inventar clientes, logos, testimonios, métricas, certificaciones, integraciones bancarias, proveedores KYB ni resultados comerciales.
- La validación empresarial es manual en el MVP.
- El MVP actual admite una empresa por cuenta, puntos de cobro y QR de pago EMV estáticos reutilizables.
- El panel actual permite crear la empresa, enviar sus datos a revisión, crear puntos, previsualizar un QR y activar su binding. No diseñar revocación, alertas, API pública, roles o equipos como capacidades disponibles. Si se mencionan, deben estar claramente marcadas como futuras.

## 3. Objetivo de conversión

La landing principal está orientada primero a personas.

- Acción principal: **"Verificar un QR por WhatsApp"**.
- Acción secundaria: **"Ver cómo funciona"**.
- Incluir `Empresas` como opción visible en el header y como ruta pública propia.
- No mostrar tablas de precios.
- Para captar demanda B2C utilizar un formulario mínimo de acceso o novedades con un solo campo de email.
- Para empresas utilizar "Agendar una demo" como CTA principal y un formulario mínimo de hasta dos campos: email laboral y organización opcional.
- Si todavía no existe URL final de WhatsApp, calendario o backend de leads, indicar el destino como placeholder claramente anotado; no fingir que la integración existe.
- Tomar de Certenza únicamente la decisión comercial de convertir mediante demo y captura mínima de leads sin publicar planes. No copiar su composición, identidad, textos ni recursos visuales.

## 4. Dirección visual

Construye una identidad propia: **señalética urbana contemporánea + sello de inspección verificable**.

La interfaz debe sentirse cívica, precisa, humana y confiable, no como un producto genérico de ciberseguridad. La memoria visual debe ser la relación física entre cartel, ubicación y código, no un escudo flotante ni una grilla de tarjetas SaaS.

### Paleta

- Fondo principal: blanco `#FFFFFF`.
- Superficie secundaria: verde muy pálido cercano a `#F3F8F5`.
- Texto principal: tinta verdosa muy oscura cercana a `#0B1B13`.
- Marca y acción primaria: `#169D53`.
- Verde profundo para secciones de contraste: cercano a `#0D2A1D`.
- Verde claro de señal para el panel oscuro: cercano a `#7CF1B6`.
- Ámbar y rojo exclusivamente para estados semánticos; nunca como decoración.
- El verde `#169D53` debe conservar fuerza de conversión. No diluirlo en fondos, ornamentos y textos sin jerarquía.
- Evitar gradientes decorativos, glassmorphism, halos neón y sombras excesivas.

### Tipografía

- Display y titulares: **Barlow Condensed**, con escala grande, directa y vinculada a señalética pública.
- Cuerpo e interfaz: **Manrope**.
- Datos técnicos, fingerprints y payloads: una mono del sistema.
- No usar una serif editorial ni una tipografía futurista genérica.

### Componentes y forma

- El canvas contiene un sistema de componentes shadcn/ui. Inspecciónalo y reutiliza instancias de sus botones, inputs, badges, alerts, dialogs, tabs y tablas antes de crear componentes nuevos.
- Personaliza el sistema mediante variables de QRSafe; no dejes la apariencia shadcn por defecto.
- No conviertas cada párrafo o beneficio en una card.
- Radios moderados, bordes finos y superficies mayormente planas.
- Utiliza Lucide para iconografía funcional. No dibujes manualmente un logo final: usa una marca tipográfica `QRSafe` y un símbolo provisional basado en `ScanLine`, claramente editable.
- Los estados nunca dependen sólo del color: combinar icono, nombre, explicación y forma.

### Imagen y demostración

- El primer viewport debe mostrar el mecanismo real: un parquímetro o cartel de pago con su QR físico y una capa visual que conecta **lugar → organización → código**.
- Crear o conseguir una imagen decisiva del contexto físico. Si es generada o sintética, etiquetarla como material provisional dentro del canvas.
- No resolver el hero con un dashboard dentro de una laptop ni con un teléfono genérico aislado.
- Puede existir una secuencia visual de "calcomanía superpuesta" para explicar la sustitución, pero debe ser sobria y comprensible, no alarmista.
- El gesto visual distintivo será una línea de binding o registro que une el código, el cartel y la organización responsable.

## 5. Copy base de la landing B2C

Utiliza español rioplatense claro y consistente, con voseo. No uses lorem ipsum.

### Header

- Marca: `QRSafe`
- Navegación: `Cómo funciona`, `Respuestas`, `Cobertura`, `Empresas`
- CTA: `Verificar por WhatsApp`

### Hero

- Eyebrow: `VERIFICACIÓN DE QR EN WHATSAPP`
- Título: **`Que un QR funcione no significa que sea el correcto.`**
- Bajada: `Antes de pagar o abrir un enlace, enviá una foto por WhatsApp. QRSafe contrasta el código, la organización declarada y el lugar donde aparece.`
- CTA principal: `Verificar un QR por WhatsApp`
- CTA secundaria: `Ver cómo funciona`
- Microcopy: `QRSafe nunca te escribe primero. No pedimos datos ni cobramos por WhatsApp.`

### Problema

Componer una secuencia narrativa breve:

- `El QR funcionó.`
- `La página abrió.`
- `La transferencia se procesó.`
- `Pero el código podía no pertenecer a ese lugar.`

Cerrar con: `Un código técnicamente válido también puede llevarte al destino equivocado.`

### Tesis

- Título: `No verificamos sólo el código. Verificamos la relación.`
- Explicar visualmente tres entidades conectadas: `QR`, `Organización`, `Lugar físico`.
- Texto: `QRSafe compara el contenido exacto del QR con un registro autorizado para ese punto.`

### Cómo funciona

Mostrar tres pasos claros, no tres tarjetas idénticas:

1. `Sacá una foto` — incluir el QR y el cartel o contexto visible.
2. `Enviala por WhatsApp` — la conversación siempre la inicia la persona.
3. `Recibí una respuesta precisa` — QRSafe comunica qué pudo comprobar y qué no.

### Sistema de respuestas

Diseñar un único instrumento o escala de resultados, no cinco cards repetidas:

- `Verificado`: autorizado por el emisor declarado para ese punto.
- `No autorizado`: contradice un inventario cerrado y conocido.
- `Fuera de cobertura`: todavía no hay información suficiente; no es una alerta.
- `Anómalo`: existe algo verificablemente incorrecto dentro del código.
- `Ilegible`: la imagen no pudo procesarse; intentá nuevamente.

Agregar una nota visible: `QRSafe sólo alerta cuando existe evidencia concreta.`

### Confianza del canal

- Título: `WhatsApp se usa para verificar. Nada más.`
- `Vos iniciás la conversación.`
- `El bot no solicita datos personales.`
- `El bot no cobra ni procesa pagos.`
- `El registro y la habilitación ocurren fuera del chat.`

### Cobertura conectada

- Título: `La cobertura empieza con organizaciones que registran sus QR.`
- Mostrar cómo la red B2B alimenta las respuestas B2C sin recurrir a un mapa falso ni métricas inventadas.
- CTA: `Conocer QRSafe para empresas`.

### Captura de leads B2C

- Título: `Quiero probar QRSafe.`
- Campo: `Tu email`
- CTA: `Avisarme cuando tenga acceso`
- Microcopy breve de privacidad, sin inventar términos legales completos.

### FAQ

Incluir al menos estas preguntas:

- `¿QRSafe me asegura que el pago es seguro?`
- `¿Qué significa fuera de cobertura?`
- `¿Por qué tengo que enviar también el cartel?`
- `¿QRSafe puede escribirme primero?`
- `¿Tengo que descargar una aplicación?`
- `¿Qué pasa si la foto no se puede leer?`

### Cierre

- Título: **`Antes de pagar, comprobá si ese QR realmente pertenece ahí.`**
- CTA: `Verificar por WhatsApp`
- Secundario: `Quiero recibir novedades`

## 6. Landing de Empresas

Crear una ruta pública independiente accesible desde el header. Debe compartir marca con B2C, pero hablarle a municipios, operadores de estacionamiento, transporte, cadenas comerciales y organizaciones con QR expuestos en espacios físicos.

### Hero Empresas

- Eyebrow: `QRSAFE PARA EMPRESAS`
- Título: **`Sepan cuáles de sus QR siguen autorizados después de imprimirlos.`**
- Bajada: `Registren la organización, sus puntos de cobro y los QR oficiales de cada ubicación para ofrecer una respuesta verificable frente a posibles sustituciones.`
- CTA principal: `Agendar una demo`
- CTA secundaria: `Ingresar al panel`

### Narrativa Empresas

- Explicar la secuencia real: `Validar organización → crear punto de cobro → registrar QR estático → activar binding`.
- Mostrar una demostración visual del registro, con organización, dirección, estado y fingerprint del QR.
- Explicar por qué estacionamientos y municipios son el primer segmento: espacio público, ubicaciones conocidas e inventario acotado.
- Mostrar la conexión B2B2C: las empresas construyen cobertura; las personas consultan esa cobertura antes de pagar.
- No mostrar métricas ficticias, dashboards de ingresos ni logos de clientes.
- No presentar alertas, revocación o API como disponibles hoy.

### Lead Empresas

- Título: `Conversemos sobre su red de QR.`
- Campos: `Email laboral` y `Organización (opcional)`.
- CTA: `Solicitar una demo`.
- Si no existe calendario, el CTA abre este formulario; no simular una agenda conectada.

## 7. Flujos funcionales a diseñar

Además de las dos landing pages, diseñar los flujos clave del producto. Mantener una sola acción dominante por pantalla y representar loading, vacío, error, éxito y restricciones cuando correspondan.

### B2C web gate, sin checkout ficticio

Diseñar estos estados como flujo futuro claramente etiquetado en el canvas:

1. `Acceso requerido`: la persona llegó desde WhatsApp pero todavía no está habilitada.
2. `Solicitar acceso`: email como único campo principal.
3. `Solicitud recibida`: confirmación y explicación de próximos pasos.
4. `Continuar en WhatsApp`: cuenta habilitada y CTA para volver al canal.

No diseñar precios ni pago hasta que el negocio los defina.

### Panel Empresas, comportamiento actual

Preservar el flujo que ya existe en `apps/admin`:

1. Crear cuenta o iniciar sesión con email y contraseña.
2. Registrar empresa: razón social, CUIT e identidad del representante.
3. Enviar a revisión manual y mostrar estados `pendiente`, `verificada` y `rechazada`.
4. Crear un punto de cobro con nombre y dirección.
5. Seleccionar un punto y subir una imagen de QR.
6. Mostrar preview del QR: tipo, cuentas detectadas, payload o fingerprint técnico.
7. Pedir confirmación explícita de que el destino está autorizado por la empresa.
8. Activar el binding.
9. Mostrar recibo con empresa, punto, fingerprint y estado `activo`.
10. Mostrar la lista de bindings registrados.

El panel puede conservar el lenguaje de consola oscura existente: fondo tinta, instrumentos de estado y verde claro como señal. Debe seguir perteneciendo a la misma marca, pero no copiar la composición aireada de marketing.

No convertir el panel en una cuadrícula de métricas. La secuencia operativa visible es:

`Empresa → Identidad → Punto → Binding`

## 8. Frames requeridos

Organiza el canvas de izquierda a derecha y de arriba hacia abajo. Conserva intacto el frame maestro del kit shadcn y utiliza instancias de sus componentes.

Crear como frames de primer nivel:

1. `00 — QRSafe Foundations`
2. `01 — Landing B2C / Desktop 1440`
3. `02 — Landing B2C / Mobile 390`
4. `03 — Empresas / Desktop 1440`
5. `04 — Empresas / Mobile 390`
6. `05 — Lead capture / Dialog + Mobile sheet`
7. `06 — B2C gate / Key states`
8. `07 — Admin access / Desktop + Mobile`
9. `08 — Admin onboarding / Empresa + Identidad`
10. `09 — Admin points / Empty + Created`
11. `10 — Admin binding / Upload + Preview`
12. `11 — Admin binding / Active receipt + Inventory`
13. `12 — Responsive and state annotations`

Si el trabajo debe dividirse en fases, priorizar en este orden:

1. Foundations y landing B2C completa en desktop y mobile.
2. Empresas y captación de leads.
3. Gate B2C.
4. Panel operativo y sus estados.

No detenerse después del hero ni entregar wireframes grises. Cada fase debe quedar en fidelidad alta antes de avanzar.

## 9. Responsividad y accesibilidad

- Diseñar desktop y mobile como composiciones deliberadas, no como una reducción proporcional.
- Soportar conceptualmente desde 320 px.
- En mobile, header compacto con menú, CTA visible y sin overflow horizontal.
- Objetivos táctiles de al menos 44 px.
- Texto de cuerpo de al menos 14 px y longitud legible.
- Contraste WCAG AA.
- Focus visible en controles.
- Estados comunicados con texto e icono además del color.
- Formularios con labels reales, ayuda, error y confirmación.
- Dialog en desktop y sheet de ancho completo en mobile para captura de leads.
- Tablas del panel deben convertirse en filas apiladas legibles en mobile.
- Incluir una propuesta de `prefers-reduced-motion` en las anotaciones.

## 10. Movimiento propuesto

El diseño debe funcionar estático. Anotar únicamente movimiento con propósito:

- En el hero, una transición breve puede revelar la calcomanía superpuesta y luego la relación correcta entre lugar y QR.
- La línea de binding puede dibujarse una sola vez al entrar en viewport.
- Los estados de análisis pueden pasar de `Leyendo el código…` a su resultado sin loops decorativos.
- Evitar animaciones perpetuas salvo un indicador de proceso real.

## 11. Criterios de calidad y verificación

Antes de considerar el trabajo terminado:

- Verificar cada frame inmediatamente después de completarlo.
- Confirmar que ninguna sección esté colapsada, cortada o fuera del frame.
- Confirmar alineación, ritmo, contraste y lectura real del copy.
- Confirmar que el primer viewport explica qué es QRSafe, por qué importa y qué debe hacer la persona.
- Confirmar que `Empresas` sea visible desde el header y tenga una ruta clara.
- Confirmar que el CTA B2C dominante sea WhatsApp y el CTA B2B dominante sea demo.
- Confirmar que no aparezcan precios, clientes, métricas o capacidades inventadas.
- Confirmar que "fuera de cobertura" e "ilegible" no parezcan alertas de fraude.
- Confirmar que el panel conserva exactamente sus tareas actuales.
- Utilizar contenido final en español; no usar placeholders genéricos salvo URLs e integraciones todavía no definidas.
- Mantener capas, componentes y nombres ordenados para que otra persona pueda continuar el trabajo o generar React desde el `.pen` aprobado.

El resultado debe sentirse como una infraestructura de confianza vinculada al mundo físico: clara para una persona que está por pagar, y operativa para una organización que necesita demostrar qué QR autorizó en cada lugar.
