# QR Safe — Tesis de Identity Binding

Los sistemas actuales pueden determinar si un QR es técnicamente válido y, durante el pago, resolver información sobre la cuenta receptora. Sin embargo, existe una propiedad diferente que hoy no está garantizada en el QR físico exhibido por un comercio:

> **que ese QR específico haya sido autorizado por el negocio que el consumidor cree estar pagando.**

En un escenario de sustitución física, un atacante no necesita crear un QR corrupto, modificar el estándar ni distribuir malware. Puede generar un QR perfectamente válido asociado a otra cuenta y colocarlo encima del QR legítimo. Desde el punto de vista técnico, ambos QRs pueden ser válidos; el problema es que uno **no pertenece al comercio en cuyo contexto está siendo utilizado**. La investigación realizada muestra precisamente este gap: el estándar comercial utilizado en Argentina no incorpora una firma criptográfica que impida la sustitución física y no existe un registro público que vincule un QR legítimo con un comercio determinado.

## Hipótesis central

**QR Safe propone crear un binding verificable entre la identidad de un comercio y los QRs que ese comercio autoriza para cobrar.**

Ese binding puede representarse conceptualmente como:

`Identidad del comercio ↔ QR autorizado ↔ destino de pago`

QR Safe mantiene esa asociación como una fuente de verdad independiente. Así, la pregunta deja de ser:

> “¿Este QR es seguro?”

y pasa a ser:

> **“¿Este es realmente uno de los QRs autorizados por el comercio al que estoy intentando pagar?”**

La diferencia es importante. Un scanner convencional puede analizar una URL, buscar patrones maliciosos o comprobar que un QR tenga una estructura válida. QR Safe busca verificar **autenticidad y pertenencia**. Un QR fraudulento puede ser completamente válido y no contener ningún elemento técnicamente malicioso; aun así, QR Safe debería poder detectar que no está vinculado con la identidad del negocio en el que está siendo utilizado.

## Modelo de funcionamiento

Cuando un comercio se incorpora a QR Safe, primero establece una identidad verificable y registra los QRs que reconoce como propios. Para cada QR autorizado, QR Safe conserva una representación verificable —por ejemplo, su fingerprint/hash y los metadatos relevantes del destino de cobro— asociada a ese comercio.

A partir de allí:

`Comercio verificado → registra QR → QR Safe crea binding → consumidor verifica → QR Safe compara → verified / mismatch`

Si una persona escanea el QR legítimo, QR Safe puede responder:

> **QR verificado. Este código está autorizado por Comercio X.**

Si alguien coloca otro QR encima:

> **Advertencia. Este QR no está registrado como un medio de cobro autorizado por Comercio X.**

QR Safe no necesita determinar que el segundo QR pertenece a un delincuente ni afirmar que la cuenta receptora es fraudulenta. Sólo necesita comprobar una propiedad mucho más defendible:

> **el QR observado no coincide con ninguno de los QRs que ese comercio declaró y verificó como propios.**

## Qué estamos protegiendo

Por lo tanto, QR Safe no protege principalmente el contenido del QR.

Protege el vínculo:

**mundo físico → identidad → instrumento de cobro.**

Ese vínculo es la “última pulgada” que queda expuesta cuando un comercio imprime un QR y lo coloca en una mesa, surtidor, mostrador, estacionamiento u otro espacio accesible físicamente. El research identifica precisamente la integridad física del QR como un espacio actualmente no cubierto por los mecanismos antifraude transaccionales existentes.

## Alcance inicial de la tesis

La primera versión de QR Safe no necesita convertirse en billetera, PSP ni procesar la transacción. Tampoco necesita blockchain, cámaras o detección automática del cambio físico.

Su responsabilidad inicial puede limitarse a:

> **registrar qué QRs son legítimos para una identidad comercial y permitir verificar esa relación antes de que una persona confíe en ellos.**

Esto implica también una limitación explícita: sin integración con una billetera o con el flujo de pago, QR Safe no sabe automáticamente que alguien sustituyó un QR. **La detección ocurre cuando existe una verificación.**

El producto inicial, entonces, no promete:

> “Detectamos automáticamente cuando alguien pega un QR falso.”

Promete algo más preciso:

> **“Te permitimos comprobar que el QR que estás por usar es realmente un QR autorizado por el negocio que tenés enfrente.”**

## Tesis resumida

**QR Safe parte de la premisa de que un QR técnicamente válido no es necesariamente un QR legítimo para el contexto donde aparece.**

Por eso introduce una capa de identidad que vincula cada QR autorizado con el comercio al que pertenece y permite verificar esa relación antes del pago.

La unidad de confianza no es el QR aislado.

Es:

> **Comercio verificado + QR autorizado + destino esperado.**

Si ese vínculo puede registrarse y verificarse de manera confiable, QR Safe puede transformar un QR físico —hoy esencialmente una imagen que el usuario debe confiar que nadie sustituyó— en un instrumento cuya **procedencia puede comprobarse**.