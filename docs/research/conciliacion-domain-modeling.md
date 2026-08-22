# QRSafe — Conciliación de puntos críticos para Domain Modeling

> Fecha: 2026-08-22  
> Propósito: normalizar los puntos críticos surgidos del research conciliado con la tesis B2B de Identity Binding antes de ejecutar `domain-modeling`.  
> Fuente de verdad de producto: `tesis-identity-binding-b2b.md`.  
> Fuente de evidencia: research consolidado `Research: Fraude QR en Argentina, players internacionales, criptografía y blockchain — QRSafe (v3)`.

---

## 1. Objetivo de esta conciliación

El research actual mezcla cuatro tipos de información que deben mantenerse separados para evitar que una inferencia o una decisión de producto se presenten como evidencia:

1. **Hechos observados / evidencia**
2. **Conclusiones derivadas**
3. **Decisiones de producto**
4. **Preguntas abiertas / hipótesis**

Este documento no busca resolver todavía la arquitectura técnica final de QRSafe. Su objetivo es fijar el lenguaje, los invariantes y las fronteras del problema antes de pasar a `domain-modeling`.

---

## 2. Tesis de producto que se mantiene

La tesis central se conserva:

> **Un QR técnicamente válido no es necesariamente un QR legítimo para el contexto donde aparece.**

El problema que QRSafe intenta resolver no es determinar si un QR contiene malware, phishing o una estructura inválida.

El problema es determinar:

> **si el QR observado fue efectivamente autorizado por el comercio que el usuario cree estar pagando.**

La unidad de confianza no debe ser el QR aislado.

Debe modelarse como una relación verificable entre:

```text
Identidad / contexto esperado
        ↕
QR autorizado
        ↕
Destino de pago esperado
```

---

## 3. Cambio conceptual importante: el binding necesita contexto

La formulación previa:

```text
Identidad del comercio ↔ QR autorizado ↔ destino de pago
```

es correcta pero incompleta.

Para detectar una sustitución, QRSafe necesita conocer por una vía independiente **qué comercio o punto de cobro debería estar presente en ese contexto**.

La formulación recomendada es:

```text
Contexto físico / identidad esperada
        ↕
QR autorizado
        ↕
Destino de pago esperado
```

### Razón

Si QRSafe únicamente escanea un QR y pregunta a quién pertenece ese QR, un QR legítimo de un atacante puede responder correctamente:

```text
QR observado → pertenece a Atacante X
```

Eso no demuestra por sí mismo que exista una sustitución.

El sistema necesita comparar:

```text
Comercio esperado: Comercio A
QR observado: QR B
QR B autorizado por Comercio A: NO
```

Por lo tanto, el **anchor de identidad/contexto físico no es una feature secundaria**. Es parte del modelo de confianza.

---

## 4. Segundo punto estructural: identidad verificable del comercio

La tesis utiliza el concepto de **comercio verificado**.

Ese concepto debe tener una definición concreta.

Si un atacante puede registrar libremente una identidad similar a la de un comercio legítimo, el registro de bindings puede ser internamente consistente pero externamente falso.

Por lo tanto:

> **No puede existir un binding confiable si la identidad del comercio no fue previamente verificada.**

El mecanismo de KYC comercial todavía no está definido.

Posibles mecanismos a investigar:

- CUIT + fuentes públicas
- documentación comercial
- validación contra adquirente
- proceso humano
- verificación presencial
- combinación de mecanismos

### Estado

```text
Importancia: CRÍTICA
Estado: NO RESUELTO
Tipo: trust-model requirement
```

No debe tratarse solamente como una decisión de onboarding.

---

## 5. Modelo mínimo del dominio a llevar a `domain-modeling`

### Merchant Identity

Representa la identidad que QRSafe reconoce como perteneciente a un comercio real.

No debe confundirse con:

- nombre de fantasía
- razón social
- `collector.name`
- dominio web
- identidad del adquirente

---

### Physical / Payment Context

Representa el contexto donde el usuario espera realizar el pago.

Ejemplos:

```text
YPF Rosario Centro
Surtidor 4

Restaurante X
Mesa 12

Parking Y
Terminal de salida 2
```

Su función es responder:

> **¿A quién debería estar pagando el usuario en este contexto?**

---

### Authorized QR

QR que una Merchant Identity verificada declaró y QRSafe registró como autorizado.

Un comercio puede poseer múltiples Authorized QRs.

Relación:

```text
1 Merchant Identity
        ↓
N Authorized QRs
```

---

### Payment Destination

Destino de pago asociado al QR registrado.

Puede incluir, según disponibilidad:

- payload EMVCo
- adquirente
- identificadores de cuenta
- collector
- metadatos relevantes

No debe utilizarse automáticamente como sinónimo de identidad comercial.

---

### Binding

Relación registrada por QRSafe entre:

```text
Merchant Identity
+
Physical / Payment Context
+
Authorized QR
+
Expected Payment Destination
```

