# Competidores que ya generan sus propios QR — Argentina

> Fecha: 2026-08-22 · Alcance: Argentina, 2023–2026 · Método: investigación contra fuentes primarias (sitios oficiales de municipios y provincias, ordenanzas, pliegos y adjudicaciones de licitación, Boletín Oficial, InfoLEG, normativa de SENASA y de la Secretaría de Industria y Comercio, sitios de producto de billeteras y proveedores, sitios oficiales de museos). Cada afirmación lleva su fuente etiquetada **[PRIMARIA]** o **[SECUNDARIA]**. Las secundarias se usan sólo como pista, nunca como única evidencia de una afirmación estructural. Los vacíos de datos están declarados en línea y en la sección de limitaciones.

Este informe complementa a [`fraude-qr-argentina-y-blockchain.md`](./fraude-qr-argentina-y-blockchain.md), que cubre modalidades de fraude, regulación BCRA/CIMPRA y el análisis de blockchain. Acá se responde una pregunta distinta y más acotada: **quién emite hoy códigos QR al mundo físico en Argentina, y cuál de esos emisores puede construir verificación de integridad sin necesitar a QRSafe.**

---

## Resumen ejecutivo

1. **De todos los actores que hoy emiten QR físico en Argentina, exactamente uno construyó alguna verificación de integridad: SENASA. Y es ingenua.** Su mecanismo es pedirle al consumidor que mire el prefijo de la URL. Ningún otro emisor relevante — incluida la billetera más grande del país — documenta ninguno.

2. **El emisor más expuesto del país es un municipio, no un comercio.** La Municipalidad de Córdoba habilitó el pago del estacionamiento medido "mediante códigos QR instalados en **casi 600 carteles georreferenciados** distribuidos en la vía pública". [PRIMARIA] https://cordoba.gob.ar/estacionamiento-exenciones-bonificaciones/

3. **Mercado Pago no es sólo un rail: es una fábrica de QR físicos.** Su Kit QR Oficial envía "1 código QR autoadhesivo" al comercio — "no necesitás imprimir tu QR". Controla generación, impresión, distribución y backend. Es el único actor del mapa que puede cerrar la categoría entera de un release a otro.

4. **El corte "¿ya genera su QR?" ordena el mercado mejor que el corte "¿es competidor?".** Quien ya emite demostró que el caso de uso le importa y que tiene el flujo montado. La diferencia entre competidor y cliente no está en si emite, sino en **si controla el ciclo de vida completo y tiene con qué firmarlo**.

5. **Hay una asimetría regulatoria explotable.** SENASA exige que el QR apunte a un dominio del Estado. El Marcado de Conformidad (Res. 237/2024 + 428/2025) permite que el QR apunte al sitio del propio fabricante, **sin exigir ningún mecanismo de autenticidad** — confirmado leyendo la Res. 26/2025. Es el argumento normativo más fuerte encontrado.

6. **Los que todavía no emiten son el riesgo de mediano plazo.** Blinkay, la UTE SAEM–IT NET y Sonda no exponen QR hoy, pero tienen concesiones o licitaciones en curso de 6 a 10 años. Rosario y Paraná se están definiendo **ahora**.

---

## 1. Criterio: qué cuenta como "ya genera su QR"

Un actor **ya genera su QR** cuando hoy, de forma verificable, produce códigos QR que terminan expuestos en el mundo físico bajo su responsabilidad o su marca. No cuenta:

- Consumir el QR de otro (una billetera que escanea el QR del comercio).
- Tener capacidad de emitir pero no hacerlo todavía (un concesionario recién adjudicado).
- Recibir el QR de un tercero sin control sobre su generación.

Y se distinguen dos capas, que **no** hay que mezclar:

| Capa | Quién es | Ejemplo |
|---|---|---|
| **Capa 1 — Desplegador** | Expone el QR al público y responde por él | Municipalidad de Córdoba, el museo, la bodega |
| **Capa 2 — Proveedor** | Genera el QR y/o le vende el sistema | SENASA, Mercado Pago, Blinkay |

Un mismo actor puede ocupar las dos capas a la vez. Esos son los casos peligrosos: **son los que no necesitan a nadie.**

