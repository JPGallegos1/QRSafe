# Research: Fraude QR en Argentina, players internacionales, criptografía y blockchain — QRSafe

> Fecha: 2026-08-22 (v3: conciliación con la tesis de Identity Binding — `tesis-identity-binding-b2b.md`, source of truth de la propuesta B2B) · Alcance: Argentina + paisaje internacional · Método: investigación contra fuentes primarias (BCRA/CIMPRA, MPF/UFECI, EMVCo, W3C, NIST, BCB, NPCI, FTC, papers académicos) por agentes paralelos, sintetizada en este documento. Las afirmaciones que solo aparecen en prensa están marcadas como *fuente secundaria*.

---

## Resumen ejecutivo

1. **El problema existe y está regulado a medias**: la normativa argentina (BCRA/CIMPRA) obliga a billeteras y PSP a mitigar fraude *transaccional*, pero **nadie cubre la integridad física del QR exhibido en el comercio** (la "última pulgada" anti-sticker). El QR de comercio EMVCo no tiene firma criptográfica anti-sustitución; solo el QR de transporte (VQR) la tiene.
2. **No existe estadística pública nacional de fraude por sustitución de QR** (UFECI no lo tipifica; BCRA reporta reclamos agregados). Eso es a la vez un riesgo (mercado difícil de dimensionar) y una oportunidad (QRSafe puede generar el dato).
3. **Espacio competitivo vacío en Argentina y a nivel internacional**: ninguna empresa argentina se dedica a verificación de QR de pago. Los escáneres seguros internacionales (Kaspersky, Norton, Trend Micro, Bitdefender, "Is This QR Safe?") verifican **reputación de URLs** contra phishing — **ninguno valida la sustitución de un QR de pago EMVCo ni el binding QR↔comercio**. El ataque argentino (sticker con QR EMVCo válido del estafador) es invisible para todos ellos: el fraude no está en el link, está en quién cobra. Además, la categoría B2C de "QR security scanner" está en contracción (Kaspersky QR Scanner discontinuado iOS 2022 y fuera de Google Play 2024; Norton Snap EOL 2019; Trend Micro sin updates desde 2023), y el lado comercio queda cubierto solo por consejos manuales.
4. **Blockchain como diferencial central es un buzzword en el contexto argentino**: existe un tercero de confianza online regulado (BCRA + IEP/API resolve que ya se consulta en cada pago), lo que invalida el criterio académico estándar (Wüst & Gervais). La criptografía requiere además una distinción fina (ver §5.5): la **firma embebida en el QR verificada por terceros** (billeteras/adquirentes) es improbable sin mandato del BCRA, pero el **registro propio de QRs autorizados verificado en canal propio** — el modelo de la tesis B2B — no depende de la cooperación de ninguna billetera y es desplegable hoy.
5. **Premisa de producto (validity ≠ authenticity)**: un QR técnicamente válido no es necesariamente legítimo para el contexto donde aparece. El sticker fraud presenta un QR *perfectamente válido* apuntando a la cuenta del atacante; la propiedad que nadie garantiza hoy es que **ese QR específico haya sido autorizado por el negocio que el consumidor cree estar pagando**. La evidencia internacional (BCB/Pix, NPCI/UPI, papers de address poisoning) confirma que el punto de fallo es de identidad/pertenencia, no de contenido — pero el contraste semántico por nombre (`collector.name`) tiene una debilidad propia (razón social vs. nombre de fantasía, ver §5.6), mientras que el binding por fingerprint no depende del nombre.
6. **Extensión al mundo cripto: no recomendada**. La hipótesis de que cada wallet tiene su propio mecanismo de seguridad se valida sustancialmente: EIP-55/EIP-681, simulación pre-firma (Blockaid en MetaMask/Coinbase, US$50M Serie B 2025) y blocklists (Scam Sniffer) ya cubren el espacio, y el fraude QR cripto dominante es remoto (ingeniería social), no presencial.
7. **Recomendación de foco**: el nicho real es el **QR estático físico sin supervisión** (estaciones, gastronomía, parking, kioscos). El MVP se concreta como **identity binding**: registro verificable `identidad del comercio ↔ QR autorizado ↔ destino de pago`, con verificación en canal propio (app QRSafe) que afirma pertenencia/no-pertenencia — nunca "seguridad" del QR. **El principal riesgo estructural del modelo es la adopción del verificador** (el paso extra de escanear antes de pagar; ver §4.3). *(Nota de alcance: el monitoreo por cámaras con IA, evaluado en la v1 de este documento, quedó fuera del MVP por complejidad de integración con providers de videoanalítica.)*

---

## 1. Magnitud del problema

### 1.1 Cómo funciona el fraude

