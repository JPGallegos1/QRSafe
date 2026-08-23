# Kapso — qué incluye el plan gratuito

> Fecha: 2026-08-22 · Alcance: cuotas, techos y precios del plan Free de Kapso, y su frontera con los cargos que cobra Meta por mensajes de WhatsApp. Cubre volumen de mensajes, números conectados, almacenamiento de media, funciones serverless, eventos de proyecto, logs, transcripción, rate limits, retención y el número de sandbox. **No** cubre alta productiva en Meta, comparación con otros BSPs, ni el detalle tarifario país por país de Meta. · Método: (1) descarga completa del corpus documental oficial `https://docs.kapso.ai/llms-full.txt` (HTTP 200, 615.201 bytes, versión del 2026-08-22) y búsqueda sistemática sobre él; (2) descarga de la página de precios `https://kapso.com/pricing` (HTTP 200, 23.444 bytes) y extracción del **payload JSON de planes embebido en el HTML**, que es más detallado que la tabla renderizada; (3) contraste de la tabla de la doc contra ese payload; (4) documentación oficial de Meta para los cargos de mensajes; (5) consultas de **solo lectura** al CLI `@kapso/cli` 0.18.0 autenticado como `actassi@gmail.com`, proyecto QRSafe. Sin cambios de configuración, sin envío de mensajes.

## Resumen ejecutivo

**El plan Free de Kapso tiene un techo duro y bien definido: 2.000 mensajes por mes.** [PRIMARIA] Y el detalle que decide todo: Kapso cuenta **los mensajes entrantes y los salientes** contra esa cuota, no sólo los que el bot envía. Una verificación de QR consume como mínimo 2 mensajes (la foto que entra, la respuesta que sale). El techo real del plan gratuito, entonces, es del orden de **1.000 verificaciones por mes**, no 2.000.

**Lo que se agota primero es el contador de mensajes, y con margen amplio sobre todo lo demás.** El almacenamiento de media (1 GB) aguanta ~8.900 imágenes al tamaño medido empíricamente (118 KB por foto de WhatsApp); a 1.000 verificaciones/mes tarda unos 8-9 meses en llenarse. Las funciones serverless (100.000/mes) dan 100 invocaciones por cada mensaje del cupo. El rate limit de 100 req/min no es un problema para un bot conversacional. **El cuello de botella es uno solo y es el volumen de mensajes.**

**Se encontró una fuente mejor que la tabla publicada.** La página de precios de Kapso incluye en su HTML un objeto JSON con los límites de cada plan campo por campo — incluidos precios de excedente, retención de eventos y cuotas que la tabla de la documentación no menciona (eventos de proyecto, logs, transcripción de audio, créditos de IA). Ese payload es la fuente más granular disponible sin autenticar y es la que sostiene la §1 de este informe.

**Ese payload contradice a la documentación en un punto.** La tabla de `docs.kapso.ai` dice que Platform trae **1 TB** de media; el payload de la página de precios dice **2000 GB** (`media_storage_gb_limit: 2000`), es decir ~2 TB. Se reportan las dos versiones sin elegir. Es la segunda vez que esta plataforma muestra un desacople doc/realidad — el primero fue el host de media, documentado en el informe del canal.

**El Free no tiene excedente medido: los precios de overage son 0.** `message_overage_price_dollars: 0.0`, `function_overage_price_dollars: 0.0`, `phone_number_overage_price_dollars: 0.0`. En Pro y Platform esos campos sí traen precio (`$0.002` y `$0.001` por mensaje extra). **Qué hace Kapso exactamente al llegar a 2.000 mensajes en Free no está documentado en ninguna parte** — ver §2, donde el vacío se declara en vez de inferirse.

**Los cargos de Meta son aparte y hoy son casi cero para este caso de uso — pero eso vence el 1 de octubre de 2026.** Hoy los mensajes que no son plantilla son gratis dentro de la ventana de 24 horas de servicio al cliente, que es exactamente donde vive un bot que responde a quien le escribió. Meta ya anunció que **a partir del 1 de octubre de 2026 los mensajes de servicio pasan a cobrarse por mensaje**. Las tarifas se publican el 1 de septiembre de 2026. Es decir: la ventana de validación gratuita de QRSafe tiene fecha de vencimiento externa, y está a semanas.

**La retención de media de Kapso no está documentada. En absoluto.** Ver §7 — es el vacío más relevante para el diseño del adaptador y no se puede cerrar con las fuentes disponibles.

---

## 1. Cuotas del plan Free

Todos los valores de esta sección salen del **payload JSON embebido en `https://kapso.com/pricing`** [PRIMARIA], salvo donde se indica otra fuente. Se transcriben con el nombre del campo original para que sean auditables.

### Tabla completa del plan Free

| Concepto | Valor | Campo en el payload |
| --- | --- | --- |
| Precio | **USD 0/mes** | `price_cents: 0` / `price_dollars: 0.0` |
| **Mensajes de WhatsApp** | **2.000/mes** | `messages_per_month: 2000` |
| Precio de mensaje excedente | **0.0** (sin overage medido) | `message_overage_price_dollars: "0.0"` |
| **Números de teléfono conectados** | **1** | `phone_numbers_limit: 1` |
| Precio de número extra | **0.0** (no se puede comprar) | `phone_number_overage_price_dollars: "0.0"` |
| **Almacenamiento de media** | **1 GB** | `media_storage_gb_limit: 1` |
| **Llamadas a funciones serverless** | **100.000/mes** | `functions_per_month: 100000` |
| Precio de función excedente | **0.0** | `function_overage_price_dollars: "0.0"` |
| **Eventos de proyecto** | **5.000/mes** | `project_events_per_month: 5000` |
| **Retención de eventos de proyecto** | **90 días** | `project_events_retention_days: 90` |
| **Logs ingeridos** | **100.000/mes** | `log_ingestion_events_per_month: 100000` |
| Precio de logs excedentes | **0.0 por millón** | `log_ingestion_overage_price_dollars_per_million: "0.0"` |
| **Transcripción de audio** | **1.800 segundos/mes** (30 min) | `audio_transcription_seconds_per_month: 1800` |
| **Llamadas a integraciones de apps** | **0** (ninguna) | `app_integration_calls_per_month: 0` |
| Créditos de IA | **USD 2, por única vez** | `ai_credits_monthly: "2.0"`, `ai_credits_recurring: false` |
| White label | **No** | `allows_white_label: false` |

