# Capa intermedia entre escaneo y redirección — viabilidad por plataforma

> Fecha: 2026-08-22 · Alcance: Android e iOS (parque argentino), navegadores móviles y billeteras/PSP argentinos, estado de plataforma a agosto de 2026 · Método: verificación contra documentación oficial de plataforma (developer.android.com, developer.apple.com, developer.chrome.com, webkit.org, extensionworkshop.com/MDN, emvco.com), documentación de producto de las billeteras y texto de las comunicaciones del BCRA descargadas del sitio oficial. Cada afirmación lleva su fuente etiquetada **[PRIMARIA]** o **[SECUNDARIA]** y su estatus epistémico **HECHO / INFERENCIA / HIPÓTESIS**. Los vacíos están declarados en línea con lo que se buscó.

Este informe responde una pregunta de arquitectura, no de mercado: **¿puede QRSafe interponerse entre el escaneo de un QR y la carga del destino, y con qué límites impuestos por Android, iOS y los navegadores?** Complementa a [`fraude-qr-argentina-y-blockchain.md`](./fraude-qr-argentina-y-blockchain.md) y se subordina a [`tesis-identity-binding-b2b.md`](./tesis-identity-binding-b2b.md) como fuente de verdad de la propuesta B2B.

---

## Resumen ejecutivo