---

## 2. Los que ya generan QR de pago

### 2.1 Mercado Pago — el único rail que fabrica el objeto físico

| | |
|---|---|
| **Qué emite** | **Kit QR Oficial**: "1 código QR autoadhesivo con el instructivo para asociarlo a tu cuenta" + soporte plástico + stickers + cartel. Se envía físico: "no necesitás imprimir tu QR". También QR dinámico desde la app y dispositivo Point. |
| **Tipo** | Estático (kit) y dinámico (app/Point) |
| **Verificación hoy** | **No.** Ni la página del Kit ni la de "Cobrar con QR" mencionan verificación de integridad ni riesgo de sustitución del QR expuesto. |
| **Fuente** | [PRIMARIA] https://www.mercadopago.com.ar/herramientas-para-vender/cobrar-con-qr/kit-oficial · https://www.mercadopago.com.ar/herramientas-para-vender/cobrar-con-qr |

Controla las cuatro etapas: genera, imprime, distribuye y opera el backend. Sumado a su Central de Seguridad (ver informe previo §3.1), es **capacidad máxima**. Lo que hoy no tiene es incentivo: el costo del anti-tampering está externalizado al comerciante.

> **HIPÓTESIS (no hecho documentado)**: la asimetría de incentivos explica esa ausencia — los rails ganan por volumen transaccional y el costo de la sustitución recae en comercio y pagador. No se encontró documento que confirme la motivación.

### 2.2 Los que NO generan QR físico: Cuenta DNI y MODO

Aunque el encuadre inicial los ubicaba como competidores, la evidencia primaria dice otra cosa: **consumen el QR del comercio, no lo emiten.**

- **Cuenta DNI (Banco Provincia)**: "Podés utilizar Cuenta DNI en cualquier comercio que tenga QR". El FAQ oficial no menciona verificación del destinatario ni fraude por QR; sólo un teléfono para denunciar gastos desconocidos. [PRIMARIA] https://www.bancoprovincia.com.ar/cuentadni/contenidos/cdniIndividuosFaq
- **MODO**: su guía "Cómo pagar con QR paso a paso" recomienda verificar **el monto**, no el destinatario, y no aborda adulteración del QR. [PRIMARIA] https://www.modo.com.ar/blog/como-pagar-con-qr-en-argentina-paso-a-paso

**Consecuencia práctica**: no compiten en emisión. Compiten — potencialmente — en el lado del escaneo, que es otro producto. Para QRSafe son canal antes que rival.

### 2.3 Municipios que ya emiten QR de calle

| Desplegador | Qué emite | Proveedor (Capa 2) | Verif. | Fuente |
|---|---|---|---|---|
| **Municipalidad de Córdoba** | ~600 carteles georreferenciados con QR de estacionamiento medido en la vía pública | App SEMM: desarrollador **no confirmado**; pasarela **no confirmada** | No | [PRIMARIA] https://cordoba.gob.ar/estacionamiento-exenciones-bonificaciones/ |
| **Municipalidad de Gualeguaychú** | QR en nomencladores de calle, monumentos y sitios de interés | **In-house**: Dir. de Informática y Nuevas Tecnologías (Ord. 12611/2022) | No | [PRIMARIA] Ord. 12611/2022 |
| **GCBA – DGPeIH** | 42 QR en fachadas de sitios históricos | In-house | No | [PRIMARIA] |
| **Municipalidad de Corrientes** | QR en sitios turísticos, edificios y monumentos → visitcorrientes.tur.ar | "El sector privado" (**proveedor no nombrado**) | No | [PRIMARIA, despliegue] |

> **Sobre Córdoba** — la fuente no declara si los QR son estáticos o dinámicos; al ir impresos en cartelería fija son estáticos en el sentido relevante (**INFERENCIA**, no dato de la fuente). Están en poste, en la calle, sin supervisión, 24/7, replicados ~600 veces con identidad visual uniforme. Un atacante con una plancha de impresión convincente escala a toda la ciudad. Es el mismo municipio que ya advirtió públicamente por multas truchas con QR.

### 2.4 Organismos de recaudación — QR dinámico en boleta

