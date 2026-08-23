# Kapso como canal de WhatsApp para el bot

> Fecha: 2026-08-22 · Alcance: una sola pregunta técnica — si el sandbox de WhatsApp de Kapso entrega mensajes con imagen a webhooks, y qué necesita el adaptador de descarga para funcionar. No cubre pricing comparado, alta productiva en Meta, ni evaluación de BSPs alternativos. · Método: lectura de la documentación oficial de Kapso, descargada completa desde `https://docs.kapso.ai/llms-full.txt` (615 KB, versión del 2026-08-22) y verificada contra las páginas HTML publicadas; contraste del camino clásico contra la documentación oficial de Meta; **auditoría del CLI `@kapso/cli` 0.18.0 instalado y ejecutado localmente el 2026-08-22** para verificar que los comandos del runbook existan de verdad (§5.0.1). Sin cuenta de Kapso, sin credenciales configuradas, sin sesión de sandbox ejecutada.

## Resumen ejecutivo

> **VERIFICADO EMPÍRICAMENTE el 2026-08-22.** La pregunta se cerró ejecutando el runbook contra el sandbox real (`phone_number_id` 597907523413541, con una sesión activada desde un teléfono del equipo). Todo lo que sigue en este resumen es **HECHO observado**, no lectura de documentación. Las secciones 1 a 4 conservan el análisis documental previo, con las correcciones marcadas donde la realidad lo contradijo.

**El sandbox de Kapso SÍ entrega mensajes con imagen.** Un mensaje enviado desde un teléfono al número de sandbox llegó como `type: "image"` con `has_media: true` y el objeto `media_data` completo. La documentación no lo declaraba ni a favor ni en contra; la prueba lo cerró.

**La hipótesis original era correcta, incluida su parte más específica.** La URL **sí** apunta a un blob de Active Storage en `app.kapso.ai`:

```
https://app.kapso.ai/rails/active_storage/blobs/redirect/<token>--<firma>/<archivo>.jpeg
```

La documentación muestra `https://api.kapso.ai/media/...`, que **no es lo que devuelve el sistema**. Una versión anterior de este informe dio por refutada esa parte de la hipótesis basándose en la doc: esa refutación era incorrecta y queda anulada. Es un recordatorio de que en esta plataforma la documentación no coincide con el comportamiento, y de que el vacío documental no autoriza a afirmar lo contrario.

**La descarga no requiere credencial.** `curl` anónimo a esa URL devolvió **HTTP 200** y exactamente los `byte_size` declarados (117.868). No hace falta `X-API-Key`. La URL es larga, firmada y no adivinable, pero es pública para quien la tenga: **tratarla como un secreto**.

**Vienen los dos caminos, no uno.** Además del blob propio de Kapso, el mensaje trae `image.id` — el `media_id` de Meta — y una `image.url` en `lookaside.fbsbx.com` con un parámetro `ext=<epoch>` que es su vencimiento (~8 minutos desde la recepción). El camino de Meta sirve como respaldo.

**Ubicación real de los campos**: `has_media`, `content`, `media_url` y `media_data` viven **dentro del sobre `kapso`** del mensaje, no en la raíz. Un parser que los busque en el nivel superior no encuentra nada y no falla — devuelve `undefined` en silencio.

**Pipeline probado de punta a punta**: WhatsApp → Kapso → descarga → `decodeImage` del motor. La única etapa que no completó fue la decodificación, y por una razón ajena al canal: la imagen de prueba era una foto generada por IA cuyo patrón no es un código QR válido (91 intentos, `ILEGIBLE`). **Falta repetir la prueba con una foto de un QR real.**

## 1. La pregunta: ¿el sandbox entrega media?

> **RESPONDIDA — sí.** Ver el resumen ejecutivo. Esta sección conserva el análisis documental previo a la prueba, que sigue siendo válido como descripción de **lo que la documentación dice y no dice**. Su conclusión de entonces —que el vacío documental no autorizaba a afirmar la capacidad— era correcta en su momento y quedó superada por la evidencia.

### Lo que dice la documentación del sandbox — textual