1. **El hallazgo que reordena la pregunta: en el QR de pago argentino no hay redirección que interceptar.** El QR interoperable sigue el estándar EMVCo Merchant Presented Mode, cuyo contenido **no es una URL**. EMVCo lo dice textualmente: *"such data is payment specific and does not have a general purpose, unlike a uniform resource locator (URL) […] A generic QR Code reader such as the mobile operating system provided camera application is generally not usable with the EMV Merchant Presented QR Code Specification."* [PRIMARIA — https://www.emvco.com/emv-technologies/qrcodes/] **HECHO**. La cámara del sistema no abre un navegador: no hay salto cámara → navegador donde interponerse.

2. **Consecuencia directa**: las Opciones 1 y 2 (capa de SO y capa de navegador) **no aplican al caso de uso central de la tesis** (sustitución de QR de cobro). Aplican al **QR de exploración** — menú, señalética, cartelería, placas, etiquetas — y al *quishing* con URL, que sí encodean http(s) y sí terminan en un navegador.

3. **Android — Opción 1: viable HOY, con una única vía documentada: registrarse como navegador.** Desde Android 12, *"a generic web intent resolves to an activity in your app only if your app is approved for the specific domain contained in that web intent. If your app isn't approved for the domain, the web intent resolves to the user's default browser app instead."* [PRIMARIA] Como QRSafe no controla los dominios ajenos, no puede verificarlos vía App Links; la única puerta que queda abierta es el **rol de navegador por defecto** (`ROLE_BROWSER`), que se obtiene declarando un intent filter genérico `<data android:scheme="http" />` y pidiéndoselo al usuario con `RoleManager.createRequestRoleIntent()` (API 29+). [PRIMARIA] **HECHO**.

4. **iOS — Opción 1: imposible como app no-navegador; posible SÓLO como navegador con entitlement gestionado y aprobación explícita de Apple.** Los Universal Links exigen un archivo servido en el dominio de destino y Apple es taxativa: *"Only you can store this file on your server, securing the association of your website and your app."* [PRIMARIA] **HECHO** — QRSafe no puede reclamar dominios ajenos. La única vía restante: *"The system invokes the default web browser in iOS whenever the user opens an HTTP or HTTPS link"* [PRIMARIA], y ese rol requiere el entitlement gestionado `com.apple.developer.web-browser`, que se solicita por formulario y Apple aprueba caso por caso. **Y Apple contempla explícitamente la excepción que QRSafe necesita**: *"Your app may present a 'Safe Browsing' or other warning for content suspected of phishing or other problems."* [PRIMARIA] **HECHO**.

5. **Opción 2 — extensiones: cubre como máximo ~9% del parque argentino.** Chrome para Android no soporta extensiones (el trabajo de Chromium es para *builds* de escritorio sobre Android, con lo móvil explícitamente fuera de alcance) y Chrome es el 86,31% del navegador móvil en Argentina. Safari iOS sí soporta Web Extensions desde iOS 15, pero Apple documenta que **no soporta bloqueo de requests**: *"`BlockingResponse` not supported. Blocking requests not supported."* [PRIMARIA] — sólo `declarativeNetRequest`, reglas declarativas locales, sin consulta a servidor por request.

6. **DNS no sirve para esto y conviene decirlo sin vueltas.** DNS resuelve nombres de host: no ve el path, no ve la *trama* EMVCo, no sabe si la navegación vino de un QR o de un tap, y bloquear a nivel DNS significa bloquear el dominio entero. Google mismo acota el alcance de Private DNS: *"The secure channel only applies to DNS, so it can't protect users from other kinds of security and privacy violations."* [PRIMARIA] **HECHO**.

7. **Opción 3 — SDK en billeteras: es la única arquitectura que se interpone realmente en el flujo de pago, y hay una palanca regulatoria concreta.** La Com. "A" 8032 establece que *"cuando un pago con tarjeta de crédito se inicie desde una billetera digital interoperable mediante la lectura de un código QR, la responsabilidad por fraude será asumida por la billetera"* [PRIMARIA] **HECHO**: el actor que absorbe la pérdida es el que tiene que integrar la mitigación. Y la Com. "A" 7463 obliga a los esquemas a *"alertar al cliente ordenante y/o requerirle confirmación por vías alternativas antes de cursar la transacción"* como ejemplo de herramienta antifraude [PRIMARIA] **HECHO**. Lo que **no** existe hoy es un SDK público de billetera al que enchufarse: el único programa documentado (flujo emisor de Mercado Pago) está reservado a billeteras digitales externas, no a verificadores.

8. **Recomendación (§6)**: dejar de perseguir la intercepción a nivel SO para el pago — no existe — y separar el producto en dos frentes con arquitecturas distintas: **canal propio + SDK de billetera** para el QR de cobro, y **navegador propio en Android** (`ROLE_BROWSER`) para el QR de exploración, que es donde la capa intermedia sí es técnicamente real.

---

## 1. El punto de intercepción: qué ocurre entre el escaneo y la carga

Antes de evaluar arquitecturas hay que fijar qué se está interceptando. **No hay un solo flujo: hay dos, y son incompatibles entre sí.**

### 1.1 Flujo A — QR de pago EMVCo (el caso de la tesis)

**HECHO** [PRIMARIA]. El QR de comercio argentino transporta una *trama* EMVCo, no una URL. La API de Mercado Pago que genera el QR devuelve un campo `qr_data`, descrito como *"Trama EMVCo para la generación del código QR"*, con este ejemplo de respuesta:

```json
{
  "qr_data": "00020101021243650016COM.MERCADOLIBRE02013063638f1192a-5fd1-4180-a180-8bcae3556bc35204000053039865802BR5925IZABEL AAAA DE MELO6007BARUERI62070503***63040B6D",
  "in_store_order_id": "d4e8ca59-3e1d-4c03-b1f6-580e87c654ae"
}
```

Fuente: https://www.mercadopago.com.ar/developers/es/reference/qr-dynamic/_instore_orders_qr_seller_collectors_user_id_pos_external_pos_id_qrs/post

**HECHO** [PRIMARIA]. EMVCo describe explícitamente qué implica ese formato para un lector genérico:

> *"The EMV Merchant Presented QR Code Specification defines an interoperable and domain-specific format for communicating the data from the merchant to the consumer in a structured manner to initiate a payment; such data is payment specific and does not have a general purpose, unlike a uniform resource locator (URL). Consequently, a specific mobile app is generally required to process the information in the EMV QR Code and to conduct the payment itself. **A generic QR Code reader such as the mobile operating system provided camera application is generally not usable with the EMV Merchant Presented QR Code Specification.**"*
>
> https://www.emvco.com/emv-technologies/qrcodes/

**HECHO** [PRIMARIA]. La resolución del destino la hace la billetera contra la API del adquirente, no el navegador: el flujo aceptador de Mercado Pago documenta la llamada `GET /resolve?data={qr_raw}` que devuelve `order_id` y métodos de pago. Fuente: https://www.mercadopago.com.ar/developers/es/docs/qr-code/interoperable/acceptor-flow

Secuencia real del Flujo A:

```
QR físico (trama EMVCo)
   └─> cámara del sistema: decodifica y muestra TEXTO PLANO (no hay link, no hay navegación)
   └─> el usuario abre su billetera y escanea de nuevo
        └─> billetera: GET /resolve?data={qr_raw}  →  adquirente/IEP
             └─> billetera muestra collector.name y monto
                  └─> confirmación  →  transferencia irrevocable
```

**No hay ningún punto entre "escaneo" y "navegador" en este flujo, porque no hay navegador.** El único intersticio disponible está *dentro* de la billetera, entre el `resolve` y la confirmación del usuario. Eso es la Opción 3, y no hay otra.

> **Vacío declarado**: no se pudo confirmar con documentación primaria qué encodea exactamente el sticker del **Kit QR Oficial** de Mercado Pago (trama EMVCo pura o una URL propietaria que abre la app vía App Links). Se buscó en `mercadopago.com.ar/herramientas-para-vender/cobrar-con-qr/kit-oficial`, en la documentación de desarrolladores de QR estático (`/docs/qr-code/integration-configuration/qr-static/landing` devolvió **HTTP 404**) y en la referencia de API. Si el kit encodeara una URL, parte del Flujo A migraría al Flujo B y cambiaría el veredicto para Android. **Es la primera prueba empírica a correr (§7).**

### 1.2 Flujo B — QR de exploración y quishing (donde la capa intermedia sí existe)

Menús de restaurante, señalética turística, placas históricas, etiquetas de producto, carteles municipales y los QR de phishing encodean una URL http(s). Ahí sí:

```
QR físico (URL https://…)
   └─> cámara / Lens: reconoce URL y ofrece abrirla
        └─> el SO resuelve un web intent (Android) / abre el default browser (iOS)
             └─> ► PUNTO DE INTERCEPCIÓN ◄
                  └─> carga de la página
```

Todo lo que sigue en §2 y §3 aplica **exclusivamente al Flujo B**.

---

## 2. Opción 1 — Capa de sistema operativo

### 2.1 Android

#### 2.1.1 Qué cambió en Android 12 y por qué cierra el camino obvio

**HECHO** [PRIMARIA]. Texto literal de *Behavior changes: all apps* (Android 12), sección **Web intent resolution**:

> *"Starting in Android 12 (API level 31), a generic web intent resolves to an activity in your app only if your app is approved for the specific domain contained in that web intent. If your app isn't approved for the domain, the web intent resolves to the user's default browser app instead.*
>
> *Apps can get this approval by doing one of the following:*
> - *Verify the domain using Android App Links. […] In your app's intent filters, check that you include the `BROWSABLE` category and support the `https` scheme.*
> - *Request the user to associate your app with the domain in system settings."*
>
> https://developer.android.com/about/versions/12/behavior-changes-all

> **Nota de fuente**: la URL `https://developer.android.com/about/versions/12/web-intent-resolution` **existe pero redirige** (HTTP 200 tras redirección) a `https://developer.android.com/training/app-links/verify-applinks`, que no contiene ese texto. La cita se tomó de `behavior-changes-all`, que sí lo contiene.

**INFERENCIA (alta confianza)**: antes de Android 12, una app podía declarar un intent filter para `https` con host comodín y aparecer en el diálogo "Abrir con" de cualquier URL. Android 12 eliminó ese camino: sin aprobación de dominio, el intent va directo al navegador por defecto. Google ya cerró exactamente esta técnica una vez. Es el **precedente de ruptura** más relevante del informe.

#### 2.1.2 Las dos vías de aprobación por dominio, y por qué ninguna sirve

**HECHO** [PRIMARIA]. Verificación automática (`autoVerify`): *"For each unique hostname found in the intent filters, Android queries the corresponding websites for the Digital Asset Links file at `https://hostname/.well-known/assetlinks.json`."* — https://developer.android.com/training/app-links/verify-android-applinks

→ Requiere **controlar el servidor del dominio de destino**. QRSafe no controla `restaurante-x.com.ar` ni `cordoba.gob.ar`. **Descartado.**

**HECHO** [PRIMARIA]. Asociación manual por el usuario: la app dispara `Settings.ACTION_APP_OPEN_BY_DEFAULT_SETTINGS`; el usuario ve la pantalla **Open by default**, activa **Open supported links** y marca dominios bajo **Links to open in this app**; *"They can also select **Add link** to add domains"*. Con la nota: *"On a given device, only one app at a time can be associated with a particular domain."* — misma fuente.

→ Requiere que el usuario agregue **dominio por dominio, a mano**. Para un producto cuyo valor es interceptar dominios *desconocidos de antemano*, es inservible. **Descartado.**

Estados consultables en runtime vía `DomainVerificationManager`: `DOMAIN_STATE_VERIFIED`, `DOMAIN_STATE_SELECTED`, `DOMAIN_STATE_NONE`. [PRIMARIA, misma fuente]

#### 2.1.3 La vía que sí funciona: el rol de navegador

**HECHO** [PRIMARIA]. Definición literal del rol, en la referencia de `RoleManagerCompat` (idéntica a la de `android.app.role.RoleManager`):

> *"**ROLE_BROWSER** — The name of the browser role. To qualify for this role, an application needs to handle the intent to browse the Internet:*
> ```xml
> <activity>
>   <intent-filter>
>     <action android:name="android.intent.action.VIEW" />
>     <category android:name="android.intent.category.BROWSABLE" />
>     <category android:name="android.intent.category.DEFAULT" />
>     <data android:scheme="http" />
>   </intent-filter>
> </activity>
> ```
> *The application will be able to handle that intent by default."*
>
> https://developer.android.com/reference/androidx/core/role/RoleManagerCompat

**HECHO** [PRIMARIA]. `RoleManager.createRequestRoleIntent(String roleName)`, disponible desde **API level 29** (Android 10): *"Returns an Intent suitable for passing to `Activity.startActivityForResult(Intent,int)` which prompts the user to grant a role to this application."* — https://developer.android.com/reference/android/app/role/RoleManager

**Conclusión Android (HECHO + INFERENCIA)**: una app que declara el intent filter genérico de navegador y obtiene `ROLE_BROWSER` recibe **toda** URL http/https que el sistema no haya podido dirigir a una app verificada por dominio — que es exactamente el fallback descrito en la cita de Android 12 (*"the web intent resolves to the user's default browser app instead"*). QRSafe puede entonces mostrar su pantalla de verificación y, según el resultado, cargar el destino en un `WebView`/Custom Tab o frenarlo.

El costo es explícito: **QRSafe tendría que ser un navegador**, con lo que eso implica de superficie de mantenimiento, y el usuario tiene que **cambiar su navegador por defecto**.

#### 2.1.4 Visibilidad de paquetes (Android 11)

**HECHO** [PRIMARIA]. *"When an app targets Android 11 (API level 30) or higher and queries for information about the other apps that are installed on a device, the system filters this information by default."* — afecta a `queryIntentActivities()`, `getPackageInfo()`, `getInstalledApplications()`. Se recupera visibilidad declarando `<queries>` en el manifest. https://developer.android.com/training/package-visibility

→ Relevante si QRSafe quisiera enumerar billeteras instaladas para ofrecer "continuar en Mercado Pago / MODO": hay que declarar los paquetes o el intent en `<queries>`. Es un trámite, no un bloqueo. **Segundo precedente de restricción progresiva** de Google.

#### 2.1.5 ¿El escáner nativo respeta el selector de apps o va directo a Chrome?

**Vacío declarado.** No se encontró documentación oficial de Google que afirme textualmente cómo resuelve el destino el escáner de QR de la cámara del sistema / Google Lens. Se buscó en `support.google.com/camerafromgoogle`, `developer.android.com` y `support.google.com/chrome` con consultas restringidas a dominios de Google.

Lo único que dice la ayuda oficial [PRIMARIA — https://support.google.com/camerafromgoogle/answer/12033278]:

> *"To open a browser page, app, or payments app after a QR code is scanned, click the banner that appears."*

**INFERENCIA (confianza media-alta)**: que el banner pueda abrir *"a browser page, app, or payments app"* indica que el destino se resuelve por el sistema de intents estándar, y por lo tanto queda sujeto a App Links y al navegador por defecto. **No está afirmado por Google en ningún texto que haya podido verificar y no debe presentarse como hecho.** Es la segunda prueba empírica obligatoria (§7).

#### 2.1.6 Ficha Android

| Dimensión | Evaluación |
|---|---|
| **Viabilidad técnica** | **Parcial — Sí sólo vía `ROLE_BROWSER`.** Registrarse para "cualquier URL" como app no-navegador: **No** desde Android 12 [PRIMARIA]. Como navegador por defecto: **Sí** [PRIMARIA, `ROLE_BROWSER` + `createRequestRoleIntent` API 29+]. |
| **Cobertura** | 87,46% del parque móvil argentino es Android [SECUNDARIA, StatCounter jul-2026]. Pero sólo cubre el **Flujo B**: cero cobertura del QR de pago EMVCo. |
| **Fricción** | Alta. Instalar la app **y** cambiar el navegador por defecto en un diálogo del sistema. Un navegador por defecto se elige una vez en la vida del teléfono; pedir ese cambio para una función de seguridad es una barrera mayor que el "paso extra" que la tesis ya identifica como riesgo principal (§4.3 del informe principal). |
| **Dependencia de terceros** | Google. El rol existe por decisión de Android; el comportamiento del escáner de la cámara depende de Google Lens / el OEM. |
| **Riesgo de ruptura** | **Alto, con precedente doble y documentado**: Android 11 restringió la visibilidad de paquetes; Android 12 cerró la resolución genérica de web intents. Google ha estrechado esta superficie en dos versiones consecutivas. Que `ROLE_BROWSER` siga abierto a apps no-navegador es una **HIPÓTESIS** sobre el futuro, no una garantía. |

---

### 2.2 iOS

**Este es el punto donde el informe tiene que ser inequívoco.**

#### 2.2.1 Universal Links: imposible reclamar dominios ajenos

**HECHO** [PRIMARIA]. Apple, sobre el mecanismo de asociación:

> *"When someone installs your app, the system checks a file stored on your web server to verify that your website allows your app to open URLs on its behalf. **Only you can store this file on your server, securing the association of your website and your app.**"*
>
> https://developer.apple.com/documentation/xcode/allowing-apps-and-websites-to-link-to-your-content

**HECHO** [PRIMARIA]. Requisitos operativos del archivo: se sirve en `https://<fully qualified domain>/.well-known/apple-app-site-association`, *"You must host the file using `https://` with a valid certificate and with no redirects"*, y desde iOS 14 el pedido lo hace un CDN de Apple, no el dispositivo. https://developer.apple.com/documentation/xcode/supporting-associated-domains

→ **Universal Links es, por diseño, un mecanismo de *opt-in del dueño del dominio*.** Una app de terceros no puede reclamar `restaurante-x.com.ar`. **Cerrado.**

#### 2.2.2 Custom URL schemes: no capturan http/https

**INFERENCIA (alta confianza)** — declarado como inferencia porque **no encontré una frase de Apple que lo prohíba textualmente**. La evidencia indirecta es fuerte y primaria: entre los requisitos para ser navegador por defecto, Apple lista *"Your app must specify the HTTP and HTTPS schemes in its `Info.plist` file"* **junto con** la exigencia del entitlement gestionado. Si declarar los esquemas alcanzara por sí solo, el entitlement sería redundante. Se buscó en la documentación de `CFBundleURLTypes` y en la guía de definición de esquemas propios sin hallar una prohibición explícita.

#### 2.2.3 SFSafariViewController: no es una capa de intercepción

**HECHO** [PRIMARIA]. *"Interactions with the web interface aren't visible to your app, and you can't access AutoFill data, browsing history, or website data."* — https://developer.apple.com/documentation/safariservices/sfsafariviewcontroller

→ Sirve como **superficie de renderizado después** de una verificación propia, no como punto de inspección. Además, Apple lo **prohíbe explícitamente** en apps con el entitlement de navegador (§2.2.4).

#### 2.2.4 La única vía real: ser el navegador por defecto (iOS 14+), con entitlement gestionado

**HECHO** [PRIMARIA]. Texto literal de *Preparing your app to be the default web browser*:

> *"In iOS 14 and later, users can select an app to be their default web browser. […] **The system invokes the default web browser in iOS whenever the user opens an HTTP or HTTPS link.** Because this app becomes the user's primary gateway to the internet, Apple requires that web browsing apps meet specific functional criteria to protect user privacy and ensure proper access to internet resources.*
>
> *Apps express their capability to be a default web browser by using the `com.apple.developer.web-browser` managed entitlement. Request the default browser entitlement by filling out the [form]."*
>
> https://developer.apple.com/documentation/xcode/preparing-your-app-to-be-the-default-browser

**HECHO** [PRIMARIA]. Criterios de admisión, verbatim de la misma página:

> *"Apps that register as a default web browser option must satisfy the following criteria:*
> - *Your app must specify the HTTP and HTTPS schemes in its `Info.plist` file.*
> - *Your app can't use [SFSafariViewController].*
> - *On launch, the app must provide a text field for entering a URL, search tools for finding relevant links on the internet, or curated lists of bookmarks.*
> - *When opening an HTTP or HTTPS URL in its default configuration:*
>   - ***The app must navigate directly to the specified destination and render the expected web content. Apps that redirect to unexpected locations or render content not specified in the destination's source code don't meet the requirements of a default web browser.***
>   - *Apps designed to operate in a parental controls or locked down mode may restrict navigation to comply with those goals.*
>   - ***Your app may present a "Safe Browsing" or other warning for content suspected of phishing or other problems.***
>   - *Your app may offer a native authentication UI for a site that also offers a native web sign-in flow."*

**Y una restricción cruzada, también verbatim**:

> *"Apps that have the [`com.apple.developer.web-browser`] managed entitlement **may not claim to respond to Universal Links for specific domains. The system will ignore any such claims.** Apps with the entitlement can still open Universal Links to other apps as usual."*

**HECHO** [PRIMARIA]. Cómo lo cambia el usuario: *Settings > Apps > Default Apps > Browser App*. Requiere **iOS 18.2 o posterior** para la pantalla unificada de Default Apps. https://support.apple.com/en-us/121430

#### 2.2.5 ¿La app Cámara abre una app de terceros o Safari?

**HECHO** [PRIMARIA]. La guía oficial confirma que el destino puede ser una app: *"You can use Camera or Control Center to scan Quick Response (QR) codes for **websites, apps**, coupons, tickets, and more."* — https://support.apple.com/guide/iphone/scan-a-qr-code-iphe8bda8762/ios

**Vacío declarado.** Ni esa guía ni la documentación de desarrollador dicen **qué navegador** abre la Cámara cuando el QR es una URL. Se buscó en `support.apple.com/guide/iphone`, en la documentación de `SafariServices` y en el sitio de desarrollador.

**INFERENCIA (confianza alta)**: encadenando dos hechos primarios — (a) la Cámara ofrece abrir el enlace, y (b) *"The system invokes the default web browser in iOS whenever the user opens an HTTP or HTTPS link"* — el enlace escaneado debería ir al navegador por defecto. **Apple no lo afirma en ninguna página que haya podido verificar.** Tercera prueba empírica obligatoria (§7).

**Condición exacta bajo la cual la Cámara abre una app de terceros (HECHO, por composición de primarias)**: cuando la URL escaneada está cubierta por un Universal Link cuyo `apple-app-site-association` está publicado **en el dominio de esa URL** y la app correspondiente está instalada. Es decir: **sólo el dueño del dominio puede provocar ese salto.** No hay ninguna otra condición documentada.

#### 2.2.6 Veredicto iOS, sin ambigüedad

> **Interceptar una URL escaneada por la app Cámara desde una app de terceros que no sea un navegador: NO ES POSIBLE en iOS.** No hay API pública que lo permita. Universal Links exige control del dominio de destino [PRIMARIA]; los esquemas personalizados no capturan http/https; `SFSafariViewController` no ve lo que ocurre dentro [PRIMARIA].
>
> **La única arquitectura posible en iOS es que QRSafe SEA un navegador web completo**, apruebe el entitlement gestionado `com.apple.developer.web-browser` y el usuario lo elija como navegador por defecto en *Settings > Apps > Default Apps*.
>
> **Y esa vía no está cerrada para un producto antifraude**: Apple contempla expresamente que un navegador por defecto *"may present a 'Safe Browsing' or other warning for content suspected of phishing or other problems"* [PRIMARIA]. Una pantalla intersticial de verificación cae, textualmente, dentro de lo permitido. Lo que **no** está permitido es redirigir a destinos inesperados o renderizar contenido que no esté en el código fuente del destino.

#### 2.2.7 Ficha iOS

| Dimensión | Evaluación |
|---|---|
| **Viabilidad técnica** | **No** como app normal. **Parcial (Sí, condicionado)** como navegador con entitlement gestionado aprobado por Apple, y sólo para el Flujo B. |
| **Cobertura** | 12,51% del parque móvil argentino [SECUNDARIA, StatCounter jul-2026]. Cero cobertura del QR de pago EMVCo. |
| **Fricción** | **La más alta de las tres opciones.** Instalar una app que además debe ser un navegador usable (campo de URL, búsqueda o bookmarks en el arranque, por requisito de Apple), y luego cambiar el navegador por defecto. |
| **Dependencia de terceros** | **Apple, de forma discrecional y explícita.** El entitlement es *managed*: Apple lo concede o no. No hay derecho de apelación técnico. Además exige perfiles de aprovisionamiento manuales. |
| **Riesgo de ruptura** | **Alto y de naturaleza distinta al de Android**: en Android el riesgo es que una API se cierre; en iOS el riesgo es que Apple **no otorgue el entitlement de entrada**. Precedente documentado de restricción: *"Apps that have the managed entitlement may not claim to respond to Universal Links for specific domains. The system will ignore any such claims."* |

---

## 3. Opción 2 — Capa de navegador

### 3.1 Extensiones

#### 3.1.1 Estado real por navegador

| Navegador | ¿Extensiones? | Evidencia | Etiqueta |
|---|---|---|---|
| **Chrome Android** | **No** | El único trabajo de Chromium sobre extensiones en Android es la issue *"Support extensions on experimental desktop android builds"* (356905053), con lo móvil explícitamente fuera de alcance. https://issues.chromium.org/issues/356905053 | [PRIMARIA — issue tracker oficial de Chromium] |
| **Firefox Android** | **Sí** | Mozilla documenta el desarrollo y la distribución de extensiones para Firefox for Android y **recomienda Manifest V2** por problemas no resueltos en MV3 (sin background service worker). https://extensionworkshop.com/documentation/develop/developing-extensions-for-firefox-for-android/ | [PRIMARIA] |
| **Safari iOS** | **Sí, desde iOS 15** | *"Safari web extensions are available in macOS with Safari 14 and later, visionOS 1 and later, and **iOS 15 and later**."* https://developer.apple.com/documentation/safariservices/safari-web-extensions | [PRIMARIA] |
| **Samsung Internet** | **No verificado** | No se investigó. Soporta *content blockers*, no la API WebExtensions completa — **no confirmado con fuente primaria**, declarado como vacío. | — |

> **Vacío declarado**: no se encontró una página de `developer.chrome.com` ni de `support.google.com` que afirme textualmente "Chrome for Android does not support extensions". Se buscó con consultas restringidas a `developer.chrome.com`, `chromium.org`, `blog.chromium.org` y `support.google.com`. La evidencia disponible es la issue de Chromium citada y la ausencia total de Android en la documentación de extensiones. La afirmación se sostiene, pero la fuente es un tracker de bugs, no documentación de producto.

#### 3.1.2 Qué puede hacer realmente una extensión: MV3 vs webRequest bloqueante

**HECHO** [PRIMARIA]. Chrome, sobre `declarativeNetRequest`: la API permite **bloquear**, **redirigir**, **actualizar el esquema** (http→https), **permitir** y **modificar headers**, y lo hace *"without intercepting them and viewing their content, thus providing more privacy."* Límites documentados: hasta 30.000 reglas dinámicas, 5.000 de sesión, máximo 50 rulesets estáticos habilitados, 1.000 reglas regex por tipo. https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest

**HECHO** [PRIMARIA]. Chrome, sobre la migración: MV3 reemplaza *"intercepting network requests and altering them at runtime with `chrome.webRequest`"* por reglas declarativas. https://developer.chrome.com/docs/extensions/develop/migrate/blocking-web-requests

**HECHO** [PRIMARIA]. Firefox conserva el modelo bloqueante: `webRequest.onBeforeRequest` con `"blocking"` en `extraInfoSpec` permite devolver un `BlockingResponse` con `cancel: true` o `redirectUrl`, previo permiso `webRequestBlocking`. https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/onBeforeRequest

**HECHO** [PRIMARIA]. **Safari no soporta bloqueo de requests.** Apple lo lista en incompatibilidades de API:

> *"`BlockingResponse` not supported. Blocking requests not supported. `opt_extraInfoSpec` not supported for any of the events."*
>
> https://developer.apple.com/documentation/safariservices/assessing-your-safari-web-extension-s-browser-compatibility

**HECHO** [PRIMARIA]. Safari sí soporta `declarativeNetRequest` desde Safari 15 (*"adds support for the Declarative Net Request WebExtensions API to block content on the web"*, https://webkit.org/blog/11989/new-webkit-features-in-safari-15/), con reglas dinámicas y de sesión desde Safari 15.4, y Manifest V2 y V3 desde Safari 15.4.

**HECHO** [PRIMARIA]. Modelo de permisos de Safari iOS: el usuario debe conceder acceso sitio por sitio. *"When the user visits a page where they haven't granted access to your Safari web extension, Safari shows a badge next to your extension's item that indicates the user needs to interact with the extension to grant it permission. […] In iOS, the user selects the extension's entry in the More menu, and selects a permission option."* Y las opciones por sitio son **Ask / Allow / Deny**. https://developer.apple.com/documentation/safariservices/managing-safari-web-extension-permissions

#### 3.1.3 ¿Se puede frenar una navegación antes de que ocurra?

**Sí, pero la respuesta cambia por navegador y ninguna variante es cómoda para identity binding:**

- **Firefox (MV2, `webRequest` bloqueante)**: sí, con consulta asíncrona posible. Es el único que permitiría *"parar el request, preguntarle al backend de QRSafe, y recién ahí decidir"*. Cuota de mercado móvil en Argentina: **0,2%**.
- **Safari / Chrome MV3 (`declarativeNetRequest`)**: sí, pero **la decisión debe estar precargada en reglas locales**. No hay callout síncrono a un servidor por request. **INFERENCIA**: para identity binding — que exige resolver *"¿este QR pertenece a este comercio?"* contra un registro remoto — la vía practicable sería una **regla de redirect** que desvíe patrones de dominios de pago hacia un intersticial propio, y que ese intersticial haga la consulta. Funciona conceptualmente, pero rompe navegaciones legítimas al mismo dominio y exige permiso de host sobre dominios de pago, que es exactamente el permiso más caro de pedirle a un usuario.
- **Chrome Android**: no aplica, no hay extensiones.

#### 3.1.4 Ficha extensiones

| Dimensión | Evaluación |
|---|---|
| **Viabilidad técnica** | **Parcial.** Safari iOS 15+: sí, sólo declarativo, sin bloqueo de requests [PRIMARIA]. Firefox Android: sí, completo [PRIMARIA]. Chrome Android: **no**. |
| **Cobertura** | Techo duro de **~9,04%** del navegador móvil argentino (Safari 8,84% + Firefox 0,20%). Chrome, con 86,31%, queda estructuralmente fuera. [SECUNDARIA, StatCounter jul-2026]. Cero cobertura del Flujo A. |
| **Fricción** | Alta en iOS: instalar la app contenedora desde el App Store, activar la extensión en Ajustes de Safari, y conceder permiso **por sitio** (Ask/Allow/Deny) — precisamente el peor modelo para un producto que debe actuar sobre dominios que el usuario nunca visitó. |
| **Dependencia de terceros** | Apple (revisión de App Store + WebKit), Mozilla (AMO). Google no participa porque no hay producto que soportar. |
| **Riesgo de ruptura** | **Medio-alto y ya materializado.** La transición a MV3 ya eliminó el `webRequest` bloqueante en Chrome; Safari nunca lo implementó. La tendencia de plataforma es hacia menos capacidad de interceptar, no más. |

### 3.2 DNS

#### 3.2.1 Qué se puede

**HECHO** [PRIMARIA]. **Android**: Private DNS (DNS over TLS) existe desde Android 9. *"DNS over TLS uses the TLS protocol to establish a secure channel to the server. Once the secure channel is established, DNS queries and responses can't be read or modified by anyone else who might be monitoring the connection."* El usuario configura un hostname de proveedor en *Network & internet settings*. https://android-developers.googleblog.com/2018/04/dns-over-tls-support-in-android-p.html

**HECHO** [PRIMARIA]. **iOS**: dos caminos.
- App con `NEDNSSettingsManager`: *"When your app starts up, access the shared instance of the DNS settings manager, and load existing settings from the preferences […] **In order to use your DNS settings, the user needs to enable it in the Settings app on iOS** or in System Preferences on macOS."* https://developer.apple.com/documentation/networkextension/nednssettingsmanager
- Perfil MDM `com.apple.dnsSettings.managed`: *"When installed from an MDM, the setting only applies to managed Wi-Fi networks. When installed manually, this setting also applies to cellular networks."* https://developer.apple.com/documentation/devicemanagement/dnssettings

#### 3.2.2 Qué NO se puede — y hay que ser explícito

**HECHO (por definición del protocolo) + [PRIMARIA] para el alcance declarado por Google:**

1. **DNS resuelve nombres de host. Nada más.** No ve el path ni el query string, así que no distingue `banco.com/legítimo` de `banco.com/phishing`.
2. **DNS no sabe de dónde vino la navegación.** Una consulta DNS originada por un QR escaneado es indistinguible de una originada por un tap en un link o por un typeo en la barra de direcciones. **Para un producto cuya premisa es "el QR observado no pertenece a este comercio", el DNS no tiene acceso a ninguno de los dos términos de la comparación.**
3. **En el Flujo A no hay consulta DNS que sirva.** El QR de pago EMVCo no genera navegación; la única resolución DNS es la que hace la billetera contra el dominio de su propio adquirente. Bloquear eso es bloquear la billetera.
4. **La única acción disponible es binaria y de grano grueso**: permitir o bloquear un dominio entero.
5. Google acota el alcance textualmente: *"(The secure channel only applies to DNS, so it can't protect users from other kinds of security and privacy violations.)"* [PRIMARIA]

> **DNS no es una capa de verificación de procedencia de un QR. Es una lista negra de dominios. Son problemas distintos y no conviene mezclarlos en la narrativa del producto.**

#### 3.2.3 Ficha DNS

| Dimensión | Evaluación |
|---|---|
| **Viabilidad técnica** | **No, para el problema de QRSafe.** Técnicamente desplegable (Android 9+ y iOS con perfil o NetworkExtension), pero **no puede expresar la propiedad que el producto necesita verificar**. |
| **Cobertura** | Irrelevante: no cubre el Flujo A y sólo alcanza a bloquear dominios enteros en el Flujo B. |
| **Fricción** | Media-alta (config manual en Android) a muy alta (perfil/MDM en iOS; en MDM, además, **sólo redes Wi-Fi gestionadas** [PRIMARIA]). |
| **Dependencia de terceros** | Baja en infraestructura, pero irrelevante dado el veredicto. |
| **Riesgo de ruptura** | Bajo. Es infraestructura estándar. |

---

## 4. Opción 3 — SDK en billeteras

### 4.1 Por qué es la única que se interpone de verdad en el flujo de pago

Del §1.1: en el Flujo A el único intersticio existente está **dentro de la billetera**, entre el `resolve` y la confirmación del usuario. Ninguna capa de SO ni de navegador puede ocupar ese lugar, porque el SO nunca ve una URL y el navegador nunca se abre. **Esto no es una preferencia arquitectónica: es una consecuencia del formato del QR.**

### 4.2 Qué expone cada billetera hoy

#### Mercado Pago — hay un programa documentado, pero no es para QRSafe

**HECHO** [PRIMARIA]. Existe un **flujo emisor** de QR interoperable, documentado públicamente, y está reservado a billeteras: la documentación dice explícitamente *"Si no sos representante de una billetera digital, andá al overview de Código QR"*. Los requisitos para solicitarlo son razón social, **CUIT**, la **URI de la API resolve del aceptador (IEP)** y un cuestionario de homologación (administrador utilizado, tipos de QR soportados, devoluciones, fecha de producción, pruebas). https://www.mercadopago.com.ar/developers/es/docs/qr-code/interoperable/issuer-flow

**HECHO** [PRIMARIA]. El **flujo aceptador** documenta la llamada `GET /resolve?data={qr_raw}` que devuelve `order_id` y métodos de pago. https://www.mercadopago.com.ar/developers/es/docs/qr-code/interoperable/acceptor-flow

**INFERENCIA**: no existe un SDK ni un punto de extensión para que un tercero **inyecte una verificación** en el flujo de la billetera. Lo que existe es una vía para que **otra billetera** interopere. QRSafe podría usar esa puerta sólo si se convirtiera en billetera — lo cual la tesis descarta explícitamente en su alcance inicial ("no necesita convertirse en billetera, PSP ni procesar la transacción").

#### MODO — no emite QR y su SDK es de checkout

**HECHO** [PRIMARIA]. MODO documenta del lado comercio: *"El QR lo emite tu adquirente desde tu terminal. MODO es la solución que tu cliente usa para pagarlo desde su app bancaria."* (citado y verificado en [`competidores-que-ya-generan-qr-argentina.md`](./competidores-que-ya-generan-qr-argentina.md) §2.3).

**HECHO** [PRIMARIA]. El SDK v2 de MODO es un **botón de pago para e-commerce** (integración frontend + backend), publicado en https://merchants.modo.com.ar/docs. No se encontró en esa documentación ninguna superficie relacionada con escaneo o validación de QR físico.

> **Vacío declarado**: no se encontró un programa de partners de MODO orientado a mitigación de fraude o verificación de QR. Se buscó en `modo.com.ar`, `docs.modo.com.ar` y `merchants.modo.com.ar`.

#### Cuenta DNI Comercios — no hay documentación pública de integración

**Vacío declarado.** No se encontró documentación pública de API, SDK ni programa de desarrolladores de Cuenta DNI Comercios. Se buscó en `bancoprovincia.com.ar`, `cuentadni.com.ar` y `gba.gob.ar`. La única referencia a integración es la posibilidad de cobrar con CLAVE DNI vinculando a través de Link para sistemas propios, sin especificación técnica publicada. **INFERENCIA**: la vía de entrada sería comercial/institucional, no técnica.

### 4.3 La palanca regulatoria: qué obliga el BCRA y qué no

Se descargaron y leyeron los textos completos de las comunicaciones desde el sitio oficial del BCRA.

**HECHO** [PRIMARIA] — **Com. "A" 7463**, punto 2.6.1 de las normas sobre *Sistema Nacional de Pagos – Transferencias*, verbatim:

> *"2.6.1. Cada esquema de transferencias inmediatas deberá: […]*
> *b. **Apoyar sus análisis de fraude con herramientas que permitan identificar patrones sospechosos.** De acuerdo con el riesgo evaluado y en función de las responsabilidades identificadas, deberá contemplar acciones en coordinación con los participantes de los esquemas involucrados (por ejemplo: **alertar al cliente ordenante y/o requerirle confirmación por vías alternativas antes de cursar la transacción**)."*
>
> https://www.bcra.gob.ar/archivos/Pdfs/comytexord/A7463.pdf

> **Lectura honesta**: el sujeto obligado es el **esquema de transferencias inmediatas**, no la billetera individual, y la obligación es de medio ("apoyar sus análisis con herramientas"), no de resultado. Pero la redacción del ejemplo — *alertar al cliente ordenante antes de cursar la transacción* — describe **exactamente** la función que QRSafe quiere cumplir. Es la palanca discursiva más fuerte del informe, y hay que usarla como lo que es: un ejemplo normativo que legitima la categoría, no un mandato de compra.

**HECHO** [PRIMARIA] — **Com. "A" 8032**, punto 1, verbatim:

> *"1. Establecer que cuando un pago con tarjeta de crédito se inicie desde una billetera digital interoperable mediante la lectura de un código QR, **la responsabilidad por fraude será asumida por la billetera**, excepto: a) cuando la billetera procese el pago con los requisitos y estándares técnicos de tokenización y autenticación de la marca de la tarjeta; b) que la transacción no pueda procesarse con los requisitos y estándares técnicos disponibilizados por la marca de la tarjeta […]; c) que exista acuerdo en contrario entre emisores, billeteras y/o adquirentes/agregadores […]. A excepción del caso previsto en el inciso b), **los adquirentes no podrán ser debitados/contracargados** por operaciones iniciadas desde billeteras digitales interoperables con lectura de códigos QR que hayan sido desconocidas o fraudulentas."*
>
> https://www.bcra.gob.ar/archivos/Pdfs/comytexord/A8032.pdf

> **Lectura honesta**: esta es la palanca **económica**, y es la mejor que tiene el producto. La norma pone la pérdida sobre la billetera cuando el pago se inicia **por lectura de QR**. Un actor que absorbe pérdidas tiene incentivo directo a integrar mitigación. **Límite importante que no hay que ocultar**: el alcance textual es **pago con tarjeta de crédito**, no transferencia PCT. El fraude por sticker en QR estático de transferencia queda fuera de este artículo — y ahí, como ya señala el informe principal (§4.3), la pérdida recae sobre comercio y pagador, no sobre la billetera.

**HECHO** [PRIMARIA] — **Com. "A" 8298** (07/08/2025): su Anexo trata de **totalizadores de CBU/CVU por CUIT/CUIL** administrados por la CEC-BV y de análisis de riesgo reforzado sobre clientes con cantidad injustificada de cuentas. https://www.bcra.gob.ar/archivos/Pdfs/comytexord/A8298.pdf

> **Corrección de alcance**: esta comunicación apunta a **cuentas mula**, no a integridad de QR. No crea ninguna obligación aprovechable como palanca directa para QRSafe. Conviene no citarla como si lo hiciera.

**Vacío declarado**: **no se encontró** ninguna norma del BCRA que obligue a verificar la **integridad física o la pertenencia** del QR exhibido. Esto es coherente con el hallazgo del informe principal (§1.4). Se revisaron los textos de A 7463, A 8032 y A 8298.

### 4.4 Ficha SDK en billeteras

| Dimensión | Evaluación |
|---|---|
| **Viabilidad técnica** | **Sí — es la única opción que técnicamente ocupa el punto de decisión del pago.** No depende de ninguna API de Google ni de Apple. |
| **Cobertura** | Potencialmente **100% del Flujo A** por billetera integrada, en Android y en iOS por igual. Cobertura real hoy: **0%**, porque no hay ninguna integración. |
| **Fricción para el usuario** | **Cero — y es su ventaja decisiva.** No instala nada, no cambia ningún default, no concede ningún permiso. La verificación aparece en la pantalla donde ya estaba. Resuelve el riesgo estructural que el informe principal identifica como el principal del modelo (§4.3: adopción del verificador). |
| **Dependencia de terceros** | **Total, y es su debilidad decisiva.** Depende de una decisión comercial de Mercado Pago, MODO o Banco Provincia. No hay puerta técnica de autoservicio. |
| **Riesgo de ruptura** | Bajo en lo técnico (un contrato de API es estable). Alto en lo comercial: la integración se cae si la billetera decide construirlo in-house — y Mercado Pago tiene, según el mapa de competidores, **capacidad máxima** para hacerlo. |

---

## 5. Comparación

### 5.1 Tabla comparativa

| | **Op. 1a — Android navegador (`ROLE_BROWSER`)** | **Op. 1b — iOS navegador (entitlement)** | **Op. 2a — Extensiones** | **Op. 2b — DNS** | **Op. 3 — SDK en billetera** |
|---|---|---|---|---|---|
| **Viabilidad técnica** | **Parcial (sí, como navegador)** | **Parcial (sí, con aprobación de Apple)** | **Parcial (Safari/Firefox)** | **No, para este problema** | **Sí** |
| **Cita que lo respalda** | `ROLE_BROWSER` + `createRequestRoleIntent` API 29+ [PRIMARIA] | *"The system invokes the default web browser […] whenever the user opens an HTTP or HTTPS link"* + entitlement gestionado [PRIMARIA] | *"available in […] iOS 15 and later"* / *"Blocking requests not supported"* [PRIMARIA] | *"The secure channel only applies to DNS"* [PRIMARIA] | Com. "A" 8032 pt. 1 [PRIMARIA]; flujo emisor MP [PRIMARIA] |
| **¿Cubre el QR de pago EMVCo (Flujo A)?** | **No** | **No** | **No** | **No** | **Sí** |
| **¿Cubre el QR de exploración (Flujo B)?** | Sí | Sí | Sí, parcial | Sólo bloqueo por dominio | No |
| **Cobertura del parque AR** | 87,46% (Android) | 12,51% (iOS) | ≤9,04% (Safari + Firefox móvil) | n/a | 0% hoy; ~100% por billetera integrada |
| **Fricción** | Instalar + cambiar navegador por defecto | Instalar navegador completo + cambiar default (iOS 18.2+ para la pantalla de Default Apps) | Instalar app contenedora + activar extensión + permiso **por sitio** | Config manual / perfil MDM (sólo Wi-Fi gestionada vía MDM) | **Ninguna** |
| **Depende de** | Google | **Apple, discrecionalmente** | Apple / Mozilla | Nadie relevante | La billetera |
| **Riesgo de ruptura** | Alto — precedente doble (Android 11 y 12) | Alto — el entitlement puede no otorgarse | Medio-alto — MV3 ya eliminó `webRequest` bloqueante | Bajo | Bajo técnico / alto comercial |

### 5.2 Cobertura combinada del parque de dispositivos

Datos de referencia, Argentina, julio 2026 [SECUNDARIA — Statcounter Global Stats; es un panel de medición web, no un censo]:

| Sistema operativo móvil | Cuota | | Navegador móvil | Cuota |
|---|---|---|---|---|
| Android | **87,46%** | | Chrome | **86,31%** |
| iOS | **12,51%** | | Safari | **8,84%** |
| | | | Samsung Internet | 3,91% |
| | | | Brave | 0,38% |
| | | | Firefox | **0,20%** |
| | | | Opera | 0,16% |

Fuentes: https://gs.statcounter.com/os-market-share/mobile/argentina · https://gs.statcounter.com/browser-market-share/mobile/argentina

**Lecturas que hay que hacer con estos números:**

1. **Una solución sólo-Android deja afuera a 1 de cada 8 teléfonos argentinos.** Pero el sesgo socioeconómico de iOS en Argentina hace que ese 12,5% no sea intercambiable con el 87,5% en valor de transacción. **HIPÓTESIS, no verificada**: el ticket promedio y el perfil de comercio del segmento iOS difieren del de Android. No se investigó.

2. **La vía de extensiones tiene un techo de ~9%** y ese techo es estructural, no coyuntural: depende de que Google incorpore extensiones a Chrome Android, algo que su propio tracker sitúa fuera de alcance para móvil.

3. **La cobertura combinada más alta del Flujo B** es Android-navegador (87,46%) + iOS-navegador (12,51%) ≈ **~100% del parque** — pero con **dos productos-navegador completos** que mantener y **la fricción más alta de todas las opciones en ambas plataformas**.

4. **La cobertura del Flujo A no es una función del parque de dispositivos, sino del parque de billeteras.** Una sola integración con Mercado Pago cubriría, en un solo movimiento, más flujo de pago QR que cualquier combinación de las Opciones 1 y 2 — en Android y en iOS simultáneamente.

---

## 6. Veredicto y arquitectura recomendada

### 6.1 La posición

**La pregunta original contiene una premisa que la evidencia no sostiene.** QRSafe no puede "interponerse entre la cámara que escanea el QR y el navegador que abre la URL" en el caso que le importa, porque **en el pago con QR argentino no hay navegador y no hay URL**. La trama EMVCo no es un recurso web; EMVCo dice textualmente que un lector genérico como la cámara del sistema *"is generally not usable"* con ese formato. Sostener el modelo de capa intermedia OS-level para el pago sería construir sobre un punto de intercepción que no existe.

**Arquitectura recomendada: SDK/API de verificación embebido en la billetera (Opción 3), con canal propio como puente táctico y sin construir navegador propio en la primera etapa.**

### 6.2 Por qué

1. **Es la única que ocupa el punto de decisión real.** El intersticio entre el `resolve` y la confirmación del usuario es el único lugar del Flujo A donde una verificación puede insertarse. Lo demás es imposible por formato, no por API faltante.
2. **Es la única con fricción cero**, y la fricción es el riesgo estructural que ya está identificado como el principal del modelo (§4.3 del informe principal: el 73% escanea sin verificar destino; la categoría B2C de checkers está en contracción precisamente por el paso extra). Las Opciones 1 y 2 **agravan** ese riesgo: cambiar el navegador por defecto es una fricción mayor, no menor, que abrir una app extra.
3. **Es la única independiente de Google y de Apple.** Las Opciones 1 y 2 tienen precedentes documentados de estrechamiento: Android 11 (visibilidad de paquetes), Android 12 (resolución genérica de web intents), MV3 (eliminación de `webRequest` bloqueante), y en iOS la concesión discrecional del entitlement. Todas se mueven en la misma dirección.
4. **Tiene palanca regulatoria concreta y verificada.** La Com. "A" 8032 pone la pérdida por fraude sobre la billetera cuando el pago con tarjeta se inicia por lectura de QR. La Com. "A" 7463 nombra como ejemplo de herramienta antifraude exactamente *"alertar al cliente ordenante […] antes de cursar la transacción"*.

### 6.3 Qué se resigna al elegirla — dicho sin maquillaje

- **Se resigna el autoservicio.** No hay puerta técnica: el producto no existe hasta que una billetera firme. La Opción 1 en Android se puede desplegar mañana sin pedirle permiso a nadie; la Opción 3 no.
- **Se resigna el control del roadmap.** El time-to-market pasa a depender de un ciclo comercial ajeno.
- **Se acepta el riesgo de canibalización.** Mercado Pago tiene, según el mapa de competidores, capacidad máxima para construirlo in-house. Integrarse con quien puede reemplazarte es una apuesta con fecha.
- **Se acepta que la palanca A 8032 sólo cubre tarjeta de crédito.** Para el sticker sobre QR estático de transferencia — el caso central de la tesis — la pérdida sigue recayendo sobre comercio y pagador, y la billetera no tiene obligación equivalente. El argumento de venta a billeteras tiene que ser reputacional y de retención, no sólo de contracargo.
- **Se posterga la cobertura del QR de exploración.** Menús, señalética, placas, etiquetas: nada de eso lo toca un SDK de billetera.

### 6.4 La combinación que cubre más que cualquiera sola

**Sí existe, pero son dos productos, no uno**, y confundirlos es el error a evitar:

| Frente | Arquitectura | Estado |
|---|---|---|
| **QR de cobro (Flujo A)** | Canal propio (app QRSafe, tal como ya define la tesis) → evoluciona a SDK/API en billetera | Canal propio: hoy. SDK: mediano plazo, dependiente de adopción. |
| **QR de exploración y quishing (Flujo B)** | Navegador QRSafe en Android con `ROLE_BROWSER` | Técnicamente desplegable hoy [PRIMARIA]. Requiere decidir si vale construir un navegador. |

**Recomendación sobre el Flujo B: no construirlo ahora.** Es un producto distinto, con un usuario distinto, un modelo de negocio distinto y una superficie de mantenimiento enorme (ser navegador). Vale como opción documentada para cuando el registro de bindings tenga masa crítica y aparezca un caso de uso de exploración con cliente pagador identificado — por ejemplo un municipio con 600 carteles en la vía pública.

**Sobre iOS, para cerrar la ambigüedad**: si en algún momento se decide atacar el Flujo B en iOS, la única vía es un navegador con entitlement gestionado. Y hay un dato que juega a favor y conviene no perder: Apple **contempla explícitamente** que un navegador por defecto muestre *"a 'Safe Browsing' or other warning for content suspected of phishing or other problems"*. La pantalla intersticial de QRSafe cabe, textualmente, en esa excepción. Lo que **no** cabe es redirigir a destinos inesperados. Es una diferencia de diseño de producto, no de permisos, y hay que respetarla desde el primer mockup.

---

## 7. Qué habría que probar para confirmarlo

Ordenado por impacto sobre el veredicto. Los tres primeros pueden **cambiarlo**.

| # | Prueba | Por qué importa | Cómo |
|---|---|---|---|
| 1 | **Escanear un Kit QR Oficial de Mercado Pago real con la app Cámara de iOS y con Google Lens.** ¿Muestra texto plano, una URL, o un banner de app? | Si el kit encodea una URL propietaria en vez de trama EMVCo pura, **parte del Flujo A migra al Flujo B** y las Opciones 1 y 2 recuperan relevancia para el pago. Es el vacío declarado en §1.1. | Empírica, con un kit físico. |
| 2 | **Verificar si el escáner de QR nativo de Android respeta el navegador por defecto** o va directo a Chrome. | La Opción 1a **depende enteramente** de esto y hoy es una INFERENCIA sin respaldo documental (§2.1.5). | App de prueba con `ROLE_BROWSER`, escanear una URL desde la cámara del sistema en Pixel + Samsung. |
| 3 | **Verificar si la app Cámara de iOS abre la URL en el navegador por defecto** cuando no es Safari. | Mismo peso para la Opción 1b (§2.2.5). | iPhone con iOS 18.2+, Default Apps → un navegador de terceros, escanear una URL. |
| 4 | **Consultar a Apple** (`default-browser-requests@apple.com`, formulario oficial) si un navegador con foco antifraude califica para el entitlement gestionado. | Determina si la Opción 1b existe o es teórica. | Consulta formal antes de invertir en desarrollo. |
| 5 | **Prototipo Android con `ROLE_BROWSER`**: medir qué porcentaje de usuarios completa el cambio de navegador por defecto. | Cuantifica la fricción que hoy es cualitativa. Si es <10%, la Opción 1a queda descartada por adopción aunque sea viable. | Test con usuarios reales. |
| 6 | **Prototipo de extensión Safari con `declarativeNetRequest`** que redirija patrones de dominio de pago a un intersticial. | Confirma si una regla declarativa intercepta la navegación originada por la Cámara, y mide el costo del permiso por sitio. | Xcode + dispositivo iOS 15+. |
| 7 | **Solicitar formalmente el flujo emisor a Mercado Pago** y preguntar si admite un integrador que no sea billetera. | Define si la Opción 3 tiene puerta de entrada o hay que construir relación comercial desde cero. | Formulario documentado en el issuer-flow. |
| 8 | **Consulta a BCRA/CIMPRA**: ¿un verificador de binding QR↔comercio califica como "herramienta que permita identificar patrones sospechosos" del punto 2.6.1.b? | Convierte la palanca discursiva en argumento normativo utilizable en material comercial. | Consulta formal. |
| 9 | **Contactar a Banco Provincia** por Cuenta DNI Comercios. | El vacío de §4.2 sólo se cierra por vía institucional. | Canal comercial. |
| 10 | **Verificar el soporte de extensiones de Samsung Internet** (3,91% del parque AR). | Vacío declarado en §3.1.1; podría sumar ~4 puntos a la Opción 2. | Documentación de Samsung Developers. |

---

## Limitaciones de esta investigación

- **No se ejecutó ninguna prueba en dispositivo real.** Todo el informe es análisis documental. Las tres preguntas de mayor impacto sobre el veredicto (§7.1–3) sólo se resuelven empíricamente.
- **Vacío central declarado**: no se pudo confirmar con documentación primaria qué encodea el sticker del Kit QR Oficial de Mercado Pago. La URL `https://www.mercadopago.com.ar/developers/es/docs/qr-code/integration-configuration/qr-static/landing` devolvió **HTTP 404**.
- **No se encontró documentación oficial de Google ni de Apple** que afirme textualmente qué navegador abre el escáner de QR del sistema. Ambas afirmaciones del informe están marcadas como INFERENCIA y no deben citarse como hechos.
- **No se encontró una página de `developer.chrome.com` que declare** que Chrome para Android no soporta extensiones. La evidencia usada es la issue 356905053 del tracker de Chromium — fuente de Google, pero tracker de bugs, no documentación de producto.
- **Nota de URL**: `https://developer.android.com/about/versions/12/web-intent-resolution` **existe pero redirige** a `/training/app-links/verify-applinks`, que no contiene el texto de la resolución de web intents. La cita se tomó de `/about/versions/12/behavior-changes-all`.
- **Nota de URL**: `https://developer.apple.com/documentation/xcode/preparing-your-app-to-be-the-default-browser-or-email-client` devolvió **HTTP 404**. La página vigente es `/documentation/xcode/preparing-your-app-to-be-the-default-browser`.
- Las páginas de referencia de `developer.android.com` y `developer.apple.com` se renderizan por JavaScript y no son legibles por un fetch simple. Las citas de `RoleManagerCompat`, `RoleManager`, `SFSafariViewController`, `NEDNSSettingsManager`, `DNSSettings` y las páginas de Safari Web Extensions se extrajeron por HTTP directo del HTML servido y del endpoint JSON público de la documentación de Apple (`developer.apple.com/tutorials/data/documentation/…`). Son textos oficiales, pero obtenidos por una vía no navegable.
- **No se revisó la política de Google Play** sobre apps que solicitan `ROLE_BROWSER`, ni las políticas de App Review de Apple más allá de la página del entitlement. Ambas podrían imponer restricciones adicionales no contempladas acá.
- **No se investigó Samsung Internet** (3,91% del parque móvil argentino) ni ningún navegador de OEM chino.
- **Los datos de cuota de mercado son de Statcounter**, un panel de medición de tráfico web. No es un censo de dispositivos y sobrerrepresenta el uso de navegador frente al uso de apps. Se usan como orden de magnitud, no como cifra exacta.
- **No se revisó el texto completo de la Com. "A" 8114** (t.o. de *Sistema Nacional de Pagos – Servicios de pago*, 27.613 caracteres) ni los Boletines CIMPRA. Podría contener obligaciones relevantes no detectadas.
- **La caracterización del Flujo A se apoya en Mercado Pago y en EMVCo.** No se verificó el comportamiento de los QR generados por otros adquirentes argentinos (Payway, Getnet, Clover, Nave, Fiserv), cuyo formato podría diferir.
- El informe **no evalúa costos, esfuerzo de desarrollo ni tiempo de implementación** de ninguna de las opciones. La recomendación de §6 es de viabilidad y riesgo de plataforma, no de negocio.
