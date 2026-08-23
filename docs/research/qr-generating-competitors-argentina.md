# Competitors That Already Generate Their Own QR Codes — Argentina

> Date: 2026-08-22 · Scope: Argentina, 2023-2026 · Method: research against primary sources (official municipal and provincial sites, ordinances, tender specifications and awards, the Official Gazette, InfoLEG, SENASA and Secretariat of Industry and Commerce regulations, product sites for wallets and providers, and official museum sites). Each claim carries a source labeled **[PRIMARY]** or **[SECONDARY]**. Secondary sources are used only as leads, never as the sole evidence for a structural claim. Data gaps are stated inline and in the limitations section.

This report supplements [`qr-fraud-argentina-blockchain.md`](./qr-fraud-argentina-blockchain.md), which covers fraud patterns, BCRA/CIMPRA regulation, and blockchain analysis. It answers a different, narrower question: **who currently issues QR codes into Argentina’s physical world, and which issuers can build integrity verification without QRSafe?**

---

## Executive Summary

1. **Of all actors currently issuing physical QR codes in Argentina, exactly one has built any integrity verification: SENASA. And it is naive.** Its mechanism asks consumers to check the URL prefix. No other relevant issuer, including the country’s largest wallet, documents any such mechanism.

2. **The country’s most exposed issuer is a municipality, not a merchant.** The Municipalidad de Córdoba enabled metered-parking payment “mediante códigos QR instalados en **casi 600 carteles georreferenciados** distribuidos en la vía pública” [English: “using QR codes installed on **nearly 600 georeferenced signs** distributed throughout public spaces”]. [PRIMARY] https://cordoba.gob.ar/estacionamiento-exenciones-bonificaciones/

3. **Mercado Pago is not merely a payment rail: it is a physical QR-code factory.** Its Kit QR Oficial sends “1 código QR autoadhesivo” [English: “1 self-adhesive QR code”] to the merchant: “no necesitás imprimir tu QR” [English: “you do not need to print your QR code”]. It controls generation, printing, distribution, and the backend. It is the only actor on the map that can close off the entire category from one release to the next.

4. **Cuenta DNI Comercios also issues QR codes**, with printable static QR codes and no verification. **The question “does it already generate its QR code?” organizes the market better than “is it a competitor?”** An issuer has shown that the use case matters to it and that its workflow is in place. The distinction between competitor and customer is not whether it issues codes, but **whether it controls the full lifecycle and has the means to sign them**.

5. **Possible regulatory asymmetry: HYPOTHESIS, not verified.** SENASA requires the QR code to point to a State domain (this is a fact). For the Marcado de Conformidad, no authenticity requirement or definition of where to host the documentation **was found** in the accessible text of the regulations, but **the technical annexes could not be consulted** (see §3.2). It would be the report’s strongest regulatory argument **if confirmed**; until then, it must not be presented as fact in commercial materials.

6. **Actors that do not yet issue codes are the medium-term risk.** Blinkay, the UTE SAEM-IT NET, and Sonda do not currently expose QR codes, but they hold concessions or are involved in ongoing 6-to-10-year tenders. Rosario and Paraná are being decided **now**.

---

## 1. Criterion: What Counts as “Already Generates Its QR Code”

An actor **already generates its QR code** when it verifiably produces QR codes today that end up exposed in the physical world under its responsibility or brand. The following do not count:

- Consuming someone else’s QR code (a wallet that scans a merchant’s QR code).
- Having the capacity to issue codes but not yet doing so (a newly awarded concessionaire).
- Receiving a third party’s QR code without control over its generation.

Two layers are distinguished and **must not** be conflated:

| Layer | Role | Example |
|---|---|---|
| **Layer 1: Deployer** | Exposes the QR code to the public and is accountable for it | Municipalidad de Córdoba, the museum, the winery |
| **Layer 2: Provider** | Generates the QR code and/or sells the system | SENASA, Mercado Pago, Blinkay |

The same actor can occupy both layers at once. Those are the dangerous cases: **they need no one else.**