| Desplegador | Qué emite | Tipo | Verif. | Riesgo |
|---|---|---|---|---|
| **GCBA (recaudación)** | QR interoperable en Boletas Únicas Inteligentes | Dinámico | No | Bajo — el QR dinámico no es sustituible de la misma forma |
| **API Santa Fe** | QR en boleta digital / liquidación de deuda | Dinámico | No | Bajo |

Emiten, sí, pero el QR dinámico reduce mucho la superficie de ataque. **Prioridad comercial baja**, aunque la capacidad técnica esté.

### 2.5 Fuera de alcance: transporte público

El QR de colectivo y subte **lo presenta el pasajero** contra el lector del validador. No hay QR físico sustituible, y el esquema VQR ya va firmado con Ed25519 (ver informe previo). **Cero superficie de ataque, cero mercado.** Descartar.

---

## 3. Los que ya generan QR de exploración y de producto

### 3.1 SENASA — el único emisor del país con verificación construida

Es el hallazgo central del Escenario B.

- **Qué es**: servicio de generación de códigos QR para "los más de 150 mil productos registrados" bajo su órbita, para que el consumidor consulte la situación oficial del producto. Lanzado el **21-02-2024**. [PRIMARIA] https://www.argentina.gob.ar/noticias/el-senasa-lanza-codigo-qr-para-productos-inscriptos-en-sus-registros-y-hace-historia-en
- **Es voluntario y gratuito**: "cien por ciento gratuito y por autogestión", "adhesión es voluntaria". [PRIMARIA, misma fuente]
- **Requisito físico**: el QR "debe consignarse en forma impresa como parte del rótulo o etiqueta", en el rotulado externo. [PRIMARIA] https://www.argentina.gob.ar/senasa/generacion-del-qr-senasa-para-titulares-de-productos-registrados
- **El mecanismo de verificación que eligió**: decirle al consumidor que mire la URL. "La url del producto deberá comenzar en todos los casos de la siguiente manera: `https://aps2.senasa.gov.ar/`". [PRIMARIA] https://www.argentina.gob.ar/noticias/el-senasa-lanza-codigo-qr-para-productos-inscriptos-en-sus-registros-y-hace-historia-en *(la cita está en la noticia de lanzamiento, NO en la página de generación del QR citada arriba)*

> **ANÁLISIS (HIPÓTESIS técnica, no hecho documentado)**: ese control es la definición de verificación ingenua. Depende de que el usuario lea el dominio en una URL renderizada por el lector de QR de su celular, y no protege contra homógrafos, subdominios engañosos ni redirecciones. Pero es un **precedente institucional enorme**: el Estado argentino ya aceptó públicamente que un QR de producto necesita ser verificable por el consumidor.

**Segundo despliegue, obligatorio**: la **Res. SENASA 1219/2024** (BO 14-10-2024) obliga a los Centros de Tratamiento Cuarentenario a adherir una Etiqueta de Trazabilidad con QR "en al menos una cara visible de cada envase". Se emite por el sistema **SIGPV-SUFP** — o sea, **el Estado genera la etiqueta**. Aplica a cítricos dulces, pimientos, uvas y paltas. [PRIMARIA] https://www.boletinoficial.gob.ar/detalleAviso/primera/315483/20241014

### 3.2 Fabricantes bajo Marcado de Conformidad — emisión obligatoria, cero autenticidad

Las Res. 237/2024, Disp. 1/2024 y Res. 428/2025 obligan a fabricantes e importadores de productos con certificación obligatoria a exhibir un sello de Marcado de Conformidad **con QR**. Cada fabricante aloja la documentación **en su propio sitio**, y la Res. 26/2025 **no exige ningún mecanismo de autenticidad**. [PRIMARIA, InfoLEG]

Es un universo de emisores creciendo **por mandato regulatorio**, donde el QR apunta a un dominio privado sin ancla de confianza. Un tercero que falsifique el QR lleva al consumidor a una declaración de conformidad apócrifa: es riesgo de responsabilidad regulatoria, no sólo de fraude.

### 3.3 Organismos culturales — emiten in-house, sin capacidad

