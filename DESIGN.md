---
name: QRSafe Admin
description: Panel merchant operativo para registrar empresas, puntos de cobro y bindings QR verificables.
colors:
  ink: "#081219"
  panel: "#0d1a22"
  panel-raised: "#12232c"
  line: "#28404b"
  line-soft: "#1a303a"
  paper: "#f0f6f4"
  muted: "#91a8ad"
  signal: "#7cf1b6"
  signal-dark: "#0d5b40"
  amber: "#f4be67"
  danger: "#ff8b86"
typography:
  display:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "clamp(3.8rem, 7vw, 6rem)"
    fontWeight: 700
    lineHeight: 0.9
    letterSpacing: "-0.03em"
  workspace-title:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "clamp(2.5rem, 5vw, 4rem)"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "-0.025em"
  section-title:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "clamp(1.8rem, 3vw, 2.4rem)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
  instrument-label:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.13em"
  technical:
    fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace"
    fontSize: "0.68rem"
    fontWeight: 400
components:
  button-primary:
    backgroundColor: "{colors.signal}"
    textColor: "#06140f"
    rounded: "11px"
    padding: "0 20px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "#92f8c7"
  button-secondary:
    backgroundColor: "#13232b"
    textColor: "#dbe7e5"
    rounded: "10px"
    padding: "0 15px"
    height: "42px"
  input-light:
    backgroundColor: "#fbfdfc"
    textColor: "#102128"
    rounded: "10px"
    padding: "0 15px"
    height: "50px"
  operations-console:
    backgroundColor: "{colors.panel}"
    rounded: "14px"
---

# Design System: QRSafe Admin

## Overview

**Tesis visual: cada estado de confianza ocupa un instrumento legible; se rechaza el dashboard de tarjetas intercambiables.**

QRSafe Admin trabaja en modo **Operate**. La prioridad es leer el estado general, entender la siguiente acción y completar una secuencia merchant corta. El mundo es un panel nocturno azul tinta inspirado en instrumentos de vuelo: marcas blancas, datos compactos y señal cromática escasa para atención y confirmación.

El acceso combina una mitad narrativa oscura con un formulario claro; una vez autenticado, toda la operación sucede en la consola oscura. La identidad no depende de decoración genérica, sino de readouts, sellos, líneas de escaneo, huellas y estados verificables.

**Características clave:**

- Jerarquía tipográfica alta y condensada frente a datos pequeños y precisos.
- Una acción siguiente dominante por etapa.
- Flujo visible de cuatro pasos: Empresa, Identidad, Punto y Binding.
- Verde como señal de selección, progreso y binding activo; ámbar y rojo solo para atención.
- `apps/admin` es este sistema Operate. `apps/app` es una landing pública independiente y no hereda automáticamente su composición, densidad ni componentes.

## Colors

El frontmatter contiene los once tokens normativos definidos en `:root`; no se deben renombrar ni sustituir por aproximaciones.

### Primary

- **Signal:** acción primaria, selección, progreso completo, foco, lectura y binding activo.
- **Signal Dark:** acento nativo de controles como el checkbox.

### Secondary

- **Amber:** revisión pendiente y puntos de atención no destructivos.
- **Danger:** rechazo, inactividad problemática y error sobre superficies oscuras.

### Neutral

- **Ink:** fondo global y base del mundo operativo.
- **Panel / Panel Raised:** superficies de consola y capas internas.
- **Line / Line Soft:** bordes estructurales y divisores secundarios.
- **Paper:** base clara del acceso y onboarding.
- **Muted:** texto auxiliar, metadatos y estados incompletos.

Los componentes claros usan además literales locales observados, como `#eef3f1`, `#fbfdfc`, `#102128` y `#617378`; no son tokens globales. Los estados también tienen fondos y bordes locales específicos para conservar contraste.

**La regla de señal.** El verde, el ámbar y el rojo comunican estado; no se usan como relleno decorativo indiscriminado.

## Typography

**Display y títulos:** Barlow Condensed, pesos 500, 600 y 700 desde Google Fonts.
**Cuerpo e interfaz:** Manrope, pesos 400, 500, 600 y 700, con fallback `ui-sans-serif`, `system-ui`, `sans-serif`.
**Datos técnicos:** `ui-monospace`, `SFMono-Regular`, `Consolas`, `monospace`.