La página [Use Kapso Sandbox](https://docs.kapso.ai/docs/how-to/whatsapp/use-sandbox-for-testing) tiene una única tabla de limitaciones, precedida por la frase "The sandbox is for testing message flows, not production features":

| Feature | Sandbox | Production |
| --- | --- | --- |
| Send text messages | ✅ | ✅ |
| Send interactive messages | ✅ | ✅ |
| Send templates | ❌ | ✅ |
| Sync from WhatsApp | ❌ | ✅ |
| Multiple recipients | ❌ | ✅ |

**HECHO.** Las cinco filas describen capacidades de **salida** o de sincronización de plantillas. **Ninguna fila trata sobre mensajes entrantes de ningún tipo** —ni texto, ni imagen. La tabla no puede leerse como una enumeración exhaustiva de lo que el sandbox recibe, porque tampoco enumera la recepción de texto, que el propio flujo de activación demuestra que funciona (el usuario manda un código de seis caracteres por chat).

**VACÍO DECLARADO.** No existe en la documentación de Kapso ninguna afirmación —ni afirmativa ni negativa— sobre si un número de sandbox entrega mensajes entrantes con media a los webhooks. Se buscó en el corpus completo de `llms-full.txt` por `sandbox`, `media_data`, `has_media`, `media_url` y sus intersecciones. No hay coincidencia que las relacione.

### El resto de restricciones documentadas del sandbox

Reunidas de todo el corpus, no sólo de la página del sandbox. Ninguna toca media entrante:

- **HECHO.** "Sandbox configurations are blocked (returns 403)" — al intentar editar el perfil de negocio ([API de perfil de negocio](https://docs.kapso.ai/api/meta/whatsapp)).
- **HECHO.** "BSUID recipients are not supported on sandbox numbers" ([business-scoped user IDs](https://docs.kapso.ai/docs/whatsapp/business-scoped-user-ids)).
- **HECHO.** Los broadcasts exigen "Phone number must be production type (not sandbox)".
- **HECHO.** Arrancar un workflow con `recipient` sobre un número de sandbox devuelve `422`.
- **HECHO.** "Activation codes expire 15 minutes after the session is created."
- **HECHO.** Estados de sesión: `pending_activation`, `active`, `superseded`. Reclamar el mismo teléfono desde otro proyecto deja la sesión anterior en `superseded`, cierra sus conversaciones abiertas y enruta los nuevos mensajes sólo a la sesión activa.
- **HECHO.** "Active sandbox session required to send messages": el campo `to` debe coincidir con el teléfono registrado.

**INFERENCIA (débil, no accionable).** Kapso enumera con detalle las cosas que el sandbox *no* puede hacer, incluso las de bajo perfil como el 403 del perfil de negocio. Que no exista una restricción escrita para media entrante es compatible con que funcione — y también con que nadie lo haya documentado. Un argumento del silencio no cierra la pregunta.

### El indicio de pricing, y por qué no alcanza

**HECHO.** Todos los planes incluyen un número de sandbox: "All plans include unlimited API calls, AI agents, workflows, serverless function calls, and a Kapso sandbox number. Plans differ in message volume, connected numbers, media storage, and integration calls." El plan Free trae 2.000 mensajes/mes, 1 número conectado y **1 GB de Media storage** ([pricing FAQ](https://docs.kapso.ai/docs/whatsapp/pricing-faq)).

**HECHO.** "Kapso counts **all messages** (inbound and outbound) toward your plan limit", y la lista incluye explícitamente "Media messages (image, video, audio, document)" y "Messages you receive from customers" ([pricing FAQ](https://docs.kapso.ai/docs/whatsapp/pricing-faq)).

**HIPÓTESIS.** Que el plan gratuito incluya sandbox *y* cuota de media sugiere que el storage de media es una capacidad de plataforma, transversal al tipo de número. Es la lectura razonable. **No es evidencia de que el sandbox entregue imágenes**: la cuota de media también se consume en un número productivo dentro del mismo plan Free, y nada en la doc ata las dos cosas.

---

## 2. Forma del payload de webhook

### Mensaje con imagen — JSON textual de la doc

De [Message events](https://docs.kapso.ai/docs/platform/webhooks/message-events), sección "Message type-specific data → Media messages (image/video/document)", reproducido literal:

```json
{
  "message": {
    "id": "wamid.789",
    "timestamp": "1730093000",
    "type": "image",
    "image": {
      "caption": "Photo description",
      "id": "media_id_123"
    },
    "kapso": {
      "direction": "inbound",
      "status": "received",
      "processing_status": "pending",
      "origin": "cloud_api",
      "has_media": true,
      "content": "Photo description Image attached (photo.jpg) [Size: 200 KB | Type: image/jpeg] URL: https://api.kapso.ai/media/...",
      "media_url": "https://api.kapso.ai/media/...",
      "media_data": {
        "url": "https://api.kapso.ai/media/...",
        "filename": "photo.jpg",
        "content_type": "image/jpeg",
        "byte_size": 204800
      },
      "message_type_data": {
        "caption": "Photo description"
      }
    }
  }
}
```

El envelope completo de `whatsapp.message.received` (visible en el ejemplo de mensaje de texto de la misma página) agrega, fuera de `message`:

```json
  "conversation": {
    "id": "conv_123",
    "phone_number": "16315551181",
    "business_scoped_user_id": "US.13491208655302741918",
    "status": "active",
    "phone_number_id": "123456789012345"
  },
  "phone_number_id": "123456789012345"
```

### Mensaje con imagen — JSON REAL observado

**HECHO**, capturado el 2026-08-22 con `kapso whatsapp messages list --phone-number-id 597907523413541 --direction inbound`. Recortado a los campos que importan; los tokens van truncados a propósito.

```json
{
  "type": "image",
  "from": "54XXXXXXXXXX",
  "id": "wamid.HBgNNTQ5MzQxNjQxNzk4MRUCABIYIEFDMjZBRDFF...",
  "timestamp": "1787443106",
  "image": {
    "id": "1371993794424264",
    "mime_type": "image/jpeg",
    "sha256": "zTC1IRibhUeU8FXIJjVt/Iz06A+cWxwwkneq+WVXaKE=",
    "url": "https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=1371993794424264&source=webhook&ext=1787443262&hash=...",
    "link": "https://app.kapso.ai/rails/active_storage/blobs/redirect/eyJfcmFpbHMi...--97f070bb.../image_cd71339006dd.jpeg"
  },
  "kapso": {
    "direction": "inbound",
    "status": "delivered",
    "processing_status": "pending",
    "origin": "cloud_api",
    "phone_number": "54XXXXXXXXXX",
    "phone_number_id": "597907523413541",
    "has_media": true,
    "whatsapp_conversation_id": "20e0e0c5-d08f-4361-8d3c-f563d58ee884",
    "contact_name": "<nombre del contacto>",
    "content": "Image attached (image_cd71339006dd.jpeg) [Size: 115.1 KB | Type: image/jpeg] URL: https://app.kapso.ai/rails/active_storage/...",
    "media_url": "https://app.kapso.ai/rails/active_storage/blobs/redirect/eyJfcmFpbHMi...--97f070bb.../image_cd71339006dd.jpeg",
    "media_data": {
      "url": "https://app.kapso.ai/rails/active_storage/blobs/redirect/eyJfcmFpbHMi...--97f070bb.../image_cd71339006dd.jpeg",
      "filename": "image_cd71339006dd.jpeg",
      "content_type": "image/jpeg",
      "byte_size": 117868
    },
    "message_type_data": {}
  }
}
```

**Diferencias contra el ejemplo de la documentación**, todas verificadas:

| | La doc dice | El sistema devuelve |
|---|---|---|
| Host del blob | `api.kapso.ai/media/...` | **`app.kapso.ai/rails/active_storage/blobs/redirect/...`** |
| Campo `image.url` | no aparece en el ejemplo | URL de `lookaside.fbsbx.com` con `ext=<epoch>` |
| Campo `image.link` | no aparece en el ejemplo | duplica la URL del blob de Kapso |
| `message_type_data` | no documentado | presente, vacío en este caso |

> **Los datos personales van anonimizados a propósito.** El número de teléfono y el nombre del contacto de la prueba se reemplazaron por marcadores: este repositorio es público, y un payload de ejemplo no necesita el número real de nadie para documentar la forma del mensaje. Lo que importa acá es la estructura, no quién mandó la foto.

**Claves reales del sobre `kapso`** en un mensaje con media: `direction`, `status`, `processing_status`, `origin`, `phone_number`, `phone_number_id`, `has_media`, `whatsapp_conversation_id`, `contact_name`, `content`, `media_data`, `media_url`, `message_type_data`.

En un mensaje de texto el sobre trae las mismas menos `media_data`, `media_url` y `message_type_data`, y `has_media` viene en `false`.

> **Trampa de parseo, y cuesta encontrarla**: `has_media` y `content` están **dentro de `kapso`**, no en la raíz del mensaje. Un parser que los busque arriba no falla — devuelve `undefined` en silencio y te hace creer que el mensaje no traía media. Pasó durante esta misma verificación.

### Contraste punto por punto con la hipótesis

| Afirmación de la hipótesis | Veredicto | Evidencia |
| --- | --- | --- |
| `has_media: true` | **CONFIRMADO** | Literal en el ejemplo de imagen |
| objeto `media_data` con `url`, `filename`, `content_type`, `byte_size` | **CONFIRMADO** | Los cuatro campos, con esos nombres exactos |
| también viene `media_url` | **CONFIRMADO** (no estaba en la hipótesis) | Campo hermano, mismo valor en el ejemplo |
| la `url` apunta a un blob de **Active Storage** | **CONFIRMADO empíricamente** | La doc no lo menciona, pero el sistema devuelve `/rails/active_storage/blobs/redirect/...` |
| la `url` apunta a **`app.kapso.ai`** | **CONFIRMADO empíricamente** | La doc muestra `api.kapso.ai/media/...`, pero el sistema devuelve `app.kapso.ai` |
| Kapso ingesta el archivo y lo sirve desde su propio storage | **SOSTENIDO** (ver abajo) | Host propio + `stored media` + cuota de Media storage |
| en lugar del camino Meta `media_id` → Graph API | **PARCIAL** | El `media_id` de Meta **también viene**, en `message.image.id` |

**Sobre el último punto, que es el que más importa para el adaptador:** el payload trae **las dos cosas**. `message.image.id` es el `media_id` de Meta y habilita el camino clásico; `kapso.media_url` es la URL en infraestructura de Kapso. No son alternativas excluyentes: son dos caminos hacia los mismos bytes, con propiedades de vencimiento distintas (sección 4).

### Evidencia de que `media_data` es storage de Kapso, no un espejo de Meta

**HECHO.** La referencia de campos del SDK ([Kapso extensions](https://docs.kapso.ai/docs/whatsapp/typescript-sdk/kapso-extensions)) los describe así, textual:

| Field | Description |
| --- | --- |
| `has_media` | True when a media blob is attached. |
| `media_data` | URL, filename, content type, and byte size for stored media. |
| `media_url` | Direct URL to the attached media. Inbound: immediate. Outbound: appears shortly after send. |

**HECHO.** [WhatsApp data](https://docs.kapso.ai/docs/platform/whatsapp-data), sección Media: "**Stored**: File attachments on messages (images, videos, audio, documents)", accesibles desde "Dashboard: WhatsApp > Data > Media".

**INFERENCIA.** "stored media", "Inbound: immediate", un host propio (`api.kapso.ai`) y una cuota de plan medida en GB describen en conjunto un almacenamiento propio de la plataforma, no un proxy de la URL temporal de Meta. **Cómo está implementado ese storage por debajo no está documentado, pero la prueba empírica lo reveló: la ruta de la URL real es `/rails/active_storage/blobs/redirect/`, o sea Active Storage de Rails.** No debe afirmarse citando la doc, sí citando la observación.

### Detalles operativos del webhook

- **HECHO.** Formatos: `kapso` (por defecto, con filtrado de eventos, buffering y payload estructurado) y `meta` (reenvío crudo del payload de Meta, sin filtrado ni buffering). Para el adaptador conviene `kapso`, porque es el único que trae `media_url` ([Webhooks overview](https://docs.kapso.ai/docs/platform/webhooks/overview)).
- **HECHO.** Headers de un webhook Kapso: `X-Webhook-Event`, `X-Webhook-Signature` (hmac-sha256-hex), `X-Idempotency-Key`, `X-Webhook-Payload-Version: v2`. Con buffering activado se agregan `X-Webhook-Batch: true` y `X-Batch-Size`.
- **HECHO.** "Your endpoint must return `200 OK` within 10 seconds."
- **HECHO.** Reintentos a los 10 s, 40 s y 90 s. "After max retries, batched messages fall back to individual delivery."
- **HECHO.** Con buffering, el cuerpo cambia de forma: "the body uses a batch envelope with `type`, `batch: true`, `data: [...]`, and `batch_info`". El parser debe contemplar ambas formas.
- **VACÍO / GOTCHA.** La página de [seguridad](https://docs.kapso.ai/docs/platform/webhooks/security) dice "Kapso creates a signature by hashing the **raw JSON payload**", pero su propio ejemplo en Node.js firma `JSON.stringify(payload)` sobre el objeto ya parseado, y el de Python usa `json.dumps(payload)`. Las dos cosas no son equivalentes si Kapso serializa distinto que `JSON.stringify`. **La doc no resuelve la ambigüedad.** Conservar el body crudo es la implementación defensiva, pero verificar contra un webhook real antes de dar la firma por buena.

---

## 3. Límites del sandbox y del plan gratuito

### Sandbox

Ya listados en la sección 1. El resumen ejecutable: **no hay ningún límite documentado que afecte a media entrante**, y tampoco hay una garantía. Lo que sí está documentado y afecta al PoC:

- No hay plantillas. Toda la prueba debe ser iniciada por el usuario desde el teléfono.
- Un solo destinatario por sesión: el `to` debe coincidir con el teléfono registrado.
- El código de activación vence a los 15 minutos.
- **VACÍO.** No se publica duración máxima de una sesión ya activada.
- **VACÍO.** No se publica cantidad máxima de sesiones o teléfonos de prueba por proyecto.
- **VACÍO.** No se publica límite de tamaño para imágenes **entrantes**. El límite de 5 MB para JPEG/PNG documentado en [Upload media](https://docs.kapso.ai/api/meta/whatsapp/media/upload-media) aplica a la subida, no a la recepción.

### Plan Free

**HECHO** ([pricing FAQ](https://docs.kapso.ai/docs/whatsapp/pricing-faq)):

| | Free | Pro | Platform |
| --- | --- | --- | --- |
| Messages/month | 2,000 | 100,000 | 1,000,000 |
| Connected numbers | 1 | 3 (luego $10 c/u) | 50 (luego $5 c/u) |
| Media storage | 1 GB | 100 GB | 1 TB |
| Integration calls/month | — | 1,000 | 10,000 |

**HECHO.** Los mensajes entrantes cuentan contra la cuota, y los de media también. Una prueba de 20 fotos consume 40 mensajes contra el tope de 2.000 (ida y vuelta), lo cual es irrelevante para el PoC.

**HECHO.** "Sandbox number — Free, shared with other users (but isolated). Use it for testing and development."

**VACÍO.** No se publica retención: ni cuántos días conserva Kapso los mensajes, ni la media, ni qué pasa al superar 1 GB en el plan Free.

---

## 4. Vigencia de la URL de media y qué implica para el adaptador

Esto es un requisito de diseño, no un detalle. Hay tres relojes distintos y sólo dos están documentados.

> **Lo medido el 2026-08-22**, sobre la URL real de Active Storage:
>
> - **La descarga anónima funciona.** `curl` sin cabeceras devolvió `HTTP 200` y exactamente 117.868 bytes, los mismos que declaraba `byte_size`. **No se requiere `X-API-Key`.** **HECHO.**
> - **La vigencia sigue sin medirse.** La descarga se hizo a los pocos minutos de recibido el mensaje. Falta correr `check-media-url.sh` para saber si esa URL vence y cuándo. **VACÍO ABIERTO.**
> - **La URL de Meta sí declara su vencimiento en el propio parámetro**: `image.url` trae `ext=<epoch>`, que en la captura daba unos 8 minutos desde la recepción. **HECHO.**
>
> **Consecuencia práctica mientras la vigencia del blob siga sin medirse**: descargar al recibir el webhook y persistir los bytes. No guardar la URL como si fuera estable. Y como la descarga no pide credencial, **esa URL es un secreto**: quien la tenga baja la imagen.

| URL | Vencimiento documentado | Fuente |
| --- | --- | --- |
| `kapso.media_url` / `kapso.media_data.url` (`https://api.kapso.ai/media/...`) | **NO DOCUMENTADO** | — |
| URL devuelta por `GET /{media_id}` del proxy Kapso→Meta | "The returned URL is temporary and **expires after 5 minutes**" | [Get media URL](https://docs.kapso.ai/api/meta/whatsapp/media/get-media-url) |
| `download_url` de esa misma respuesta (token embebido) | "They **expire 4 minutes after issue**" | [Download media file](https://docs.kapso.ai/api/meta/whatsapp/media/download-media-file) |
| URL de media de Meta directo (camino clásico) | "Media URLs **expire after 5 minutes**"; el `media_id` recibido por webhook es descargable 7 días | [Meta Cloud API — Media](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media) |

Notas primarias adicionales:

- **HECHO.** El `download_url` de Kapso no lleva `X-API-Key`: "No `X-API-Key` header is needed — authentication is embedded in the token."
- **HECHO.** El proxy vive en `https://api.kapso.ai/meta/whatsapp/v24.0`, y "Mirrors Meta's Graph API shapes, so existing Cloud API code ports over with a base URL change."
- **VACÍO.** La doc **no dice** si `media_data.url` requiere autenticación (`X-API-Key`, bearer, o ninguna). Es una incógnita que el runbook resuelve en un `curl`.

### Consecuencias de diseño

**REQUISITO (derivado, no opcional).** El adaptador **descarga los bytes al recibir el webhook**, no en un job diferido de duración indefinida. Justificación: la vigencia de `media_data.url` no está documentada, y el camino de respaldo —el `media_id` de Meta vía proxy— sí tiene un techo duro de 5 minutos. Diseñar contra el reloj más corto conocido es la única postura defendible mientras el otro sea desconocido.

**REQUISITO.** Descargar no puede hacerse dentro del handler que debe responder `200` en menos de 10 segundos. La secuencia es: verificar firma → deduplicar por `X-Idempotency-Key` → **encolar con los bytes ya descargados o con la descarga como primer paso inmediato del worker** → responder `200`. La decodificación del QR va después; `packages/verification/src/decode.ts` recorre una escalera de hasta ocho variantes más un barrido de mosaicos, y ese costo no cabe en el presupuesto del webhook.

**REQUISITO.** Guardar `message.image.id` (el `media_id` de Meta) junto al evento. Es el único camino de recuperación si `media_data.url` falla o ya venció, y su ventana de 7 días es mucho más ancha que la de cualquier URL.

**Sobre el motor:** `decodeImage(source: string | Buffer)` ya acepta bytes, así que el adaptador sólo debe entregarle un `Buffer`. No hay que tocar el motor. Lo que falta es exactamente lo que esta investigación intenta habilitar: la pieza que consigue esos bytes.

---

## 5. Runbook de verificación (5 minutos, requiere un teléfono)

> **Los comandos de esta sección ya no vienen de la documentación: fueron auditados contra el CLI instalado.** Todo lo marcado como HECHO acá sale de correr `--help` o el comando en esta máquina el 2026-08-22, con `@kapso/cli` 0.18.0. Donde la sintaxis del informe original difería de la real, está corregida y señalada.

### 5.0 Estado en esta máquina, verificado el 2026-08-22

**HECHO — instalación.** Se ejecutó `npm install -g @kapso/cli` (143 paquetes). Resultado:

- `kapso --version` → `@kapso/cli/0.18.0 win32-x64 node-v24.14.0`
- Ubicación: `C:\Users\admin\AppData\Roaming\npm\node_modules\@kapso\cli`
- `node --version` → **v24.14.0**, cumple el `engines.node: >=20.19` del paquete.

**HECHO — autenticación: NO hay credencial.** Salida textual de `kapso status --output json`:

```json
{
  "data": {
    "authenticated": false,
    "authentication_mode": "none",
    "project_access": { "ready": false }
  },
  "next": [{ "command": "kapso login" }]
}
```

Y cualquier comando de proyecto falla con este error textual, capturado tal cual:

```
 »   Error: Not authenticated. Run "kapso login" first.
```

con `exit code 2`. **No se ejecutó `kapso login` ni se configuró ninguna credencial**: `login` es interactivo (abre el navegador) y queda como paso humano.

**HECHO — `KAPSO_API_KEY` es una vía real de autenticación.** Verificado sin configurar nada: con `KAPSO_API_KEY` seteada a un valor inválido *sólo dentro del proceso de prueba*, el error cambia de `Not authenticated` a `Error: Invalid or missing API key`. Es decir, el CLI **lee esa variable** y la manda al servidor. La variable no quedó seteada en el entorno.

**GOTCHA — `~/.kapso/cli` existe pero está vacío, y su existencia NO prueba que haya sesión.** Antes de instalar no existía. El primer arranque del CLI lo crea igual, sin login: `getCliHomeDir()` en `dist/services/cli-home.js` hace `mkdirSync` incondicional. Hoy contiene `config/` y `secure/`, **ambos vacíos**. Cualquier chequeo de credencial debe usar `kapso status --output json`, no la presencia del directorio. (Se puede reubicar con la variable `KAPSO_CLI_HOME`.)

**HECHO — `jq` no está instalado en esta máquina.** `curl` (8.18.0) y `bash` sí. Por eso los scripts de `scripts/kapso/` parsean JSON con `node` en vez de `jq`.

### 5.0.1 Auditoría de los comandos del runbook

El informe original tomó estos comandos de la documentación, no de la herramienta. Se contrastaron uno por uno.

| Comando del runbook original | ¿Existe? | Veredicto |
| --- | --- | --- |
| `kapso whatsapp numbers list --output json` | Sí | **CORRECTO** |
| `kapso whatsapp messages list --phone-number-id <id> --direction inbound --limit 5 --output json` | Sí | **CORRECTO**, los cuatro flags existen con ese nombre exacto |
| `kapso whatsapp conversations list --phone-number-id <id> --status active --output json` | Sí | **CORRECTO**; `--status` acepta `active\|ended` |
| `kapso whatsapp messages get <message-id> --output json` | Sí | **CORRECTO**; el ID va como argumento posicional |
| `kapso whatsapp webhooks new --phone-number-id ... --url ... --event ... --active` | Sí | **CORRECTO**; `--url` es el único flag requerido |
| `kapso whatsapp webhooks list --phone-number-id <id>` | Sí | **CORRECTO** |
| `kapso login`, `kapso status` | Sí | **CORRECTO** |
| `... --output json \| jq '.[0] \| {...}'` | — | **INCORRECTO — corregido abajo** |

**CORRECCIÓN 1 (la que rompía el runbook).** El JSON del CLI **no es un array suelto**: viene envuelto. `messages list` y `conversations list` devuelven `{ "data": [...], "paging": {...} }`; `numbers list` devuelve `{ "data": [...], "meta": {...} }` (`PagedResponse<T>` y `ApiEnvelope<T>` en `dist/models/api.d.ts` y en los tipos de `@kapso/whatsapp-cloud-api`). El `jq '.[0]'` del informe original **no habría devuelto nada**. Lo correcto es `jq '.data[0]'`.

**CORRECCIÓN 2 (menor).** `--output json` es **el valor por defecto** en `numbers list`, `messages list`, `messages get`, `conversations list`, `webhooks list` y `logs search`: pasarlo es redundante pero inofensivo, y conviene dejarlo explícito para que el runbook no dependa de un default. **No** es el default en `kapso status` ni en `kapso whatsapp webhooks new`, donde el default es `human` y el flag **sí hace falta**.

**HECHO — los nombres de campo del JSON son `snake_case`.** El CLI aplica `decamelizeKeys` de `humps` sobre todo lo que imprime (`dist/utilities/output.js`). Los tipos internos son camelCase (`hasMedia`, `mediaData`, `contentType`, `byteSize`) pero la salida es `has_media`, `media_data`, `content_type`, `byte_size` — coincide con lo que documenta la sección 2. Los scripts igual toleran las dos formas.

**HECHO — el CLI 0.18.0 no tiene ningún comando de sandbox.** `kapso whatsapp sandbox` devuelve `Error: Command whatsapp:sandbox not found`, y la palabra `sandbox` **no aparece en ninguna parte del código del CLI**. Confirma por la herramienta lo que la doc sugería: crear y activar la sesión de sandbox es exclusivamente dashboard + teléfono.

**HALLAZGO NUEVO — `kapso logs search` sirve para ver qué entregó Kapso a los webhooks.** No estaba en el informe original. Existe con `--source all|external_api_log|whatsapp_webhook_event|flow_event|webhook_delivery`, `--query`, `--filter k=v`, `--period 24h|7d|30d`, `--problems-only`, `--limit`. Permite inspeccionar entregas de webhook **sin montar un túnel**, lo que lo vuelve el complemento natural del paso 4.

**HALLAZGO NUEVO — el registro de un número trae `inbound_processing_enabled`.** El tipo `WhatsAppNumber` (`dist/models/api.d.ts`) incluye `inboundProcessingEnabled?: boolean`. Si el sandbox no entregara nada entrante, este campo es el primer lugar donde mirar. **No hay ningún campo que marque un número como sandbox** en ese tipo: el sandbox se identifica por su número visible, no por un discriminador.

**VACÍO / GOTCHA NUEVO.** Los tipos del SDK declaran `kapso.content` como `Record<string, unknown>`, mientras el ejemplo de la documentación de webhooks lo muestra como **string** (`"Photo description Image attached (photo.jpg) ..."`). Las dos cosas no pueden ser ciertas a la vez. **No parsear `content` hasta ver un payload real.**

**RESUELTO POR LA PRUEBA.** El análisis previo era una inferencia débil: `GET https://api.kapso.ai/media/<id-inexistente>` sin credencial devuelve **404 HTML**, no 401 ni 403, lo que no permitía concluir nada porque un 404 puede emitirse antes o después de autorizar.

La medición del 2026-08-22 lo cierra: la URL real de `media_data` se descargó **sin ninguna credencial**, con `HTTP 200` y los `byte_size` exactos. **No requiere `X-API-Key`.** Con la consecuencia de seguridad correspondiente: esa URL es un secreto, porque quien la tenga baja el archivo.

### 5.1 Scripts para no hacerlo a mano

Dos scripts en [`scripts/kapso/`](../../scripts/kapso/), escritos con la sintaxis **verificada** del CLI:

| Script | Qué hace | Salida |
| --- | --- | --- |
| [`poll-inbound.sh`](../../scripts/kapso/poll-inbound.sh) | Consulta los entrantes cada N segundos hasta encontrar uno con `has_media == true`, y lo imprime formateado. La persona manda la foto y el script la detecta solo. Tolera la ausencia de mensajes y los errores del CLI sin cortar. | `kapso-inbound-media.json` con el payload completo · exit `0` encontrado / `2` timeout |
| [`check-media-url.sh`](../../scripts/kapso/check-media-url.sh) | Golpea una `media_data.url` a los **0, 5, 10 y 30 minutos** y registra el código HTTP de cada intento. Prueba primero sin credencial y, si da 401/403, reintenta con `X-API-Key`. Mide los dos vacíos de la sección 4. | CSV `kapso-media-url-vigencia.csv` con minuto, código anónimo, código autenticado y lectura |

Ambos usan `node` para parsear JSON (`jq` no está instalado acá) y `bash`. `poll-inbound.sh` avisa por adelantado si `kapso status` reporta `authenticated: false`.

### Paso 0 — Instalar y autenticar (una sola vez)

**Ya hecho en esta máquina:**

```bash
npm install -g @kapso/cli    # HECHO: 0.18.0 instalado
```

**Pendiente, requiere una persona** — `kapso login` es interactivo y abre el navegador:

```bash
kapso login                  # la sesión queda en ~/.kapso/cli/
kapso status --output json   # debe pasar de "authenticated": false a true
```

Alternativa sin navegador, con una API key de proyecto creada en [app.kapso.ai](https://app.kapso.ai) (verificado: el CLI lee esta variable):

```bash
export KAPSO_API_KEY=your_project_api_key   # PowerShell: $env:KAPSO_API_KEY = "..."
```

### Paso 1 — Crear y activar la sesión de sandbox (**paso humano**)

En el dashboard, **WhatsApp → Sandbox → Add Test Number**, ingresar el teléfono desde el que se va a probar, **Create**. Kapso muestra un código de seis caracteres, el número compartido y un botón **Open WhatsApp**. Desde ese teléfono, mandar el código exacto (distingue mayúsculas) por chat. Llega una confirmación. **El código vence a los 15 minutos.**

### Paso 2 — Ubicar el `phone_number_id` del sandbox

```bash
kapso whatsapp numbers list --output json
```

**Sintaxis verificada.** La salida es `{ "data": [ ... ], "meta": { ... } }`. Para leerla de un vistazo, `--output human` imprime una línea por número con `phone_number_id=` incluido:

```bash
kapso whatsapp numbers list --output human
```

**No hay campo que marque un número como sandbox**: identificarlo por el número visible que muestra el dashboard. Anotar su `phone_number_id`; todo lo que sigue lo usa. Si el CLI acepta el número real en vez del ID, `--phone-number "+549..."` lo resuelve solo (flag disponible en `messages list`, `conversations list`, `webhooks list` y `messages get`).

Vale la pena mirar también `inbound_processing_enabled` en el registro del número: si está en `false`, no va a entrar nada y el resto del runbook no prueba nada.

### Paso 3 — **Mandar una foto con un QR desde el teléfono al número de sandbox** (**paso humano**)

Este es el paso que decide la investigación y **no puede simularse**. Una foto real, sacada con la cámara, enviada como imagen por el chat.

Para no tener que mirar la consola, arrancar **antes** el script de espera, que detecta el mensaje solo:

```bash
./scripts/kapso/poll-inbound.sh --phone-number-id <id> --interval 10 --timeout 900
```

Sale con `0` en cuanto ve un entrante con `has_media == true`, imprime el resumen y deja el payload completo en `kapso-inbound-media.json`. Sale con `2` si se agota el timeout, y en ese caso imprime qué revisar antes de concluir nada.

### Paso 4 — Leer el mensaje real y mirar el payload

Si se prefiere a mano, en vez del script:

```bash
kapso whatsapp conversations list --phone-number-id <id> --status active --output json

kapso whatsapp messages list \
  --phone-number-id <id> \
  --direction inbound \
  --limit 5 \
  --output json
```

Y para un mensaje puntual:

```bash
kapso whatsapp messages get <message-id> --output json
```

**Criterio de decisión, sobre el último mensaje entrante:**

| Observación | Lectura |
| --- | --- |
| `type: "image"` y `kapso.has_media: true` y `kapso.media_data.url` presente | El sandbox entrega media. Hipótesis confirmada. |
| `type: "image"` pero `has_media: false` o sin `media_data` | El sandbox recibe la imagen pero no la ingesta. Queda el camino `message.image.id` vía proxy. |
| el mensaje no aparece, o llega como texto/placeholder | El sandbox no entrega media entrante. Escalar a soporte de Kapso o pasar a número productivo. |

Extraer sólo lo que importa. **Ojo con el envelope** — la versión anterior de este informe usaba `.[0]` y no habría devuelto nada:

```bash
kapso whatsapp messages list --phone-number-id <id> --direction inbound --limit 1 --output json \
  | jq '.data[0] | {type, image, has_media: .kapso.has_media, media_url: .kapso.media_url, media_data: .kapso.media_data}'
```

Sin `jq` (el caso de esta máquina), lo mismo con `node`:

```bash
kapso whatsapp messages list --phone-number-id <id> --direction inbound --limit 1 --output json \
  | node -e "let r='';process.stdin.on('data',c=>r+=c).on('end',()=>{const m=JSON.parse(r).data[0];console.log(JSON.stringify({type:m.type,image:m.image,...m.kapso},null,2))})"
```

**Complemento útil** — ver qué entregó Kapso a los webhooks, sin montar un túnel:

```bash
kapso logs search --source whatsapp_webhook_event --period 24h --limit 20 --output json
kapso logs search --source webhook_delivery --problems-only --output json
```

### Paso 5 — Probar la URL de media: existe, autentica y devuelve bytes

Este paso mide los dos vacíos de la sección 4 —**vigencia** y **autenticación** de `media_data.url`— y está automatizado:

```bash
./scripts/kapso/check-media-url.sh "<media_data.url>" \
  --api-key "$KAPSO_API_KEY" \
  --download ./qr-sandbox.jpg
```

Golpea la URL a los **0, 5, 10 y 30 minutos**; en cada punto prueba primero sin credencial y, si responde 401/403, reintenta con `X-API-Key`. Registra todo en `kapso-media-url-vigencia.csv` y avisa entre qué dos minutos dejó de servir bytes. **Corre 30 minutos: dejarlo en una terminal aparte.** La medición *es* la espera.

Los `curl` equivalentes, si se prefiere a mano:

```bash
curl -sSI "<media_data.url>"                                  # ¿es pública?
curl -sSI -H "X-API-Key: $KAPSO_API_KEY" "<media_data.url>"   # ¿necesita la API key?
curl -sSL -H "X-API-Key: $KAPSO_API_KEY" "<media_data.url>" -o ./qr-sandbox.jpg
```

**Si sigue devolviendo `200` a los 30 minutos, la URL no es de vida corta**; si devuelve `403`/`404`, ese minuto es el presupuesto real del adaptador.

Y probar los bytes contra el motor, que es el único criterio que importa:

```bash
node -e "require('./packages/verification/dist/decode.js').decodeImage(require('fs').readFileSync('./qr-sandbox.jpg')).then(r=>console.log(r))"
```

### Paso 6 — Camino de respaldo, si `media_data.url` no sirve

Con el `message.image.id` del payload:

```bash
curl -sS -H "X-API-Key: $KAPSO_API_KEY" \
  "https://api.kapso.ai/meta/whatsapp/v24.0/<media_id>?phone_number_id=<id>"
```

La respuesta trae la URL de Meta (5 minutos de vida) y un `download_url` de Kapso (4 minutos, sin necesidad de `X-API-Key`).

### Alternativa sin shell: Project MCP

**HECHO** ([MCP server](https://docs.kapso.ai/docs/whatsapp/mcp)). Endpoint `https://api.kapso.ai/mcp`. Autenticación por login en navegador o por header `Authorization: Bearer YOUR_PROJECT_API_KEY` / `X-API-Key: YOUR_PROJECT_API_KEY`.

```bash
claude mcp add --transport http kapso https://api.kapso.ai/mcp \
  --header "Authorization: Bearer $KAPSO_API_KEY"
```

Herramientas relevantes, con sus acciones documentadas:

| Tool | Actions |
| --- | --- |
| `whatsapp_numbers` | `help`, `list`, `get`, `resolve`, `health`, `start_setup`, `create`, `update`, `delete` |
| `whatsapp_conversations` | `help`, `list`, `get`, `set_status` |
| `whatsapp_messages` | `help`, `list`, `get`, `send`, `mark_read` |
| `whatsapp_webhooks` | `help`, `list`, `get`, `create`, `update`, `delete` |

`action: "help"` sobre cualquiera devuelve parámetros requeridos, opcionales y ejemplos. **VACÍO.** La doc no publica el esquema de campos que devuelve `whatsapp_messages.list`; no se puede afirmar de antemano que exponga `media_data` con esa forma.

### Cuando haya que enchufar el webhook de verdad

```bash
kapso whatsapp webhooks new \
  --phone-number-id <id> \
  --url "https://<tunel>.ngrok.app/webhooks/kapso/whatsapp" \
  --event whatsapp.message.received \
  --kind kapso \
  --payload-version v2 \
  --active \
  --output json

kapso whatsapp webhooks list --phone-number-id <id> --output json
```

**Sintaxis verificada, con dos agregados que el informe original no tenía.** `webhooks new` expone `--kind kapso|meta` y `--payload-version v1|v2` como flags explícitos: son exactamente las dos decisiones que la sección 2 dice que hay que tomar (formato `kapso` para tener `media_url`; payload v2). Conviene declararlas en vez de confiar en el default. También existen `--buffer-enabled` / `--no-buffer-enabled`, `--buffer-window-seconds`, `--max-buffer-size`, `--header Name=value`, `--secret-key` e `--inactivity-minutes`. **Para el PoC conviene `--no-buffer-enabled`**: con buffering el cuerpo cambia de forma (sección 2) y agrega una variable innecesaria a la prueba. `--url` es el único flag requerido, y `--output` acá **sí hace falta** porque su default es `human`.

En el dashboard el camino equivalente es **WhatsApp → Configurations → Sandbox WhatsApp → Manage Webhooks**. Sólo se aceptan endpoints HTTPS alcanzables desde Internet; para local, la doc recomienda `ngrok http 3000` o `cloudflared tunnel --url http://localhost:3000`.

### 5.9 Qué falta hacer, y quién tiene que hacerlo

Todo lo automatizable ya está hecho. Lo que sigue **requiere una persona** y no se puede simular. En este orden:

1. **Hacer login en el CLI.** Correr `kapso login` en una terminal interactiva (abre el navegador). Alternativa sin navegador: crear una API key de proyecto en [app.kapso.ai](https://app.kapso.ai) y exportarla como `KAPSO_API_KEY`. **Bloqueante: sin esto, todo lo demás devuelve `Not authenticated`.**
2. **Confirmar el login.** `kapso status --output json` tiene que devolver `"authenticated": true`. Hoy devuelve `false`.
3. **Crear la sesión de sandbox en el dashboard.** WhatsApp → Sandbox → *Add Test Number* → ingresar el teléfono de prueba → *Create*. Anotar el código de seis caracteres. El CLI 0.18.0 **no** puede hacer este paso.
4. **Activar la sesión desde el teléfono.** Mandar ese código exacto (distingue mayúsculas) por WhatsApp al número compartido de sandbox. **Vence a los 15 minutos.**
5. **Obtener el `phone_number_id`.** `kapso whatsapp numbers list --output human`. Verificar de paso que `inbound_processing_enabled` no esté en `false`.
6. **Arrancar el detector.** `./scripts/kapso/poll-inbound.sh --phone-number-id <id> --interval 10 --timeout 900` y dejarlo corriendo.
7. **Mandar la foto del QR desde el teléfono al número de sandbox.** Una foto real, sacada con la cámara, enviada como imagen (no como documento). **Este es el paso que responde la pregunta de toda la investigación.**
8. **Leer el veredicto** con la tabla del paso 4, sobre el resumen que imprime el script o sobre `kapso-inbound-media.json`.
9. **Medir la URL de media.** `./scripts/kapso/check-media-url.sh "<media_data.url>" --api-key "$KAPSO_API_KEY" --download ./qr-sandbox.jpg`. Corre 30 minutos.
10. **Probar los bytes contra el motor.** `decodeImage` sobre `./qr-sandbox.jpg`. Es el único criterio que decide si el canal sirve.
11. **Volver a este informe y escribir el resultado** — incluida la vigencia medida y si la URL pidió `X-API-Key`. Hasta entonces, **la sección 1 sigue siendo la verdad: no está probado que el sandbox entregue imágenes.**

---

## 6. Qué NO responde el botón Test Webhook

**HECHO.** Kapso expone `POST /whatsapp/webhooks/{webhook_id}/test`, descrito textualmente así ([Test project webhook](https://docs.kapso.ai/api/platform/v1/webhooks/test-project-webhook)):

> "Send a test payload to the webhook endpoint. Optionally specify an `event_type` to test with a specific event payload. The event type must be one of the events the webhook is configured to receive."

**INFERENCIA (fuerte, y directamente derivada del texto).** El payload lo **genera Kapso a pedido**, a partir de un `event_type` elegido por quien dispara la prueba. No proviene de un mensaje real ni de un número real: es un dato sintético que Kapso arma para ejercitar el endpoint. Por lo tanto, si se dispara con `event_type: whatsapp.message.received`, **el payload de prueba puede traer un `media_data` perfectamente formado aunque el sandbox jamás entregue una imagen en la vida real**. Muestra la forma del contrato, no la capacidad del canal.

**Sirve para:** validar que el endpoint es alcanzable, que la firma HMAC verifica, que la deduplicación por `X-Idempotency-Key` funciona y que el parser no explota con la estructura v2.

**No sirve para:** responder la pregunta de esta investigación. La única prueba válida es un mensaje real, enviado por una persona desde un teléfono real (sección 5, pasos 1 y 3).

**VACÍO / CORRECCIÓN A UNA FUENTE SECUNDARIA.** Un resumen de buscador atribuía a la documentación la frase "realistic sample data that matches the exact structure of production webhooks". **Esa frase no se encontró en ninguna página de la documentación de Kapso.** Se buscó en el corpus completo por `Send Test`, `sample data`, `realistic`, `production webhook` y `exact structure`: la única coincidencia es la descripción del endpoint citada arriba. Tampoco se encontró documentado un botón llamado literalmente "Test Webhook" o "Send Test" en la doc del dashboard. La advertencia se sostiene igual —por la naturaleza de un payload generado a pedido— pero **no debe citarse esa frase como si fuera de Kapso**. La página [`docs.kapso.ai/docs/integrations/api-webhooks`](https://docs.kapso.ai/docs/integrations/api-webhooks), que el buscador ofrecía como fuente, devuelve **HTTP 404**.

---

## 7. Implicancias para el adaptador

El motor no cambia. `decodeImage(source: string | Buffer)` en `packages/verification/src/decode.ts` ya acepta bytes. Lo que falta es la pieza que los consigue, y estas son sus restricciones derivadas de lo verificado:

1. **Descargar en el momento de recibir el webhook.** La vigencia de `media_data.url` es desconocida y el camino de respaldo vence en 5 minutos. No diferir la descarga a un job de latencia arbitraria. (Sección 4.)

2. **Persistir `message.image.id` junto al evento.** Es la única vía de recuperación con una ventana ancha (7 días según Meta) si la URL de Kapso falla.

3. **Dos caminos de obtención, no uno.** Primario: `GET kapso.media_data.url`. Respaldo: `GET https://api.kapso.ai/meta/whatsapp/v24.0/{media_id}?phone_number_id=...` y después el `download_url` (que no lleva `X-API-Key`). El adaptador debe implementar el primario y dejar el segundo detrás de una interfaz, no cablearlo.

4. **El handler responde `200` en menos de 10 segundos y no decodifica nada.** Verificar firma → deduplicar por `X-Idempotency-Key` → encolar → `200`. La escalera de variantes y el barrido de mosaicos del motor corren en el worker.

5. **Idempotencia obligatoria.** Reintentos a 10 s, 40 s y 90 s. Sin deduplicación, una foto se procesa hasta cuatro veces.

6. **Parsear las dos formas del cuerpo.** Con buffering desactivado llega el evento suelto; con buffering llega `{ type, batch: true, data: [...], batch_info }`. Detectar por `X-Webhook-Batch` o por `body.batch === true`.

7. **Validar `content_type` y `byte_size` antes de descargar.** Vienen en el payload. Rechazar lo que no sea imagen y poner un techo de bytes propio: el límite de recepción del sandbox no está documentado.

8. **No asumir que hay teléfono.** "Do not assume every payload has a phone number": Kapso agrega `business_scoped_user_id`, `parent_business_scoped_user_id` y `username`. Relevante para la compuerta de identidad y suscripción que define [`docs/flujo-b2c.md`](../flujo-b2c.md), que se resuelve **antes** del motor y fuera del chat.

9. **Conservar el body crudo para la firma, y verificarlo contra un webhook real.** La doc dice "raw JSON payload" pero sus ejemplos re-serializan con `JSON.stringify`. La ambigüedad no está resuelta en la documentación.

10. **El QR llega como foto de un usuario nervioso, no como archivo limpio.** Es exactamente el caso para el que `decode.ts` construyó la escalera de preprocesado. El adaptador no debe recortar, recomprimir ni redimensionar antes de entregar los bytes: el motor ya tiene su propio `MAX_SIDE` y su propia estrategia.

---

## Limitaciones de esta investigación

> **Reconciliadas con el experimento del 2026-08-22.** Una versión anterior de esta sección decía que la pregunta principal seguía abierta. Ya no lo está: el runbook se ejecutó. Lo que sigue distingue lo que quedó probado de lo que sigue sin medirse.

**Cerrado por la prueba:**

- **El sandbox entrega imágenes.** Se envió una foto desde un teléfono y llegó como `type: "image"` con `has_media: true` y `media_data` completo. Antes esto no podía escribirse en ningún lado; ahora es un hecho observado.
- **`media_data.url` no requiere autenticación.** Descarga anónima con `HTTP 200` y los `byte_size` exactos.
- **La forma de la respuesta ya no viene de los tipos del SDK.** Antes se conocía por la declaración del paquete; ahora hay un payload real capturado, y difiere de la documentación en el host del blob.

**Sigue abierto:**

- **La vigencia de `media_data.url` no se midió.** Es el vacío que más cuesta si se asume mal. La descarga se hizo a los pocos minutos de recibido el mensaje, así que no se sabe si esa URL vence ni cuándo. `scripts/kapso/check-media-url.sh` la mide; hasta correrlo, el requisito de diseño es descargar al recibir el webhook y persistir los bytes.
- **No se probó la lectura de un código real por el canal.** El pipeline completo funcionó —WhatsApp, Kapso, descarga, `decodeImage`— pero la imagen de prueba era generada por IA y su patrón no es un QR válido, así que devolvió `ILEGIBLE` tras 91 intentos. **Falta repetirlo con una foto de un QR de verdad**; `scripts/qr-pruebas/` genera hojas listas para fotografiar.
- **No se probó el webhook.** Todo lo verificado se hizo consultando la API por CLI. Que Kapso entregue el mismo payload a un endpoint propio es una inferencia razonable, no un hecho medido.
- **Retención**: cuánto tiempo Kapso conserva el archivo no está documentado en ninguna parte. Publica capacidad, nunca tiempo.
- **Los scripts de `scripts/kapso/` no fueron probados contra Kapso.** Se validó su sintaxis, su manejo del error `Not authenticated`, y su parser contra payloads sintéticos con la forma que documenta la sección 2. `check-media-url.sh` se probó contra URLs reales que devuelven `200` y `404`. **Ninguno corrió todavía contra un mensaje real.**
- **La documentación de Kapso cambia rápido.** Todo lo citado corresponde a la versión del 2026-08-22.
- **Una URL falló:** `https://docs.kapso.ai/docs/integrations/api-webhooks` → **HTTP 404**. `https://www.npmjs.com/package/@kapso/cli` devolvió **HTTP 403** a la herramienta automatizada; el dato de versión se obtuvo de `https://registry.npmjs.org/@kapso/cli/latest`.
- **No se evaluó nada legal.** Retención, residencia de datos, DPA, SLA. Una foto de un QR sacada por un usuario es un dato de una persona real; esto hay que resolverlo antes de producción, y no se resuelve con documentación técnica.
- **Fuera de alcance:** alta productiva en Meta, número argentino, verificación de negocio, plantillas, facturación. Este informe responde una sola pregunta.