**Patrón verificado**: el desplegador es el propio organismo cultural y el desarrollo es in-house o de un proveedor no identificado públicamente. El QR va impreso en cartelería de sala o fachada, es estático, y no tiene ninguna verificación.

Casos: Museo Nacional de Bellas Artes (QR en cartelería de sala y QR de Wi-Fi), GCBA–DGPeIH (42 QR en fachadas), Museo Emilio Caraffa (reportado; 403 al verificar).

**No se encontró proveedor argentino vivo** de guías digitales o audioguías por QR para museos. El único intento documentado en etiquetado con verificación (Winega/Intekio) tiene el dominio a la venta — verificado: 302 a hugedomains.

---

## 4. Matriz de emisores actuales

Ordenada por lo único que importa acá: **si el emisor puede construir verificación sin ayuda.**

| Emisor | Escenario | Qué emite | ¿Ciclo completo? | Capacidad | Verif. hoy |
|---|---|---|---|---|---|
| **Mercado Pago** | Pago | Kit QR físico autoadhesivo | **Sí** (genera, imprime, distribuye, opera backend) | **Máxima** | No |
| **SENASA** | Producto | QR para +150.000 productos + etiqueta obligatoria | **Sí** (genera y ancla en dominio propio) | Alta | **Sí, ingenua** |
| **GCBA (recaudación)** | Pago | QR dinámico en boleta | Sí | Alta | No |
| **API Santa Fe** | Pago | QR dinámico en boleta | Sí | Media | No |
| **Municipalidad de Gualeguaychú** | Exploración | QR en nomencladores y monumentos | **Sí** (in-house por ordenanza) | Media | No |
| **GCBA – DGPeIH** | Exploración | 42 QR en fachadas históricas | Sí (in-house) | Media | No |
| **Municipalidad de Córdoba** | Pago | ~600 carteles en vía pública | **No** (proveedor no identificado) | Media | No |
| **Municipalidad de Corrientes** | Exploración | QR en sitios turísticos | No (proveedor privado sin nombrar) | Baja | No |
| **Museos (MNBA, Caraffa)** | Exploración | QR en cartelería de sala | No | Baja | No |
| **Fabricantes Marcado de Conformidad** | Producto | QR obligatorio en producto | Parcial (alojan en su sitio) | Media | **No, y la norma no lo exige** |
| **Comercios físicos** | Pago | Sticker o cartel del rail | **No** (sólo la pared) | Nula | No |

---

## 5. Clasificación: quién compite y quién compra

### 5.1 Criterio

**Lo declaro explícitamente porque otro criterio razonable daría otro resultado.**

- **COMPETIDOR** = ya emite **Y** controla el ciclo de vida completo **Y** tiene capacidad técnica alta. El incentivo puede estar latente; lo que importa es que **el día que decida hacerlo, no necesita a QRSafe**.
- **CLIENTE** = ya emite y responde por el QR, pero le falta al menos una: no controla el ciclo, o no tiene capacidad, o el costo del fraude le pega directo y no tiene con qué defenderse.

### 5.2 Competidores — ya emiten y podrían firmarlo solos

| Actor | Por qué | Confianza |
|---|---|---|
| **Mercado Pago** | Fabrica e imprime el QR físico, opera el rail, tiene Central de Seguridad. Ciclo completo más capacidad máxima. Hoy sin incentivo, pero **es quien puede cerrar la categoría**. | Alta (capacidad) / Baja (incentivo actual) |
| **SENASA** | **Ya construyó verificación** y la ofrece gratis a 150.000 productos. Es un organismo del Estado: no compra, provee. En etiquetado de producto registrado **ya ocupa el lugar**. Que su mecanismo sea débil no lo hace menos competidor: lo hace un competidor gratuito y con autoridad institucional. | Alta |
| **GCBA (recaudación)** | Emite in-house con capacidad alta. Riesgo bajo por ser QR dinámico, pero si decide extender a cartelería, lo hace solo. | Media |
| **Municipalidad de Gualeguaychú** | La Ord. 12611/2022 asigna el desarrollo y mantenimiento de los QR a su Dirección de Informática. **No compra: hace.** | Media |

