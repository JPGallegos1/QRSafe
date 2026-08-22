# Fuentes de las imágenes de referencia

Las imágenes usadas como material de referencia para el research de fraude QR **no se versionan
en este repositorio** (ver `.gitignore`): son fotografías de medios de prensa y sitios
institucionales sobre las que no tenemos derechos de redistribución.

Este archivo registra las URLs de origen para que cualquiera pueda reconstruir el set local.
La estructura esperada es `images/pago/` e `images/exploración/` en la raíz del proyecto.

## QR de pago (`images/pago/`)

Escenario transaccional: el usuario escanea para mover dinero.

| Archivo | Descripción | Fuente |
|---|---|---|
| `estacionamiento-cordoba.jpg` | Estacionamiento medido, Córdoba | [cronista.com](https://www.cronista.com/resizer/v2/SYPDMAXR6FC3JHWL3FLPXJSQ5E.jpg?auth=80bcf3606ca8293cd915e711d15f10eff84657c6e8c3fae36bf6dcef6647b684&height=630&quality=70&smart=true&width=1200) |
| `cuenta-dni-mercado.jpg` | Cuenta DNI en mercado regional, La Plata | [0221.com.ar](https://media.0221.com.ar/p/61d83c1965713ca3ea32688cf39c6f49/adjuntos/357/imagenes/100/213/0100213859/1400x0/smart/mercado-regional-minorista-la-platajpg.jpg) |
| `pago-qr-comercio.jpeg` | Pago con QR en comercio | [ambito.com](https://media.ambito.com/p/68f6aa6ab853a9fe8897c120f38b60e1/adjuntos/239/imagenes/039/507/0039507838/1200x675/smart/pag10-pagos-celula_optjpeg.jpeg) |
| `cartel-mercado-pago.jpg` | Cartel de Mercado Pago en local | [sociedaduruguaya.org](https://www.sociedaduruguaya.org/wp-content/uploads/2024/12/2K8A4535-scaled.jpg) |
| `qr-supermercado.jpg` | QR de Mercado Pago en Coto | [lacapital.com.ar](https://media.lacapital.com.ar/p/23bfef7a8290507622bc4cbe984ce437/adjuntos/203/imagenes/101/789/0101789037/642x0/smart/mercado-pago-coto-1jpg.jpg) |
| `pago-qr-colectivo.jpg` | Pago con QR en colectivo | [paymentmedia.com](https://www.paymentmedia.com/gallery/689bd9727b783mercado_pago_bus_argentina.jpg) |

## QR de exploración (`images/exploración/`)

Escenario informativo: el usuario escanea para acceder a contenido.

| Archivo | Descripción | Fuente |
|---|---|---|
| `menu-qr-restaurante.webp` | Carta QR en restaurante | [restomovil.com](https://www.restomovil.com/sitio/seo/imagenes_blog/carta-qr-restaurante-venda-mas-uniendo-lo-digital-y-fisico-faq3.webp) |
| `menu-qr-cafe.jpg` | Menú QR en café | [st-hatena.com](https://cdn-ak.f.st-hatena.com/images/fotolife/N/NOV2008/20221008/20221008103601.jpg) |
| `menu-qr-la-pepica.jpg` | Menú QR, restaurante La Pepica | [lapepica.com](https://lapepica.com/wp-content/uploads/2023/03/MUA_0969-683x1024.jpg) |
| `museo-valparaiso.jpeg` | QR en Museo de Historia Natural de Valparaíso | [mhnv.gob.cl](https://www.mhnv.gob.cl/sites/www.mhnv.gob.cl/files/noticias-galeria/2026-04/WhatsApp%20Image%202026-04-09%20at%2012.44.39%20PM%20%281%29.jpeg) |
| `guia-digital-museo-trento.jpg` | Guía digital del Museo de Trento | [opencityitalia.it](https://flyimg.opencityitalia.it/upload/rf_1%2Co_auto%2Cw_2500%2Ch_2500/https%3A%2F%2Fs3-eu-west-1.amazonaws.com%2Fstatic.opencity.opencontent.it%2Fvar%2Fcidpat%2Fstorage%2Fimages%2Fmedia%2Fimages%2Fnuove-guide-digitali-nelle-lingue-di-minoranza%2F5938731-1-ita-IT%2FNuove-guide-digitali-nelle-lingue-di-minoranza_reference.jpg) |
| `senal-turistica-argentina.jpg` | Señalética turística con QR, Argentina | [semreflejos.com.ar](https://www.semreflejos.com.ar/adjuntos/1200/reflejos/2021/02/1.jpg) |
| `placa-historica-qr.jpeg` | Placa histórica con código QR | [edupedu.ro](https://cdn.edupedu.ro/wp-content/uploads/2023/01/turism-cod-qr-2.jpeg) |
| `qr-sendero-educativo.jpg` | QR en sendero educativo | [nde.groningen.nl](https://nde.groningen.nl/sites/default/files/styles/large/public/images/_DSC9372.jpg?itok=ApwgAS3M) |
| `qr-biblioteca.jpg` | QR en biblioteca | [pressbooks.pub](https://pressbooks.pub/app/uploads/sites/4057/2022/09/1367869887-4991-0.jpg) |
| `qr-vino1-1.jpg` | QR en etiqueta de vino | Origen sin registrar — archivo incorporado manualmente al set local. Ver nota abajo. |

## Referencias relacionadas

- Normativa europea de etiquetado de vino, usada como contexto para el caso de la etiqueta:
  <https://davidmoreno.es/etiquetas-rioja-normativa-europea/>

## Pendientes y URLs caídas

Estas fuentes formaban parte del set original pero no están en el set local actual:

| Descripción | URL | Estado |
|---|---|---|
| Pago QR en puesto de comida | `https://images.rawpixel.com/image_social_landscape/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDI1LTA1L3NyLWltYWdlLTI0MDQyNS1wY2EwNy1zLTIzMC5qcGc.jpg` | **404** — la URL ya no existe |
| QR en etiqueta de vino (Avery) | `https://www.avery.es/sites/avery.es/files/styles/crop_free_ratio_style/public/2025-01/3.jpg?itok=aZbNlpSw` | **521** — origen caído tras Cloudflare. Sustituida localmente por `qr-vino1-1.jpg`, cuya procedencia no quedó registrada |
| Parquímetro Rosario | <https://www.rosarionoticias.gob.ar/uploads/fotos/p1dmoaijts172o88m4dasf1ead8.jpg> | Descargada y luego descartada del set |
| Parquímetro North Sydney | <https://www.northsydney.nsw.gov.au/images/Untitled_design__62_.jpg> | Descargada y luego descartada del set |
| Pago QR en YPF | <https://cloudfront-us-east-1.images.arcpublishing.com/infobae/QA2FJ3KNAVDATPBZWEFXIQTYKU.jpeg> | Descargada y luego descartada del set |