La lista `features` del mismo payload lo dice en prosa, textual: `"2,000 WhatsApp messages/month"`, `"100,000 function calls/month"`, `"Up to 1 connected phone number"`, `"Digital phone numbers included"`, `"5,000 project events/month"`, `"$2 AI credits (one-time)"`, `"1GB media storage"`, `"30 minutes audio transcription/month"`, `"100,000 logs/month"`.

### Rate limits del plan Free

Fuente distinta y explícitamente segmentada por plan: [Rate limits](https://docs.kapso.ai/api/rate-limits) [PRIMARIA].

| Límite | Free |
| --- | --- |
| Requests por minuto (por API key, o por IP sin key) | **100** |
| Ejecuciones de workflow por segundo, por workflow | **5** |

**HECHO.** La ventana es un minuto fijo, no deslizante: *"The window is a fixed minute, not a rolling one. A project with no active plan gets the free limit."* Cada respuesta trae `X-RateLimit-Limit` y `X-RateLimit-Remaining`; al exceder, `429` con `Retry-After: 60`. El burst de workflows devuelve `429` con `Retry-After: 1`.

### Qué incluye Free según la documentación

**HECHO.** [Pricing FAQ](https://docs.kapso.ai/docs/whatsapp/pricing-faq), textual: *"All plans include unlimited API calls, AI agents, workflows, serverless function calls, and a Kapso sandbox number. Plans differ in message volume, connected numbers, media storage, and integration calls."*

**CONTRADICCIÓN INTERNA DECLARADA.** Esa frase dice que las llamadas a funciones serverless son **ilimitadas** en todos los planes. El payload de la página de precios dice `functions_per_month: 100000` para Free y lo lista como feature visible (`"100,000 function calls/month"`). No son compatibles: o es ilimitado o son 100.000. Se reportan ambas. Para efectos prácticos de QRSafe el punto es indiferente — 100.000 es holgadísimo — pero desmiente que la frase "unlimited" pueda tomarse literalmente.

**Igual contradicción con "unlimited API calls"**: existe un rate limit publicado de 100 req/min para Free. "Ilimitado" ahí significa "sin cuota mensual", no "sin límite".

### Qué cuenta como mensaje — el dato que más importa

**HECHO.** [Pricing FAQ](https://docs.kapso.ai/docs/whatsapp/pricing-faq), textual: *"Kapso counts **all messages** (inbound and outbound) toward your plan limit"*. La lista publicada:

Cuentan:
- Mensajes de texto que enviás
- Mensajes con media (imagen, video, audio, documento)
- Mensajes de plantilla
- Mensajes interactivos (botones, listas)
- **Mensajes que recibís de clientes**
- Reacciones

No cuentan:
- Acuses de lectura (*read receipts*)

**Esta es la línea que define el techo real del plan.** La foto del QR que manda el usuario consume cupo. La respuesta del bot consume cupo. Nada de lo que hace un bot de verificación es gratis contra esta cuota.

### Lo que el CLI confirma sobre esta cuenta

**HECHO (observado el 2026-08-22).** `kapso status --output json` devuelve el proyecto QRSafe (`1fa75a14-5810-4bdf-807d-d248297446cc`), usuario `actassi@gmail.com`, `whatsapp_numbers.count: 1`. `kapso whatsapp numbers list --output json` devuelve exactamente un número: `phone_number_id` **597907523413541**, `"kind": "sandbox"`, `"display_name": "Sandbox WhatsApp"`, `inbound_processing_enabled: true`.

**VACÍO DECLARADO — y es relevante.** El CLI cuenta el número de sandbox dentro de `whatsapp_numbers.count`. La documentación, en cambio, presenta *"a Kapso sandbox number"* como algo incluido en todos los planes **por separado** de la fila "Connected numbers". **No se pudo determinar si el número de sandbox consume el único slot de `phone_numbers_limit: 1` del plan Free.** Si lo consume, conectar un número productivo en Free exigiría soltar el sandbox. No hay endpoint ni comando de CLI que exponga el consumo de cuota, y probarlo requeriría dar de alta un número real — fuera del alcance de solo lectura de esta investigación.

**No existe en el CLI ningún comando de uso, cuota o facturación.** Los topics disponibles son `customers`, `logs`, `projects`, `whatsapp`, más `build`, `link`, `login`, `logout`, `pull`, `push`, `setup`, `status`. Ninguno expone el consumo contra las 2.000 mensajes. **El consumo real del plan no es observable desde el CLI**; habría que mirarlo en el dashboard.

---

## 2. Qué pasa al superar cada cuota

Esta sección es, en su mayor parte, un vacío documental. Se declara como tal.

### Lo que sí está documentado

| Cuota superada | Comportamiento | Fuente |
| --- | --- | --- |
| **Rate limit (100 req/min en Free)** | `429 Too Many Requests` con `X-RateLimit-Remaining: 0` y `Retry-After: 60`. Cuerpo: `{"error": "Rate limit exceeded", ...}` | [Rate limits](https://docs.kapso.ai/api/rate-limits) [PRIMARIA] |
| **Burst de workflows (5/s/workflow en Free)** | `429` con `X-Burst-RateLimit-Remaining: 0` y `Retry-After: 1` | ídem |
| **Eventos de proyecto sobre la cuota mensual** | *"event emission returns `402 Payment Required` unless your plan allows metered overage"* | [Events](https://docs.kapso.ai/docs/platform/events) [PRIMARIA] |
| **Eventos de proyecto no disponibles en el plan** | Crear o actualizar definiciones de evento y suscripciones a `project.event` devuelve `402 Payment Required` | ídem |
| **Evento más viejo que la ventana de retención** | *"Events older than your project's event retention window are rejected."* | ídem |
| **Tamaño de archivo en subida** | Imágenes 5 MB, audio/video 16 MB, documentos 100 MB. *"Requests exceeding these limits fail immediately."* | corpus `llms-full.txt` [PRIMARIA] |
| **Webhook que falla persistentemente** | Pausa automática. Se dispara cuando en una ventana de 15 min se cumplen **las tres**: ≥20 entregas totales, ≥10 fallidas, y ≥85% de tasa de fallo. El webhook pasa a `active: false`, las entregas pendientes se marcan `failed` con `"Webhook inactive; delivery skipped"`, y se avisa por email a todos los miembros del proyecto. **No se reintenta nada hasta reactivarlo a mano** desde Integraciones → Webhooks. | [Webhooks](https://docs.kapso.ai/docs/platform/webhooks) [PRIMARIA] |

### Lo que NO está documentado

**VACÍO DECLARADO — el más importante de esta sección.** **No se encontró ninguna afirmación sobre qué ocurre al llegar a los 2.000 mensajes mensuales del plan Free.** No hay página de límites de plan, ni código de error asociado, ni aviso de degradación, ni mención de corte. Se buscó en el corpus completo de 615 KB por `message limit`, `exceed`, `suspend`, `blocked`, `run out`, `allowance`, `402`, `upgrade`, y por las combinaciones de esos términos con `plan`. La única coincidencia de `## What counts toward my message limit?` explica **qué** se cuenta, nunca **qué pasa después**.

Lo mismo para: superar 1 GB de media, superar 100.000 llamadas a funciones, superar 100.000 logs, superar los 1.800 segundos de transcripción. Ninguno tiene comportamiento documentado.

**INFERENCIA (no confirmada, no accionable como certeza).** El payload de precios asigna `message_overage_price_dollars: "0.0"` a Free y precios reales a Pro (`0.002`) y Platform (`0.001`). La lectura natural es que Free **no admite excedente medido** y por lo tanto la cuota es un tope duro, no un umbral de facturación. El precedente documentado de los eventos de proyecto —`402 Payment Required` cuando el plan no permite overage medido— apunta en la misma dirección. **Pero es una inferencia estructural, no un hecho verificado**: Kapso nunca lo escribe para mensajes. Un `0.0` también podría significar "gratis" o "campo sin usar". **Para cerrar esto haría falta agotar la cuota en una cuenta real y observar el error.**

**INFERENCIA análoga y con la misma reserva** para los números: `phone_number_overage_price_dollars: "0.0"` en Free, contra `$10.0` en Pro y `$5.0` en Platform. La documentación sí es explícita acá y la respalda: *"No. The Free plan includes 1 WhatsApp number. Upgrade to Pro for up to 3 numbers."*

---

## 3. Qué queda fuera del plan gratuito

### Confirmado como excluido

| Capacidad | Estado en Free | Fuente |
| --- | --- | --- |
| **Segundo número de WhatsApp** | Excluido. *"No. The Free plan includes 1 WhatsApp number. Upgrade to Pro for up to 3 numbers."* | [Pricing FAQ](https://docs.kapso.ai/docs/whatsapp/pricing-faq) [PRIMARIA] |
| **Llamadas a integraciones de apps** | **0/mes** — la tabla de la doc lo marca con `—`, el payload con `app_integration_calls_per_month: 0` | pricing FAQ + payload [PRIMARIA] |
| **Números locales / Twilio propio** (*Provide local numbers*) | *"Free and Legacy: visible in the UI, but cannot be enabled"* | [Provide local numbers](https://docs.kapso.ai/docs/platform/phone-numbers/provide-local-numbers) [PRIMARIA] |
| **White label** | `allows_white_label: false` | payload [PRIMARIA] |
| **Analítica avanzada** | Aparece como feature de Pro y Platform, no de Free | payload [PRIMARIA] |
| **Soporte prioritario** | Sólo Platform | payload [PRIMARIA] |
| **Créditos de IA recurrentes** | Free recibe USD 2 **por única vez** (`ai_credits_recurring: false`) | payload [PRIMARIA] |

### Confirmado como INCLUIDO — importa para el bot

Esto responde directamente a la parte de la pregunta sobre "cualquier cosa que el bot vaya a necesitar":

- **Webhooks: incluidos.** [HECHO] No hay ninguna mención de que los webhooks de WhatsApp estén restringidos por plan. La página del sandbox documenta explícitamente el camino *"Route to webhooks"* sobre la configuración Sandbox WhatsApp. La única suscripción con puerta de plan es `project.event`, que es un tipo de evento personalizado del proyecto y **no** es lo que necesita el bot (el bot necesita `whatsapp.message.received`).
- **API: incluida.** [HECHO] *"All plans include unlimited API calls"*, con el matiz del rate limit de 100 req/min ya señalado.
- **Media entrante: incluida y verificada empíricamente.** [HECHO] El informe del canal (`docs/research/kapso-whatsapp-sandbox-bot.md`, rama `docs/kapso-canal`) lo cerró con una prueba real sobre el sandbox: llegó `type: "image"` con `has_media: true` y `media_data` completo. No hay ninguna cuota de plan que restrinja recibir media; lo que hay es la cuota de **almacenamiento** (1 GB) y el hecho de que cada mensaje con media **cuenta contra las 2.000**.
- **Eventos de proyecto: incluidos en Free**, con 5.000/mes y 90 días de retención (`project_events_per_month: 5000`). **CONTRADICCIÓN DECLARADA:** la tabla de la documentación no tiene fila de eventos de proyecto, y el texto de la página de Events dice que son *"plan-gated"* con `402` cuando *"project events are not available on your plan"*. El payload dice que en Free sí están disponibles con cuota. Se reportan las dos versiones.
- **Número de sandbox: incluido en todos los planes.** *"All plans include ... a Kapso sandbox number."*

### Nombres de plan que no cierran entre fuentes

**CONTRADICCIÓN DECLARADA.** Las fuentes no coinciden en cuántos planes existen ni cómo se llaman:

| Fuente | Planes que nombra |
| --- | --- |
| Payload de `kapso.com/pricing` | `free`, `pro`, `platform` — **y nada más** |
| Tabla de la pricing FAQ | Free, Pro, Platform + *"Enterprise plans have custom limits and pricing"* |
| Página de rate limits | Free, **Legacy**, Pro, Platform, Enterprise |
| Provide local numbers | Enterprise; **"Pro, Team, Platform"**; "Free and **Legacy**" |

**"Team" aparece una sola vez en los 615 KB del corpus** (en *Provide local numbers*) y no existe en ninguna otra fuente, ni en el payload de precios. **"Legacy"** aparece como plan en rate limits y en *Provide local numbers*, con los mismos límites que Free (100 req/min, 5 ejecuciones/s), pero **no es contratable**: no está en la página de precios. La lectura razonable es que Legacy es un plan histórico heredado y que "Team" es un residuo de nomenclatura, pero **ninguna fuente lo dice** y por lo tanto queda como vacío.

---

## 4. El número de sandbox y sus límites

Fuente: [Use Kapso Sandbox](https://docs.kapso.ai/docs/how-to/whatsapp/use-sandbox-for-testing) [PRIMARIA], más restricciones dispersas por el corpus.

### Lo documentado

**HECHO.** Es un número **compartido** entre usuarios pero aislado por sesión: *"Sandbox number — Free, shared with other users (but isolated). Use it for testing and development."*

**HECHO.** El flujo: se crea una sesión con el teléfono de prueba, se recibe un código de activación de 6 caracteres, se envía ese código por WhatsApp al número de sandbox.

**HECHO — el único plazo numérico publicado.** *"Activation codes expire 15 minutes after the session is created. Create a new session to get a fresh code."* Y: *"Codes expire after 15 minutes — create a new session to get a fresh one."*

**HECHO.** Estados de sesión: `pending_activation`, `active`, `superseded`.

**HECHO — reclamar un número desde otro proyecto.** Un teléfono ya activo en otra sesión puede reclamarse: se crea la sesión nueva y se manda el código desde ese teléfono. Entonces *"the new session becomes `active`"*, *"the previous session becomes `superseded` and its open sandbox conversations are closed"*, y *"new inbound messages route only to the active session"*. El código debe enviarse desde el teléfono para el que se creó la sesión.

**HECHO.** Las sesiones se administran en WhatsApp → Sandbox: ver qué teléfonos están autorizados, qué agente/config usa cada una, y borrarlas.

**HECHO.** El sandbox enruta a agentes, a flows (vía *Inbound Message Trigger*) y **a webhooks** (Configurations → Sandbox WhatsApp → Manage Webhooks).

### Restricciones documentadas del sandbox

| Restricción | Fuente |
| --- | --- |
| Enviar plantillas: ❌ | tabla de limitaciones |
| Sincronizar desde WhatsApp (templates): ❌ | tabla + *"Sync is disabled for sandbox numbers"* |
| Múltiples destinatarios: ❌ | tabla |
| Enviar texto e interactivos: ✅ | tabla |
| El campo `to` debe coincidir con el teléfono registrado | *"Active sandbox session required to send messages"* |
| Configuración del perfil de negocio: `403` | API de perfil de negocio |
| BSUID como destinatario: no soportado | [business-scoped user IDs](https://docs.kapso.ai/docs/whatsapp/business-scoped-user-ids) |
| Broadcasts: prohibidos (*"Phone number must be production type (not sandbox)"*) | corpus |
| Arrancar workflow con `recipient` sobre sandbox: `422` | corpus |

### Vacíos del sandbox

**VACÍO DECLARADO — sesiones simultáneas.** **No se encontró ningún tope publicado de sesiones de sandbox simultáneas ni de números de prueba distintos por proyecto.** La documentación habla en plural (*"view all sessions"*, *"See which phone numbers are authorized"*), lo que confirma que más de una es posible, pero **no publica el máximo**. Se buscó por `sandbox` cruzado con `limit`, `maximum`, `concurrent`, `sessions`, `per project`. Sin resultado.

**VACÍO DECLARADO — duración de la sesión.** **Los 15 minutos son la vigencia del *código de activación*, no de la sesión.** No se encontró ninguna afirmación sobre cuánto dura una sesión ya activada, si caduca por inactividad, o si hay que renovarla. La única forma documentada de que una sesión activa termine es que otra la deje en `superseded`, o que se borre a mano.

**VACÍO DECLARADO — renovación.** No hay documentado ningún mecanismo de "renovar" una sesión. Lo que sí está documentado es **recrearla**: crear una sesión nueva y reactivar con un código nuevo.

**HECHO relacionado, sobre el número gratuito NO-sandbox.** El número Kapso-managed gratuito del plan Free —que es otra cosa distinta del sandbox— sí tiene reglas duras: *"Free plan only"*, *"The user's default first project"*, **"One lifetime claim per user"**, *"Kapso instant setup path only"*. Y una trampa: *"If that first free number is later deleted or disconnected, the lifetime free claim does **not** reset."* Además, *"If the number has no production messages within 30 days, it is automatically released."* [PRIMARIA, [Instant setup](https://docs.kapso.ai/docs/platform/phone-numbers/)]

---

## 5. Planes pagos y qué agrega cada uno

**Todos los precios son en USD** [PRIMARIA, payload de `kapso.com/pricing`, campos `price_dollars`]. No se convierten.

| | Free | Pro | Platform |
| --- | --- | --- | --- |
| **Precio** | **USD 0/mes** | **USD 25/mes** | **USD 299/mes** |
| Mensajes/mes | 2.000 | 100.000 | 1.000.000 |
| Precio mensaje excedente | — (`0.0`) | **USD 0,002** | **USD 0,001** |
| Números conectados | 1 | 3 (luego **USD 10**/extra) | 50 (luego **USD 5**/extra) |
| Media storage | 1 GB | 100 GB | **ver contradicción abajo** |
| Llamadas a funciones/mes | 100.000 | 1.000.000 | 10.000.000 |
| Precio función excedente | — (`0.0`) | USD 0,000002 | USD 0,000002 |
| Llamadas a integraciones/mes | **0** | 1.000 | 10.000 |
| Precio integración excedente | — | USD 0,01 | USD 0,01 |
| Eventos de proyecto/mes | 5.000 | 250.000 | 6.000.000 |
| **Retención de eventos** | **90 días** | **180 días** | **365 días** |
| Logs/mes | 100.000 | 1.000.000 | 10.000.000 |
| Precio logs excedentes | — (`0.0`) | USD 1,50 por millón | USD 1,50 por millón |
| Transcripción de audio | 1.800 s (30 min) | 18.000 s (5 h) | 180.000 s (50 h) |
| Precio transcripción excedente | — | USD 1,00/hora | USD 1,00/hora |
| Créditos IA | USD 2 (única vez) | — | — |
| Analítica avanzada | ❌ | ✅ | ✅ |
| Soporte prioritario | ❌ | ❌ | ✅ |

**CONTRADICCIÓN DECLARADA — media storage de Platform.** Se reportan las dos versiones sin elegir:

- La tabla de [docs.kapso.ai/docs/whatsapp/pricing-faq](https://docs.kapso.ai/docs/whatsapp/pricing-faq) dice **1 TB**.
- El payload de `kapso.com/pricing` dice **`media_storage_gb_limit: 2000`** y el texto de la feature dice **"2000GB media storage"**, es decir ~2 TB.

Free (1 GB) y Pro (100 GB) sí coinciden entre ambas fuentes. La discrepancia es exclusiva de Platform. La propia documentación advierte cuál debería mandar: *"Prices and limits are always up to date at [kapso.ai/pricing](https://kapso.ai/pricing)"* — lo que sugiere que el 2000 GB es el vigente y el 1 TB está desactualizado. **Pero eso es inferencia sobre cuál fuente está stale, no una verificación.** Nota operativa: `kapso.ai/pricing` responde **301 → `kapso.com/pricing`**; el dominio canónico es `.com`.

### Enterprise

**HECHO.** *"Enterprise plans have custom limits and pricing."* No hay precio publicado. Sí aparece en las tablas de rate limits (**2.000 req/min**, 30 ejecuciones/s/workflow) y en *Provide local numbers* como plan donde esa capacidad viene *"included"*.

### Add-on documentado

**HECHO.** *Provide local numbers* (números locales con Twilio propio): *"Pro, Team, Platform: available as a `$400/mo` add-on on the existing project subscription"*. Enterprise lo trae incluido. Free y Legacy no pueden habilitarlo.

---

## 6. Los costos de Meta, que son aparte

**Este es el punto donde se rompen las estimaciones, así que va explícito: el plan Free de Kapso NO incluye los cargos de Meta.**

**HECHO.** [Pricing FAQ](https://docs.kapso.ai/docs/whatsapp/pricing-faq), textual: *"Kapso plan message allowances and Meta message fees remain separate in both modes."* Y la propia página de precios de Kapso lo dice en el encabezado: *"Meta conversation and template charges are passed through separately."*

Es decir: las 2.000 mensajes/mes del plan Free son **cuota de plataforma de Kapso** (procesamiento, almacenamiento, inbox, analytics, flows, agentes, funciones, soporte — según *"What does Kapso charge for?"*). Lo que Meta cobre por entregar mensajes va por afuera y se suma.

### Qué cobra Meta hoy — fuente oficial de Meta

**HECHO** [PRIMARIA, [Meta: Pricing on the WhatsApp Business Platform](https://developers.facebook.com/docs/whatsapp/pricing)]. Desde el **1 de julio de 2025** rige **precio por mensaje**, no por conversación: *"Conversation-based pricing is deprecated. It was replaced with per-message pricing on July 1, 2025."* Y: *"You are only charged when a template message is delivered."*

- **Mensajes de servicio**: gratis. Meta no los cobra **desde noviembre de 2024**.
- **Mensajes que no son plantilla**, dentro de la ventana de 24 h de atención al cliente: gratis.
- **Plantillas de utilidad dentro de esa ventana**: gratis.
- **Plantillas fuera de la ventana**: se cobran, con tarifa que varía por categoría (marketing / utility / authentication) y por país del destinatario.
- **Free Entry Point**: ventana de 72 h gratis cuando el usuario llega por un anuncio Click-to-WhatsApp.

**Para un bot que sólo responde a quien le escribió primero, todo eso cae hoy dentro de la ventana de 24 h y el costo Meta es cero.**

### El cambio del 1 de octubre de 2026 — y esto sí es un riesgo con fecha

**HECHO** [PRIMARIA, [Meta: Changes to non-template message pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/non-template-messages)]:

- **1 de agosto de 2026**: Meta empieza a cobrar los mensajes de Meta Business Agent por token, a **USD 2,00 por millón de tokens** (~4-5 centavos por mensaje).
- **1 de octubre de 2026**: **los mensajes de servicio pasan a cobrarse por mensaje.** Textual: *"charge on a per-message basis for service messages, consistent with how Meta charges for template messages."* No se cobraban desde noviembre de 2024.
- **1 de octubre de 2026**: los mensajes de utilidad, que no se cobraban desde el 1 de julio de 2025, **vuelven a cobrarse por mensaje**.
- Las tarifas de servicio igualarán las de utility/authentication por mercado. Meta las publica **antes del 1 de septiembre de 2026**: *"announce and publish the rates that take effect October 1, 2026, including rates for service messages, by September 1, 2026."*
- Hoy no hay tramos por volumen para mensajes de servicio.

**Kapso lo confirma y coincide** [PRIMARIA, pricing FAQ]: *"**Non-template messages stop being free on October 1, 2026.** The free-form replies you send inside the 24-hour customer service window will be billed per message."* Kapso agrega que Meta indicó que facturará a la tarifa de utility de cada mercado, y que la actualización del rate card del 1 de septiembre todavía puede mover esas tarifas.

**Traducido a QRSafe:** hoy la conversación de verificación no le cuesta nada a Meta. **A partir del 1 de octubre de 2026 cada respuesta del bot pasa a tener costo por mensaje**, a una tarifa que al 2026-08-22 **todavía no está publicada** (falta ~10 días para el anuncio del 1 de septiembre). Estimar el costo de operación del bot a más de un mes vista es hoy imposible con datos publicados.

### Cómo se paga Meta a través de Kapso

**HECHO** [PRIMARIA, [Meta message billing](https://docs.kapso.ai/docs/whatsapp/meta-message-billing)]. Dos modos, elegidos por WABA completo:

- **`customer_managed`**: paga con el método configurado en Meta Billing Hub.
- **`partner_managed`**: paga con créditos de Kapso. *"Kapso deducts Meta's published USD price from your project credits with no added fee."*

Detalles con número: para cuentas en USD, el cargo es el precio publicado por Meta **sin recargo**. Para cuentas en otra moneda, es el precio USD de Meta **más un margen de cambio (5% al lanzamiento)**. Los créditos, cargos y facturas del proyecto quedan siempre en USD. Si el proyecto se queda sin créditos, *"potentially paid sends pause"*. `meta_billing_mode` sólo se define al crear el link y **no se puede cambiar después**.

**Relevante para Argentina:** una WABA cuya moneda asignada por Meta no sea USD pagaría el precio USD **+5%** vía créditos Kapso. Además: *"Kapso enables non-USD accounts one currency at a time. If your account's currency is not enabled yet, connecting Kapso credits is blocked with `unsupported_currency`."* **No se encontró la lista de monedas habilitadas**, así que no se puede afirmar si ARS está soportada.

---

## 7. Retención de datos y de media

### Lo único con número publicado

**HECHO.** Retención de **eventos de proyecto**, del payload de precios:

| Plan | `project_events_retention_days` |
| --- | --- |
| Free | **90 días** |
| Pro | 180 días |
| Platform | 365 días |

Con la consecuencia documentada: *"Events older than your project's event retention window are rejected."*

**HECHO.** Media subida a Meta por el endpoint estándar: *"`meta_media`: Standard upload to Meta's media endpoint (**30-day lifetime**)"*. **Ojo: esto es la vida útil del media en Meta, no en Kapso**, y es para media **subida**, no recibida.

**HECHO.** Los setup links expiran a los 30 días de creados.

### El vacío que importa para el adaptador

**VACÍO DECLARADO — y no se pudo cerrar.** **No existe en la documentación de Kapso ninguna afirmación sobre cuánto tiempo conserva un archivo recibido.** Se buscó en el corpus completo por `retention`, `retained`, `deleted after`, `purge`, `stored for`, `how long`, `data retention`, y por sus cruces con `media` y `storage`. Las únicas coincidencias con `media` son cuotas de **capacidad** (`media_storage_gb_limit`, "1GB media storage"), nunca de **tiempo**.

Kapso publica cuánto **espacio** te da. No publica cuánto **tiempo** te lo guarda. Son preguntas distintas y sólo está respondida la primera.

**Tampoco está documentado** qué pasa cuando el proyecto llega a 1 GB: si se rechazan medias nuevas, si se borran las viejas por FIFO, o si se cobra. Ver §2 — mismo vacío.

**HECHO relacionado, ya verificado empíricamente** (informe del canal, rama `docs/kapso-canal`): la URL real de media entrante es un blob de Active Storage en `app.kapso.ai` (`/rails/active_storage/blobs/redirect/<token>--<firma>/<archivo>.jpeg`), descargable con `curl` anónimo, HTTP 200. **La documentación muestra `https://api.kapso.ai/media/...`, que no es lo que devuelve el sistema.** El corpus lo sigue mostrando así en los ejemplos de payload (`"media_url": "https://api.kapso.ai/media/..."`). Esa discrepancia sigue vigente al 2026-08-22 y es la razón por la que este informe no infiere retención a partir de la doc.

**El camino de Meta sí tiene plazo medido**, no documentado sino observado: la `image.url` de `lookaside.fbsbx.com` trae un parámetro `ext=<epoch>` que vence a los **~8 minutos** de recibido el mensaje. Ese es el único plazo real conocido de media entrante, y es cortísimo.

**Conclusión de diseño, con la incertidumbre explícita:** dado que (a) la retención de media en Kapso no está publicada, (b) el camino de Meta caduca en ~8 minutos, y (c) la doc de Kapso ya demostró estar desactualizada sobre el host de media, **el adaptador no debe apoyarse en que Kapso guarde el archivo**. Si QRSafe necesita el archivo original más allá del momento del procesamiento, hay que persistirlo por cuenta propia en el momento de la recepción. No es una recomendación por prudencia genérica: es que **no hay dato para hacer otra cosa**.

---

## 8. Implicancias para QRSafe

### Sí, el free tier alcanza para validar — hasta ~1.000 verificaciones por mes

**La posición, con el número que la sostiene:**

El plan Free da **2.000 mensajes/mes**, y Kapso **cuenta entrantes y salientes**. Un ciclo mínimo de verificación es:

| Paso | Dirección | ¿Cuenta? |
| --- | --- | --- |
| El usuario manda la foto del QR | entrante | **sí** |
| El bot responde el resultado | saliente | **sí** |

**2 mensajes por verificación → 2.000 / 2 = 1.000 verificaciones/mes.**

Si el bot manda además un acuse ("recibí tu imagen, procesando"), el ciclo pasa a 3 mensajes y el techo cae a **~666 verificaciones/mes**. Si el flujo incluye un saludo inicial y una pregunta de desambiguación, 4-5 mensajes, y el techo baja a **400-500/mes**.

**Consecuencia de diseño directa y barata:** cada mensaje que el bot no manda son media verificación más de cupo. En el plan Free, **la verbosidad del bot cuesta el 50% del techo**. Un bot de un solo turno de respuesta duplica la capacidad de validación frente a uno que acusa recibo. Esto debería decidirse ahora, no cuando se agote la cuota.

### Qué se agota primero — y a qué distancia está el segundo

| Recurso | Cuota Free | Consumo estimado a 1.000 verificaciones/mes | Margen |
| --- | --- | --- | --- |
| **Mensajes** | **2.000/mes** | **2.000/mes** | **0% — este es el techo** |
| Media storage | 1 GB | ~118 MB/mes (a 118 KB/foto, tamaño real medido) | ~8-9 meses hasta llenar, **si nada se borra** |
| Funciones serverless | 100.000/mes | ~2.000-10.000 según diseño | 90%+ libre |
| Logs | 100.000/mes | dependiente de verbosidad | holgado |
| Eventos de proyecto | 5.000/mes | 0 si no se usan | sin uso |
| Rate limit | 100 req/min | un bot conversacional no se acerca | irrelevante |
| Transcripción de audio | 30 min/mes | 0 — QRSafe procesa imágenes | sin uso |

**El contador de mensajes se agota primero, y no hay segundo lugar cerca.** Todo lo demás tiene entre uno y dos órdenes de magnitud de margen. El dato de 118 KB por foto no es un supuesto: es el `byte_size` exacto (117.868 bytes) de la imagen de prueba real descargada del sandbox, documentado en el informe del canal.

**Matiz sobre el media storage, que sí puede morder.** La cuota de mensajes es **mensual y se renueva**. La de almacenamiento es **acumulativa** y —según §7— **no se sabe si Kapso purga algo**. En el peor caso (Kapso no borra nunca), 1 GB se llena en unos 8-9 meses de operación al tope del plan. Ese es el segundo techo en el tiempo, aunque no en el mes.

### Cuándo hay que pagar, y cuánto

El salto es **USD 25/mes** (Pro), que lleva la cuota a **100.000 mensajes/mes** — **50 veces** el Free, o ~50.000 verificaciones/mes al ciclo de 2 mensajes. Es un salto desproporcionado respecto del precio: no hay escalón intermedio. En la práctica, **QRSafe no necesita pagar nada hasta pasar las ~1.000 verificaciones/mes, y cuando las pase, USD 25 le compran dos órdenes de magnitud de cabecera**. Pro además habilita el excedente medido (USD 0,002/mensaje), o sea que deja de existir el riesgo de tope duro.

### Las tres cosas que hay que vigilar

1. **El 1 de octubre de 2026.** [HECHO, fuente Meta] Los mensajes de servicio dejan de ser gratis. Hasta esa fecha el costo Meta de QRSafe es cero; después, cada respuesta del bot tiene tarifa. **Las tarifas se publican el 1 de septiembre de 2026** — faltan ~10 días. Cualquier proyección de costos a partir de octubre es hoy imposible con datos publicados, y hay que rehacerla cuando Meta publique el rate card.
2. **La retención de media, que no está publicada.** El adaptador debe persistir por cuenta propia todo archivo que necesite después del momento del procesamiento. No hay dato que permita confiar en Kapso como almacén duradero, y el camino de Meta caduca en ~8 minutos.
3. **El slot único de número.** `phone_numbers_limit: 1` y no está claro si el sandbox lo ocupa (§1). Antes de intentar conectar un número productivo en Free hay que resolver esto, porque si el sandbox ocupa el slot, la transición sandbox → producción no es aditiva sino excluyente.

### Riesgo operativo secundario: la pausa automática de webhooks

**HECHO.** Si el endpoint de QRSafe falla persistentemente —≥20 entregas y ≥10 fallos con ≥85% de tasa de error en 15 minutos— Kapso **pausa el webhook y no lo reactiva solo**. Deja de entregar mensajes hasta que alguien lo vuelva a activar a mano desde el dashboard. Un deploy roto un viernes puede dejar el bot mudo el fin de semana entero sin que nadie lo note, salvo por el email a los miembros del proyecto. Vale monitorear el `active` del webhook, no sólo la salud del propio endpoint.

---

## Limitaciones de esta investigación

**Lo que quedó sin responder, explícitamente:**

1. **Qué pasa exactamente al superar los 2.000 mensajes en Free.** No documentado. La inferencia desde `message_overage_price_dollars: "0.0"` apunta a tope duro, pero es inferencia estructural, no hecho. **Sólo se cierra agotando la cuota en una cuenta real.**
2. **Cuánto tiempo retiene Kapso un archivo recibido.** No documentado en ningún lado. Es el vacío de mayor impacto para el diseño del adaptador (§7).
3. **Qué pasa al llegar a 1 GB de media.** No documentado: no se sabe si rechaza, purga o cobra.
4. **Cuántas sesiones de sandbox simultáneas se permiten**, y **cuánto dura una sesión ya activada**. Los 15 minutos publicados son del código de activación, no de la sesión. Sin tope publicado de números de prueba.
5. **Si el número de sandbox consume el slot único de `phone_numbers_limit: 1`.** El CLI lo cuenta dentro de `whatsapp_numbers.count`; la doc lo presenta como incluido aparte. No resoluble sin dar de alta un número real.
6. **Las tarifas de Meta a partir del 1 de octubre de 2026.** Meta se comprometió a publicarlas antes del 1 de septiembre de 2026. Al 2026-08-22 **no existen**. Todo cálculo de costo operativo posterior a esa fecha es imposible con fuentes publicadas.
7. **Si ARS está entre las monedas habilitadas para créditos Kapso.** El mecanismo (`unsupported_currency`, margen FX del 5%) está documentado; la lista de monedas habilitadas no se encontró.
8. **Los planes "Team" y "Legacy".** "Team" aparece una sola vez en 615 KB de corpus y en ninguna otra fuente. "Legacy" tiene límites publicados pero no es contratable. Ninguna fuente explica qué son.
9. **Consumo real de la cuenta QRSafe.** El CLI no expone ningún comando de uso, cuota ni facturación. No se pudo observar cuántos de los 2.000 mensajes lleva consumidos el proyecto. Requeriría el dashboard autenticado.

**Contradicciones reportadas sin resolver** (por regla explícita de no elegir entre versiones):

- **Media storage de Platform**: 1 TB (docs) vs. 2000 GB (payload de pricing).
- **Funciones serverless**: *"unlimited ... serverless function calls"* (docs) vs. `functions_per_month: 100000` en Free (payload).
- **Llamadas a API**: *"unlimited API calls"* (docs) vs. rate limit publicado de 100 req/min en Free.
- **Eventos de proyecto**: descritos como *"plan-gated"* con `402` cuando no están disponibles (docs) vs. `project_events_per_month: 5000` disponible en Free (payload). La tabla de la docs FAQ no tiene fila de eventos.
- **Nombres de planes**: cuatro fuentes, cuatro listas distintas (§3).
- **Host de media**: `api.kapso.ai/media/...` en los ejemplos del corpus vs. `app.kapso.ai/rails/active_storage/...` observado empíricamente. Verificado en el informe del canal; sigue sin corregirse en la doc.

**Advertencia metodológica que atraviesa todo el informe.** Esta plataforma ya demostró que su documentación no siempre describe su comportamiento — el host de media es el precedente probado. Los números de este informe son **lo que Kapso publica**, no lo que Kapso hace. La única capa realmente verificada aquí es la del CLI autenticado (§1, estado de la cuenta), y esa capa no expone cuotas. **Ningún número de cuota de este informe fue verificado contra el comportamiento real del sistema.**

**Sobre la jerarquía de fuentes usada.** Cuando la tabla de la documentación y el payload de la página de precios difieren, este informe **no elige**: reporta ambos. Se señala, eso sí, que la propia documentación declara que `kapso.ai/pricing` es la fuente autoritativa (*"Prices and limits are always up to date at kapso.ai/pricing"*), lo que da una razón publicada para preferir el payload — pero eso es un argumento, no una verificación.

---

## Fuentes

**Primarias — Kapso:**
- [`https://docs.kapso.ai/llms-full.txt`](https://docs.kapso.ai/llms-full.txt) — corpus documental completo. HTTP 200, 615.201 bytes, descargado 2026-08-22.
- [`https://kapso.com/pricing`](https://kapso.com/pricing) — HTTP 200, 23.444 bytes. `https://kapso.ai/pricing` responde **301** hacia este. Contiene el payload JSON de planes usado en §1 y §5.
- [Pricing FAQ](https://docs.kapso.ai/docs/whatsapp/pricing-faq)
- [Rate limits](https://docs.kapso.ai/api/rate-limits)
- [Use Kapso Sandbox](https://docs.kapso.ai/docs/how-to/whatsapp/use-sandbox-for-testing)
- [Meta message billing](https://docs.kapso.ai/docs/whatsapp/meta-message-billing)
- [Events](https://docs.kapso.ai/docs/platform/events)
- [Provide local numbers](https://docs.kapso.ai/docs/platform/phone-numbers/provide-local-numbers)
- CLI `@kapso/cli` 0.18.0 autenticado — `kapso status`, `kapso whatsapp numbers list`, `kapso --help` (solo lectura, 2026-08-22).

**Primarias — Meta:**
- [Pricing on the WhatsApp Business Platform](https://developers.facebook.com/docs/whatsapp/pricing)
- [Changes to non-template message pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/non-template-messages)

**Interna del repo:**
- `docs/research/kapso-whatsapp-sandbox-bot.md` (rama `docs/kapso-canal`) — verificación empírica de media entrante, host real del blob y tamaño medido de 117.868 bytes. No modificado por esta investigación.