### 5.3 Emiten, pero compran — los prospectos

| Actor | Por qué | Confianza |
|---|---|---|
| **Municipalidad de Córdoba** | **El prospecto #1.** ~600 QR en la vía pública, sin verificación, proveedor de seguridad no identificado. Ya advirtió públicamente por estafas con QR en multas truchas: **reconoce el vector**. Su incentivo es reputacional y directo — si aparece un sticker sobre uno de sus carteles, la marca comprometida es la Municipalidad. | Alta |
| **Fabricantes bajo Marcado de Conformidad** | Obligados a emitir un QR que apunta a su propio sitio, sin mecanismo de autenticidad exigido. Riesgo de responsabilidad regulatoria. Universo creciendo por mandato. | Media |
| **Comercios físicos** | Exponen el QR del rail, no controlan nada salvo la pared, capacidad nula, y **el costo del fraude les pega directo**. | Alta |
| **Museos y organismos de patrimonio** | Emiten in-house con capacidad baja. El daño de un QR sustituido es reputacional, no monetario: **baja la urgencia**, no la elimina. Ticket chico. | Media |
| **Municipalidad de Corrientes** | Emite con proveedor privado sin nombrar. No controla el ciclo, así que compra. | Media |

---

## 6. Los que todavía no emiten — el riesgo de mediano plazo

Ninguno expone QR hoy, pero todos tienen el mandato y el horizonte para hacerlo:

| Actor | Situación | Por qué importa |
|---|---|---|
| **Blinkay Mobility S.L.** | Opera CABA por app, sin QR en cartelería | **PCI DSS Level 1** y registro como Service Provider de Visa/Mastercard: ya tiene función de seguridad formalizada. Si CABA adopta QR, lo construye in-house. |
| **UTE SAEM – IT NET S.A.** | Adjudicataria de Paraná (Lic. 44/2026), finalista en Rosario | IT NET es integradora de sistemas desde 1987. La concesión de 6–7 años le da horizonte. |
| **Sonda Argentina** | Compitiendo por Rosario | Integradora regional con más músculo corporativo. |
| **SEM – CeSPI (UNLP)** | ~60 municipios; **no documentado** que expongan QR de calle | Unidad universitaria de I+D: capacidad **alta y barata**. Si concluye que el QR necesita firma, la distribuye gratis a toda su red. |

> **La ventana se cierra.** Las concesiones se firman por 6 a 10 años (Paraná 6+, Rosario 7+3). Rosario está **hoy** en licitación y **hoy** tiene un proyecto de QR en el Concejo. Es la intersección exacta donde un requisito de verificación puede entrar **al pliego**, antes de que exista el despliegue. El punto de entrada al mundo municipal no es el municipio: es el pliego.

---

## 7. Implicancias para QRSafe

1. **Córdoba es el caso de referencia que hay que ir a buscar.** Es a la vez el mejor prospecto y el mejor caso de estudio para generar el dato que el informe previo identificó como ventaja competitiva.

2. **A SENASA no hay que competirle: hay que señalarle el hueco.** Su mecanismo no resiste homógrafos ni redirecciones. Ofrecerle la capa criptográfica que le falta vale más que intentar desplazarlo. Como socio institucional vale más que como competidor derrotado.

3. **La asimetría regulatoria es el argumento de venta más fuerte.** SENASA exige ancla estatal; el Marcado de Conformidad permite ancla privada sin requisito de autenticidad. El segundo modelo es indefendible y **está creciendo por mandato**.

4. **Mercado Pago es el riesgo existencial N°1.** Que hoy no tenga incentivo es una ventana, no una garantía. Cualquier tesis de inversión debería tratar "Mercado Pago lanza verificación de QR" como el escenario a defender, no como una posibilidad remota.

5. **En Escenario B el vacío competitivo es más limpio que en pago — pero ojo.** No se encontró proveedor argentino vivo de guías digitales para museos ni de etiquetas con verificación digital. Vacío puede significar oportunidad **o** que no hay mercado. En museos el daño es reputacional y el ticket chico: urgencia baja. En etiquetado de producto el daño es económico y regulatorio: ahí sí hay presupuesto.

