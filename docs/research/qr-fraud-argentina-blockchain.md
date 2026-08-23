# Research: QR Fraud in Argentina, International Players, Cryptography and Blockchain - QRSafe

> Date: 2026-08-22 (v3: B2B reconciliation of Identity Binding) · Scope: Argentina + international landscape · Method: research against primary sources (BCRA/CIMPRA, MPF/UFECI, EMVCo, W3C, NIST, BCB, NPCI, FTC, academic papers) by parallel agents, synthesized in this document. Claims that appear only in the press are marked as *secondary sources*.

---

## Executive Summary

1. **The problem exists and is only partly regulated**: Argentine regulation (BCRA/CIMPRA) requires wallets and PSPs to mitigate *transactional* fraud, but **no one covers the physical integrity of the QR displayed at the merchant** (the anti-sticker "last inch"). The EMVCo merchant QR has no anti-substitution cryptographic signature; only the transit QR (VQR) has one.
2. **There are no public national statistics on QR-substitution fraud** (UFECI does not classify it; BCRA reports aggregated complaints). This is both a risk (the market is difficult to size) and an opportunity (QRSafe can generate the data).
3. **The competitive space is empty in Argentina and internationally**: no Argentine company is dedicated to payment-QR verification. International secure scanners (Kaspersky, Norton, Trend Micro, Bitdefender, "Is This QR Safe?") check **URL reputation** against phishing; **none validates substitution of an EMVCo payment QR or QR-to-merchant binding**. The Argentine attack (a sticker with the scammer's valid EMVCo QR) is invisible to all of them: the fraud is not in the link, but in who receives payment. In addition, the B2C "QR security scanner" category is contracting (Kaspersky QR Scanner discontinued on iOS in 2022 and removed from Google Play in 2024; Norton Snap EOL in 2019; Trend Micro has had no updates since 2023), while the merchant side is covered only by manual advice.
4. **Blockchain as a core differentiator is a buzzword in the Argentine context**: a regulated online trusted third party already exists (BCRA + IEP/API resolve, which is already queried on every payment), invalidating the standard academic criterion (Wust & Gervais). Cryptography also requires a careful distinction (see §5.5): an **embedded QR signature verified by third parties** (wallets/acquirers) is unlikely without a BCRA mandate, but **QRSafe's own registry of authorized QRs verified in its own channel**, the B2B thesis model, does not depend on the cooperation of any wallet and can be deployed today.
5. **Product premise (validity != authenticity)**: a technically valid QR is not necessarily legitimate in the context in which it appears. Sticker fraud presents a *perfectly valid* QR pointing to the attacker's account; the property that no one guarantees today is that **that specific QR was authorized by the business the consumer believes they are paying**. International evidence (BCB/Pix, NPCI/UPI, address-poisoning papers) confirms that the failure point is identity/ownership, not content. However, semantic comparison by name (`collector.name`) has its own weakness (legal name versus trade name; see §5.6), whereas fingerprint binding does not depend on the name.
6. **Extension into crypto is not recommended**. The hypothesis that each wallet has its own security mechanism is substantially validated: EIP-55/EIP-681, pre-signature simulation (Blockaid in MetaMask/Coinbase, US$50M Series B in 2025), and blocklists (Scam Sniffer) already cover the space, and dominant crypto QR fraud is remote (social engineering), not in-person.
7. **Focus recommendation**: the real niche is **unattended physical static QR** (service stations, hospitality, parking, kiosks). The MVP takes the form of **identity binding**: a verifiable registry of `merchant identity <-> authorized QR <-> payment destination`, verified in its own channel (the QRSafe app), which asserts ownership/non-ownership, never QR "security." **The model's main structural risk is verifier adoption** (the extra step of scanning before paying; see §4.3). *(Scope note: AI camera monitoring, evaluated in v1 of this document, was excluded from the MVP because of the complexity of integrating video-analytics providers.)*

---

## 1. Problem Magnitude

### 1.1 How the Fraud Works

- The Argentine payment QR follows the **EMVCo Merchant Presented Mode** standard. **Static** QRs (printable, reusable, identifying the acceptor in fields 26-49) are resolved through the acquirer's "API resolve," which returns the `collector` (name/CUIT/account). The QR is **not cryptographically signed** against physical substitution: whoever controls the printed image controls the destination account. [CIMPRA Bulletin 525 - https://www.bcra.gob.ar/archivos/Pdfs/SistemasFinancierosYdePagos/Boletin-CIMPRA-525.pdf] [CIMPRA Bulletin 530 - https://www.bcra.gob.ar/archivos/Pdfs/SistemasFinancierosYdePagos/Boletin_CIMPRA_530.pdf]
- The only strong cryptographic signature exists in **Viaje con QR (VQR, transit)**: wallets sign with ED25519 and validators verify integrity, TTL, and deny lists. BCRA has already solved this problem for transit, but **not** for merchant QRs. [CIMPRA Bulletin 544 - https://www.bcra.gob.ar/archivos/Pdfs/SistemasFinancierosYdePagos/Boletin-CIMPRA-544.pdf]
- Transfers (PCT) are **"de acreditación inmediata, irrevocables"** ("with immediate, irrevocable settlement") - a condition that makes fraud profitable. [BCRA, Transferencias 3.0 - https://www.bcra.gob.ar/noticias/transferencia-con-qr/]
- Technically, EMV MPM only has CRC-16 (error detection, not forgery detection): the attacker does not alter the legitimate QR, but instead generates a new valid one pointing to their account. [EMV QRCPS spec - https://www.emvco.com/emv-technologies/qr-codes/] [Con Vos en la Web (Ministry of Justice) - https://www.argentina.gob.ar/justicia/convosenlaweb/situaciones/como-me-protejo-al-utilizar-un-codigo-qr]

### 1.2 Documented Methods

1. **Sticker over the original QR**: "los delincuentes pegan un adhesivo con un QR falso sobre el original del local… el dinero termina en manos de un tercero" ("criminals place a sticker with a fake QR over the business's original one... and the money ends up in a third party's hands"). *(Secondary source: El Destape, 2026-05-25 - https://www.eldestapeweb.com/tecnologia/cuidado-codigos-qr-detalle-tenes-fijarte-antes-escanear-local-2026525182154)*
2. **Fake "Mercado Pago"**: a pirated APK sold on Telegram that simulates a payment receipt against the printed QR; it works only against a **printed static QR**, not against a dynamic Point-terminal QR. *(Secondary source: La Capital Rosario - https://www.lacapital.com.ar/suscriptores/las-estafas-la-mercado-pago-trucha-llegaron-rosario-n10146051.html)*
3. **Fake on-screen receipt** (without a pirated app). *(Secondary source: Diario Huarpe, 2025-08-30 - https://www.diariohuarpe.com/nota/alerta-por-estafa-con-mercado-pago-2025829214148)*
4. **QR tampered with by internal staff**: a cashier at Anana nightclub (Mar del Plata) collected payments with her own POS terminal/QR ("millonario" loss, meaning multimillion-peso). *(Secondary source: La Capital MDQ, 2025-06-27 - https://www.lacapitalmdp.com/piden-elevar-a-juicio-la-causa-por-estafas-contra-empleada-de-anana/)*
5. **Fake fines with QR codes on windshields** (Neuquen, San Juan, Pergamino, Salta, La Plata). *(Sources: Municipality of Neuquen, official, 2025-02-20 - https://www.neuquencapital.gov.ar/prensa/la-municipalidad-alerta-por-la-aparicion-de-nuevas-estafas-con-multas-truchas/; Radio D3 - https://radiod3.com/advierten-sobre-una-nueva-modalidad-de-estafa-con-falsos-avisos-de-infraccion-en-autos-estacionados/)*
6. **QRishing/QRLjacking** (WhatsApp session hijacking through a linking QR). *(Secondary source: Bahia Cesar, 2026-08-13 - https://bahiacesar.com/2026/08/13/como-detectar-un-qr-falso-antes-de-que-te-vacien-la-cuenta/)*

### 1.3 Statistics

- **UFECI (MPF)**: 34,468 cybercrime reports in 2024 (+21.1% YoY); "fraude en línea" ("online fraud") = 21,729 (63%). **UFECI does not break out a specific "QR fraud" category**; there are no public national statistics on QR-substitution fraud. [UFECI 2024 annual report - https://www.mpf.gob.ar/ufeci/files/2025/06/UFECI_informe_anual_2024-1.pdf]
- **BCRA (complaints)**: 769,500 average monthly complaints in 2025 (+5%); "operaciones desconocidas posiblemente fraudulentas" ("unrecognized, potentially fraudulent transactions") was the number-one category (~54,000-63,600/month). [2025 User Protection Report - https://www.bcra.gob.ar/publicaciones/informe-sobre-proteccion-a-las-personas-usuarias-de-servicios-financieros-2025/]
- **Channel volume (exposure)**: Dec. 2024: 62.6 million interoperable QR payments (+117.4% YoY) worth ARS 1.0529 trillion; Apr. 2025: 70.4 million (+97% YoY); 76 wallets and 43 registered PCT acceptors. [BCRA Retail Payments Report Dec. 2024 - https://www.bcra.gob.ar/archivos/Pdfs/PublicacionesEstadisticas/informe-mensual-de-pagos-minoristas-dic-2024.pdf; Apr. 2025 - https://www.bcra.gob.ar/publicaciones/informe-de-pagos-minoristas-abril-de-2025/]
- **Mercado Pago**: 80% of its users' complaints are about transfers to accounts at other banks/PSPs. *(Secondary source: La Nacion, 2025-09-11 - https://www.lanacion.com.ar/tecnologia/mercado-pago-presento-una-central-de-seguridad-y-mecanismos-anti-estafa-nid11092025/)*. VP Paula Arregui: after card QR interoperability (Apr. 2024), QR payments from bank wallets have "85 veces más casos de fraude que en nuestro estándar" ("85 times more fraud cases than under our standard"). *(Secondary source: Rafaela Noticias/Infobae, 2024-10-14 - https://rafaelanoticias.com/economia/advertencia-sobre-los-pagos-qr-con-tarjeta-aumentan-los-casos-de-fraude.htm)*
- Quishing growth of "+150% in Q1 2026": *a secondary source citing RedesZone*; no independent verification found.

### 1.4 Current Regulation

| Regulation | What It Establishes | Source |
|---|---|---|
| Com. A 7153 (2020) - Transferencias 3.0 | Creates the IEP and interoperable EMVCo QR; requires fraud-mitigation tools | https://www.bcra.gob.ar/noticias/transferencia-con-qr/ |
| Com. A 7463 (2022) | Anti-fraud responsibilities for each participant, suspicious patterns, complaints | https://www.bcra.gob.ar/archivos/Pdfs/comytexord/A7463.pdf |
| Com. A 7769 (2023) | Full QR interoperability (transfer + card), mandatory registration of acceptors/acquirers/aggregators as PSPs | https://www.bcra.gob.ar/noticias/nuevas-medidas-que-potencian-el-uso-del-qr-interoperable/ |
| Com. A 8032 (2024) | Liability for fraud in QR-initiated card payments: the wallet assumes it unless the acquirer fails | https://www.bcra.gob.ar/archivos/Pdfs/comytexord/A8032.pdf |
| Com. A 8114 (consolidated text) | Anti-fraud measures for wallets (identity verification, enrollment) | https://www.bcra.gob.ar/archivos/Pdfs/comytexord/A8114.pdf |
| Com. A 8298 + B 13117 (Feb. 2026) | Fraud Prevention Center (CPF): mandatory reporting and inquiry for fraud events | https://www.bcra.gob.ar/archivos/Pdfs/comytexord/B13117.pdf |
| Energy Provision NO-2022-118638566 | Requires removal of QR codes from dispensers/columns in classified areas of stations (for fire reasons, not fraud) and their relocation | https://surtidores.com.ar/wp-content/uploads/2022/11/NO-2022-118638566-APN-DNRYCMEC1-2.pdf |

**Key finding**: regulation requires *wallets, PSPs, and administrators* to mitigate transactional fraud, but **there is no obligation concerning the physical security/integrity of the displayed QR**. No one regulates the physical QR "last inch." Bill 4661-D-2025 (National Cyberfraud Incident Registry) is not yet law. [https://www4.hcdn.gob.ar/dependencias/dsecretaria/Periodo2025/PDF2025/TP2025/4661-D-2025.pdf]

### 1.5 Documented Cases by Segment

- **Service stations**: (a) Shell, San Martin (Greater Buenos Aires): **ARS 38 million** missing due to physical POS-terminal substitution (4 arrests). *(Secondary source: eltrece, 2026-08-10 - https://www.eltrecetv.com.ar/arriba-argentinos/2026/08/10/adulteraron-un-posnet-de-una-estacion-de-servicio-y-robaron-38-millones-de-pesos-el-video-de-la-maniobra/)* (b) AXION/Maxfa (San Juan): internal fraud exceeding ARS 200 million. *(Infocaucete, 2026-04-24 - https://www.infocaucete.com.ar/sanjuan/24/04/2026/escandalo-en-san-juan-detienen-a-empleado-de-estacion-de-servicio-por-estafa-que-superaria-los-200-millones/)* (c) "Twin receipts" in Chimbas (>ARS 15M, 8 employees). *(Diario La Ventana - https://diariolaventana.com.ar/investigan-a-ocho-empleados-de-una-estacion-de-servicio-por-una-millonaria-defraudacion/)* (d) AOYPF documents fraud and chargeback "chains." [https://www.aoypf.org/contracargos-de-la-app-ypf-un-problema-en-vias-de-solucion/]
- **Candid finding**: no resolved, large-scale police case was found specifically involving a "sticker over QR at a YPF station." The vector is extensively documented as a generic method, but the best-documented station cases are internal fraud and POS-terminal tampering (both involve physical replacement of the payment device).

---

## 2. Most Exposed Segments (Ranking)

1. **Service stations** - QR at pumps/forecourts 24/7, staff turnover, victims paying from their cars without checking the recipient; Energy regulation relocated QRs to less supervised areas. [Energy Provision (above); https://surtidores.com.ar/se-disparan-los-pagos-digitales-en-las-estaciones-de-servicio-y-cambian-la-logica-del-negocio/]
2. **Hospitality (tables, menus, bars)** - QR stuck to tables within public reach and without supervision. *(Secondary sources: El Destape; Bahia Cesar; Mercado Pago Brasil describes the same vector - https://www.mercadopago.com.br/blog/golpe-qr-code-falso)*
3. **Kiosks, nightclubs, grocery stores, pharmacies** - main targets of fake "Mercado Pago" against printed QRs. *(La Capital Rosario (above))*
4. **Metered parking / parking meters** - fake QR fines replicated in at least 5 provinces; unattended public signage (Blinkay CABA, SEMM Cordoba). *(Municipality of Neuquen (above); https://www.pergaminoverdad.com.ar/archivos/126612; https://www.lanacion.com.ar/buenos-aires/blinkay-por-parquimetros-como-funciona-la-aplicacion-que-controlara-el-estacionamiento-medido-en-la-nid28062022/)*
5. **Mass events (cashless)** - QR/wristbands at venues with heterogeneous audiences. *(Secondary source: https://gbol.com.ar/blog/cashless-2026/)*
6. **Churches/collections** - static QR in public spaces with no control at all. *(Secondary source: https://surtidores.com.ar/en-las-estaciones-de-servicio-las-tarjetas-ahora-deberan-ser-manipuladas-por-los-clientes/)*
7. **Delivery/self-service** - QR codes on shared scooters/e-scooters cited as targets. *(El Destape (above))*

---

## 3. Competitive Landscape (Argentina and International)

### 3.1 Banks / Fintech / Processors

- **Mercado Pago**: Security Center (Sept. 2025) - payer-side monitoring (alerts for new recipients, device blocking). It **does not offer** protection for the physical integrity of the merchant QR; its merchant documentation recommends *manual* "inspección casi diaria" ("near-daily inspection") of the QR and comparison with a photo, externalizing anti-tampering to the merchant. *(La Nacion (above); https://www.mercadopago.com.br/blog/golpe-qr-code-falso)*
- **Modo, Cuenta DNI, Uala, Naranja X, PlusPagos**: interoperable QR and reconciliation; regarding fraud, complaints with police reports and blocks. *(https://www.defensorba.org.ar/pdfs/protocolo-ciberestafa-2025.pdf; https://www.bancosantafe.com.ar/empresas/cobros-y-pagos/pluspagos-comercios)*
- **T3.0 processors** (Pagos360, Bind, Newpay, Prisma/Red Link): technical documentation for static QR without an offering to verify physical integrity. *(https://ayuda.pagos360.com/desarrolladores/qr-estatico)*
- **Foca Software**: dynamic QR payment apps for attendants (+800 YPF stations) - management software, not anti-fraud. *(https://surtidores.com.ar/nueva-app-movil-para-cobros-con-qr-practicos-y-seguros/)*

### 3.2 QR Verification / Anti-Quishing Startups

**Central finding: no Argentine company is dedicated specifically to payment-QR verification / QR anti-tampering.** Searches return only adjacent providers: QR marketing shorteners (https://tw.com.ar/), generic identity verification (https://aidi.com.ar/empresas/), and e-commerce transaction anti-fraud engines (https://www.wondersoft.com.ar/). The closest regional provider is Depay (cross-border QR, mentioning malicious-QR prevention as an infrastructure feature - https://bankmagazine.com.ar/la-tecnologia-detras-del-qr/). **A documentable empty space.**

### 3.3 International QR Verification / Secure-Scanning Players

**Kaspersky QR Scanner** - the best-known scanner:
- What it does: checks every scanned code against Kaspersky URL/link reputation (phishing/malware blocklist). The documentation confirms "checking any links they may contain" - **URL verification, not payment-payload verification**. Ironically, its own blog describes the legitimate-QR sticker-over attack, but its product only checks the resulting link, not whether the payload belongs to the merchant where the code is attached. [Kaspersky blog - https://www.kaspersky.com/blog/kaspersky-qr-scanner-app/7350/] [Kaspersky Support - https://support.kaspersky.com/kaspersky-for-android/237265]
- Model: free B2C app, funnel to the Kaspersky suite.
- **Critical status**: discontinued on iOS (Oct. 2022) and removed from Google Play (Oct. 2024, due to US sanctions that terminated the developer account). [Kaspersky Support EOL - https://support.kaspersky.com/qrscanner-for-ios/1.10/249505] [BackBox - https://news.backbox.org/2024/10/07/kaspersky-apps-are-no-longer-available-on-google-play-what-to-do-kaspersky-official-blog/]
- LatAm coverage: Spanish-language site, but a global, generic product; no features for the Argentine payment-QR ecosystem.

**"Is This QR Safe?"** and the "QR checkers" category:
- ITQS: individual developer (Geoji Paul / Paulosec LLC, US), a personal project explicitly acknowledged as such. It decodes the QR, follows redirects, and checks the destination against 70+ engines via VirusTotal. Free, micro-scale (3 App Store ratings). It does not verify EMVCo payloads or physical binding. [App Store - https://apps.apple.com/us/app/isthisqrsafe/id6737241777]
- Rest of the category (all URL-reputation verification):

| Player | 2025-2026 Status | Verification |
|---|---|---|
| Trend Micro QR Scanner | Last updated Aug. 2023; reported unavailable in Play (2026) | URL safety checks [https://play.google.com/store/apps/details?id=com.trendmicro.qrscan] |
| Norton Snap QR Reader | **Discontinued (EOL 2019)**; Norton has no dedicated QR scanner today | URL reputation [https://community.norton.com/t/end-of-life-announcement-for-norton-snap-qr-code-reader/235043] |
| Bitdefender Scamio | **Active**, free AI chatbot, on-demand QR analysis | Bitdefender threat intelligence [https://www.bitdefender.com/en-us/consumer/scamio] |
| susQR / QR Safe / QR Secure (Spanish) / indie micro-apps | Active, micro-scale | VirusTotal / Safe Browsing [https://susqr.com/] [https://apps.apple.com/us/app/qr-secure-esc%C3%A1ner-qr-seguro/id6475613305] |
| QRTracker Safe Scan / QRLynx | Active, but **generators** with URL hygiene (B2B marketing, not payments) | URL screening for codes they generate [https://qrtracker.io/safe-scan] |

**Anti-quishing startups / merchant side (global):**
- No established (funded) startup dedicated to "QR payment substitution / merchant QR protection" as a commercial product was found. The 2023-2026 quishing boom generated tools, but nearly all are consumer URL checkers or features from large vendors. [https://www.startupdefense.io/blog/quishing-attacks-qr-code-phishing-startups]
- The closest B2B player conceptually: **MSME SecureX (India)** - "AI-powered payment fraud protection for Indian businesses... fake UPI screenshots, QR tampering," UPI-first, WhatsApp integration. Replicating it in Argentina would require a complete rearchitecture for the Transferencias 3.0 ecosystem. [https://www.msmesecurex.com/]
- Academic work without a commercial product: visual detection of fake QRIS (Indonesia) using CNN + EMVCo payload validation reaches 95% accuracy, but the authors acknowledge that they **cannot verify the actual merchant** "due to restricted access to Bank Indonesia's official merchant database" - precisely the problem QRSafe addresses. [ResearchGate - https://www.researchgate.net/publication/364593009]
- **LatAm/Argentina: no dedicated player was found.** The Spanish-language apps are translations of indie URL-checking apps.

**Fit analysis - hypothesis CONFIRMED:**
> "Los escáneres seguros existentes verifican reputación de URLs contra phishing/quishing, PERO ninguno valida la sustitución de un QR de pago EMVCo ni el binding físico QR↔comercio, y por lo tanto no cubren el caso argentino."
>
> English translation: "Existing secure scanners verify URL reputation against phishing/quishing, BUT none validates substitution of an EMVCo payment QR or physical QR-to-merchant binding, and therefore they do not cover the Argentine case."

The key nuance: the sticker attack **does not require a malicious URL**. A scammer's genuine EMVCo QR (with their own legitimately registered CVU/alias) passes all these scanners cleanly; the fraud is in the recipient's identity, not in the link. No international player has a database of Argentine merchants, integration with the local ecosystem (BCRA/CIMPRA), or a merchant business model. Audience difference: all are **B2C consumer** products (the individual must install an extra app and interpret a URL verdict); QRSafe operates **B2B2C** (the merchant registers and verifies its QR; the payer receives validation). No international incumbent will occupy this ground: the category is contracting and the merchant side receives only manual physical-audit advice. [Global Payments Integrated - https://www.globalpaymentsintegrated.com/en-us/blog/2022/03/29/5-ways-isvs-can-help-protect-merchants-against-qr-code-scams]

---

## 4. Opportunities and Viability by Channel

### 4.1 Uncovered Gaps

1. **Identity <-> authorized QR binding**: no public or commercial registry links a legitimate QR to the merchant that authorized it. The EMVCo merchant standard has no anti-substitution signature (only VQR/transit does). This is precisely the gap the Identity Binding thesis turns into a product: the question is not "is this QR safe?" but "is this one of the QRs authorized by the merchant I am trying to pay?"
2. **Early detection**: no product detects a QR change, either by payment pattern (a sharp drop in merchant revenue, volume/sales discrepancy as in the San Juan/Shell cases). Under the thesis's scope, detection is *on demand*: it occurs when a verification exists.
3. **Verification channel for the payer**: no wallet shows a "QR verified by the merchant" signal independent of `collector.name` (which the average user does not compare). Model note: this gap does not require wallet participation to address; the owned channel (QRSafe app) can resolve binding without anyone's cooperation, at the cost of user friction.
4. **Physical identity anchor (open gap, not researched)**: verifying the binding requires resolving *"which business is in front of me?"* - the other half of the physical-to-identity link. Candidate mechanisms (manual search, GPS, storefront photo) were not researched in this document. This is also the same gap documented in the academic literature on the regulator side (QRIS/Indonesia study: "restricted access to official merchant database").
5. **Specific statistics**: the true extent of substituted-QR fraud is invisible; generating it is a defensible advantage.
6. Current official recommendations are entirely manual ("check whether there is a sticker on top," "daily inspection").

### 4.2 Viability by Proposed Channel

| Channel | Viability | Key Notes |
|---|---|---|
| **Owned app (binding verifier) - MVP selected by the thesis** | Medium-high | Decodes the EMVCo string and compares it against QRSafe's registry of authorized QRs (hash/fingerprint + payment-destination metadata). The registry does not exist; building it **is the product**, not an external barrier. It requires no cooperation from wallets or acquirers. Liability risk ("approves a QR that later proves fraudulent") is mitigated by the thesis framing: the app asserts only *ownership* ("authorized by Merchant X") or *non-ownership* ("not registered by Merchant X"), never that the QR or account is "safe"; it does not accuse fraud, it establishes non-ownership. |
| **Intermediate layer (PSP/middleware)** | Technically high, regulatorily delicate - **outside the MVP** | Being a PSP requires BCRA registration, CIMPRA, integration with an administrator (COELSA, Red Link, Newpay), and a bank sponsor; the PCT fee cap (0.8%) constrains margin. The thesis explicitly excludes becoming a wallet/PSP or processing the transaction in v1; it remains a possible evolution through integration with T3.0 acquirers (enriched resolve). |
| **WhatsApp + AI verification** | Medium - candidate to reduce MVP friction | WhatsApp is the dominant fraud channel (5,509 UFECI reports in 2024), creating a risk of scam confusion. There is no Argentine precedent for QR-verification bots; Business API restrictions apply to financial use cases. It could work as an alternative to the app channel (avoiding installation of an extra app), but inherits the problem of entrusting the identity anchor to a dominant fraud channel. |

> **Outside MVP scope**: AI camera monitoring (evaluated in v1 of this document) was discarded for the MVP because of the complexity of integrating multiple video analytics/VMS providers and hardware provisioning. The Shell/San Martin case (ARS 38M, tampered POS terminal) remains documented in §1.5 as evidence of the physical-substitution vector, not as a product use case.

### 4.3 Structural Risks

- **Verifier adoption - the main risk of the selected model**: binding in an owned channel requires the payer to scan with QRSafe *before* paying with their wallet (a voluntary extra step). The adverse evidence already documented in §3.3 applies directly: 73% of users scan without verifying the destination, and the B2C checker category has structurally low adoption because of this extra step. The thesis acknowledges this candidly ("detection occurs when a verification exists"); without verification there is no detection, and without a critical mass of registered merchants there is no reason to verify. This is a two-sided market cold-start problem (registered merchants <-> verifying users). Mitigations to explore: see open question §7.5.
- **Incentive asymmetry**: static-QR fraud falls on the merchant/customer, not wallets/acquirers (Com. A 8032 protects acquirers from chargebacks). This is also an advantage for QRSafe: the merchant is the actor with a direct incentive (it loses the sale and trust) and is the B2B2C payer.
- **Favorable regulatory trend**: the mandatory CPF and the proposed National Incident Registry create data infrastructure with which QRSafe could integrate.
- **Adverse data point to verify**: Pronto Pago reports "0% fraud" in dynamic invoice QR; the problem is concentrated in **physical static QR**, exactly the product's niche. *(Secondary source: iProfesional, 2025-08-31 - https://www.iprofesional.com/negocios/436086-que-ventajas-tienen-los-pagos-de-facturas-por-qr-que-son-boom-en-argentina)*

---

## 5. Blockchain and Cryptography: Technical Analysis

### 5.1 What It Would Provide (Theoretically)

| Model | Mechanism | What It Addresses |
|---|---|---|
| On-chain registry | Hash of the legitimate QR registered on chain | Substitution detection on scan |
| Anchoring | Registry hash periodically anchored in a public chain | Temporal traceability and non-repudiation in disputes |
| W3C Verifiable Credentials | QR as an issuer-signed credential | Issuer authentication + integrity (the spec allows registries without a ledger) |
| Certified NFT/SBT | Token as the merchant's "digital passport" | Immutable identity with auditable history |

Blockchain itself **does not provide substitution detection**; the registry plus verification on scan does that. Its only additions are registry immutability/governance and evidence for disputes. [NIST IR 8202 - https://csrc.nist.gov/pubs/ir/8202/final] [W3C VC Data Model v2.0 - https://www.w3.org/TR/vc-data-model-2.0/] [OpenTimestamps - https://opentimestamps.org/]

### 5.2 Comparison with Simple Alternatives

State of the art **without blockchain** (recent academic literature that solves this exact problem):

- QRs signed with **Ed25519 + CBOR certificates**: full offline verification within a v15 QR; a hybrid variant with Web PKI (`/.well-known/jwks.json`) for real-time revocation. [Jonderko & Wodo, arXiv - https://arxiv.org/html/2607.08383]
- **Self-authenticating QRs (SDMQR)**: embedded EdDSA signature, backward-compatible with existing readers. [Barron & Sharma, IEEE S&P - https://hajim.rochester.edu/ece/sites/gsharma/papers/BarronSDMQRQuashQuishingIEEESnP2025.pdf]
- Systematic review of 50 studies (2010-2024): the dominant countermeasures are cryptography and ML/AI; **blockchain appears marginally**. [https://www.techscience.com/JCS/v7n1/59532/html]

**Argentine context**: the QR contains the acquirer's reverse domain and the scheme administrator's CUIT; the wallet **already queries the API resolve / IEP on every payment**. A signed lookup, "was this hash issued for this merchant?", integrates into the existing flow without blockchain and without changing UX or the EMVCo/CIMPRA standard. [CIMPRA Bulletin 530/535 - URLs above]

| Criterion | Signed Central Registry | Signed QR (Ed25519, off-chain) | Permissioned Blockchain | Public Anchoring (Hybrid) |
|---|---|---|---|---|
| Real-time detection | Yes (lookup in the existing IEP) | Yes (offline signature verification) | Yes, with on-chain latency or off-chain mirror | No (post-hoc evidence) |
| Cost | Low | Low | High (nodes, governance) | Very low (Merkle batching) |
| Latency | = current API resolve | Milliseconds | Seconds-minutes | Hours |
| Dependency | Trust in operator | Issuer key management | Validator consortium | None (Bitcoin) |
| Governance | Regulated (BCRA) | Defined by issuer | Complex | Not required |

### 5.3 Verdict (Wust & Gervais Criterion)

Blockchain is justified only when **multiple writers that do not trust one another** need to modify state **and do not accept an online TTP**. [Wust & Gervais, "Do you need a Blockchain?" - https://eprint.iacr.org/2017/375]

In Argentina **that scenario does not apply**: BCRA regulates the scheme and the IEP already interconnects the parties. Moreover, the dominant problem is **physical binding** (stickers, fake apps); a ledger does not prove that the sticker attached to the table corresponds to the registered hash.

**Future scenarios where it WOULD make sense** (review if they change): (a) a registry written by multiple acquirers that do not trust one another and none accepts BCRA or a competitor operating it; (b) public verifiability as a requirement (proving in legal proceedings that the registry was never edited); (c) a cross-border scenario without a common regulator (LACChain/IDB style - https://publications.iadb.org/en/cross-border-payments-blockchain).

### 5.4 Track Record of Analogous Cases

- **Everledger** (anti-counterfeiting, the emblematic case): collapsed in 2023. [https://www.afr.com/technology/government-and-tencent-backed-aussie-blockchain-firm-collapses-20230503-p5d58l]
- **IBM Food Trust / TradeLens**: discontinued; IBM dismantled its blockchain team. A Capgemini survey found that only 3% of supply-chain blockchain initiatives reached at-scale deployment. [https://www.ibm.com/docs/en/food-trust?topic=overview] [https://www.coindesk.com/business/2021/02/01/ibm-blockchain-is-a-shell-of-its-former-self-after-revenue-misses-job-cuts-sources]
- **Cases that persist** (Arianee/Breitling 500K+ watches, Lululemon+VeChain): single-brand, luxury, high margin, with the brand controlling the entire chain - precisely the scenario in which a signed database would suffice; the value is marketing, not security. [https://www.arianee.com/en/case-studies/breitling] [https://wwd.com/sourcing-journal/industry-news/tech-tactics-lululemon-vechain-crack-down-on-counterfeits-1238858630/] In addition, a Veridise audit found critical vulnerabilities in Arianee's ZK circuits. [https://veridise.com/wp-content/uploads/2024/11/VAR_Arianee_Circuits-Final.pdf]
- **Petro (Venezuela)**: illusory as a precedent. [https://www.reuters.com/article/business/special-report-in-venezuela-new-cryptocurrency-is-nowhere-to-be-found-idUSKCN1LF18F]

**Conclusion**: blockchain as QRSafe's core differentiator is currently a buzzword in the Argentine context. Real security comes from issuer signing plus verification in the existing payment flow, at lower cost, latency, and complexity. **Defensible hybrid** (if the commercial narrative is valued): OpenTimestamps-style anchoring of the registry's Merkle root in Bitcoin - marginal cost near zero, immutable proof verifiable even if QRSafe disappears; useful only for evidence in disputes and non-repudiation, never for real-time detection (which remains 100% off-chain).

### 5.5 Cryptography Without Blockchain - Deep Verification

**Compatibility with EMVCo MPM without modifying the standard: a signature DOES fit.**
- EMV MPM is a plain TLV payload (tags 00-63, where 26-51 are Merchant Account Information templates with the acquirer's reverse domain, and tag 63 = CRC-16, which provides only capture integrity, not source authenticity). The spec defines **Unreserved Templates (IDs 80-99)** with "context specific" content outside EMVCo's scope: this is the designed gap for proprietary extensions. An Ed25519 signature is 64 bytes (~86 base64 characters), within the limit of 99 per value. Wallets that do not recognize the GUID simply ignore the tag (standard TLV parser behavior), so **adding it does not break compatibility**. [EMV MPM spec v1.1 - https://mvallim.github.io/emv-qrcode/docs/EMVCo-Merchant-Presented-QR-Specification-v1.1.pdf]
- **But the problem is incentives, not technology**: having someone *verify* the signature requires wallets to incorporate the key and logic, something none will do without a BCRA mandate or their own benefit. A signature in a tag ignored by the reader provides **zero** security.

**Who would sign? Trust models:**
1. **The acquirer** (Mercado Pago, Pagos360...): the only model with a real anchor; it has already KYC'd the merchant, is already accountable to BCRA, and already issues the QR. This is the India UPI 2.0 model (since 2018): verified merchant QRs with a digital signature and a "verified merchant" indicator in the payer app. [BHIM/NPCI UPI 2.0 - https://www.bhimupi.org.in/upi2]
2. **A third party (QRSafe) registered with BCRA**: technically possible, commercially unlikely; it would require the ~90 interoperable wallets to incorporate QRSafe's public key without adding anything the acquirer cannot sign itself.
3. **The merchant itself**: not viable at scale (key management by retailers is not realistic).

**Key distribution and deployment precedents:**

| Case | Signed QR? | Scale / Effect |
|---|---|---|
| **EU Digital COVID Certificate** | Yes (CBOR+COSE, ECDSA) | Massive multi-country deployment, **offline** verification on device, national trust lists + EU gateway - the strongest technical precedent [https://www.consilium.europa.eu/en/policies/coronavirus-pandemic/eu-digital-covid-certificate/] |
| **India UPI 2.0** | Yes (verified merchants, since 2018) | "Verified merchant" indicator; verification occurs in the acquirer's backend, not the consumer app [https://www.bhimupi.org.in/upi2] |
| **Brazil Pix (static QR)** | **No** | Faced with swapped-QR fraud, BCB responded with **reversibility (MED)** and campaigns to verify the recipient's name, not signatures [https://www.bcb.gov.br/estabilidadefinanceira/pix-seguranca] |
| **Argentina VQR (transit)** | Not applicable | Dynamic consumer-presented QR (originates in the payer's phone): mitigated by *dynamism*, not signature [BCRA Com. 8206/2025] |

**Cryptography verdict** (revised in v3; the v2 verdict conflated two distinct mechanisms under a single conclusion):

1. **Embedded QR signature, verified by third parties (wallets/acquirers): unlikely without a regulatory mandate.** No wallet will verify a third-party signature without a BCRA mandate; India achieved this because NPCI is the single scheme and imposed it, whereas Argentina has ~90 wallets. Furthermore, the signature answers "this QR was issued by X," but the sticker presents a *different, perfectly valid* QR issued for the criminal's account; the signature helps only if the merchant is onboarded with a signing acquirer, which resolve already validates by querying the alias and showing the account holder.
2. **Owned registry of authorized QRs, verified in its own channel (Identity Binding thesis model): the incentives argument does NOT apply.** QRSafe does not need any wallet to verify anything; its app queries its own registry. It can be deployed today, without a regulatory mandate or third-party cooperation, because verification occurs outside the payment flow, exactly where no one acts today. The unit of trust is not the isolated QR but `verified merchant + authorized QR + expected destination`; what the user buys is not cryptography but **the source of truth for that binding**.
3. Brazil, with the same problem and greater scale, chose reversibility + name verification *within* the flow (BCB can impose it on banks); the owned registry operates *outside* the flow, so the mitigations are complementary, not exclusive.
4. **Residual contribution of cryptography in the thesis model**: deterministic, comparable payload fingerprint/hash; QRSafe signature of the registry (integrity of the registry itself against internal tampering); and potential EU DCC-style offline verification. It is a product-engineering layer, not the differentiator: the differentiator is the existence and reliability of the binding's source of truth.

### 5.6 Crypto World and QR - Attacks, Players and Future Extension

**Documented QR attacks in crypto:**
- **Address poisoning**: in 2024, Chainalysis identified ~82,000 spoof addresses that poisoned histories; 2,774 victims transferred US$69.7M (largest case: US$68M in WBTC, May 2024). A 2025 academic paper detected **270 million attempts**, 13 times more than prior estimates, with lookalike addresses generated even with GPUs. [Chainalysis - https://www.chainalysis.com/blog/address-poisoning-scam/] [arXiv:2501.16681 - https://www.emergentmind.com/papers/2501.16681]
- **Crypto ATMs**: FBI IC3 recorded 10,956 complaints with US$246.7M lost in 2024 (~US$333M in 2025); the typical vector is social engineering (call + QR sent by SMS). There are also fake stickers over legitimate ATMs and firmware CVEs (Lamassu CVE-2024-0674). [FTC - https://www.ftc.gov/news-events/data-visualizations/data-spotlight/2024/09/bitcoin-atms-payment-portal-scammers] [DFPI - https://dfpi.ca.gov/consumers/crypto/crypto-atm-scams/]
- **Wallet drainers** (dominant vector): US$494M lost in 2024; losses fell 83% to US$83.85M in 2025, attributed to wallet-integrated defenses. [Scam Sniffer - https://drops.scamsniffer.io/scam-sniffer-2025-crypto-phishing-losses-fall-83-to-84-million/]

**QR/address security players in crypto (mature ecosystem):** Blockaid (pre-signature simulation integrated in MetaMask and Coinbase Wallet, US$50M Series B in 2025), Scam Sniffer (blocklists of 258K+ domains/addresses, consulted by Binance, Phantom, Chainalysis), Wallet Guard, Pocket Universe, and native Binance anti-poisoning alerts ("Antidote").

**Founder hypothesis: "each crypto wallet has its own security mechanism, so it makes no sense to enter that world" - VERDICT: substantially VALID, with nuances.**
- In favor: the mechanisms exist and are standard (EIP-55 checksum, EIP-681 QR payment requests, integrated pre-signature simulation); the market has already solved this with established, funded incumbents integrated into leading wallets. [EIP-681 - https://eips.ethereum.org/EIPS/eip-681]
- Key nuance: these mechanisms protect against errors and signature phishing, but **NOT against recipient identity confusion** (address poisoning), which is structurally identical to sticker fraud: the user believes they know whom they are paying but does not compare the real identity.
- **Transferable crypto -> fiat lesson**: the emerging mitigation against address poisoning is to verify by **name/alias rather than address** (ENS, human-readable names), because addresses are opaque to humans. This is exactly the problem with Argentina's EMVCo `collector.name`: it exists and is displayed, but the average user does not compare it. The effective mitigation in both worlds is **forcing semantic identity comparison**, not more cryptography. [arXiv:2501.16681]
- **Limit of semantic comparison that binding avoids (v3)**: `collector.name` is often a legal name that does not match the merchant's trade name (the sign says "La Esquina," the collector says "GONZALEZ JUAN CARLOS SA") - name comparison structurally fails across that gap, and is also exploitable (an attacker can register a legal name similar to the victim's trade name). The thesis's fingerprint binding does not depend on the name: it verifies *ownership declared by the merchant*, not textual similarity. In practice, both mechanisms complement one another: binding answers "was this authorized by this merchant?" and the trade name registered in QRSafe (not the collector's legal name) answers "is this the merchant I think it is?"

**Future QRSafe -> crypto extension: NOT recommended as a roadmap.**
1. Wallet-closed world: effective verification occurs *within* wallets or exchanges, with established incumbents (Blockaid, Scam Sniffer) that already have APIs and distribution.
2. Dominant crypto QR fraud is not in-person: address poisoning, drainers, and BTM social engineering are remote vectors (SMS/call + QR sent to the victim); QRSafe addresses the in-person scenario (sticker over a legitimate QR), which is marginal in crypto.
3. Potential exception (physical BTMs with stickers): it replicates sticker-fraud logic, but the volume (US$246-333M/year in the US) does not justify building for Argentina, where crypto-ATM penetration is minimal.
4. No evidence was found of a specific, uncovered gap in end-user crypto QR verification.

---

## 6. Recommendations for QRSafe

> These recommendations reflect the B2B reconciliation of Identity Binding current at the close of v3.

1. **Product focus**: unattended physical static QR (service stations, hospitality, parking, kiosks). Dynamic QR is already secure (Pronto Pago reports 0% fraud).
2. **Product core - identity binding (per the thesis)**: a verifiable registry of `merchant identity <-> authorized QR <-> payment destination`, verified in its own channel before payment. The product question is **"is this one of the QRs authorized by the merchant I intend to pay?"**, not "is this QR safe?" (validity != authenticity). Semantic recipient comparison (`collector.name` expected versus resolved) becomes a **long-term evolution within the payment flow**; it requires wallet/acquirer participation (enriched resolve) and inherits the legal-name versus trade-name weakness (§5.6). Fingerprint binding is the mitigation deployable today, without anyone's cooperation.
3. **Architecture** (without blockchain, PSP, or cameras): `verified merchant -> registers QR -> QRSafe creates binding (fingerprint/hash + destination metadata) -> consumer verifies -> verified / mismatch`. Cryptography is an engineering layer (deterministic payload hashing, signature of the registry itself), not the product differentiator. The Ed25519 signature in Unreserved Templates (80-99) remains documented as a future option for when there are verifiers in the payment flow.
4. **Communication and liability principle**: the app asserts *ownership* ("authorized by Merchant X") or *non-ownership* ("not registered by Merchant X") and never that a QR or account is "safe." It does not accuse fraud or validate recipients; it establishes non-ownership against what the merchant declared as its own. This framing mitigates the legal risk of "approving" a QR that later proves fraudulent (§4.2).
5. **Go-to-market**: through brands/associations (AOYPF, FECRA) and T3.0 acquirers, without becoming a PSP in the first stage (regulatory complexity + 0.8% fee cap). B2B2C model with the merchant as the paying customer (direct incentive: it loses the sale and trust); no international incumbent (all are contracting B2C URL checkers) will occupy this ground.
6. **Blockchain**: discard it as the core; retain it as optional hash anchoring if it supports the commercial narrative, with honest communication (detection occurs off-chain).
7. **Crypto world**: discard it as a product extension. Wallets already have their own mechanisms (EIP-55/681, pre-signature simulation, blocklists) with established incumbents; dominant crypto QR fraud is remote, not in-person.
8. **Generate the data**: no national statistic on substituted-QR fraud exists; building it (with anonymized merchants) is a competitive and positioning advantage. QRSafe's record of verifications generates that data as a byproduct of the model.

---

## 7. Open Questions (for Discussion / Future Research)

These arise from reconciliation with the thesis; none blocks the product decision, but all must be resolved before or during MVP design.

### 7.1 Physical Identity Anchor - How Does the App Know Which Merchant Is in Front of It?

Binding verifies "was this QR authorized by merchant X?", but the verifier needs to resolve X first. Unevaluated candidate mechanisms: manual user search (name/geolocation), GPS + radius, storefront photo, the merchant's own code on signage, or implicit verification by context (the merchant displays a QRSafe identifier next to the QR). This is the other half of the `physical world -> identity` link and was not researched in this document. Critical design decision: the more friction it adds, the worse the adoption problem (§7.5); the less it adds, the weaker the anchor (and the easier it is to forge).

### 7.2 Fingerprint Stability - What Is Hashed and What Happens When the QR Changes?

- If the acquirer reissues the static QR (account change, re-enrollment, new scheme), the fingerprint no longer matches -> false mismatch. What re-registration policy, binding expiration, or merchant notification applies?
- Is the raw TLV string hashed, or a normalized canonical form (without volatile fields)? The raw string is simpler but more fragile; normalization requires defining which fields are stable.
- Is a visual reference also registered (position in signage), or only the payload? Sticker fraud changes the payload; the payload is enough to detect it, but contextual metadata can help in disputes.

### 7.3 Multiple Legitimate QRs per Merchant - Registry Data Model

A real merchant has several legitimate QRs simultaneously (table, booth, bar, branch, QR from another acquirer as fallback). The registry is N QRs : 1 identity. Questions: does the merchant register all of them? How are they presented to the verifier? Does the verifier validate against the merchant or against the physical point (table 4 at branch Y)? This directly affects §7.1.

### 7.4 Merchant Onboarding KYC - What Verifies the Identity?

The thesis requires "a verifiable identity" for the merchant but does not define the mechanism. Options: CUIT + public registries (AFIP, gross-income tax), human document verification, validation through the acquirer (if the QR matches an already onboarded merchant), or in-person verification. This is the binding's most critical link: if merchant identity can be forged, the whole model collapses (an attacker could register "their" merchant with the victim's name). It has not been researched and is a candidate for follow-up research.

### 7.5 Verifier Adoption and Two-Sided Market Cold Start

Without a critical mass of registered merchants, there is no reason to verify; without verifiers, there is no demonstrable value for the merchant. Mitigations to evaluate: physical in-store signage ("QR verified by QRSafe" - turns the merchant into a verifier-acquisition channel), passive verification, WhatsApp channel (§4.2), and merchant incentives for the payer. Guiding metric to define: percentage of real payments preceded by a verification.

### 7.6 Mismatch UX and the "Merchant Not Registered" Case

An unregistered QR has two very different causes: (a) the merchant is not in QRSafe (a harmless false negative, the majority of cases at the start), or (b) the QR was substituted (the case that matters). How is the difference communicated without creating alarmism or trivializing risk? Is the user offered an action (notify the merchant, report it)? The design of this flow determines the product's credibility.

---

## Research Limitations

- No Argentine primary statistic isolating "sticker over QR" fraud was found (UFECI does not classify it; BCRA reports aggregate complaints).
- No resolved police case specifically involving a sticker over QR at YPF stations was found; documented station cases involve internal fraud and POS-terminal tampering.
- Quishing growth data (+150% in Q1 2026) comes from press citing foreign sources that cannot be verified for Argentina.
- The internal app of any wallet was not audited; claims about "what they do not offer" are based on public documentation and announcements.
- Cryptographic details of UPI 2.0 signing (exact algorithm, key format) are not public: NPCI restricts its specifications to member banks; the mechanism was documented from official public-facing sources.
- Research on international players is based on public product documentation (official sites, stores); availability status in stores can vary by region and date.
- Documented scope changes: camera monitoring (v1) was excluded from the MVP by product decision (provider complexity); v1 video-analytics content was removed from this document. In v3, B2B reconciliation of Identity Binding corrected the identified discrepancies, principally the §5.5 verdict (third-party-verified signature versus owned registry) and the §6 core recommendation.
- The questions in §7 are design/open questions, not findings: they were not researched against sources and must be resolved through product experiments or follow-up research.
- The agents' raw sources (`research-qrsafe-mercado.md`, `research-qrsafe-blockchain.md`, `research-qrsafe-players.md`, and `research-qrsafe-cripto.md`) were saved in a temporary directory outside the repository and **are no longer recoverable**: the user profile where they resided does not exist on the current machine. The accessible support for this report is the inline cited links; **claims without a link have no additional supporting material to consult**. This is the case for the "+150% in Q1 2026" quishing data mentioned above in this same section.