---

## 2. Actors That Already Generate Payment QR Codes

### 2.1 Mercado Pago: The Only Rail That Manufactures the Physical Object

| | |
|---|---|
| **What it issues** | **Kit QR Oficial**: “1 código QR autoadhesivo con el instructivo para asociarlo a tu cuenta” [English: “1 self-adhesive QR code with instructions for associating it with your account”] + plastic stand + stickers + sign. It is shipped physically: “no necesitás imprimir tu QR” [English: “you do not need to print your QR code”]. Also offers dynamic QR codes through the app and Point device. |
| **Type** | Static (kit) and dynamic (app/Point) |
| **Verification today** | **No.** Neither the Kit page nor the “Cobrar con QR” page mentions integrity verification or the risk of substitution of an exposed QR code. |
| **Source** | [PRIMARY] https://www.mercadopago.com.ar/herramientas-para-vender/cobrar-con-qr/kit-oficial · https://www.mercadopago.com.ar/herramientas-para-vender/cobrar-con-qr |

It controls all four stages: generation, printing, distribution, and backend operation. Combined with its Central de Seguridad (see prior report §3.1), this is **maximum capability**. What it currently lacks is incentive: the cost of anti-tampering is externalized to the merchant.

> **HYPOTHESIS (not a documented fact):** the incentive asymmetry explains this absence: rails profit from transaction volume, while the cost of substitution falls on merchants and payers. No document confirming this motivation was found.

### 2.2 Cuenta DNI Comercios: Issues Its Own Printable Static QR Code

**Correction to the first version of this report:** it had concluded, based on the FAQ for **individuals**, that Cuenta DNI did not issue QR codes. That was incorrect: the merchant product does issue them.

- **The QR code belongs to the merchant:** “El QR es un código único vinculado a Cuenta DNI Comercios que te permite recibir pagos” [English: “The QR is a unique code linked to Cuenta DNI Comercios that lets you receive payments”]. [PRIMARY] https://www.bancoprovincia.com.ar/cuentadni/contenidos/cdniComerciosFaq/
- **There is a static, non-expiring QR code intended for display:** “Este QR no tiene vencimiento y te va a servir para cobrar todas las veces que quieras” [English: “This QR code does not expire and will let you collect payments as many times as you want”], with the instruction **“Imprimilo para ponerlo visible donde quieras”** [English: “Print it and display it wherever you want”]. [PRIMARY, same source]
- **And a dynamic QR code with the amount:** “Ingresá el importe y presioná 'Generar QR', el código tendrá una validez de 10 minutos” [English: “Enter the amount and press ‘Generate QR’; the code will be valid for 10 minutes”]. [PRIMARY, same source]
- **Integrity verification today:** **none**. The product documentation does not mention tampering, substitution of the printed code, or authenticity validation. [PRIMARY, same source]

**Difference from Mercado Pago:** Mercado Pago manufactures and **prints** the sticker, then sends it to the merchant; Cuenta DNI generates the code and tells the merchant to print it. Both issue codes; only the former controls the physical medium.

### 2.3 MODO: Does Not Issue Codes

Confirmed through documentation for the **merchant side**, not the user guide: **“El QR lo emite tu adquirente desde tu terminal. MODO es la solución que tu cliente usa para pagarlo desde su app bancaria.”** [English: “Your acquirer issues the QR code from your terminal. MODO is the solution your customer uses to pay it from their banking app.”] [PRIMARY] https://www.modo.com.ar/blog/como-aceptar-pagos-con-qr-con-modo-en-tu-comercio

The QR code comes from the acquirer (Payway, Posnet, Clover, Getnet, Nave), not MODO. On the payer side, its guide “Cómo pagar con QR paso a paso” [English: “How to pay with QR step by step”] recommends checking **the amount**, not the recipient, and does not address QR tampering. [PRIMARY] https://www.modo.com.ar/blog/como-pagar-con-qr-en-argentina-paso-a-paso