- El QR de pago argentino sigue el estándar **EMVCo Merchant Presented Mode**. Los QR **estáticos** (imprimibles, reutilizables, identifican al aceptador en campos 26–49) se resuelven vía "API resolve" del adquirente, que devuelve el `collector` (nombre/CUIT/cuenta). El QR **no está firmado criptográficamente** contra sustitución física: quien controla la imagen impresa controla la cuenta destino. [Boletín CIMPRA 525 — https://www.bcra.gob.ar/archivos/Pdfs/SistemasFinancierosYdePagos/Boletin-CIMPRA-525.pdf] [Boletín CIMPRA 530 — https://www.bcra.gob.ar/archivos/Pdfs/SistemasFinancierosYdePagos/Boletin_CIMPRA_530.pdf]
- La única firma criptográfica fuerte existe en **Viaje con QR (VQR, transporte)**: billeteras firman con ED25519 y los validadores verifican integridad, TTL y listas de denegación. El BCRA ya resolvió este problema para transporte, pero **no** para el QR de comercio. [Boletín CIMPRA 544 — https://www.bcra.gob.ar/archivos/Pdfs/SistemasFinancierosYdePagos/Boletin-CIMPRA-544.pdf]
- Las transferencias (PCT) son **"de acreditación inmediata, irrevocables"** — condición que hace rentable el fraude. [BCRA, Transferencias 3.0 — https://www.bcra.gob.ar/noticias/transferencia-con-qr/]
- A nivel técnico, el EMV MPM solo tiene CRC-16 (detección de errores, no de falsificación): el atacante no modifica el QR legítimo sino que genera uno nuevo válido apuntando a su cuenta. [EMV QRCPS spec — https://www.emvco.com/emv-technologies/qr-codes/] [Con Vos en la Web (Min. Justicia) — https://www.argentina.gob.ar/justicia/convosenlaweb/situaciones/como-me-protejo-al-utilizar-un-codigo-qr]

### 1.2 Modalidades documentadas

1. **Sticker sobre QR original**: "los delincuentes pegan un adhesivo con un QR falso sobre el original del local… el dinero termina en manos de un tercero". *(Fuente secundaria: El Destape, 25/05/2026 — https://www.eldestapeweb.com/tecnologia/cuidado-codigos-qr-detalle-tenes-fijarte-antes-escanear-local-2026525182154)*
2. **"Mercado Pago trucha"**: APK pirata vendida en Telegram que simula el comprobante de pago contra el QR impreso; solo funciona contra **QR estático impreso**, no contra QR dinámico de terminal Point. *(Fuente secundaria: La Capital Rosario — https://www.lacapital.com.ar/suscriptores/las-estafas-la-mercado-pago-trucha-llegaron-rosario-n10146051.html)*
3. **Comprobante falso en pantalla** (sin app pirata). *(Fuente secundaria: Diario Huarpe, 30/08/2025 — https://www.diariohuarpe.com/nota/alerta-por-estafa-con-mercado-pago-2025829214148)*
4. **QR adulterado por personal interno**: cajera del boliche Ananá (Mar del Plata) cobraba con posnet/QR propio (perjuicio "millonario"). *(Fuente secundaria: La Capital MDQ, 27/06/2025 — https://www.lacapitalmdp.com/piden-elevar-a-juicio-la-causa-por-estafas-contra-empleada-de-anana/)*
5. **Multas truchas con QR en parabrisas** (Neuquén, San Juan, Pergamino, Salta, La Plata). *(Fuentes: Municipalidad de Neuquén, oficial, 20/02/2025 — https://www.neuquencapital.gov.ar/prensa/la-municipalidad-alerta-por-la-aparicion-de-nuevas-estafas-con-multas-truchas/; Radio D3 — https://radiod3.com/advierten-sobre-una-nueva-modalidad-de-estafa-con-falsos-avisos-de-infraccion-en-autos-estacionados/)*
6. **QRishing/QRLjacking** (robo de sesión de WhatsApp vía QR de vinculación). *(Fuente secundaria: Bahía César, 13/08/2026 — https://bahiacesar.com/2026/08/13/como-detectar-un-qr-falso-antes-de-que-te-vacien-la-cuenta/)*

### 1.3 Estadísticas

- **UFECI (MPF)**: 34.468 reportes de delitos informáticos en 2024 (+21,1% i.a.); "fraude en línea" = 21.729 (63%). **La UFECI no desagrega una categoría específica de "fraude QR"** — no existe estadística pública nacional de fraude por sustitución de QR. [Informe anual UFECI 2024 — https://www.mpf.gob.ar/ufeci/files/2025/06/UFECI_informe_anual_2024-1.pdf]
- **BCRA (reclamos)**: 769,5 mil reclamos promedio mensual en 2025 (+5%); "operaciones desconocidas posiblemente fraudulentas" fue el concepto N°1 (~54.000–63.600/mes). [Informe Protección Usuarios 2025 — https://www.bcra.gob.ar/publicaciones/informe-sobre-proteccion-a-las-personas-usuarias-de-servicios-financieros-2025/]
- **Volumen del canal (exposición)**: dic-2024: 62,6 millones de pagos con QR interoperable (+117,4% i.a.) por $1.052,9 mil millones; abr-2025: 70,4 millones (+97% i.a.); 76 billeteras y 43 aceptadores de PCT registrados. [BCRA Informe Pagos Minoristas dic-2024 — https://www.bcra.gob.ar/archivos/Pdfs/PublicacionesEstadisticas/informe-mensual-de-pagos-minoristas-dic-2024.pdf; abr-2025 — https://www.bcra.gob.ar/publicaciones/informe-de-pagos-minoristas-abril-de-2025/]
- **Mercado Pago**: el 80% de las denuncias de sus usuarios son por transferencias a cuentas de otros bancos/PSP. *(Fuente secundaria: La Nación, 11/09/2025 — https://www.lanacion.com.ar/tecnologia/mercado-pago-presento-una-central-de-seguridad-y-mecanismos-anti-estafa-nid11092025/)*. VP Paula Arregui: tras la interoperabilidad QR con tarjeta (abr-2024), los pagos QR de billeteras bancarias presentan "85 veces más casos de fraude que en nuestro estándar". *(Fuente secundaria: Rafaela Noticias/Infobae, 14/10/2024 — https://rafaelanoticias.com/economia/advertencia-sobre-los-pagos-qr-con-tarjeta-aumentan-los-casos-de-fraude.htm)*
- Crecimiento de quishing "+150% T1 2026": *fuente secundaria que cita a RedesZone*; verificación independiente no encontrada.

### 1.4 Regulación vigente

| Norma | Qué establece | Fuente |
|---|---|---|
| Com. A 7153 (2020) — Transferencias 3.0 | Crea la IEP y el QR interoperable EMVCo; obliga a herramientas de mitigación de fraude | https://www.bcra.gob.ar/noticias/transferencia-con-qr/ |
| Com. A 7463 (2022) | Responsabilidades antifraude de cada participante, patrones sospechosos, reclamos | https://www.bcra.gob.ar/archivos/Pdfs/comytexord/A7463.pdf |
| Com. A 7769 (2023) | Interoperabilidad total QR (transferencia + tarjeta), registro obligatorio de aceptadores/adquirentes/agregadores como PSP | https://www.bcra.gob.ar/noticias/nuevas-medidas-que-potencian-el-uso-del-qr-interoperable/ |
| Com. A 8032 (2024) | Responsabilidad por fraude en pagos con tarjeta iniciados por QR: la asume la billetera salvo falla del adquirente | https://www.bcra.gob.ar/archivos/Pdfs/comytexord/A8032.pdf |
| Com. A 8114 (t.o.) | Medidas antifraude para billeteras (verificación de identidad, enrolamiento) | https://www.bcra.gob.ar/archivos/Pdfs/comytexord/A8114.pdf |
| Com. A 8298 + B 13117 (feb. 2026) | Central de Prevención de Fraude (CPF): reporte y consulta obligatorios de eventos de fraude | https://www.bcra.gob.ar/archivos/Pdfs/comytexord/B13117.pdf |
| Disposición Energía NO-2022-118638566 | Obliga a eliminar el QR de surtidores/columnas en áreas clasificadas de estaciones (motivo incendio, no fraude) y reubicarlo | https://surtidores.com.ar/wp-content/uploads/2022/11/NO-2022-118638566-APN-DNRYCMEC1-2.pdf |

**Hallazgo clave**: la normativa obliga a *billeteras, PSP y administradores* a mitigar fraude transaccional, pero **no existe obligación de seguridad física/integridad del QR exhibido**. Nadie regula la "última pulgada" física del QR. El proyecto de ley 4661-D-2025 (Registro Nacional de Incidentes de Ciberfraude) aún no es ley. [https://www4.hcdn.gob.ar/dependencias/dsecretaria/Periodo2025/PDF2025/TP2025/4661-D-2025.pdf]

### 1.5 Casos documentados por segmento

- **Estaciones de servicio**: (a) Shell, San Martín (GBA): faltante de **$38 millones** por sustitución física del posnet (4 detenidos). *(Fuente secundaria: eltrece, 10/08/2026 — https://www.eltrecetv.com.ar/arriba-argentinos/2026/08/10/adulteraron-un-posnet-de-una-estacion-de-servicio-y-robaron-38-millones-de-pesos-el-video-de-la-maniobra/)* (b) AXION/Maxfa (San Juan): fraude interno >$200 millones. *(Infocaucete, 24/04/2026 — https://www.infocaucete.com.ar/sanjuan/24/04/2026/escandalo-en-san-juan-detienen-a-empleado-de-estacion-de-servicio-por-estafa-que-superaria-los-200-millones/)* (c) "Tickets mellizos" en Chimbas (>$15M, 8 empleados). *(Diario La Ventana — https://diariolaventana.com.ar/investigan-a-ocho-empleados-de-una-estacion-de-servicio-por-una-millonaria-defraudacion/)* (d) AOYPF documenta "cadenas" de fraudes y contracargos. [https://www.aoypf.org/contracargos-de-la-app-ypf-un-problema-en-vias-de-solucion/]
- **Hallazgo honesto**: no se encontró un caso policial resuelto y masivo específicamente de "sticker sobre QR de estación YPF". El vector está abundantemente documentado como modalidad genérica, pero los casos de estaciones más documentados son fraude interno y adulteración de posnet (ambos involucran reemplazo físico del dispositivo de cobro).

---

## 2. Segmentos más expuestos (ranking)

1. **Estaciones de servicio** — QR en surtidores/playa 24/7, rotación de personal, víctimas que pagan desde el auto sin verificar destinatario; la normativa de Energía reubicó los QR a zonas menos supervisadas. [Disposición Energía (arriba); https://surtidores.com.ar/se-disparan-los-pagos-digitales-en-las-estaciones-de-servicio-y-cambian-la-logica-del-negocio/]
2. **Gastronomía (mesas, cartas, barras)** — QR pegado en mesas al alcance del público sin vigilancia. *(Fuentes secundarias: El Destape; Bahía César; Mercado Pago Brasil describe el mismo vector — https://www.mercadopago.com.br/blog/golpe-qr-code-falso)*
3. **Kioscos, boliches, almacenes, farmacias** — principal blanco de la "Mercado Pago trucha" contra QR impreso. *(La Capital Rosario (arriba))*
4. **Estacionamiento medido / parquímetros** — multas truchas con QR replicadas en ≥5 provincias; cartelería pública sin supervisión (Blinkay CABA, SEMM Córdoba). *(Municipalidad de Neuquén (arriba); https://www.pergaminoverdad.com.ar/archivos/126612; https://www.lanacion.com.ar/buenos-aires/blinkay-por-parquimetros-como-funciona-la-aplicacion-que-controlara-el-estacionamiento-medido-en-la-nid28062022/)*
5. **Eventos masivos (cashless)** — QR/pulseras en predios con público heterogéneo. *(Fuente secundaria: https://gbol.com.ar/blog/cashless-2026/)*
6. **Iglesias/colectas** — QR estático en espacios públicos sin ningún control. *(Fuente secundaria: https://surtidores.com.ar/en-las-estaciones-de-servicio-las-tarjetas-ahora-deberan-ser-manipuladas-por-los-clientes/)*
7. **Delivery/autoservicio** — QR en scooters/monopatines compartidos citados como blancos. *(El Destape (arriba))*

---

## 3. Paisaje competitivo (Argentina e internacional)

### 3.1 Bancos / fintech / procesadores

- **Mercado Pago**: Central de Seguridad (sept. 2025) — monitoreo del lado del pagador (alertas por destinatarios nuevos, bloqueo de dispositivos). **No ofrece** protección de la integridad física del QR del comercio; su documentación para comercios recomienda *manualmente* "inspección casi diaria" del QR y comparar con una foto — externaliza el anti-tampering al comerciante. *(La Nación (arriba); https://www.mercadopago.com.br/blog/golpe-qr-code-falso)*
- **Modo, Cuenta DNI, Ualá, Naranja X, PlusPagos**: QR interoperable y conciliación; contra fraude, reclamos con denuncia policial y bloqueos. *(https://www.defensorba.org.ar/pdfs/protocolo-ciberestafa-2025.pdf; https://www.bancosantafe.com.ar/empresas/cobros-y-pagos/pluspagos-comercios)*
- **Procesadores T3.0** (Pagos360, Bind, Newpay, Prisma/Red Link): documentación técnica del QR estático sin oferta de verificación de integridad física. *(https://ayuda.pagos360.com/desarrolladores/qr-estatico)*
- **Foca Software**: apps de cobro QR dinámico para playeros (+800 estaciones YPF) — software de gestión, no antifraude. *(https://surtidores.com.ar/nueva-app-movil-para-cobros-con-qr-practicos-y-seguros/)*

### 3.2 Startups de verificación QR / anti-quishing

**Hallazgo central: no existe ninguna empresa argentina dedicada específicamente a verificación de QR / anti-tampering de QR de pago.** Las búsquedas devuelven solo adyacentes: acortadores con QR para marketing (https://tw.com.ar/), verificación de identidad genérica (https://aidi.com.ar/empresas/), motores antifraude transaccional e-commerce (https://www.wondersoft.com.ar/). Lo más cercano regional: Depay (QR cross-border, menciona prevención de QRs maliciosos como feature de infraestructura — https://bankmagazine.com.ar/la-tecnologia-detras-del-qr/). **Espacio vacío documentable.**

### 3.3 Players internacionales de verificación/escaneo seguro de QR

**Kaspersky QR Scanner** — El escáner más conocido:
- Qué hace: chequea cada código escaneado contra la reputación de URLs/links de Kaspersky (blocklist de phishing/malware). La documentación lo confirma: "checking any links they may contain" — **verificación de URLs, no de payloads de pago**. Irónicamente, su propio blog describe el ataque de sticker-sobre-QR legítimo, pero su producto solo chequea el link resultante, no si el payload pertenece al comercio donde está pegado el código. [Kaspersky blog — https://www.kaspersky.com/blog/kaspersky-qr-scanner-app/7350/] [Kaspersky Support — https://support.kaspersky.com/kaspersky-for-android/237265]
- Modelo: app gratuita B2C, funnel hacia la suite Kaspersky.
- **Estado crítico**: discontinuado en iOS (oct. 2022) y fuera de Google Play (oct. 2024, por sanciones de EE.UU. que terminaron la cuenta de desarrollador). [Kaspersky Support EOL — https://support.kaspersky.com/qrscanner-for-ios/1.10/249505] [BackBox — https://news.backbox.org/2024/10/07/kaspersky-apps-are-no-longer-available-on-google-play-what-to-do-kaspersky-official-blog/]
- Cobertura LatAm: sitio en español, pero producto global y genérico; sin features para el ecosistema QR de pagos argentino.

**"Is This QR Safe?"** y la categoría "QR checkers":
- ITQS: desarrollador individual (Geoji Paul / Paulosec LLC, EE.UU.), proyecto personal admitido como tal. Decodifica el QR, sigue redirects y consulta el destino contra 70+ motores vía VirusTotal. Gratuito, micro-escala (3 ratings en App Store). No verifica payloads EMVCo ni binding físico. [App Store — https://apps.apple.com/us/app/isthisqrsafe/id6737241777]
- Resto de la categoría (todos verificación de reputación de URL):

| Player | Estado 2025-2026 | Verificación |
|---|---|---|
| Trend Micro QR Scanner | Última actualización ago. 2023; reportado no disponible en Play (2026) | URL safety checks [https://play.google.com/store/apps/details?id=com.trendmicro.qrscan] |
| Norton Snap QR Reader | **Discontinuado (EOL 2019)**; Norton hoy no tiene escáner QR dedicado | URL reputation [https://community.norton.com/t/end-of-life-announcement-for-norton-snap-qr-code-reader/235043] |
| Bitdefender Scamio | **Activo**, chatbot IA gratuito, análisis de QR on-demand | Threat-intel Bitdefender [https://www.bitdefender.com/en-us/consumer/scamio] |
| susQR / QR Safe / QR Secure (español) / micro-apps indie | Activas, micro-escala | VirusTotal / Safe Browsing [https://susqr.com/] [https://apps.apple.com/us/app/qr-secure-esc%C3%A1ner-qr-seguro/id6475613305] |
| QRTracker Safe Scan / QRLynx | Activos, pero son **generadores** con higiene de URLs (B2B marketing, no pagos) | Screening de URLs de códigos que ellos generan [https://qrtracker.io/safe-scan] |

**Startups anti-quishing / lado comercio (global):**
- No se encontró ninguna startup consolidada (con funding) dedicada a "QR payment substitution / merchant QR protection" como producto comercial. El boom quishing 2023-2026 generó herramientas, pero casi todas son consumer URL-checkers o features de vendors grandes. [https://www.startupdefense.io/blog/quishing-attacks-qr-code-phishing-startups]
- El player B2B más cercano conceptualmente: **MSME SecureX (India)** — "AI-powered payment fraud protection for Indian businesses... fake UPI screenshots, QR tampering", UPI-first, WhatsApp integration. Replicarlo en Argentina requeriría re-architecture completo al ecosistema Transferencias 3.0. [https://www.msmesecurex.com/]
- Académico sin producto comercial: detección visual de QRIS falsificados (Indonesia) con CNN + validación de payload EMVCo logra 95% de precisión, pero los autores reconocen que **no pueden verificar el merchant real** "due to restricted access to Bank Indonesia's official merchant database" — exactamente el problema que QRSafe ataca. [ResearchGate — https://www.researchgate.net/publication/364593009]
- **LatAm/Argentina: no se encontró ningún player dedicado.** Las apps en español son traducciones de indie apps de URL-checking.

**Análisis de encaje — hipótesis CONFIRMADA:**
> "Los escáneres seguros existentes verifican reputación de URLs contra phishing/quishing, PERO ninguno valida la sustitución de un QR de pago EMVCo ni el binding físico QR↔comercio, y por lo tanto no cubren el caso argentino."

El matiz clave: el ataque de sticker **no requiere que la URL sea maliciosa**. Un QR EMVCo genuino del estafador (con su propio CVU/alias legítimamente registrado) pasa limpio por todos estos escáneres — el fraude está en la identidad del cobrador, no en el link. Ningún player internacional tiene base de datos de comercios argentinos, integración con el ecosistema local (BCRA/CIMPRA), ni modelo de negocio para el merchant. Diferencia de público: todos son **B2C consumidor** (el individuo debe instalar una app extra e interpretar un veredicto de URL); QRSafe opera **B2B2C** (el comercio registra y verifica su QR; el pagador recibe la validación). Ningún incumbente internacional ocupará ese terreno: la categoría está en contracción y el lado merchant solo recibe consejos manuales de auditoría física. [Global Payments Integrated — https://www.globalpaymentsintegrated.com/en-us/blog/2022/03/29/5-ways-isvs-can-help-protect-merchants-against-qr-code-scams]

---

## 4. Oportunidades y viabilidad por canal

### 4.1 Gaps no cubiertos

1. **Binding identidad ↔ QR autorizado**: no existe ningún registro — público ni comercial — que vincule un QR legítimo con el comercio que lo autorizó. El estándar EMVCo de comercio no tiene firma anti-sustitución (solo VQR/transporte la tiene). Es exactamente el gap que la tesis de Identity Binding convierte en producto: la pregunta no es "¿este QR es seguro?" sino "¿es uno de los QRs autorizados por el comercio al que estoy intentando pagar?".
2. **Detección temprana**: no existe producto que detecte el cambio de QR (ni por patrón de pagos — caída abrupta de ingresos del comercio, discrepancia volumen/ventas como en los casos San Juan/Shell). Con la tesis como alcance, la detección es *a demanda*: ocurre cuando existe una verificación.
3. **Canal de verificación para el pagador**: ninguna billetera muestra una señal de "QR verificado por el comercio" independiente del `collector.name` (que el usuario promedio no contrasta). Nota del modelo: este gap no requiere adhesión de billeteras para atacarse — el canal propio (app QRSafe) puede resolver el binding sin cooperación de nadie, a costa de fricción para el usuario.
4. **Anchor de identidad física (gap abierto, sin investigar)**: verificar el binding exige resolver *"¿qué comercio hay enfrente?"* — la otra mitad del vínculo físico → identidad. Mecanismos candidatos (búsqueda manual, GPS, foto del local) no fueron investigados en este documento. Es además el mismo gap que la literatura académica documenta del lado del regulador (estudio QRIS/Indonesia: "restricted access to official merchant database").
5. **Estadística específica**: la dimensión real del fraude por QR sustituido es invisible; generarlo es una ventaja defensible.
6. Las recomendaciones oficiales actuales son puramente manuales ("fijarse si hay sticker encima", "inspección diaria").

### 4.2 Viabilidad por canal propuesto

| Canal | Viabilidad | Notas clave |
|---|---|---|
| **App propia (verificador de binding) — MVP elegido por la tesis** | Media-alta | Decodifica el string EMVCo y lo contrasta contra el registro de QRs autorizados de QRSafe (hash/fingerprint + metadatos del destino). El registro no existe — construirlo **es el producto**, no una barrera externa. No requiere cooperación de billeteras ni adquirentes. El riesgo de responsabilidad ("aprueba un QR que luego resulta fraudulento") queda mitigado por el framing de la tesis: la app afirma solo *pertenencia* ("autorizado por Comercio X") o *no-pertenencia* ("no registrado por Comercio X"), nunca que el QR o la cuenta sean "seguros" — no acusa fraude, constata no-pertenencia. |
| **Layer intermedio (PSP/middleware)** | Alta técnica, regulatoriamente delicada — **fuera del MVP** | Ser PSP exige registro BCRA, CIMPRA, integración con administrador (COELSA, Red Link, Newpay) y sponsor bancario; el tope de comisión PCT (0,8%) acota el margen. La tesis descarta explícitamente ser billetera/PSP/procesar la transacción en la v1; queda como posible evolución vía integración con adquirentes T3.0 (resolve enriquecido). |
| **Verificación por WhatsApp + IA** | Media — candidato a reducir fricción del MVP | WhatsApp es el canal dominante del fraude (5.509 reportes UFECI 2024): riesgo de confusión con estafa. Sin antecedentes argentinos de bots de verificación de QR; restricciones del Business API para casos financieros. Podría funcionar como canal alternativo al de la app (evitar instalar una app extra), pero hereda el problema de confiar el anchor de identidad a un canal de fraude dominante. |

> **Fuera de alcance del MVP**: el monitoreo por cámaras con IA (evaluado en la v1 de este documento) fue descartado para el MVP por la complejidad de integrar múltiples providers de videoanalítica/VMS y de aprovisionamiento de hardware. El caso Shell/San Martín ($38M, posnet adulterado) quedó documentado en §1.5 como evidencia del vector de sustitución física, no como caso de uso de producto.

### 4.3 Riesgos estructurales

- **Adopción del verificador — el principal riesgo del modelo elegido**: el binding en canal propio exige que el pagador escanee con QRSafe *antes* de pagar con su billetera (paso extra voluntario). La evidencia adversa ya documentada en §3.3 aplica directamente: 73% de los usuarios escanea sin verificar destino, y la categoría B2C de checkers tiene adopción estructuralmente baja por ese paso extra. La tesis lo reconoce con honestidad ("la detección ocurre cuando existe una verificación") — sin verificación no hay detección, y sin masa crítica de comercios registrados no hay razón para verificar. Es un problema de arranque en frío de doble mercado (comercios registrados ↔ usuarios verificadores). Mitigaciones a explorar: ver pregunta abierta §7.5.
- **Asimetría de incentivos**: el fraude de QR estático recae en el comercio/cliente, no en billeteras/adquirentes (la Com. A 8032 protege a los adquirentes de contracargos). Para QRSafe es también una ventaja: el comercio es el actor con incentivo directo (pierde la venta y la confianza) — es el pagador del B2B2C.
- **Tendencia regulatoria a favor**: la CPF obligatoria y el proyecto de Registro Nacional de Incidentes crean infraestructura de datos con la que QRSafe podría integrarse.
- **Dato adverso a verificar**: Pronto Pago reporta "0% de fraude" en QR dinámico de facturas — el problema se concentra en el **QR estático físico**, exactamente el nicho del producto. *(Fuente secundaria: iProfesional, 31/08/2025 — https://www.iprofesional.com/negocios/436086-que-ventajas-tienen-los-pagos-de-facturas-por-qr-que-son-boom-en-argentina)*

---

## 5. Blockchain y criptografía: análisis técnico

### 5.1 Qué aportaría (teóricamente)

| Modelo | Mecanismo | Qué ataca |
|---|---|---|
| Registry on-chain | Hash del QR legítimo registrado en cadena | Detección de sustitución al escanear |
| Anclaje (anchoring) | Hash del registro anclado periódicamente en cadena pública | Trazabilidad temporal y no-repudio en disputas |
| W3C Verifiable Credentials | QR como credencial firmada por el emisor | Autenticación del emisor + integridad (la spec admite registries sin ledger) |
| NFT/SBT certificado | Token como "pasaporte digital" del comercio | Identidad inmutable con historial auditable |

Blockchain per se **no aporta la detección de sustitución** — eso lo hace el registro + verificación al escanear. Lo único que agrega es inmutabilidad/gobernanza del registro y evidencia para disputas. [NIST IR 8202 — https://csrc.nist.gov/pubs/ir/8202/final] [W3C VC Data Model v2.0 — https://www.w3.org/TR/vc-data-model-2.0/] [OpenTimestamps — https://opentimestamps.org/]

### 5.2 Comparación contra alternativas simples

Estado del arte **sin blockchain** (literatura académica reciente que resuelve exactamente este problema):

- QR firmados con **Ed25519 + certificados CBOR**: verificación offline completa dentro de un QR v15; variante híbrida con Web PKI (`/.well-known/jwks.json`) para revocación en tiempo real. [Jonderko & Wodo, arXiv — https://arxiv.org/html/2607.08383]
- **QR auto-autenticables (SDMQR)**: firma EdDSA embebida, retrocompatible con lectores existentes. [Barron & Sharma, IEEE S&P — https://hajim.rochester.edu/ece/sites/gsharma/papers/BarronSDMQRQuashQuishingIEEESnP2025.pdf]
- Revisión sistemática de 50 estudios (2010–2024): las contramedidas dominantes son criptografía y ML/AI; **blockchain aparece marginalmente**. [https://www.techscience.com/JCS/v7n1/59532/html]

**Contexto argentino**: el QR contiene el dominio invertido del adquirente y el CUIT del administrador del esquema; la billetera **ya consulta la API resolve / IEP en cada pago**. Un lookup firmado "¿este hash fue emitido para este comercio?" se integra al flujo existente sin blockchain y sin cambiar UX ni el estándar EMVCo/CIMPRA. [Boletín CIMPRA 530/535 — URLs arriba]

| Criterio | Registro central firmado | QR firmado (Ed25519, off-chain) | Blockchain permisionada | Anclaje público (híbrido) |
|---|---|---|---|---|
| Detección en tiempo real | Sí (lookup en la IEP existente) | Sí (verificación de firma, offline) | Sí, con latencia on-chain o espejo off-chain | No (evidencia post-hoc) |
| Costo | Bajo | Bajo | Alto (nodos, gobernanza) | Muy bajo (batching Merkle) |
| Latencia | = API resolve actual | Milisegundos | Segundos-minutos | Horas |
| Dependencia | Confianza en el operador | Gestión de claves del emisor | Consorcio de validadores | Ninguna (Bitcoin) |
| Gobernanza | Regulada (BCRA) | La define el emisor | Compleja | No requiere |

### 5.3 Veredicto (criterio Wüst & Gervais)

Blockchain solo se justifica cuando **múltiples escritores que no confían entre sí** necesitan modificar el estado **y no aceptan un TTP online**. [Wüst & Gervais, "Do you need a Blockchain?" — https://eprint.iacr.org/2017/375]

En Argentina **ese escenario no se da**: el BCRA regula el esquema y la IEP ya interconecta a las partes. Además, el problema dominante es el **binding físico** (sticker, apps falsas) — un ledger no prueba que el sticker pegado en la mesa corresponde al hash registrado.

**Escenarios futuros donde SÍ tendría sentido** (revisar si cambian): (a) registro escrito por múltiples adquirentes que no confían entre sí y ninguno acepta que el BCRA o un competidor lo opere; (b) verificabilidad pública como requisito (demostrar en causas judiciales que el registro nunca fue editado); (c) escenario transfronterizo sin regulador común (estilo LACChain/BID — https://publications.iadb.org/en/cross-border-payments-blockchain).

### 5.4 Track record de casos análogos

- **Everledger** (anti-counterfeiting, el caso emblemático): quebró en 2023. [https://www.afr.com/technology/government-and-tencent-backed-aussie-blockchain-firm-collapses-20230503-p5d58l]
- **IBM Food Trust / TradeLens**: descontinuados; IBM desmanteló su equipo blockchain. Encuesta Capgemini: solo 3% de iniciativas blockchain en supply chain llegaron a despliegue at-scale. [https://www.ibm.com/docs/en/food-trust?topic=overview] [https://www.coindesk.com/business/2021/02/01/ibm-blockchain-is-a-shell-of-its-former-self-after-revenue-misses-job-cuts-sources]
- **Casos que persisten** (Arianee/Breitling 500K+ relojes, Lululemon+VeChain): single-brand, lujo, margen alto, la marca controla toda la cadena — exactamente el escenario donde un DB firmado bastaría; el valor es marketing, no seguridad. [https://www.arianee.com/en/case-studies/breitling] [https://wwd.com/sourcing-journal/industry-news/tech-tactics-lululemon-vechain-crack-down-on-counterfeits-1238858630/] Además, una auditoría de Veridise halló vulnerabilidades críticas en los circuitos ZK de Arianee. [https://veridise.com/wp-content/uploads/2024/11/VAR_Arianee_Circuits-Final.pdf]
- **Petro (Venezuela)**: ilusorio como precedente. [https://www.reuters.com/article/business/special-report-in-venezuela-new-cryptocurrency-is-nowhere-to-be-found-idUSKCN1LF18F]

**Conclusión**: blockchain como diferencial central de QRSafe es, hoy, un buzzword en el contexto argentino. La seguridad real viene de firma del emisor + verificación en el flujo de pago existente, a menor costo, latencia y complejidad. **Híbrido defendible** (si se valora la narrativa comercial): anclaje OpenTimestamps-style de la raíz Merkle del registro en Bitcoin — costo marginal ~cero, prueba inmutable verificable incluso si QRSafe desaparece; útil solo para evidencia en disputas y no-repudio, nunca para detección en tiempo real (que queda 100% off-chain).

### 5.5 Criptografía sin blockchain — verificación profunda

**Compatibilidad con EMVCo MPM sin modificar el estándar: SÍ cabe una firma.**
- El EMV MPM es un payload TLV plano (tags 00–63, donde 26–51 son plantillas de Merchant Account Information con dominio invertido del adquirente, y tag 63 = CRC-16 que solo da integridad de captura, no autenticidad de origen). La spec define **Unreserved Templates (IDs 80–99)** con contenido "context specific" fuera del scope de EMVCo: es el hueco diseñado para extensiones propietarias. Una firma Ed25519 es de 64 bytes (~86 caracteres base64), dentro del límite de 99 por valor. Las billeteras que no reconocen el GUID simplemente ignoran el tag (comportamiento estándar de parser TLV) — **agregarlo no rompe compatibilidad**. [EMV MPM spec v1.1 — https://mvallim.github.io/emv-qrcode/docs/EMVCo-Merchant-Presented-QR-Specification-v1.1.pdf]
- **Pero el problema no es técnico sino de incentivos**: que alguien *verifique* la firma exige que las billeteras incorporen la clave y la lógica — algo que ninguna hará sin mandato del BCRA o beneficio propio. Una firma en un tag ignorado por el lector aporta **cero** seguridad.

**¿Quién firmaría? Modelos de confianza:**
1. **El adquirente** (Mercado Pago, Pagos360...): el único modelo con anclaje real — ya hizo KYC del comercio, ya es responsable ante el BCRA, ya emite el QR. Es el modelo de India UPI 2.0 (desde 2018): QRs de comercios verificados con firma digital e indicador de "comercio verificado" en la app del pagador. [BHIM/NPCI UPI 2.0 — https://www.bhimupi.org.in/upi2]
2. **Un tercero (QRSafe) registrado ante BCRA**: técnicamente posible, comercialmente improbable — exigiría que las ~90 billeteras interoperables incorporen la clave pública de QRSafe sin que aporte nada que el adquirente no pueda firmar él mismo.
3. **El propio comercio**: descartable a escala (gestión de claves por minoristas no es realista).

**Distribución de claves y precedentes de despliegue:**

| Caso | ¿QR firmado? | Escala / Efecto |
|---|---|---|
| **EU Digital COVID Certificate** | Sí (CBOR+COSE, ECDSA) | Despliegue masivo multi-país, verificación **offline** en el dispositivo, trust lists nacionales + gateway UE — el precedente técnico más fuerte [https://www.consilium.europa.eu/en/policies/coronavirus-pandemic/eu-digital-covid-certificate/] |
| **India UPI 2.0** | Sí (comercios verificados, desde 2018) | Indicador "comercio verificado"; la verificación ocurre en el backend del adquirente, no en la app del consumidor [https://www.bhimupi.org.in/upi2] |
| **Brasil Pix (QR estático)** | **No** | Ante el fraude de QR trocado, el BCB respondió con **reversibilidad (MED)** y campañas de verificación del nombre del destinatario, no con firmas [https://www.bcb.gov.br/estabilidadefinanceira/pix-seguranca] |
| **Argentina VQR (transporte)** | No aplica | Es QR consumer-presented dinámico (nace en el teléfono del pagador): mitigación por *dinamismo*, no por firma [Com. BCRA 8206/2025] |

**Veredicto criptografía** (revisado en v3 — el veredicto v2 mezclaba dos mecanismos distintos bajo una sola conclusión):

1. **Firma embebida en el QR, verificada por terceros (billeteras/adquirentes): improbable sin mandato regulatorio.** Ninguna billetera verificará una firma de un tercero sin mandato del BCRA; India lo logró porque NPCI es el único esquema y lo impuso, Argentina tiene ~90 billeteras. Además la firma responde "este QR lo emitió X" — pero el sticker presenta un QR *distinto y perfectamente válido* emitido por la cuenta del delincuente; la firma solo ayuda si el comercio está onboardado con un adquirente firmante, cosa que el resolve ya valida consultando el alias y mostrando el titular.
2. **Registro propio de QRs autorizados, verificado en canal propio (modelo de la tesis Identity Binding): el argumento de incentivos NO aplica.** QRSafe no necesita que ninguna billetera verifique nada — su app consulta su propio registro. Es desplegable hoy, sin mandato regulatorio ni cooperación de terceros, porque la verificación ocurre fuera del flujo de pago, exactamente donde nadie actúa hoy. La unidad de confianza no es el QR aislado sino `comercio verificado + QR autorizado + destino esperado`; lo que el usuario compra no es criptografía sino **la fuente de verdad de ese binding**.
3. Brasil, con el mismo problema y más escala, eligió reversibilidad + verificación de nombre *dentro* del flujo (BCB puede imponerlo a los bancos); el registro propio opera *fuera* del flujo — son mitigaciones complementarias, no excluyentes.
4. **Aporte residual de la criptografía en el modelo de la tesis**: fingerprint/hash determinístico y comparable del payload, firma del registro por QRSafe (integridad del propio registro frente a manipulación interna) y eventual verificación offline estilo EU DCC. Es una capa de ingeniería del producto, no el diferencial: el diferencial es la existencia y confiabilidad de la fuente de verdad del binding.

### 5.6 Mundo cripto y QR — ataques, players y extensión futura

**Ataques documentados con QR en cripto:**
- **Address poisoning**: en 2024, Chainalysis identificó ~82.000 direcciones spoof que intoxicaron historiales; 2.774 víctimas transfirieron US$ 69,7M (caso mayor: US$ 68M en WBTC, mayo 2024). Un paper académico de 2025 detectó **270 millones de intentos** — 13 veces más que estimaciones previas — con direcciones lookalike generadas incluso con GPUs. [Chainalysis — https://www.chainalysis.com/blog/address-poisoning-scam/] [arXiv:2501.16681 — https://www.emergentmind.com/papers/2501.16681]
- **Crypto ATMs**: FBI IC3 registró 10.956 denuncias con US$ 246,7M perdidos en 2024 (~US$ 333M en 2025); vector típico = ingeniería social (llamada + QR enviado por SMS); también hay stickers falsos sobre ATMs legítimos y CVEs de firmware (Lamassu CVE-2024-0674). [FTC — https://www.ftc.gov/news-events/data-visualizations/data-spotlight/2024/09/bitcoin-atms-payment-portal-scammers] [DFPI — https://dfpi.ca.gov/consumers/crypto/crypto-atm-scams/]
- **Wallet drainers** (vector dominante): US$ 494M perdidos en 2024; cayeron 83% a US$ 83,85M en 2025, atribuido a las defensas integradas en wallets. [Scam Sniffer — https://drops.scamsniffer.io/scam-sniffer-2025-crypto-phishing-losses-fall-83-to-84-million/]

**Players de seguridad QR/dirección en cripto (ecosistema maduro):** Blockaid (simulación pre-firma integrada en MetaMask y Coinbase Wallet, US$ 50M Serie B 2025), Scam Sniffer (blocklists de 258K+ dominios/direcciones, consultados por Binance, Phantom, Chainalysis), Wallet Guard, Pocket Universe, y alertas anti-poisoning nativas de Binance ("Antidote").

**Hipótesis del fundador: "cada wallet cripto tiene su propio mecanismo de seguridad, no tiene sentido entrar en ese mundo" — VEREDICTO: sustancialmente VÁLIDA, con matices.**
- A favor: los mecanismos existen y son estándar (EIP-55 checksum, EIP-681 payment requests por QR, simulación pre-firma integrada); el mercado ya lo resolvió con incumbentes consolidados y financiados integrados en las wallets líderes. [EIP-681 — https://eips.ethereum.org/EIPS/eip-681]
- Matiz clave: esos mecanismos protegen contra errores y phishing de firma, pero **NO contra la confusión de identidad del receptor** (address poisoning), que es estructuralmente idéntico al sticker fraud: el usuario cree saber a quién le paga y no contrasta la identidad real.
- **Lección transferible cripto → fiat**: la mitigación emergente contra address poisoning es verificar por **nombre/alias en vez de por dirección** (ENS, nombres legibles), porque las direcciones son opacas para humanos. Es exactamente el problema del `collector.name` de EMVCo argentino: existe, se muestra, pero el usuario promedio no lo contrasta. La mitigación efectiva en ambos mundos es **forzar el contraste de identidad semántica**, no más criptografía. [arXiv:2501.16681]
- **Límite del contraste semántico que el binding esquiva (v3)**: el `collector.name` suele ser una razón social que no matchea el nombre de fantasía del comercio (el cartel dice "La Esquina", el collector dice "GONZALEZ JUAN CARLOS SA") — el contraste por nombre falla estructuralmente en esa brecha, y es además explotable (un atacante puede registrar una razón social parecida al nombre de fantasía de la víctima). El binding por fingerprint de la tesis no depende del nombre: verifica *pertenencia declarada por el comercio*, no similitud textual. En la práctica, ambos mecanismos se complementan: el binding resuelve "¿fue autorizado por este comercio?" y el nombre de fantasía registrado en QRSafe (no la razón social del collector) resuelve "¿es este el comercio que creo?".

**Extensión futura QRSafe → cripto: NO recomendada como roadmap.**
1. Mundo cerrado por wallet: la verificación efectiva ocurre *dentro* de las wallets o exchanges, con incumbentes consolidados (Blockaid, Scam Sniffer) que ya tienen APIs y distribución.
2. El fraude QR cripto dominante no es presencial: address poisoning, drainers y BTM social engineering son vectores remotos (SMS/llamada + QR enviado a la víctima); QRSafe ataca el escenario presencial (sticker sobre QR legítimo), marginal en cripto.
3. Excepción potencial (BTMs físicos con stickers): replica la lógica del sticker fraud, pero el volumen (US$ 246–333M/año en EE.UU.) no justifica construir para Argentina, donde la penetración de ATMs cripto es mínima.
4. No se encontró evidencia de una brecha específica sin player que la cubra en verificación de QR cripto para usuarios finales.

---

## 6. Recomendaciones para QRSafe

> Fuente de verdad de la propuesta B2B: `docs/research/tesis-identity-binding-b2b.md` (Tesis de Identity Binding). Estas recomendaciones se subordinan a ella.

1. **Foco de producto**: QR estático físico sin supervisión (estaciones, gastronomía, parking, kioscos). El QR dinámico ya es seguro (Pronto Pago reporta 0% de fraude).
2. **Núcleo del producto — identity binding (per la tesis)**: registro verificable `identidad del comercio ↔ QR autorizado ↔ destino de pago`, verificado en canal propio antes del pago. La pregunta del producto es **"¿es este uno de los QRs autorizados por el comercio al que intento pagar?"**, no "¿es este QR seguro?" (validity ≠ authenticity). El contraste semántico del receptor (`collector.name` esperado vs. resuelto) pasa a ser **evolución de largo plazo dentro del flujo de pago** — requiere adhesión de billeteras/adquirentes (resolve enriquecido) y hereda la debilidad razón social vs. nombre de fantasía (§5.6); el binding por fingerprint es la mitigación desplegable hoy, sin cooperación de nadie.
3. **Arquitectura** (sin blockchain, sin PSP, sin cámaras): `comercio verificado → registra QR → QRSafe crea binding (fingerprint/hash + metadatos del destino) → consumidor verifica → verified / mismatch`. La criptografía es capa de ingeniería (hashing determinístico del payload, firma del propio registro), no diferencial de producto. La firma Ed25519 en Unreserved Templates (80–99) queda documentada como opción futura para cuando existan verificadores en el flujo de pago.
4. **Principio de comunicación y responsabilidad**: la app afirma *pertenencia* ("autorizado por Comercio X") o *no-pertenencia* ("no registrado por Comercio X") — nunca que un QR o una cuenta son "seguros". No acusa fraude ni valida receptores: constata la no-pertenencia contra lo que el comercio declaró como propio. Este framing mitiga el riesgo legal de "aprobar" un QR que luego resulte fraudulento (§4.2).
5. **Go-to-market**: vía banderas/asociaciones (AOYPF, FECRA) y adquirentes T3.0, sin ser PSP en la primera etapa (complejidad regulatoria + tope de comisión 0,8%). Modelo B2B2C con el comercio como cliente pagador (incentivo directo: pierde la venta y la confianza); ningún incumbente internacional (todos B2C URL-checkers en contracción) ocupará este terreno.
6. **Blockchain**: descartar como núcleo; mantener como anclaje opcional de hashes si aporta a la narrativa comercial, con comunicación honesta (la detección ocurre off-chain).
7. **Mundo cripto**: descartar como extensión de producto. Las wallets ya tienen mecanismos propios (EIP-55/681, simulación pre-firma, blocklists) con incumbentes consolidados; el fraude QR cripto dominante es remoto, no presencial.
8. **Generar el dato**: no existe estadística nacional de fraude por QR sustituido — construirla (con comercio anónimizado) es una ventaja competitiva y de posicionamiento. El registro de verificaciones de QRSafe genera ese dato como subproducto del modelo.

---

## 7. Preguntas abiertas (a debatir / próximos research)

Surgen de la conciliación con la tesis; ninguna bloquea la decisión de producto, pero todas deben resolverse antes o durante el diseño del MVP.

### 7.1 Anchor de identidad física — ¿cómo sabe la app qué comercio hay enfrente?
El binding verifica "¿este QR fue autorizado por el comercio X?", pero el verificador necesita resolver X primero. Mecanismos candidatos sin evaluar: búsqueda manual por el usuario (nombre/géolocalización), GPS + radio, foto del local, código propio en la señalética del comercio, o verificación implícita por contexto (el comercio exhibe un identificador QRSafe junto al QR). Es la otra mitad del vínculo `mundo físico → identidad` y no fue investigada en este documento. Decisión de diseño crítica: cuanta más fricción agregue, peor el problema de adopción (§7.5); cuanta menos, más débil el anchor (y más fácil de falsear).

### 7.2 Estabilidad del fingerprint — ¿qué se hashea y qué pasa cuando el QR cambia?
- Si el adquirente re-emite el QR estático (cambio de cuenta, re-alta, nuevo esquema), el fingerprint deja de matchear → falso mismatch. ¿Política de re-registro, expiración de bindings, notificación al comercio?
- ¿Se hashea el string TLV crudo o una forma canónica normalizada (sin campos volátiles)? El string crudo es más simple pero más frágil; la normalización requiere definir qué campos son estables.
- ¿Se registra también una referencia visual (posición en la cartelería) o solo el payload? El sticker fraud cambia el payload — con el payload alcanza para detectarlo — pero los metadatos de contexto pueden ayudar en disputas.

### 7.3 QRs múltiples legítimos por comercio — modelo de datos del registro
Un comercio real tiene varios QRs legítimos simultáneos (mesa, box, barra, sucursal, QR de otro adquirente como fallback). El registro es N QRs : 1 identidad. Preguntas: ¿el comercio registra todos?, ¿cómo se presentan al verificador?, ¿el verificador valida contra el comercio o contra el punto físico (mesa 4 de la sucursal Y)? Impacta directamente en §7.1.

### 7.4 KYC del onboarding comercial — ¿contra qué se verifica la identidad?
La tesis exige "una identidad verificable" del comercio, pero no define el mecanismo. Opciones: CUIT + padrones públicos (AFIP, ingresos brutos), verificación documental humana, validación vía el adquirente (si el QR matchea un comercio ya onboarded), verificación presencial. Es el eslabón más crítico del binding: si la identidad del comercio se puede falsificar, todo el modelo colapsa (un atacante podría registrar "su" comercio con el nombre de la víctima). No está investigado; candidato a research de seguimiento.

### 7.5 Adopción del verificador y arranque en frío de doble mercado
Sin masa crítica de comercios registrados no hay razón para verificar; sin verificadores no hay valor demostrable para el comercio. Mitigaciones a evaluar: señalética física en el local ("QR verificado por QRSafe" — convierte al comercio en canal de adquisición de verificadores), verificación pasiva, canal WhatsApp (§4.2), incentivos del comercio al pagador. Métrica guía a definir: % de pagos reales precedidos por una verificación.

### 7.6 UX del mismatch y del caso "comercio no registrado"
Un QR no registrado tiene dos causas muy distintas: (a) el comercio no está en QRSafe (falso negativo inocuo, mayoría de casos al inicio), o (b) el QR fue sustituido (el caso que importa). ¿Cómo se comunica la diferencia sin generar alarmismo ni trivializar el riesgo? ¿Se ofrece al usuario una acción (avisar al comercio, reportar)? El diseño de este flujo determina la credibilidad del producto.

---

## Limitaciones de esta investigación

- No se encontró estadística primaria argentina que aisle el fraude "sticker sobre QR" (UFECI no lo tipifica; BCRA reporta reclamos agregados).
- No se encontró un caso policial resuelto específicamente de sticker sobre QR en estaciones YPF; los casos documentados de estaciones son fraude interno y adulteración de posnet.
- Los datos de crecimiento de quishing (+150% T1 2026) provienen de prensa que cita fuentes extranjeras no verificables para Argentina.
- No se auditó el interior de la app de ninguna billetera; las afirmaciones sobre "qué no ofrecen" se basan en documentación pública y comunicados.
- Los detalles criptográficos del firmado UPI 2.0 (algoritmo exacto, formato de clave) no son públicos: NPCI restringe sus especificaciones a bancos miembro; se documentó el mecanismo a partir de fuentes oficiales de divulgación.
- El research de players internacionales se basa en documentación pública de los productos (sitios oficiales, stores); el estado de disponibilidad en stores puede variar por región y fecha.
- Cambios de alcance documentados: el monitoreo por cámaras (v1) fue excluido del MVP por decisión de producto (complejidad de providers); el contenido de la v1 sobre videoanalítica fue retirado de este documento. En v3, la tesis de Identity Binding (`tesis-identity-binding-b2b.md`, versionada en este directorio) pasó a ser la fuente de verdad de la propuesta B2B: este documento se subordina a ella y las discrepancias detectadas fueron corregidas (principalmente el veredicto de §5.5, que mezclaba firma-verificada-por-terceros con registro-propio, y la recomendación de núcleo de §6).
- Las preguntas de §7 son preguntas de diseño/abiertas, no hallazgos: no fueron investigadas contra fuentes y deben resolverse con experimentos de producto o research de seguimiento.
- Las fuentes raw de los agentes (`research-qrsafe-mercado.md`, `research-qrsafe-blockchain.md`, `research-qrsafe-players.md` y `research-qrsafe-cripto.md`) se guardaron en un directorio temporal fuera del repo y **ya no son recuperables**: el perfil de usuario donde vivían no existe en la máquina actual. El respaldo consultable de este informe son los enlaces citados en línea; **las afirmaciones que no lleven enlace no tienen material de respaldo adicional al que recurrir** — es el caso del dato de quishing "+150% T1 2026" mencionado más arriba en esta misma sección.
