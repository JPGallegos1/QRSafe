# Research: Fraude QR en Argentina, players internacionales, criptografía y blockchain — QRSafe

> Fecha: 2026-08-22 (v4: conciliación para Domain Modeling con `conciliacion-domain-modeling.md`) · Alcance: Argentina + paisaje internacional · Método: investigación contra fuentes primarias (BCRA/CIMPRA, MPF/UFECI, EMVCo, W3C, NIST, BCB, NPCI, FTC, papers académicos) por agentes paralelos, sintetizada en este documento. Fuente de verdad de producto B2B: `tesis-identity-binding-b2b.md`. Las afirmaciones que solo aparecen en prensa están marcadas como *fuente secundaria*.

---

## Resumen ejecutivo

1. **El problema existe y está regulado a medias**: la normativa argentina (BCRA/CIMPRA) obliga a billeteras y PSP a mitigar fraude *transaccional*, pero no identificamos una obligación específica de integridad física del QR exhibido en el comercio (la "última pulgada" anti-sticker). El QR de comercio EMVCo no incorpora una firma criptográfica anti-sustitución; VQR de transporte sí combina dinamismo con firmas criptográficas.
2. **No hay estadística pública nacional desagregada de fraude por sustitución de QR** (UFECI no lo tipifica; BCRA reporta reclamos agregados). Eso es a la vez un riesgo (mercado difícil de dimensionar) y una oportunidad (QRSafe puede generar el dato).
3. **El espacio aparece actualmente desatendido en el research realizado**: no identificamos una empresa argentina dedicada específicamente a verificar QR de pago contra la identidad/contexto del comercio. Los escáneres internacionales relevados (Kaspersky, Norton, Trend Micro, Bitdefender, "Is This QR Safe?") verifican reputación de URLs contra phishing; no encontramos evidencia de que validen sustitución de un QR EMVCo de pago contra un binding QR↔comercio. El ataque argentino (sticker con QR EMVCo válido del estafador) no requiere un link malicioso: el problema es quién cobra. La categoría B2C relevada también muestra discontinuaciones, productos sin actualizaciones y micro-apps.
4. **Blockchain como diferencial central no se justifica con la evidencia actual**: existe un tercero de confianza online regulado (BCRA + IEP/API resolve que ya se consulta en cada pago), lo que no satisface el criterio académico estándar de Wüst & Gervais. La criptografía requiere una distinción fina (ver §5.5): la **firma embebida en el QR verificada por terceros** (billeteras/adquirentes) es improbable sin mandato del BCRA, mientras que el **registro propio de QRs autorizados verificado en canal propio** — decisión de la tesis B2B — puede construirse sin exigir integración obligatoria con billeteras.
5. **Premisa de producto (validity ≠ authenticity)**: un QR técnicamente válido no es necesariamente legítimo para el contexto donde aparece. El sticker fraud presenta un QR *perfectamente válido* apuntando a la cuenta del atacante; la propiedad a verificar es que **ese QR específico haya sido autorizado para el comercio y contexto de pago que el usuario espera**. El contexto esperado debe provenir de una fuente independiente del QR observado (ver §3.4).
6. **Extensión al mundo cripto: no recomendada**. La hipótesis de que cada wallet tiene su propio mecanismo de seguridad se valida sustancialmente: EIP-55/EIP-681, simulación pre-firma (Blockaid en MetaMask/Coinbase, US$50M Serie B 2025) y blocklists (Scam Sniffer) ya cubren el espacio, y el fraude QR cripto dominante es remoto (ingeniería social), no presencial.
7. **Recomendación de foco**: el nicho real es el **QR estático físico sin supervisión** (estaciones, gastronomía, parking, kioscos). El MVP se concreta como **identity binding**: `contexto físico / identidad esperada ↔ QR autorizado ↔ destino de pago esperado`, con verificación en canal propio que afirma pertenencia/no-pertenencia — nunca "seguridad" o fraude del QR. La adopción del verificador, el KYC comercial y el anchor de contexto son hipótesis críticas, no hechos demostrados (ver §7). *(Nota de alcance: el monitoreo por cámaras con IA, evaluado en la v1 de este documento, quedó fuera del MVP por complejidad de integración con providers de videoanalítica.)*

### Cómo interpretar este documento (v4)