6. **Cuenta DNI y MODO no son competidores de emisión.** Consumen QR ajeno. Tratarlos como rivales sería un error de encuadre; son canal potencial del lado del escaneo.

---

## Limitaciones de esta investigación

**Fuentes que fallaron técnicamente (con código de error):**
- `https://www.concejorosario.gov.ar/codigos-qr-para-pagos-de-estacionamiento-medido/` — **error TLS: "unable to verify the first certificate"**. El proyecto se cita por título indexado del dominio oficial más prensa secundaria.
- `https://apronline.gob.ar/?modulo=mediosdepago` (APR La Plata) — **error TLS**. La afirmación sobre QR en boleta impresa queda como secundaria.
- `https://prensa.cba.gov.ar/` (nota del Museo Caraffa) — **HTTP 403 Forbidden**.
- `https://digesto.senasa.gob.ar/items/show/882` — **error TLS**. La Res. 1219/2024 se verificó por Boletín Oficial en su lugar.
- `https://www.cespi.unlp.edu.ar/wp-content/uploads/2023/05/SEM.pdf` — se descargó (832 KB) pero **el PDF no tiene capa de texto extraíble**; no aportó datos de producto.
- `https://www.intekio.com` — respondió con sólo un logo sin texto; no se pudo determinar el estado de la empresa.

**Atribuciones que NO se pudieron confirmar y no deben usarse como hecho:**
- **Quién desarrolló la app SEMM de Córdoba.** Atribuida a la UTN en fuentes secundarias. Se consultaron `cordoba.gob.ar` y el portal de la Secretaría de Ciudad Inteligente: **ninguno nombra al desarrollador**.
- **Qué pasarela de pago está detrás del QR de Córdoba.** Mercado Pago y/o Taca Taca aparecen en prensa; ninguna página oficial municipal lo confirma.
- **La lista de municipios de la alianza SEM–ePagos.** Proviene de dos medios que reproducen el mismo comunicado; no se encontró comunicado primario.
- **El QR interoperable en facturas de Edenor y MetroGAS.** Sólo prensa; sin confirmación textual en los sitios de las empresas.
- **El requisito de QR en la Res. 18/2025 (EPP).** El aviso legible del Boletín Oficial **no menciona el QR**; estaría en anexos que no se pudieron leer.
- **El Reglamento (UE) 2021/2117 y el e-label de vino.** No se accedió al texto del Reglamento. Todo lo relativo a bodegas argentinas exportadoras es **HIPÓTESIS** derivada de fuentes de asesoramiento sectorial. **Es la verificación pendiente de mayor valor comercial de este informe.**

**Vacíos de datos declarados (buscados y no encontrados):**
- **Censo de municipios que exponen QR en cartelería de calle.** Córdoba es el único despliegue masivo verificado con fuente primaria. No se pudo determinar cuántos de los ~60 municipios de la red SEM hacen lo mismo. Requiere revisión municipio por municipio.
- **Proveedor argentino de guías digitales o audioguías por QR para museos.** Todos los hallados son extranjeros.
- **Empresa argentina que combine etiqueta física de seguridad con verificación digital del QR.** No encontrada. Los referentes del modelo (Scantrust, CI Hologramas, Shosky) son extranjeros.
- **QR en bibliotecas argentinas y en senderos de Parques Nacionales.** No encontrado.
- **Caso documentado de sustitución de QR en museo, placa histórica o señalética turística en Argentina.** No encontrado. La mención de "cartel de museo" como superficie vulnerable proviene de prensa genérica sobre quishing, no de un caso argentino.
- **Mención de códigos QR en los pliegos de Rosario (Lic. 15/2026) o Paraná (Lic. 44/2026).** No aparece en el material oficial publicado; no se accedió al texto completo de ninguno de los dos pliegos.

**Sesgo metodológico:** este informe se construyó desde buscadores web y fetch de páginas públicas. Los despliegues de QR físico que no generan comunicación institucional — un museo provincial chico, un municipio del interior, una bodega mediana — son **sistemáticamente invisibles a este método**. La ausencia de evidencia acá no es evidencia de ausencia, y está declarada como tal en cada punto.