El binding constituye la fuente de verdad utilizada para una verificación.

---

### Observed QR

QR que QRSafe recibe durante una verificación.

Todavía no tiene ningún estado de confianza.

---

### Verification

Comparación entre:

```text
Observed QR
vs.
Expected Binding
```

No analiza si el QR es moralmente bueno, fraudulento o seguro.

Determina si pertenece al binding esperado.

---

## 6. Estados que deben diferenciarse

### VERIFIED

```text
Existe Merchant Identity verificada
+
Existe contexto esperado
+
Observed QR coincide con un Authorized QR
+
Binding vigente
```

Significado:

> Este QR está registrado como autorizado para este comercio/contexto.

---

### MISMATCH

```text
Existe Merchant Identity verificada
+
Existe contexto esperado
+
Observed QR NO coincide con los Authorized QRs del binding
```

Significado:

> Este QR no está registrado como autorizado para este comercio/contexto.

No significa:

> Este QR es fraudulento.

---

### UNKNOWN / UNREGISTERED

```text
No existe información suficiente para comparar.
```

Ejemplos:

- comercio no registrado
- contexto no reconocido
- binding inexistente
- QR aún no registrado

Debe ser diferente de `MISMATCH`.

### Invariante

> **Ausencia de evidencia no equivale a evidencia de no-pertenencia.**

---

### EXPIRED / STALE

Binding anteriormente válido que dejó de estar vigente.

Necesario para casos como:

- QR reemitido
- cambio de adquirente
- cambio de cuenta
- baja de sucursal
- rotación de códigos

---

## 7. Invariantes del producto

Estos principios deberían sobrevivir a cualquier decisión de implementación.

### Invariante 1 — Validity ≠ Authenticity

Un QR técnicamente válido puede no ser auténtico para el contexto donde aparece.

---

### Invariante 2 — QRSafe verifica pertenencia, no fraude

QRSafe puede afirmar:

> "Este QR está autorizado por Comercio X."

o:

> "Este QR no está registrado como autorizado por Comercio X."

No debe afirmar sin evidencia adicional:

> "Este QR es una estafa."

---

### Invariante 3 — Unknown ≠ Mismatch

Un comercio o QR desconocido no puede etiquetarse automáticamente como sospechoso.

---

### Invariante 4 — No existe binding sin identidad confiable

La confiabilidad del registro depende de la confiabilidad del onboarding de la Merchant Identity.

---

### Invariante 5 — El QR no puede definir por sí solo el contexto esperado

La identidad esperada debe provenir de una fuente independiente del QR observado.

---

### Invariante 6 — Un comercio puede tener múltiples QR legítimos

No debe modelarse:

```text
1 comercio = 1 QR
```

Debe permitirse:

```text
1 comercio
↓
N sucursales
↓
N puntos de pago
↓
N QR autorizados
```

---

### Invariante 7 — El binding tiene ciclo de vida

Un binding puede:

```text
created
→ active
→ replaced
→ revoked
→ expired
```

La simple existencia histórica de un QR no implica que siga autorizado.

---

## 8. Puntos del research que deben corregirse antes de congelarlo

### 8.1 VQR

El documento contiene una contradicción:

- en el resumen y §1.1 se reconoce correctamente el uso de firmas criptográficas;
- en §5.5 se describe el mecanismo como basado en dinamismo y no en firma.

Conciliación:

> **VQR es consumer-presented, dinámico y utiliza firmas criptográficas.**

La comparación con QRSafe debe conservar esa distinción.

---

### 8.2 "QR dinámico ya es seguro"

La evidencia actual no permite convertir esta afirmación en una verdad general.

Reemplazar por una formulación del tipo:

> Los QR dinámicos reducen materialmente la exposición al vector de sustitución física que QRSafe estudia; existe evidencia secundaria de implementaciones que reportan fraude muy bajo o nulo para casos específicos.

---

### 8.3 Claims competitivos absolutos

Evitar:

```text
"No existe ninguna empresa..."
"Ningún player internacional..."
"Ningún incumbente ocupará..."
```

Preferir:

```text
"No identificamos..."
"No encontramos en el research realizado..."
"El espacio aparece actualmente desatendido..."
```

El research soporta una búsqueda, no una demostración universal.

---

### 8.4 Riesgo legal

La formulación:

> "el framing mitiga el riesgo legal"

debe tratarse como inferencia, no como evidencia jurídica.

Preferir:

> Limitar las afirmaciones a pertenencia/no-pertenencia reduce la superficie de claims que QRSafe realiza. El efecto concreto sobre responsabilidad legal debe validarse con asesoramiento jurídico.

---

### 8.5 Dato del 73%

El claim de que 73% de los usuarios escanea sin verificar destino aparece sin una fuente claramente trazable dentro del documento conciliado.

Acción:

```text
Recuperar fuente primaria/secundaria válida
OR
Eliminar el claim
```

No debe sobrevivir al research normalizado sin procedencia verificable.

---

## 9. Decisiones de producto ya tomadas

Estas decisiones no deben volver a debatirse durante `domain-modeling` salvo que aparezca evidencia contradictoria.

### Dentro del MVP

- B2B como cliente pagador.
- Modelo operativo B2B2C.
- Identity Binding como núcleo.
- QR estático físico como foco.
- Registro propio de QRs autorizados.
- Canal propio para verificación inicial.
- Framing de pertenencia / no-pertenencia.

### Fuera del MVP

- cámaras / video analytics
- blockchain como mecanismo central
- actuar como PSP
- procesar la transacción
- integración obligatoria con billeteras
- mundo cripto
- detección automática en tiempo real

---

## 10. Hipótesis que siguen abiertas

No deben transformarse en decisiones durante `domain-modeling`.

### HYP-01 — Anchor físico

> Podemos identificar con suficiente confianza qué comercio/contexto espera pagar el usuario sin introducir una fricción incompatible con el producto.

---

### HYP-02 — KYC comercial

> Podemos verificar la identidad del comercio de forma suficientemente confiable y económica para sostener el binding.

---

### HYP-03 — Adopción del verificador

> Los usuarios realizarán una verificación antes del pago con frecuencia suficiente para que el comercio perciba protección real.

Este es actualmente uno de los riesgos de producto más importantes.

---

### HYP-04 — Willingness to pay B2B

> Los comercios perciben suficiente riesgo/valor como para pagar por mantener un registro verificable de sus puntos de cobro.

Todavía no está validado.

---

### HYP-05 — Fingerprint estable

> Podemos definir una representación del QR suficientemente estable para identificarlo sin producir falsos mismatches ante cambios legítimos.

---

### HYP-06 — Múltiples puntos de cobro

> El registro puede mantenerse operacionalmente actualizado incluso en empresas con múltiples sucursales y QR.

---

## 11. Preguntas para `domain-modeling`

La ejecución de `domain-modeling` debería intentar destruir ambigüedades alrededor de estas preguntas.

### Identidad

- ¿Qué es exactamente una Merchant Identity?
- ¿Quién puede crearla?
- ¿Quién puede verificarla?
- ¿Puede una misma entidad legal poseer múltiples marcas comerciales?

### Contexto

- ¿Qué diferencia existe entre Merchant, Location y Payment Point?
- ¿Un binding ocurre a nivel comercio, sucursal o punto de pago?
- ¿Puede un QR ser válido en varios contextos?

### QR

- ¿Qué hace que un QR sea `Authorized`?
- ¿Qué ocurre cuando es reemplazado?
- ¿Puede haber múltiples adquirentes por punto de pago?
- ¿Qué parte exacta del payload constituye la identidad técnica del QR?

### Verification

- ¿Cuáles son todos los estados posibles?
- ¿Qué diferencia `Unknown`, `Mismatch`, `Expired` y `Revoked`?
- ¿Qué evidencia necesita cada transición de estado?

### Trust

- ¿Qué significa realmente "verified merchant"?
- ¿Qué parte del trust depende de QRSafe?
- ¿Qué parte depende del adquirente?
- ¿Qué ocurre si QRSafe registra información incorrecta?

---

## 12. Resultado esperado de `domain-modeling`

El objetivo no es generar arquitectura técnica.

El resultado esperado es un dominio suficientemente preciso como para que la siguiente afirmación no sea ambigua:

> **QRSafe verifica que un QR observado pertenece al comercio y contexto de pago que el usuario espera, comparándolo contra un binding previamente registrado y confiable.**

Después de `domain-modeling` deberíamos poder producir, como mínimo:

```text
GLOSSARY.md
CONTEXT.md
```

con:

- entidades
- términos
- relaciones
- estados
- invariantes
- escenarios límite
- contradicciones resueltas
- preguntas que todavía requieren evidencia

Solo después conviene convertir el dominio en especificaciones de producto y arquitectura técnica.

---

## 13. Criterio de salida

La conciliación puede considerarse suficiente cuando podamos responder sin ambigüedad:

1. ¿Qué identidad verificamos?
2. ¿Cómo sabemos qué comercio debería estar presente?
3. ¿Qué significa que un QR esté autorizado?
4. ¿Contra qué se compara un QR observado?
5. ¿Qué significa exactamente `verified`?
6. ¿Qué diferencia `mismatch` de `unknown`?
7. ¿Qué sucede cuando un QR legítimo cambia?
8. ¿Quién es responsable de mantener el binding?
9. ¿Qué afirmaciones puede hacer QRSafe y cuáles no?
10. ¿Qué elementos siguen siendo hipótesis y requieren discovery?

Hasta entonces, el research debe considerarse evidencia suficiente para modelar el dominio, pero no una especificación cerrada del producto.
