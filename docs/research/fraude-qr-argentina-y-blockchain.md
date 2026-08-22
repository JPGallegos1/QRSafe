# Research: Fraude QR en Argentina y viabilidad de blockchain — QRSafe

> Fecha: 2026-08-22 · Alcance: Argentina · Método: investigación contra fuentes primarias (BCRA/CIMPRA, MPF/UFECI, EMVCo, W3C, NIST, papers académicos) por dos agentes paralelos (mercado y blockchain), sintetizada en este documento. Las afirmaciones que solo aparecen en prensa están marcadas como *fuente secundaria*.

---

## Resumen ejecutivo

1. **El problema existe y está regulado a medias**: la normativa argentina (BCRA/CIMPRA) obliga a billeteras y PSP a mitigar fraude *transaccional*, pero **nadie cubre la integridad física del QR exhibido en el comercio** (la "última pulgada" anti-sticker). El QR de comercio EMVCo no tiene firma criptográfica anti-sustitución; solo el QR de transporte (VQR) la tiene.
2. **No existe estadística pública nacional de fraude por sustitución de QR** (UFECI no lo tipifica; BCRA reporta reclamos agregados). Eso es a la vez un riesgo (mercado difícil de dimensionar) y una oportunidad (QRSafe puede generar el dato).
3. **Espacio competitivo vacío**: no se encontró ninguna empresa argentina dedicada a verificación de QR / anti-tampering de QR de pago. Las billeteras externalizan el problema al comercio ("inspeccioná tu QR a diario").
4. **Blockchain como diferencial central es un buzzword en el contexto argentino**: existe un tercero de confianza online regulado (BCRA + IEP/API resolve que ya se consulta en cada pago), lo que invalida el criterio académico estándar (Wüst & Gervais) para justificar una blockchain. La alternativa honesta y defendible: registro firmado + verificación en el flujo existente, con anclaje opcional estilo OpenTimestamps como plus narrativo.
5. **Recomendación de foco**: el nicho real es el **QR estático físico sin supervisión** (estaciones, gastronomía, parking, kioscos). El canal más viable como primer producto es la **capa de verificación** (no ser PSP), complementada con monitoreo por cámaras con IA como diferencial defensible.

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

