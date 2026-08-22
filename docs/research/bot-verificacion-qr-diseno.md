# QR Safe Bot — diseño de verificación de QR por chat

> Fecha: 2026-08-22 · Alcance: Argentina · **Naturaleza de este documento: diseño de producto, no investigación.** No aporta hallazgos nuevos contra fuentes primarias; construye sobre los alcances ya establecidos en [`fraude-qr-argentina-y-blockchain.md`](./fraude-qr-argentina-y-blockchain.md), [`tesis-identity-binding-b2b.md`](./tesis-identity-binding-b2b.md), [`competidores-que-ya-generan-qr-argentina.md`](./competidores-que-ya-generan-qr-argentina.md) y [`capa-intermedia-escaneo-redireccion.md`](./capa-intermedia-escaneo-redireccion.md). Las afirmaciones heredadas de esos informes conservan su etiqueta de origen; las decisiones de diseño están marcadas como tales.

---

## Decisión de alcance

**Cobertura universal**: el bot responde ante cualquier QR que le envíen, no ante un dominio cerrado.

Es una decisión de producto tomada con conocimiento del riesgo. Este documento no la discute: la asume y diseña para que sea sostenible.

---

## 1. El riesgo que hay que neutralizar

Con cobertura universal, la enorme mayoría de los QR legítimos **no va a estar en el registro**. Si el bot responde a todos ellos con una advertencia, ocurre lo siguiente, en este orden:

1. El usuario verifica un QR legítimo y recibe una alerta.
2. Paga igual, porque el comercio está delante suyo y no pasa nada.
3. Repite dos o tres veces.
4. **Aprende que la alerta no significa nada.**
5. El día que la alerta sí es correcta, la ignora.

El producto no falla por dar un falso positivo. Falla porque **entrena a su propio usuario a ignorarlo**. Es el problema de arranque en frío ya declarado en el informe principal (§ riesgos estructurales): *"Sin masa crítica de comercios registrados no hay razón para verificar"*.

**Decisión de diseño**: la solución no es achicar el alcance —ya se decidió que sea universal— sino **hacer que la fuerza de la respuesta sea proporcional a lo que el bot efectivamente sabe**.

---

## 2. Arquitectura de confianza graduada

El registro no es una lista plana de comercios. Es un conjunto de **dominios de cobertura**, cada uno con un estado propio:

| Concepto | Definición |
|---|---|
| **Dominio** | Un universo acotado y enumerable de emisores. Ej.: *estacionamiento medido de la Municipalidad de Córdoba*; *productos registrados en SENASA*; *sucursales de una cadena*. |
| **Cobertura del dominio** | Qué proporción de los emisores legítimos de ese dominio está cargada. Puede ser **cerrada** (100%, enumerada y acordada con el emisor) o **abierta** (parcial). |
| **Resolución** | Dado un QR, a qué dominio pertenece — y por lo tanto, con cuánta autoridad puede hablar el bot. |

La clave: **el bot sabe cuáles de sus dominios están cerrados.** Un identificador ausente en un dominio cerrado es una señal fuerte. El mismo identificador ausente en terreno no cubierto no es señal de nada, y el bot tiene que decirlo con esas palabras.

Esto permite crecer sin mentir: cada dominio que se cierra al 100% convierte una zona de silencio en una zona de respuesta firme, sin tocar la arquitectura.

---

## 3. Los cuatro estados de respuesta

Ningún estado afirma que un QR sea "seguro" ni acusa fraude. Siguiendo la tesis de Identity Binding, el bot sólo constata **pertenencia o no-pertenencia**.

### 3.1 Verificado
> **Este código está autorizado por {Emisor}.**

El identificador de cobro figura registrado por el emisor que el usuario cree estar pagando. Es el único estado afirmativo.

### 3.2 No autorizado — señal fuerte
> **Este QR no está registrado como un medio de cobro autorizado por {Emisor}.**

Sólo se emite cuando el QR resuelve a un **dominio cerrado** y el identificador no está en él. Acá el silencio del registro es información, porque el registro está completo.

Es la respuesta que justifica el producto. **No debe emitirse nunca fuera de un dominio cerrado.**

### 3.3 Fuera de cobertura — sin opinión
> **Todavía no tengo registro de este comercio, así que no puedo confirmar ni descartar nada. Esto no es una advertencia.**

El QR es estructuralmente válido pero cae en terreno no cubierto. **La última frase no es opcional**: es lo que impide que el usuario lea silencio como sospecha, y es lo que preserva el valor del estado 3.2.

Acompañar con lo que sí se puede afirmar sin registro (ver §4.2) y con la vía de enrolamiento del comercio.

### 3.4 Anomalía estructural
> **Este código tiene algo raro: {motivo}.**

No depende del registro. Son observaciones verificables sobre el contenido mismo del QR, y funcionan con cobertura cero.

---

## 4. Qué puede afirmar el bot

### 4.1 Con registro (pertenencia)

Requiere que el emisor esté cargado. Es el núcleo del producto y el que da los estados 3.1 y 3.2.

### 4.2 Sin registro (análisis estructural)

Esto funciona desde el día uno, con el registro vacío, y es lo que hace útil al bot antes de tener cobertura:

**En QR de pago (trama EMVCo Merchant Presented Mode):**
- Decodificar la estructura TLV completa y mostrarla en lenguaje llano: quién declara cobrar, en qué moneda, en qué país, con qué identificador.
- Validar el **CRC-16/CCITT-FALSE** del campo 63.
- **Advertencia de diseño**: el CRC válido **no** indica legitimidad. Detecta errores de transmisión, no falsificación — un QR fraudulento bien formado lo pasa igual que el original. El bot nunca debe presentar "CRC correcto" como tranquilizador. Es dato técnico, no veredicto. [Heredado de `capa-intermedia-escaneo-redireccion.md`]
- Contrastar el **nombre declarado (campo 59)** contra el identificador de cobro. El campo 59 es texto libre y se copia; que diga "MUNI CORDOBA SEM" no vincula nada. Cuando el nombre declarado sugiere un organismo público o una marca conocida y el identificador pertenece a otro esquema, eso es reportable como anomalía sin necesidad de registro.
- Detectar **moneda o país inconsistentes** con el contexto declarado.

**En QR de exploración (URL):**
- Mostrar el **destino real y completo**, expandiendo acortadores. Es el aporte más útil y más barato: el usuario ve a dónde va antes de ir.
- Señalar discrepancia entre el dominio y la entidad que el QR dice representar.
- Detectar homógrafos y subdominios engañosos — exactamente lo que el mecanismo de SENASA ("mirá que la URL empiece con `aps2.senasa.gov.ar`") delega en el ojo humano y no resiste.

> **Nota de posicionamiento**: §4.2 solo no es defendible como producto — es lo que ya hace Bitdefender Scamio, gratis. El diferencial es §4.1. §4.2 es el puente que mantiene al bot útil mientras el registro se llena.

---

## 5. Canal

### 5.1 El problema de WhatsApp

Está declarado en el informe principal (§4.2) y no debe minimizarse:

> *"WhatsApp es el canal dominante del fraude (5.509 reportes UFECI 2024): riesgo de confusión con estafa. […] hereda el problema de confiar el anchor de identidad a un canal de fraude dominante."*

Un bot que pide "mandame el QR" es formalmente indistinguible de la estafa que dice lo mismo. Y hay una restricción operativa a verificar antes de comprometer el canal: **las limitaciones del WhatsApp Business API para casos de uso financieros**.

### 5.2 Mitigaciones de diseño

- **El bot nunca inicia conversación.** Sólo responde a quien le escribe primero. Cualquier mensaje proactivo destruye la distinción con el fraude.
- **El bot nunca pide datos.** Ni monto, ni cuenta, ni DNI, ni comprobante. Recibe una imagen y devuelve un análisis. Un bot que no pide nada no puede ser confundido con uno que pide.
- **Punto de entrada físico, no digital.** El acceso llega por el cartel del comercio o del municipio, no por un link reenviado. Esto ataca el vector de raíz y además convierte al emisor en canal de adquisición.
- **Identidad verificable fuera del canal**: cuenta oficial verificada, publicada en el sitio del emisor asociado.

> **HIPÓTESIS a validar**: que un punto de entrada físico sea suficiente para evitar la confusión con el fraude. No se encontró antecedente argentino de bot de verificación de QR, así que no hay precedente del que aprender. [Heredado del informe principal]

---

## 6. Cómo se llena el registro

El orden importa: cada dominio cerrado convierte terreno mudo en terreno con respuesta firme.

| Orden | Dominio | Por qué primero | Estado |
|---|---|---|---|
| 1 | **Estacionamiento medido, Municipalidad de Córdoba** | ~600 carteles, un solo emisor, identificadores enumerables. Ya advirtió públicamente por multas truchas con QR: reconoce el vector. Cerrable al 100% con un solo acuerdo. | Prospecto #1 verificado |
| 2 | **Cadenas con múltiples sucursales** | Un acuerdo cubre N locales. Alta densidad por unidad de esfuerzo comercial. | Sin mapear |
| 3 | **Emisores con QR ya normalizado** | SENASA ya ancla sus QR en dominio propio: el dominio es enumerable sin construirlo. | Ver informe de competidores |

**Métrica que gobierna el producto**: proporción de consultas que caen en dominio cerrado. Mientras sea baja, el bot es mayormente §4.2 y no tiene defensa competitiva. Es el número que hay que mirar, no el total de consultas.

---

## 7. Riesgos abiertos

1. **Erosión del estado 3.3.** Si por presión comercial el "fuera de cobertura" empieza a redactarse como advertencia suave, el producto colapsa al escenario del §1. Es la línea que no se cruza.
2. **Responsabilidad ante un falso verificado.** Si el bot dice "verificado" sobre un QR que resultó fraudulento, el daño reputacional es mayor que el de no haber existido. Requiere definición legal antes de lanzar.
3. **Fricción real.** El usuario debe decidir verificar **antes** de pagar, abrir el chat y sacar una foto. Es más fricción que una app en el momento de uso; lo que se ahorra es la instalación. **No está validado que la gente lo haga.**
4. **Canal de fraude dominante.** §5.1. Mitigado por diseño, no resuelto.
5. **Competidor gratuito ya activo.** Bitdefender Scamio hace análisis de QR on-demand por chat sin costo. Todo lo que sea §4.2 compite contra gratis.

---

## Qué falta verificar antes de construir

- **Restricciones del WhatsApp Business API para casos financieros.** Bloqueante para la elección de canal. No verificado.
- **Qué encodea el sticker del Kit QR Oficial de Mercado Pago**: trama EMVCo pura o URL propietaria. Cambia qué puede parsear el bot en el caso más común del país. Prueba empírica pendiente, declarada en `capa-intermedia-escaneo-redireccion.md`.
- **Si la Municipalidad de Córdoba puede enumerar sus identificadores de cobro.** Todo el dominio 1 depende de eso, y no hay confirmación de que exista esa lista en forma consultable.
- **Viabilidad legal del estado 3.1** frente a un falso verificado.