**Classification:** it is not an issuance competitor. It is a potential channel on the scanning side. **It also shifts the question:** in the MODO flow, the actual issuer is the acquirer, which this report did not map (see Limitations).

### 2.4 Municipalities That Already Issue Street QR Codes

| Deployer | What it issues | Provider (Layer 2) | Verification | Source |
|---|---|---|---|---|
| **Municipalidad de Córdoba** | ~600 georeferenced signs with metered-parking QR codes in public spaces | SEMM app: developer **not confirmed**; payment gateway **not confirmed** | No | [PRIMARY] https://cordoba.gob.ar/estacionamiento-exenciones-bonificaciones/ |
| **Municipalidad de Gualeguaychú** | QR codes on street-name signs, monuments, and points of interest | **In-house:** Dir. de Informática y Nuevas Tecnologías (Ord. 12611/2022) | No | [PRIMARY] Ord. 12611/2022 |
| **GCBA - DGPeIH** | 42 QR codes on historic-site facades | In-house | No | [PRIMARY] |
| **Municipalidad de Corrientes** | QR codes at tourist sites, buildings, and monuments → visitcorrientes.tur.ar | “El sector privado” [English: “The private sector”] (**provider not named**) | No | [PRIMARY, deployment] |

> **On Córdoba:** the source does not state whether the QR codes are static or dynamic; because they are printed on fixed signage, they are static in the relevant sense (**INFERENCE**, not source data). They are on posts in the street, unsupervised, 24/7, replicated ~600 times with uniform visual identity. An attacker with a convincing printing plate can scale across the entire city. This is the same municipality that has already publicly warned about fake fines using QR codes.

### 2.5 Revenue Authorities: Dynamic QR Codes on Bills

| Deployer | What it issues | Type | Verification | Risk |
|---|---|---|---|---|
| **GCBA (revenue collection)** | Interoperable QR code on Boletas Únicas Inteligentes | Dynamic | No | Low: a dynamic QR code cannot be substituted in the same way |
| **API Santa Fe** | QR code on digital bill / debt statement | Dynamic | No | Low |

They do issue codes, but dynamic QR codes greatly reduce the attack surface. **Low commercial priority**, even where technical capability exists.

### 2.6 Out of Scope: Public Transport

For buses and the subway, **the passenger presents** the QR code to the validator reader. There is no substitutable physical QR code, and the VQR scheme is already signed with Ed25519 (see prior report). **Zero attack surface, zero market.** Exclude.

---

## 3. Actors That Already Generate Exploration and Product QR Codes

### 3.1 SENASA: The Country’s Only Issuer With Built-In Verification

This is the central finding of Scenario B.

- **What it is:** a QR-code generation service for “los más de 150 mil productos registrados” [English: “more than 150,000 registered products”] under its jurisdiction, so consumers can check a product’s official status. Launched on **2024-02-21**. [PRIMARY] https://www.argentina.gob.ar/noticias/el-senasa-lanza-codigo-qr-para-productos-inscriptos-en-sus-registros-y-hace-historia-en
- **It is voluntary and free:** “cien por ciento gratuito y por autogestión” [English: “100 percent free and self-service”], “adhesión es voluntaria” [English: “participation is voluntary”]. [PRIMARY, same source]
- **Physical requirement:** the QR code “debe consignarse en forma impresa como parte del rótulo o etiqueta” [English: “must be printed as part of the label or tag”], on the external labeling. [PRIMARY] https://www.argentina.gob.ar/senasa/generacion-del-qr-senasa-para-titulares-de-productos-registrados
- **Its chosen verification mechanism:** tell consumers to check the URL. “La url del producto deberá comenzar en todos los casos de la siguiente manera: `https://aps2.senasa.gov.ar/`” [English: “In all cases, the product URL must begin as follows: `https://aps2.senasa.gov.ar/`”]. [PRIMARY] https://www.argentina.gob.ar/noticias/el-senasa-lanza-codigo-qr-para-productos-inscriptos-en-sus-registros-y-hace-historia-en *(the quotation appears in the launch notice, NOT on the QR-generation page cited above)*