- **Estaciones de servicio**: (a) Shell, San Martín (GBA): faltante de **$38 millones** por sustitución física del posnet; **las cámaras del comercio fueron la prueba clave** (4 detenidos). *(Fuente secundaria: eltrece, 10/08/2026 — https://www.eltrecetv.com.ar/arriba-argentinos/2026/08/10/adulteraron-un-posnet-de-una-estacion-de-servicio-y-robaron-38-millones-de-pesos-el-video-de-la-maniobra/)* (b) AXION/Maxfa (San Juan): fraude interno >$200 millones. *(Infocaucete, 24/04/2026 — https://www.infocaucete.com.ar/sanjuan/24/04/2026/escandalo-en-san-juan-detienen-a-empleado-de-estacion-de-servicio-por-estafa-que-superaria-los-200-millones/)* (c) "Tickets mellizos" en Chimbas (>$15M, 8 empleados). *(Diario La Ventana — https://diariolaventana.com.ar/investigan-a-ocho-empleados-de-una-estacion-de-servicio-por-una-millonaria-defraudacion/)* (d) AOYPF documenta "cadenas" de fraudes y contracargos. [https://www.aoypf.org/contracargos-de-la-app-ypf-un-problema-en-vias-de-solucion/]
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

## 3. Paisaje competitivo (Argentina)

### 3.1 Bancos / fintech / procesadores

- **Mercado Pago**: Central de Seguridad (sept. 2025) — monitoreo del lado del pagador (alertas por destinatarios nuevos, bloqueo de dispositivos). **No ofrece** protección de la integridad física del QR del comercio; su documentación para comercios recomienda *manualmente* "inspección casi diaria" del QR y comparar con una foto — externaliza el anti-tampering al comerciante. *(La Nación (arriba); https://www.mercadopago.com.br/blog/golpe-qr-code-falso)*
- **Modo, Cuenta DNI, Ualá, Naranja X, PlusPagos**: QR interoperable y conciliación; contra fraude, reclamos con denuncia policial y bloqueos. *(https://www.defensorba.org.ar/pdfs/protocolo-ciberestafa-2025.pdf; https://www.bancosantafe.com.ar/empresas/cobros-y-pagos/pluspagos-comercios)*
- **Procesadores T3.0** (Pagos360, Bind, Newpay, Prisma/Red Link): documentación técnica del QR estático sin oferta de verificación de integridad física. *(https://ayuda.pagos360.com/desarrolladores/qr-estatico)*
- **Foca Software**: apps de cobro QR dinámico para playeros (+800 estaciones YPF) — software de gestión, no antifraude. *(https://surtidores.com.ar/nueva-app-movil-para-cobros-con-qr-practicos-y-seguros/)*

### 3.2 Startups de verificación QR / anti-quishing

**Hallazgo central: no existe ninguna empresa argentina dedicada específicamente a verificación de QR / anti-tampering de QR de pago.** Las búsquedas devuelven solo adyacentes: acortadores con QR para marketing (https://tw.com.ar/), verificación de identidad genérica (https://aidi.com.ar/empresas/), motores antifraude transaccional e-commerce (https://www.wondersoft.com.ar/). Lo más cercano regional: Depay (QR cross-border, menciona prevención de QRs maliciosos como feature de infraestructura — https://bankmagazine.com.ar/la-tecnologia-detras-del-qr/). **Espacio vacío documentable.**

### 3.3 Video analítica con IA (socios/competidores del monitoreo por cámara)

Netcamara (https://netcamara.com/), Napsys (https://napsys.com.ar/), Vision Studio (https://www.linkedin.com/company/vision-studio-s-a-/), USS (https://uss.com.ar/), IP Security (https://ipsecurity.com.ar/), CreekVision (NVIDIA Inception, https://www.linkedin.com/company/creekia); regionales: KSI Vision (https://ksivision.com/), TechnoAware (https://technoaware.org/), SVA Tech (https://svatech.com.br/). **Ninguno ofrece un módulo de "detección de sustitución de QR de pago"** — son integradores/socios más que competidores.

---

## 4. Oportunidades y viabilidad por canal

### 4.1 Gaps no cubiertos

1. **Integridad física del QR del comercio**: nadie ofrece verificación de que el QR exhibido es el legítimo; el estándar EMVCo de comercio no tiene firma anti-sustitución (solo VQR/transporte la tiene).
2. **Detección temprana**: no existe producto que detecte en tiempo real el cambio de QR (ni por cámara ni por patrón de pagos — caída abrupta de ingresos, discrepancia volumen/ventas).
3. **Canal de verificación para el pagador**: ninguna billetera muestra una señal de "QR verificado por el comercio" independiente del `collector.name` (que el usuario promedio no contrasta).
4. **Estadística específica**: la dimensión real del fraude por QR sustituido es invisible; generarlo es una ventaja defensible.
5. Las recomendaciones oficiales actuales son puramente manuales ("fijarse si hay sticker encima", "inspección diaria").

### 4.2 Viabilidad por canal propuesto

| Canal | Viabilidad | Notas clave |
|---|---|---|
| **App propia (escáner verificador)** | Media-alta | Puede decodificar el string EMVCo y contrastar contra el Registro de PSP del BCRA + API resolve. Barrera: no existe registro público "QR legítimo ↔ comercio" — habría que construirlo. Riesgo de responsabilidad si aprueba un QR fraudulento. |
| **Layer intermedio (PSP/middleware)** | Alta técnica, regulatoriamente delicada | Ser PSP exige registro BCRA, CIMPRA, integración con administrador (COELSA, Red Link, Newpay) y sponsor bancario; el tope de comisión PCT (0,8%) acota el margen. Alternativa liviana: **capa de verificación sobre el QR existente** (firma + check al escanear) sin ser PSP. |
| **Verificación por WhatsApp + IA** | Media | WhatsApp es el canal dominante del fraude (5.509 reportes UFECI 2024): riesgo de confusión con estafa. Sin antecedentes argentinos de bots de verificación de QR; restricciones del Business API para casos financieros. |
| **Monitoreo por cámaras + IA** | Técnica alta | El caso Shell/San Martín demuestra que las cámaras ya son la evidencia clave; el diferencial es detectar **en tiempo real** (alerta al llegar alguien al QR), no semanas después. Barreras: hardware existente, integración con VMS, falsos positivos, costo de procesamiento continuo. |

### 4.3 Riesgos estructurales

- **Asimetría de incentivos**: el fraude de QR estático recae en el comercio/cliente, no en billeteras/adquirentes (la Com. A 8032 protege a los adquirentes de contracargos).
- **Tendencia regulatoria a favor**: la CPF obligatoria y el proyecto de Registro Nacional de Incidentes crean infraestructura de datos con la que QRSafe podría integrarse.
- **Dato adverso a verificar**: Pronto Pago reporta "0% de fraude" en QR dinámico de facturas — el problema se concentra en el **QR estático físico**, exactamente el nicho del producto. *(Fuente secundaria: iProfesional, 31/08/2025 — https://www.iprofesional.com/negocios/436086-que-ventajas-tienen-los-pagos-de-facturas-por-qr-que-son-boom-en-argentina)*

---

## 5. Blockchain: análisis técnico

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

---

## 6. Recomendaciones para QRSafe

1. **Foco de producto**: QR estático físico sin supervisión (estaciones, gastronomía, parking, kioscos). El QR dinámico ya es seguro (Pronto Pago reporta 0% de fraude).
2. **Arquitectura núcleo** (sin blockchain): registro firmado de hashes de QRs legítimos + verificación integrada al flujo existente (IEP/API resolve o app propia), con QRs emitidos firmados (Ed25519/CBOR). Especificación validada académicamente.
3. **Diferencial defensible**: monitoreo en tiempo real por cámaras con IA (detección de aproximación/manipulación del QR) — sin competidor directo, con el caso Shell como evidencia de que las cámaras son la prueba clave. Integrar con VMS locales (Netcamara, USS, IP Security) en vez de competir.
4. **Go-to-market**: vía banderas/asociaciones (AOYPF, FECRA) y adquirentes T3.0, evitando ser PSP propio en una primera etapa (complejidad regulatoria + tope de comisión 0,8%).
5. **Blockchain**: descartar como núcleo; mantener como anclaje opcional de hashes si aporta a la narrativa comercial, con comunicación honesta (la detección ocurre off-chain).
6. **Generar el dato**: no existe estadística nacional de fraude por QR sustituido — construirla (con comercio anónimizado) es una ventaja competitiva y de posicionamiento.

---

## Limitaciones de esta investigación

- No se encontró estadística primaria argentina que aisle el fraude "sticker sobre QR" (UFECI no lo tipifica; BCRA reporta reclamos agregados).
- No se encontró un caso policial resuelto específicamente de sticker sobre QR en estaciones YPF; los casos documentados de estaciones son fraude interno y adulteración de posnet.
- Los datos de crecimiento de quishing (+150% T1 2026) provienen de prensa que cita fuentes extranjeras no verificables para Argentina.
- No se auditó el interior de la app de ninguna billetera; las afirmaciones sobre "qué no ofrecen" se basan en documentación pública y comunicados.
- Fuentes raw completas de los agentes: `C:\Users\prueba\AppData\Local\Temp\opencode\research-qrsafe-mercado.md` y `research-qrsafe-blockchain.md` (temporal, fuera del repo).