La pareja contrapone titulares condensados, grandes y firmes con una interfaz Manrope sobria. Las etiquetas instrumentales usan Barlow Condensed en mayúsculas, tamaño pequeño y tracking amplio. Hashes, destinos y fingerprints siempre usan mono, números tabulares cuando actúan como readout y truncado cuando el ancho no alcanza.

### Hierarchy

- **Display:** hero de acceso y títulos principales de etapa; escala exacta en el frontmatter.
- **Workspace title:** nombre de empresa o estado principal del panel.
- **Section title:** encabezados de módulos operativos; los recibos pueden crecer hasta `clamp(2rem, 4vw, 3.1rem)`.
- **Body:** instrucciones y explicaciones; los párrafos narrativos usan `line-height: 1.6–1.7`.
- **Instrument label:** contexto operativo breve, siempre en mayúsculas.
- **Technical:** payloads, identificadores y destinos detectados.

**La regla de contraste tipográfico.** Barlow Condensed nombra la operación; Manrope explica y permite actuar; mono prueba el dato técnico.

## Layout

- **Acceso desktop:** grid de dos columnas, `minmax(420px, 1.05fr)` y `minmax(450px, .95fr)`, ambas de al menos `100svh`. La historia oscura ocupa la izquierda y el formulario claro centrado, con ancho máximo de `440px`, la derecha.
- **Panel desktop:** sidebar fija de `250px` y workspace fluido de hasta `1180px`. La consola agrupa puntos y bindings en un único contenedor, no en tarjetas independientes.
- **Composición:** encabezado, badge de verificación, flight strip de cuatro pasos y una etapa principal. El primer viewport deja visible el estado general y una siguiente acción clara.
- **Ritmo:** padding responsive con `clamp()` en zonas protagonistas; módulos operativos usan principalmente `18–38px`, gaps de `6–28px` y divisores continuos.
- **A 900px:** acceso en una columna; sidebar pasa a header horizontal, conserva solo la navegación activa y oculta el estado B2C; formularios y selectores reducen columnas.
- **A 640px:** workspace con `16px` laterales; navegación oculta; logout queda como icono; header y acciones se apilan; flight strip mantiene cuatro pasos con overflow horizontal; formularios, preview y recibo pasan a una columna; las tablas se convierten en filas de dos niveles.
- **Base:** ancho mínimo soportado de `320px`, alturas con `svh` y controles táctiles principales de `42–50px`.

## Elevation & Depth

La estructura es mayormente tonal: fondos anidados y bordes finos separan instrumentos. Las sombras se reservan para elementos accionables o superficies claras elevadas, no para convertir cada bloque en una card.

- **Acción primaria:** `0 7px 22px rgba(40,156,108,.22)`; en hover, `0 11px 28px rgba(40,156,108,.3)`.
- **Etapa clara:** `0 18px 46px rgba(0,0,0,.2)`.
- **Formulario claro:** `0 13px 34px rgba(18,49,57,.1)`.
- **Control activo de acceso:** `0 3px 12px rgba(14,38,46,.1)`.
- **Señales:** glow localizado en nodos, huella y estado; nunca como halo ambiental global.

**La regla tonal primero.** En la consola oscura, usar borde y cambio de fondo antes que una sombra nueva.

## Shapes

El lenguaje mezcla rectángulos suavemente redondeados con círculos instrumentales. Inputs, botones y opciones usan radios de `9–12px`; contenedores principales `14–16px`; badges usan `999px`. Sellos, pasos, radios y radar son círculos completos. Los bordes son de `1px`; el upload y el estado vacío usan borde dashed para indicar una zona incompleta o receptora.

No existe una escala de radius o spacing declarada como token CSS; no crear nombres de token para estos valores sin refactorizar primero la implementación.

## Components

### Navigation and Brand

- Marca compacta con ScanLine dentro de un cuadro de `36px`, radio `10px`, borde oscuro y señal verde.
- Sidebar oscura con icono y label; activo/hover cambia a fondo elevado y texto claro. En móvil queda como header con marca y logout.

### Buttons and Inputs