- **Hechos observados / evidencia**: §1–§3 y las fuentes citadas.
- **Conclusiones derivadas**: §4 y §5; interpretan la evidencia, no la reemplazan.
- **Decisiones de producto**: §3.4 y §6; provienen de la tesis B2B, no de una fuente externa.
- **Preguntas abiertas / hipótesis**: §7; no deben presentarse como evidencia ni cerrarse durante Domain Modeling sin discovery adicional.

---

## 1. Magnitud del problema

### 1.1 Cómo funciona el fraude

- El QR de pago argentino sigue el estándar **EMVCo Merchant Presented Mode**. Los QR **estáticos** (imprimibles, reutilizables, identifican al aceptador en campos 26–49) se resuelven vía "API resolve" del adquirente, que devuelve el `collector` (nombre/CUIT/cuenta). El QR **no está firmado criptográficamente** contra sustitución física: quien controla la imagen impresa controla la cuenta destino. [Boletín CIMPRA 525 — https://www.bcra.gob.ar/archivos/Pdfs/SistemasFinancierosYdePagos/Boletin-CIMPRA-525.pdf] [Boletín CIMPRA 530 — https://www.bcra.gob.ar/archivos/Pdfs/SistemasFinancierosYdePagos/Boletin_CIMPRA_530.pdf]
- **Viaje con QR (VQR, transporte)** es un esquema *consumer-presented*, dinámico y firmado criptográficamente: las billeteras firman con ED25519 y los validadores verifican integridad, TTL y listas de denegación. El dinamismo reduce la aplicabilidad del vector de sticker porque el código nace en el teléfono del pagador; la firma protege su integridad. Esta combinación no está incorporada al QR de comercio. [Boletín CIMPRA 544 — https://www.bcra.gob.ar/archivos/Pdfs/SistemasFinancierosYdePagos/Boletin-CIMPRA-544.pdf]
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

**Hallazgo clave**: la normativa obliga a *billeteras, PSP y administradores* a mitigar fraude transaccional, pero el research no identificó una obligación específica de seguridad física/integridad del QR exhibido. El proyecto de ley 4661-D-2025 (Registro Nacional de Incidentes de Ciberfraude) aún no es ley. [https://www4.hcdn.gob.ar/dependencias/dsecretaria/Periodo2025/PDF2025/TP2025/4661-D-2025.pdf]

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

**Hallazgo del research: no identificamos una empresa argentina dedicada específicamente a verificación de QR / anti-tampering de QR de pago.** Las búsquedas devolvieron adyacentes: acortadores con QR para marketing (https://tw.com.ar/), verificación de identidad genérica (https://aidi.com.ar/empresas/), motores antifraude transaccional e-commerce (https://www.wondersoft.com.ar/). Lo más cercano regional: Depay (QR cross-border, menciona prevención de QRs maliciosos como feature de infraestructura — https://bankmagazine.com.ar/la-tecnologia-detras-del-qr/). El espacio aparece desatendido, dentro del alcance y fecha de esta búsqueda.

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
- No identificamos en este research una startup consolidada (con funding) dedicada a "QR payment substitution / merchant QR protection" como producto comercial. El boom quishing 2023-2026 generó herramientas, pero las relevadas son mayormente consumer URL-checkers o features de vendors grandes. [https://www.startupdefense.io/blog/quishing-attacks-qr-code-phishing-startups]
- El player B2B más cercano conceptualmente: **MSME SecureX (India)** — "AI-powered payment fraud protection for Indian businesses... fake UPI screenshots, QR tampering", UPI-first, WhatsApp integration. Replicarlo en Argentina requeriría re-architecture completo al ecosistema Transferencias 3.0. [https://www.msmesecurex.com/]
- Académico sin producto comercial: detección visual de QRIS falsificados (Indonesia) con CNN + validación de payload EMVCo logra 95% de precisión, pero los autores reconocen que **no pueden verificar el merchant real** "due to restricted access to Bank Indonesia's official merchant database" — exactamente el problema que QRSafe ataca. [ResearchGate — https://www.researchgate.net/publication/364593009]
- **LatAm/Argentina: no identificamos un player dedicado** dentro del research realizado. Las apps en español relevadas son traducciones de indie apps de URL-checking.

**Análisis de encaje — hipótesis CONFIRMADA:**
> "Los escáneres seguros relevados verifican reputación de URLs contra phishing/quishing; no encontramos evidencia de que validen la sustitución de un QR de pago EMVCo contra un binding físico QR↔comercio, por lo que el caso argentino aparece desatendido."

El matiz clave: el ataque de sticker **no requiere que la URL sea maliciosa**. Un QR EMVCo genuino del estafador (con su propio CVU/alias legítimamente registrado) pasa limpio por los escáneres relevados — el fraude está en la identidad del cobrador, no en el link. No encontramos evidencia de que esos players tengan una base de datos de comercios argentinos, integración con el ecosistema local (BCRA/CIMPRA), ni un modelo de negocio para el merchant. Diferencia de público: los players relevados son **B2C consumidor** (el individuo debe instalar una app extra e interpretar un veredicto de URL); QRSafe plantea un modelo **B2B2C** (el comercio mantiene bindings y el pagador recibe la validación). El espacio aparece actualmente desatendido: la categoría relevada está en contracción y el lado merchant recibe principalmente consejos manuales de auditoría física. [Global Payments Integrated — https://www.globalpaymentsintegrated.com/en-us/blog/2022/03/29/5-ways-isvs-can-help-protect-merchants-against-qr-code-scams]

### 3.4 Modelo B2B conciliado (decisión de producto)

> Esta sección es una decisión de producto derivada de `tesis-identity-binding-b2b.md` y `conciliacion-domain-modeling.md`; no es evidencia externa.

**Unidad de confianza:**

```text
Contexto físico / identidad esperada
        ↕
QR autorizado
        ↕
Destino de pago esperado
```

El modelo previo `Merchant Identity ↔ QR autorizado ↔ destino` era incompleto para detectar sustitución: un QR válido de un atacante puede pertenecer correctamente a ese atacante. Para producir un `MISMATCH`, QRSafe necesita una vía independiente para saber qué comercio o punto de cobro **debería** estar presente antes de comparar el QR observado.

| Término | Definición de dominio | No debe confundirse con |
|---|---|---|
| **Merchant Identity** | Identidad que QRSafe reconoce como perteneciente a un comercio real y previamente verificado. | Nombre de fantasía, razón social, `collector.name`, dominio web o identidad del adquirente. |
| **Physical / Payment Context** | Contexto en el que el usuario espera pagar: sucursal, mesa, surtidor, terminal o punto de cobro. Responde a "¿a quién debería estar pagando acá?". | El QR observado. |
| **Authorized QR** | QR declarado por una Merchant Identity verificada y registrado como autorizado para uno o más contextos. | Cualquier QR técnicamente válido. |
| **Payment Destination** | Representación del destino de pago del QR: payload EMVCo, adquirente, cuenta/alias, `collector` y metadatos disponibles. | La identidad comercial por sí sola. |
| **Binding** | Relación registrada `Merchant Identity + Physical / Payment Context + Authorized QR + Expected Payment Destination`. | Un hash aislado o una evaluación de seguridad. |
| **Observed QR** | QR recibido en una verificación; inicialmente no tiene estado de confianza. | Un Authorized QR. |
| **Verification** | Comparación entre `Observed QR` y el `Binding` esperado para el contexto. | Detección o acusación de fraude. |

**Estados de verificación:**

| Estado | Condición | Significado permitido |
|---|---|---|
| `VERIFIED` | Merchant Identity verificada + contexto esperado + Observed QR coincide con Authorized QR + Binding vigente. | "Este QR está registrado como autorizado para este comercio/contexto". |
| `MISMATCH` | Merchant Identity verificada + contexto esperado + Observed QR no coincide con los Authorized QR vigentes. | "Este QR no está registrado como autorizado para este comercio/contexto". No implica fraude. |
| `UNKNOWN` / `UNREGISTERED` | No existe información suficiente para comparar: comercio/contexto/binding/QR no registrado. | Ausencia de evidencia; no es sospecha ni no-pertenencia. |
| `EXPIRED` / `STALE` | Binding anteriormente válido que dejó de estar vigente. | Requiere actualizar o reemplazar el binding; no equivale automáticamente a fraude. |
| `REVOKED` | Binding invalidado explícitamente por la Merchant Identity o QRSafe tras evidencia suficiente. | QR previamente autorizado que ya no debe usarse en ese contexto. |

**Invariantes de producto:**

1. `validity ≠ authenticity`: un QR técnicamente válido puede no ser auténtico para el contexto donde aparece.
2. QRSafe verifica pertenencia, no fraude: solo puede afirmar autorización/no-pertenencia respecto de un binding.
3. `UNKNOWN ≠ MISMATCH`: ausencia de evidencia no equivale a evidencia de no-pertenencia.
4. No existe binding confiable sin una Merchant Identity previamente verificada.
5. El QR observado no puede definir por sí mismo el contexto esperado.
6. Un comercio puede tener múltiples QRs legítimos, sucursales y puntos de cobro.
7. El binding tiene ciclo de vida: `created → active → replaced | revoked | expired`.

---

## 4. Oportunidades y viabilidad por canal

### 4.1 Gaps no cubiertos

1. **Binding identidad/contexto ↔ QR autorizado**: no identificamos en el research un registro público o comercial que vincule un QR de pago con el comercio **y contexto** que lo autorizó. El estándar EMVCo de comercio no incorpora firma anti-sustitución. Es el gap que la tesis de Identity Binding convierte en producto: la pregunta no es "¿este QR es seguro?" sino "¿es uno de los QRs autorizados para el comercio y punto de pago al que estoy intentando pagar?".
2. **Detección temprana**: no identificamos un producto que detecte el cambio de QR por patrón de pagos (caída abrupta de ingresos del comercio, discrepancia volumen/ventas como en los casos San Juan/Shell). Con la tesis como alcance, la detección es *a demanda*: ocurre cuando existe una verificación contra un contexto esperado.
3. **Canal de verificación para el pagador**: no identificamos en la documentación pública de billeteras una señal de "QR verificado por el comercio" independiente del `collector.name`. El canal propio de QRSafe puede verificar un binding sin integración obligatoria con billeteras, pero agrega fricción y requiere resolver primero el contexto esperado.
4. **Anchor de identidad física (trust-model requirement, CRÍTICO y no resuelto)**: verificar el binding exige resolver *"¿qué comercio/punto de pago debería estar presente acá?"* por una vía independiente del QR observado. Mecanismos candidatos (búsqueda manual, GPS, foto del local, identificador físico propio) no fueron investigados en este documento. Es además el mismo gap que la literatura académica documenta del lado del regulador (estudio QRIS/Indonesia: "restricted access to official merchant database").
5. **Estadística específica**: la dimensión real del fraude por QR sustituido es invisible; generarlo es una ventaja defensible.
6. Las recomendaciones oficiales actuales son puramente manuales ("fijarse si hay sticker encima", "inspección diaria").

### 4.2 Viabilidad por canal propuesto

| Canal | Viabilidad | Notas clave |
|---|---|---|
| **App propia (verificador de binding) — MVP elegido por la tesis** | Media-alta | Resuelve un contexto esperado independiente y contrasta el payload/fingerprint del QR observado contra bindings vigentes de QRSafe (`Merchant Identity + Context + Authorized QR + Payment Destination`). El registro es el producto, no una barrera externa. No requiere integración obligatoria con billeteras ni adquirentes, pero sí un mecanismo de KYC comercial y un anchor físico confiable. Debe diferenciar `VERIFIED`, `MISMATCH`, `UNKNOWN` y `EXPIRED/STALE`. Limitar la respuesta a pertenencia/no-pertenencia reduce la superficie de claims; el efecto concreto sobre responsabilidad legal requiere asesoramiento jurídico. |
| **Layer intermedio (PSP/middleware)** | Alta técnica, regulatoriamente delicada — **fuera del MVP** | Ser PSP exige registro BCRA, CIMPRA, integración con administrador (COELSA, Red Link, Newpay) y sponsor bancario; el tope de comisión PCT (0,8%) acota el margen. La tesis descarta explícitamente ser billetera/PSP/procesar la transacción en la v1; queda como posible evolución vía integración con adquirentes T3.0 (resolve enriquecido). |
| **Verificación por WhatsApp + IA** | Media — candidato a reducir fricción del MVP | WhatsApp es el canal dominante del fraude (5.509 reportes UFECI 2024): riesgo de confusión con estafa. Sin antecedentes argentinos de bots de verificación de QR; restricciones del Business API para casos financieros. Podría funcionar como canal alternativo al de la app (evitar instalar una app extra), pero hereda el problema de confiar el anchor de identidad a un canal de fraude dominante. |

> **Fuera de alcance del MVP**: el monitoreo por cámaras con IA (evaluado en la v1 de este documento) fue descartado para el MVP por la complejidad de integrar múltiples providers de videoanalítica/VMS y de aprovisionamiento de hardware. El caso Shell/San Martín ($38M, posnet adulterado) quedó documentado en §1.5 como evidencia del vector de sustitución física, no como caso de uso de producto.

### 4.3 Riesgos estructurales

- **Adopción del verificador — hipótesis crítica, no hecho demostrado**: el binding en canal propio exige que el pagador verifique antes de pagar (paso extra voluntario). Este research relevó una categoría B2C con productos discontinuados o de micro-escala, pero no aporta una métrica trazable que demuestre la frecuencia de verificación que el MVP necesita. La tesis lo reconoce con honestidad ("la detección ocurre cuando existe una verificación"). Es una hipótesis de arranque en frío de doble mercado (comercios registrados ↔ usuarios verificadores) que debe validarse como `HYP-03`; ver §7.3.
- **Asimetría de incentivos**: el fraude de QR estático recae en el comercio/cliente, no en billeteras/adquirentes (la Com. A 8032 protege a los adquirentes de contracargos). Para QRSafe es también una ventaja: el comercio es el actor con incentivo directo (pierde la venta y la confianza) — es el pagador del B2B2C.
- **Tendencia regulatoria a favor**: la CPF obligatoria y el proyecto de Registro Nacional de Incidentes crean infraestructura de datos con la que QRSafe podría integrarse.
- **Dato adverso a interpretar con cautela**: Pronto Pago reporta "0% de fraude" en QR dinámico de facturas. Es evidencia secundaria y específica de esa implementación; no permite concluir que todo QR dinámico sea seguro. Los QR dinámicos reducen materialmente la exposición al vector de sustitución física estudiado, pero pueden conservar otros vectores de fraude. *(Fuente secundaria: iProfesional, 31/08/2025 — https://www.iprofesional.com/negocios/436086-que-ventajas-tienen-los-pagos-de-facturas-por-qr-que-son-boom-en-argentina)*

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
| **Argentina VQR (transporte)** | Sí | Es QR *consumer-presented* y dinámico (nace en el teléfono del pagador), con firmas ED25519 verificadas por los validadores. El dinamismo reduce el vector de sticker y la firma protege la integridad; no es una mitigación "por dinamismo, no por firma". [Boletín CIMPRA 544 — https://www.bcra.gob.ar/archivos/Pdfs/SistemasFinancierosYdePagos/Boletin-CIMPRA-544.pdf] |

**Veredicto criptografía** (revisado en v3 — el veredicto v2 mezclaba dos mecanismos distintos bajo una sola conclusión):

1. **Firma embebida en el QR, verificada por terceros (billeteras/adquirentes): improbable sin mandato regulatorio.** Ninguna billetera verificará una firma de un tercero sin mandato del BCRA; India lo logró porque NPCI es el único esquema y lo impuso, Argentina tiene ~90 billeteras. Además la firma responde "este QR lo emitió X" — pero el sticker presenta un QR *distinto y perfectamente válido* emitido por la cuenta del delincuente; la firma solo ayuda si el comercio está onboardado con un adquirente firmante, cosa que el resolve ya valida consultando el alias y mostrando el titular.
2. **Registro propio de QRs autorizados, verificado en canal propio (modelo de la tesis Identity Binding): el argumento de incentivos de las billeteras no aplica de la misma forma.** QRSafe puede consultar su propio registro sin exigir que una billetera valide una firma. La propuesta opera fuera del flujo de pago, en el gap de verificación de pertenencia identificado por este research. La unidad de confianza no es el QR aislado sino `Merchant Identity verificada + Physical / Payment Context + Authorized QR + Expected Payment Destination`; lo que el usuario compra no es criptografía sino **la fuente de verdad de ese binding**.
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

1. **Foco de producto**: QR estático físico sin supervisión (estaciones, gastronomía, parking, kioscos). Los QR dinámicos reducen materialmente la exposición al vector de sustitución física que QRSafe estudia; existe evidencia secundaria de implementaciones específicas que reportan fraude muy bajo o nulo, pero eso no permite tratarlos como seguros en forma general.
2. **Núcleo del producto — Identity Binding (según la tesis)**: registro verificable `contexto físico / identidad esperada ↔ QR autorizado ↔ destino de pago esperado`, comparado en canal propio antes del pago. La pregunta del producto es **"¿este QR observado pertenece al comercio y contexto en el que intento pagar?"**, no "¿este QR es seguro?" (validity ≠ authenticity). El contraste semántico del receptor (`collector.name` esperado vs. resuelto) es una posible evolución dentro del flujo de pago: requiere adhesión de billeteras/adquirentes y hereda la debilidad razón social vs. nombre de fantasía (§5.6).
3. **Arquitectura** (sin blockchain, sin PSP, sin cámaras): `Merchant Identity verificada → Contexto de pago → Authorized QR + Expected Payment Destination → Binding → Observed QR → Verification`. La verificación debe distinguir `VERIFIED`, `MISMATCH`, `UNKNOWN`, `EXPIRED/STALE` y `REVOKED`; no puede derivar el contexto esperado solo del QR observado. La criptografía es una capa de ingeniería (fingerprint/hash determinístico y firma del propio registro), no el diferencial de producto. La firma Ed25519 en Unreserved Templates (80–99) queda documentada como opción futura para verificadores dentro del flujo de pago.
4. **Principio de comunicación y responsabilidad**: la app afirma *pertenencia* ("autorizado para Comercio/Contexto X") o *no-pertenencia* ("no registrado como autorizado para Comercio/Contexto X") — nunca que un QR o una cuenta son "seguros" ni que son una estafa. Limitar las respuestas a pertenencia/no-pertenencia reduce la superficie de claims que QRSafe realiza; el efecto concreto sobre responsabilidad legal debe validarse con asesoramiento jurídico (§4.2).
5. **Go-to-market**: vía banderas/asociaciones (AOYPF, FECRA) y adquirentes T3.0, sin ser PSP en la primera etapa (complejidad regulatoria + tope de comisión 0,8%). Modelo B2B2C con el comercio como cliente pagador (incentivo directo: pierde la venta y la confianza). Dentro del research realizado, el espacio aparece desatendido por los players internacionales relevados; esa conclusión debe revisarse periódicamente.
6. **Blockchain**: descartar como núcleo; mantener como anclaje opcional de hashes si aporta a la narrativa comercial, con comunicación honesta (la detección ocurre off-chain).
7. **Mundo cripto**: descartar como extensión de producto. Las wallets ya tienen mecanismos propios (EIP-55/681, simulación pre-firma, blocklists) con incumbentes consolidados; el fraude QR cripto dominante es remoto, no presencial.
8. **Generar el dato**: no hay estadística pública nacional desagregada de fraude por QR sustituido — construirla (con comercio anónimizado) puede ser una ventaja competitiva y de posicionamiento. El registro de verificaciones de QRSafe generaría ese dato como subproducto del modelo.

---

## 7. Hipótesis abiertas y preguntas para Domain Modeling

Estas hipótesis no son hallazgos ni decisiones. Domain Modeling debe preservar su estado abierto y usarlo para destruir ambigüedades de términos, relaciones y estados; discovery posterior debe aportar evidencia antes de convertirlas en decisiones.

### 7.1 HYP-01 — Anchor físico / contexto esperado
> Podemos identificar con suficiente confianza qué comercio y punto de pago espera usar la persona, sin introducir una fricción incompatible con el producto.

¿El contexto se identifica por búsqueda manual, GPS, foto, identificador físico QRSafe o una combinación? Cuanta más fricción agregue, más difícil será la adopción; cuanta menos, más débil será el anchor y más fácil de falsear. El QR observado no puede proveer por sí solo esa respuesta.

### 7.2 HYP-02 — KYC comercial / Merchant Identity
> Podemos verificar la identidad del comercio de forma suficientemente confiable y económica para sostener el binding.

Opciones a investigar: CUIT + padrones públicos, documentación comercial, validación contra adquirente, proceso humano, verificación presencial o combinación. Esta no es una decisión secundaria de onboarding: si una Merchant Identity se puede falsificar, el binding puede ser internamente consistente y externamente falso.

### 7.3 HYP-03 — Adopción del verificador
> Los usuarios realizarán una verificación antes del pago con frecuencia suficiente para que el comercio perciba protección real.

Sin masa crítica de comercios registrados no hay razón para verificar; sin verificadores no hay valor demostrado para el comercio. Mitigaciones a evaluar: señalética física ("QR verificado por QRSafe"), canal WhatsApp (§4.2), verificación pasiva e incentivos del comercio. Métrica guía: porcentaje de pagos reales precedidos por una verificación.

### 7.4 HYP-04 — Willingness to pay B2B
> Los comercios perciben riesgo y valor suficientes como para pagar por mantener un registro verificable de sus puntos de cobro.

El modelo B2B2C presupone que el comercio es el cliente pagador por el daño económico y reputacional del fraude. Esa disposición a pagar aún no fue validada y requiere discovery comercial separado.

### 7.5 HYP-05 — Fingerprint estable y ciclo de vida del binding
> Podemos definir una representación del QR suficientemente estable para identificarlo sin producir falsos `MISMATCH` ante cambios legítimos.

Preguntas: ¿se hashea el TLV crudo o una forma canónica normalizada?, ¿qué sucede si el adquirente re-emite el QR?, ¿cómo se versionan o expiran bindings?, ¿qué metadatos de contexto se guardan para trazabilidad? El ciclo de vida debe soportar `created → active → replaced | revoked | expired`.

### 7.6 HYP-06 — Múltiples puntos de cobro
> El registro puede mantenerse operacionalmente actualizado en empresas con múltiples sucursales, puntos de pago, adquirentes y QRs legítimos.

El modelo no puede asumir `1 comercio = 1 QR`: debe admitir una Merchant Identity con N ubicaciones, N contextos y N Authorized QRs. Debe resolverse si el binding ocurre a nivel comercio, sucursal, mesa/surtidor/terminal, o una combinación.

### 7.7 Estados de verificación y UX
`UNKNOWN`, `MISMATCH`, `EXPIRED/STALE` y `REVOKED` tienen semánticas distintas. Un comercio no registrado no es evidencia de sustitución; un `MISMATCH` solo existe si hay Merchant Identity verificada, contexto esperado y bindings vigentes contra los cuales comparar. Debe definirse qué mensaje, acción y evidencia acompaña cada estado, incluyendo reportar el caso sin acusar fraude.

---

## Limitaciones de esta investigación

- No se encontró estadística primaria argentina que aisle el fraude "sticker sobre QR" (UFECI no lo tipifica; BCRA reporta reclamos agregados).
- No se encontró un caso policial resuelto específicamente de sticker sobre QR en estaciones YPF; los casos documentados de estaciones son fraude interno y adulteración de posnet.
- Los datos de crecimiento de quishing (+150% T1 2026) provienen de prensa que cita fuentes extranjeras no verificables para Argentina.
- No se auditó el interior de la app de ninguna billetera; las afirmaciones sobre "qué no ofrecen" se basan en documentación pública y comunicados.
- Los detalles criptográficos del firmado UPI 2.0 (algoritmo exacto, formato de clave) no son públicos: NPCI restringe sus especificaciones a bancos miembro; se documentó el mecanismo a partir de fuentes oficiales de divulgación.
- El research de players internacionales se basa en documentación pública de los productos (sitios oficiales, stores); el estado de disponibilidad en stores puede variar por región y fecha.
- Cambios de alcance documentados: el monitoreo por cámaras (v1) fue excluido del MVP por decisión de producto (complejidad de providers); el contenido de la v1 sobre videoanalítica fue retirado de este documento. En v3, la tesis de Identity Binding (`tesis-identity-binding-b2b.md`) pasó a ser la fuente de verdad de la propuesta B2B. En v4, `conciliacion-domain-modeling.md` normalizó el modelo con contexto esperado, estados de verificación y ciclo de vida del binding; este research mantiene separados hechos, conclusiones, decisiones e hipótesis.
- Las hipótesis de §7 no fueron investigadas contra fuentes y deben resolverse con experimentos de producto, asesoramiento jurídico o research de seguimiento; no constituyen especificación técnica cerrada.
- Las fuentes raw de los agentes (`research-qrsafe-mercado.md`, `research-qrsafe-blockchain.md`, `research-qrsafe-players.md` y `research-qrsafe-cripto.md`) se guardaron en un directorio temporal fuera del repo y **ya no son recuperables**: el perfil de usuario donde vivían no existe en la máquina actual. El respaldo consultable de este informe son los enlaces citados en línea; **las afirmaciones que no lleven enlace no tienen material de respaldo adicional al que recurrir** — es el caso del dato de quishing "+150% T1 2026" mencionado más arriba en esta misma sección.