> **ANALYSIS (technical hypothesis, not a documented fact):** this check is the definition of naive verification. It depends on users reading the domain in a URL rendered by their phone’s QR reader and does not protect against homographs, deceptive subdomains, or redirects. But it is an **enormous institutional precedent**: the Argentine State has already publicly accepted that a product QR code needs to be verifiable by the consumer.

**Second deployment, mandatory:** **Res. SENASA 1219/2024** (Official Gazette, 2024-10-14) requires Centros de Tratamiento Cuarentenario to affix a QR Traceability Label “en al menos una cara visible de cada envase” [English: “on at least one visible side of each package”]. It is issued through the **SIGPV-SUFP** system, meaning **the State generates the label**. It applies to sweet citrus, peppers, grapes, and avocados. [PRIMARY] https://www.boletinoficial.gob.ar/detalleAviso/primera/315483/20241014

### 3.2 Manufacturers Subject to Marcado de Conformidad: Mandatory Issuance, Zero Authenticity

**Res. 237/2024** approves the Marco General de Evaluación de la Conformidad and provides that Marcado de Conformidad “consiste en un sello de conformidad y un código de respuesta rápida (QR) mediante el cual se debe acceder a los documentos” [English: “consists of a conformity mark and a quick-response code (QR) through which the documents must be accessed”]: the Declaración Jurada de Conformidad and Certificación de Producto. It must be placed in a visible location on the product or its primary packaging “que permita a usuarios y consumidores la lectura del QR” [English: “that allows users and consumers to read the QR code”]. [PRIMARY] https://www.boletinoficial.gob.ar/detalleAviso/primera/313097/20240830 · https://www.argentina.gob.ar/normativa/nacional/resoluci%C3%B3n-237-2024-403547/texto

**Res. 26/2025** extended enforceability until October 1, 2025. [PRIMARY] https://www.boletinoficial.gob.ar/detalleAviso/primera/321824/20250225