- Primario: valores normativos en frontmatter; hover asciende `2px` y refuerza verde y sombra. Disabled usa `opacity: .48`, sin sombra y cursor bloqueado. Busy sustituye el icono por spinner y cambia el verbo.
- Secundario: oscuro, borde `line`, altura `42px`; en móvil puede reducirse a botón icon-only cuando el contexto conserva el significado.
- Text button: transparente, muted y subrayado con offset de `4px`.
- Inputs: borde `#bdcac7`; focus `#1d825f` más anillo `0 0 0 3px rgba(29,130,95,.12)`. Los inputs oscuros cambian fondo y borde, no la estructura.
- Switch de acceso: dos opciones con `aria-pressed`; la activa es blanca, elevada y de texto oscuro.

### Operational Instruments

- **Verification badge:** pill con estados default ámbar, verified verde y rejected rojo; siempre combina icono y texto.
- **Flight strip:** readout `n/4` y cuatro pasos; cada completo muestra check, texto claro y círculo verde.
- **Task stage:** superficie clara protagonista para identificación y revisión; puede contener formulario elevado o sello circular de identidad.
- **Payment point selector:** grupo radio de opciones oscuras; selected usa borde/fondo verde, icono señal y radio marcado. Empty state es un único botón dashed.
- **Binding console:** contenedor continuo con header, upload, preview/confirmación o receipt, seguido por lista de bindings.
- **Upload:** input visualmente oculto y label dashed de al menos `245px`; hover, focus y busy son perceptibles.
- **Receipt activo:** sello circular, afirmación principal, comercio y punto en negrita, fingerprint mono y acción secundaria.
- **Messages:** error usa `role="alert"`; notice, espera y recibo usan status. El color siempre se acompaña con icono, título o texto.

### States and Motion

- Estados cubiertos: loading inicial, busy por acción, vacío, preview, confirmación requerida, binding activo, verificación pendiente, verificada, rechazada, error, notice, disabled, hover, focus y selected.
- Radar: giro lineal infinito de `7s`; scan beam: alternancia de `2.2s` con `cubic-bezier(0.16, 1, 0.3, 1)`; spinner: giro lineal de `0.85s`.
- Transiciones de foco, borde y fondo duran `.2s`; la elevación del botón dura `.25s` con el easing del sistema.
- `prefers-reduced-motion: reduce` desactiva scroll suave y reduce animaciones/transiciones a `0.01ms` y una iteración.

### Accessibility

- Foco global visible de `2px` en signal con offset de `3px`; el file input transfiere foco visible a su label.
- HTML en español, landmarks, labels nativos, `radiogroup`/`radio`, `aria-checked`, `aria-pressed`, `aria-live` y roles de alert/status ya forman parte del patrón.
- Mantener iconos decorativos fuera del árbol accesible; todo icon-only debe conservar nombre accesible por contexto o `aria-label`.
- No comunicar estado solo por color. Conservar icono, texto y, cuando corresponda, forma o borde.

## Do's and Don'ts

### Do

- **Do** mostrar primero qué está verificado, qué falta y cuál es la única siguiente acción.
- **Do** mantener juntos empresa, punto de cobro y binding en todo resultado positivo.
- **Do** usar copy directo, calmo y probatorio: “binding activo”, “registrado” y “autorizado por el comercio”.
- **Do** describir busy con un verbo específico: “Verificando…”, “Sincronizando…” o “Leyendo el código…”.
- **Do** truncar identificadores visualmente sin alterar el valor fuente y usar mono para datos técnicos.
- **Do** preservar desktop y móvil como composiciones deliberadas, no como una simple reducción de escala.

### Don't

- **Don't** prometer “pago seguro”, llamar fraudulento a un QR desconocido ni afirmar propiedad bancaria; la UI solo prueba cobertura del registro y autorización declarada.
- **Don't** convertir la consola en una cuadrícula de cards intercambiables o añadir métricas decorativas sin una decisión operativa asociada.
- **Don't** usar verde, ámbar o rojo como decoración, ni depender únicamente de esos colores para comunicar estado.
- **Don't** introducir gradientes ajenos: el único gradiente de superficie es el acceso/receipt y el radar usa gradiente como instrumento animado.
- **Don't** mezclar composición o componentes de `apps/app` dentro de `apps/admin`. Compartir producto o marca no vuelve equivalentes a la landing pública y al panel merchant.
- **Don't** fabricar logos de clientes, testimonios, proveedores KYB o integraciones de adquirencia.