> **DECLARED GAP, not a verified fact:** no requirement for an authenticity mechanism, digital signature, or QR integrity verification, nor a definition of where documentation must be hosted, **was found** in the published text of either regulation. However, the technical annexes (for example, “Anexo V - IF-2025-05199516-APN-DNRT#MEC”) **are not readable in the Official Gazette’s web version and could not be consulted**. Therefore, “the regulation does not require authenticity” is an **absence of evidence in the accessible text**, not a positive verification. The annexes must be read before this point is used as a commercial argument.

This is a universe of issuers growing **by regulatory mandate** (this is a fact: the obligation has been enforceable since October 1, 2025). **HYPOTHESIS to confirm by reading the annexes:** the QR code may point to a private domain without a trust anchor and with no authenticity requirement. If confirmed, a third party who counterfeits the QR code could lead a consumer to a fraudulent declaration of conformity, creating a regulatory-liability risk in addition to fraud.

### 3.3 Cultural Institutions: Issue In-House, With No Capacity

**Verified pattern:** the deployer is the cultural institution itself, and development is in-house or by a provider not publicly identified. The QR code is printed on gallery or facade signage, is static, and has no verification.

Cases: Museo Nacional de Bellas Artes (QR codes on gallery signage and Wi-Fi QR codes), GCBA-DGPeIH (42 QR codes on facades), Museo Emilio Caraffa (reported; 403 when verified).

**No active Argentine provider was found** for QR digital guides or audio guides for museums. The only documented attempt at labels with verification (Winega/Intekio) has its domain for sale; verified: 302 to hugedomains.

---

## 4. Current Issuer Matrix

Ranked by the only factor that matters here: **whether the issuer can build verification without help.**

| Issuer | Scenario | What it issues | Controls generation + destination? | Capability | Verification today |
|---|---|---|---|---|---|
| **Mercado Pago** | Payment | Self-adhesive physical QR kit | **Yes**, and also controls the printed medium (generates, prints, distributes, operates backend) | **Maximum** | No |
| **Cuenta DNI Comercios** | Payment | Its own printable, non-expiring static QR code, plus a dynamic QR code with the amount | **Yes** (generates and operates backend; printing remains with the merchant) | High (Banco Provincia) | No |
| **SENASA** | Product | QR codes for 150,000+ products + mandatory label | **Yes** (generates and anchors on its own domain) | High | **Yes, naive** |
| **GCBA (revenue collection)** | Payment | Dynamic QR code on bill | Yes | High | No |
| **API Santa Fe** | Payment | Dynamic QR code on bill | Yes | Medium | No |
| **Municipalidad de Gualeguaychú** | Exploration | QR codes on street-name signs and monuments | **Yes** (in-house by ordinance) | Medium | No |
| **GCBA - DGPeIH** | Exploration | 42 QR codes on historic facades | Yes (in-house) | Medium | No |
| **Municipalidad de Córdoba** | Payment | ~600 signs in public spaces | **No** (provider not identified) | Medium | No |
| **Municipalidad de Corrientes** | Exploration | QR codes at tourist sites | No (private provider not named) | Low | No |
| **Museums (MNBA, Caraffa)** | Exploration | QR codes on gallery signage | No | Low | No |
| **Marcado de Conformidad manufacturers** | Product | Mandatory QR code on product | Partial *(where documentation is hosted: **not verified**)* | Medium | No *(that the regulation does not require it is a **hypothesis**; see §3.2)* |
| **Physical merchants** | Payment | Rail sticker or sign | **No** (only the wall) | None | No |

---

## 5. Classification: Who Competes and Who Buys

### 5.1 Criterion

**I state this explicitly because another reasonable criterion would yield a different result.**

- **COMPETITOR** = already issues codes **AND** controls both stages on which verification depends: **code generation and destination resolution**, **AND** has high technical capability. The incentive may be dormant; what matters is that **on the day it decides to do it, it does not need QRSafe**.

> **Clarification on “full lifecycle”:** printing and distributing the physical medium are **not** necessary to build verification. Whoever generates the payload and operates the backend that resolves it can sign and validate it without touching the printer. Also controlling the printed medium (Mercado Pago’s case, as it manufactures and ships the sticker) is an **additional advantage**: it allows each physical piece to be serialized and sealed, but it is not a requirement. That is why Cuenta DNI Comercios, which generates the code and operates the backend but leaves printing to the merchant, qualifies as a competitor.
- **CUSTOMER** = already issues codes and is accountable for the QR code, but lacks at least one of the following: it does not control the lifecycle, does not have the capability, or bears the direct cost of fraud without the means to defend itself.

### 5.2 Competitors: Already Issue Codes and Could Sign Them Themselves

| Actor | Why | Confidence |
|---|---|---|
| **Mercado Pago** | Manufactures and prints the physical QR code, operates the rail, and has a Central de Seguridad. Full lifecycle plus maximum capability. It currently lacks incentive, but **it can close off the category**. | High (capability) / Low (current incentive) |
| **Cuenta DNI Comercios (Banco Provincia)** | Generates its own printable static QR code and operates the backend: **the code and destination are its own**, which is what is needed to sign and validate. Printing remains with the merchant, reducing its ability to seal the physical piece but not to verify it. Provincial public bank with high technical capability. | High |
| **SENASA** | **Has already built verification** and offers it free for 150,000 products. It is a State agency: it does not buy; it provides. In registered-product labeling, it **already occupies the position**. Its weak mechanism does not make it less of a competitor; it makes it a free competitor with institutional authority. | High |
| **GCBA (revenue collection)** | Issues in-house with high capability. Risk is low because the QR code is dynamic, but if it decides to extend to signage, it can do so alone. | Medium |
| **Municipalidad de Gualeguaychú** | Ord. 12611/2022 assigns QR-code development and maintenance to its Dirección de Informática. **It does not buy; it builds.** | Medium |

### 5.3 They Issue, but They Buy: The Prospects

| Actor | Why | Confidence |
|---|---|---|
| **Municipalidad de Córdoba** | **The number-one prospect.** ~600 QR codes in public spaces, no verification, and no identified security provider. It has already publicly warned of scams involving QR codes on fake fines: **it recognizes the vector**. Its incentive is reputational and direct: if a sticker appears over one of its signs, the compromised brand is the Municipalidad. | High |
| **Manufacturers subject to Marcado de Conformidad** | Required to issue a QR code as of October 1, 2025 (fact). That no authenticity mechanism is required is a **hypothesis pending verification in the annexes**. A universe growing by mandate. | Medium *(low for the regulatory argument)* |
| **Physical merchants** | Expose the rail’s QR code, control nothing except the wall, have no capability, and **bear the direct cost of fraud**. | High |
| **Museums and heritage institutions** | Issue codes in-house with low capability. The harm from a substituted QR code is reputational, not monetary: it **reduces urgency**, but does not eliminate it. Small ticket. | Medium |
| **Municipalidad de Corrientes** | Issues codes with an unnamed private provider. It does not control the lifecycle, so it buys. | Medium |

---

## 6. Actors That Do Not Yet Issue Codes: The Medium-Term Risk

None currently exposes QR codes. What is documented is their **concession horizon**, not a mandate to deploy QR codes:

| Actor | Status | Why it matters |
|---|---|---|
| **Blinkay Mobility S.L.** | Operates in CABA through an app, with no QR codes on signage | **PCI DSS Level 1** and registered as a Visa/Mastercard Service Provider: it already has a formalized security function. If CABA adopts QR codes, it can build them in-house. |
| **UTE SAEM - IT NET S.A.** | Awardee in Paraná (Tender 44/2026), finalist in Rosario | IT NET has been a systems integrator since 1987. Its 6-to-7-year concession gives it a planning horizon. |
| **Sonda Argentina** | Competing for Rosario | Regional integrator with greater corporate resources. |
| **SEM - CeSPI (UNLP)** | ~60 municipalities; exposure of street QR codes **not documented** | University R&D unit: **high, low-cost** capability. If it concludes that QR codes need signatures, it can distribute them free across its network. |

> **HYPOTHESIS, not fact:** that these concessionaires will deploy QR codes. **QR codes are not mentioned in the official published materials for the Rosario (Tender 15/2026) or Paraná (Tender 44/2026) tenders**, and the full text of neither specification was accessed (see Limitations). A mandate to operate metered parking **does not** establish a mandate to deploy QR codes.
>
> What is a fact: the concessions are signed for 6 to 10 years (Paraná 6+, Rosario 7+3), and Rosario currently has a QR proposal for metered parking before its Council. **If** QR codes reach those systems, the entry point is the tender specification, not the municipality, because afterward the window is closed for nearly a decade. The recommendation to review the specification rests on the concession horizon, not on a confirmed QR deployment.

---

## 7. Implications for QRSafe

1. **Córdoba is the reference case to pursue.** It is both the best prospect and the best case study for generating the data that the prior report identified as a competitive advantage.

2. **Do not compete against SENASA; point out the gap.** Its mechanism does not withstand homographs or redirects. Offering the cryptographic layer it lacks is more valuable than trying to displace it. It is worth more as an institutional partner than as a defeated competitor.

3. **The regulatory asymmetry would be the strongest sales argument, but it must first be verified.** SENASA requires a State anchor (fact). That Marcado de Conformidad permits a private anchor with no authenticity requirement **is not verified**: the regulations’ technical annexes were not accessible. **Concrete action before using this argument:** obtain and read the annexes (for example, “Anexo V - IF-2025-05199516-APN-DNRT#MEC”) through the case file or a public-information-access request.

4. **Mercado Pago is the number-one existential risk.** Its current lack of incentive is a window, not a guarantee. Any investment thesis should treat “Mercado Pago launches QR verification” as the scenario to defend against, not as a remote possibility.

5. **In Scenario B, the competitive gap is cleaner than in payments, but take care.** No active Argentine provider was found for digital museum guides or labels with digital verification. A gap can mean opportunity **or** no market. In museums, the harm is reputational and the ticket is small, so urgency is low. In product labeling, the harm is economic and regulatory, which is where budget exists.

6. **Cuenta DNI is an issuance competitor; MODO is not.** Cuenta DNI Comercios generates its own printable static QR code without integrity verification: the same exposure profile as the Mercado Pago Kit. MODO, by contrast, consumes the merchant QR code and is a potential channel on the scanning side.

---

## Research Limitations

**Sources that failed technically (with error code):**
- `https://www.concejorosario.gov.ar/codigos-qr-para-pagos-de-estacionamiento-medido/`: **TLS error: “unable to verify the first certificate.”** The proposal is cited through the indexed title from the official domain plus secondary press.
- `https://apronline.gob.ar/?modulo=mediosdepago` (APR La Plata): **TLS error.** The claim about QR codes on printed bills remains secondary.
- `https://prensa.cba.gov.ar/` (Museo Caraffa notice): **HTTP 403 Forbidden.**
- `https://digesto.senasa.gob.ar/items/show/882`: **TLS error.** Res. 1219/2024 was instead verified through the Official Gazette.
- `https://www.cespi.unlp.edu.ar/wp-content/uploads/2023/05/SEM.pdf`: downloaded (832 KB), but **the PDF has no extractable text layer**; it did not provide product data.
- `https://www.intekio.com`: responded with only a logo and no text; the company’s status could not be determined.

**Attributions that could NOT be confirmed and must not be presented as fact:**
- **Who developed Córdoba’s SEMM app.** It is attributed to UTN in secondary sources. `cordoba.gob.ar` and the Secretaría de Ciudad Inteligente portal were consulted: **neither names the developer**.
- **Which payment gateway underlies Córdoba’s QR code.** Mercado Pago and/or Taca Taca appear in the press; no official municipal page confirms either.
- **The list of municipalities in the SEM-ePagos alliance.** It comes from two media outlets reproducing the same announcement; no primary announcement was found.
- **The interoperable QR code on Edenor and MetroGAS invoices.** Press only; no textual confirmation on the companies’ sites.
- **The QR requirement in Res. 18/2025 (EPP).** The readable Official Gazette notice **does not mention the QR code**; it may appear in annexes that could not be read.
- **Regulation (EU) 2021/2117 and wine e-labeling.** The Regulation text was not accessed. Everything concerning Argentine exporting wineries is a **HYPOTHESIS** derived from industry advisory sources. **This is the report’s pending verification with the highest commercial value.**

**Declared data gaps (sought but not found):**
- **Census of municipalities exposing QR codes on street signage.** Córdoba is the only mass deployment verified with a primary source. It could not be determined how many of the ~60 municipalities in the SEM network do the same. This requires municipality-by-municipality review.
- **Argentine provider of QR digital guides or audio guides for museums.** All identified providers are foreign.
- **Argentine company combining physical security labels with digital QR verification.** None found. The model’s reference companies (Scantrust, CI Hologramas, Shosky) are foreign.
- **QR codes in Argentine libraries and on National Parks trails.** None found.
- **Documented case of QR substitution at a museum, historical plaque, or tourism sign in Argentina.** None found. The mention of a “museum sign” as a vulnerable surface comes from generic press about quishing, not an Argentine case.
- **Mention of QR codes in the Rosario (Tender 15/2026) or Paraná (Tender 44/2026) specifications.** They do not appear in the published official material; the full text of neither specification was accessed.

**Additional gap detected during review:** in the MODO flow, the actual QR issuer is **the acquirer** (Payway, Posnet, Clover, Getnet, Nave). This report **did not map acquirers as an issuance layer**, which is a material gap: they generate the QR code displayed at a large share of the country’s merchants. It should be covered in follow-up research.

**Methodological bias:** this report was built from web search engines and fetching public pages. Physical QR deployments that do not generate institutional communications, such as a small provincial museum, an inland municipality, or a mid-sized winery, are **systematically invisible to this method**. An absence of evidence here is not evidence of absence, and this is stated as such at every point.
