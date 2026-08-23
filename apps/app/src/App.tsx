import { useState, type FormEvent } from 'react'
import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  BadgeX,
  Building2,
  Camera,
  Check,
  CornerDownRight,
  Info,
  ListChecks,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  MessageSquareMore,
  QrCode,
  Scale,
  ScanLine,
  TriangleAlert,
  X,
  type LucideIcon,
} from 'lucide-react'
import './App.css'

const problemSteps = [
  'El QR funcionó.',
  'La página abrió.',
  'La transferencia se procesó.',
  'Pero podía no pertenecer ahí.',
]

const relationship = [
  { icon: MapPin, title: 'LUGAR FÍSICO', detail: 'Dónde está expuesto' },
  { icon: Building2, title: 'ORGANIZACIÓN', detail: 'Quién declara utilizarlo' },
  { icon: QrCode, title: 'QR', detail: 'Cuál es el contenido exacto' },
]

const howSteps = [
  { icon: Camera, title: 'Sacá una foto', body: 'Incluí el QR y el cartel o contexto visible.' },
  { icon: MessageCircle, title: 'Enviala por WhatsApp', body: 'La conversación siempre la inicia la persona.' },
  { icon: ListChecks, title: 'Recibí una respuesta precisa', body: 'QRSafe comunica qué pudo comprobar y qué no.' },
]

const results: Array<{
  icon: LucideIcon
  name: string
  detail: string
  mobileDetail: string
  tag: string
  tone: string
}> = [
  { icon: BadgeCheck, name: 'Verificado', detail: 'Autorizado por el emisor declarado para ese punto.', mobileDetail: 'Autorizado para ese punto.', tag: 'REGISTRADO', tone: 'verified' },
  { icon: BadgeX, name: 'No autorizado', detail: 'Contradice un inventario cerrado y conocido.', mobileDetail: 'Contradice un inventario cerrado.', tag: 'EVIDENCIA', tone: 'denied' },
  { icon: Info, name: 'Fuera de cobertura', detail: 'Todavía no hay información suficiente; no es una alerta.', mobileDetail: 'Sin información suficiente; no es una alerta.', tag: 'NEUTRO', tone: 'neutral' },
  { icon: TriangleAlert, name: 'Anómalo', detail: 'Existe algo verificablemente incorrecto dentro del código.', mobileDetail: 'Algo verificablemente incorrecto.', tag: 'EVIDENCIA', tone: 'warning' },
  { icon: ScanLine, name: 'Ilegible', detail: 'La imagen no pudo procesarse; intentá nuevamente.', mobileDetail: 'La imagen no pudo procesarse.', tag: 'REINTENTAR', tone: 'neutral' },
]

const channelRules = [
  'Vos iniciás la conversación.',
  'El bot no solicita datos personales.',
  'El bot no cobra ni procesa pagos.',
  'El registro y la habilitación ocurren fuera del chat.',
]

const coverage = [
  { icon: Building2, title: 'ORGANIZACIÓN', body: 'Valida su identidad y declara sus QR.' },
  { icon: MapPin, title: 'PUNTO FÍSICO', body: 'Asocia cada código a una ubicación.' },
  { icon: MessageCircle, title: 'PERSONA', body: 'Consulta esa cobertura antes de pagar.' },
]

const faqs = [
  ['¿QRSafe me asegura que el pago es seguro?', 'No. QRSafe verifica una relación registrada entre una organización, un punto físico y un QR. No garantiza la seguridad de una transacción.'],
  ['¿Qué significa fuera de cobertura?', 'Que todavía no existe información suficiente para confirmar o descartar la relación. No es una alerta.'],
  ['¿Por qué tengo que enviar también el cartel?', 'Porque el contexto permite contrastar el código con la organización y el lugar donde está expuesto.'],
  ['¿QRSafe puede escribirme primero?', 'No. La conversación siempre la inicia la persona desde el canal oficial.'],
  ['¿Tengo que descargar una aplicación?', 'No. La verificación se realiza desde WhatsApp; no necesitás instalar una app adicional.'],
  ['¿Qué pasa si la foto no se puede leer?', 'La respuesta será Ilegible y te pediremos que intentes nuevamente con una imagen más clara.'],
]

function Brand({ light = false }: { light?: boolean }) {
  return (
    <a className={`brand${light ? ' brand--light' : ''}`} href="#inicio" aria-label="QRSafe, inicio">
      <ScanLine aria-hidden="true" />
      <span>QRSafe</span>
    </a>
  )
}

function Eyebrow({ children, hero = false }: { children: string; hero?: boolean }) {
  return (
    <p className={`eyebrow${hero ? ' eyebrow--hero' : ''}`}>
      {hero && <span aria-hidden="true" />}
      {children}
    </p>
  )
}

function PendingWhatsAppButton({ compact = false, inverse = false, onPending }: {
  compact?: boolean
  inverse?: boolean
  onPending: () => void
}) {
  return (
    <button className={`button button--primary${compact ? ' button--compact' : ''}${inverse ? ' button--inverse' : ''}`} type="button" onClick={onPending}>
      <MessageCircle aria-hidden="true" />
      <span className="button__full">{compact ? 'Verificar por WhatsApp' : 'Verificar un QR por WhatsApp'}</span>
      {compact && <span className="button__short">Verificar</span>}
    </button>
  )
}

function BindingVisual() {
  const rows = [
    { icon: MapPin, label: 'LUGAR', value: 'Punto físico' },
    { icon: Building2, label: 'ORGANIZACIÓN', value: 'Titular del código' },
    { icon: QrCode, label: 'CÓDIGO', value: 'Contenido del QR' },
  ]

  return (
    <div className="binding-visual" aria-label="Relación entre un QR, una organización y un punto físico">
      <img src="/xGFjQ.png" alt="Cartel con un código QR en un estacionamiento" />
      <div className="binding-overlay">
        <div className="binding-overlay__status"><span>BINDING ACTIVO</span><BadgeCheck aria-hidden="true" /></div>
        {rows.map(({ icon: Icon, label, value }) => (
          <div className="binding-overlay__row" key={label}>
            <Icon aria-hidden="true" />
            <span><small>{label}</small><strong>{value}</strong></span>
          </div>
        ))}
        <p>Autorizado por la organización para este punto.</p>
      </div>
    </div>
  )
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [email, setEmail] = useState('')

  const announcePendingChannel = () => {
    setNotice('El canal de WhatsApp se habilita pronto. Dejá tu email y te avisamos.')
    window.setTimeout(() => document.querySelector<HTMLElement>('#estado-canal')?.focus(), 0)
  }

  const handleLead = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setNotice(`Gracias${email ? `, ${email}` : ''}. Te vamos a escribir cuando el acceso esté disponible.`)
  }

  return (
    <>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <header className="site-header" id="inicio">
        <Brand />
        <nav className="desktop-nav" aria-label="Navegación principal">
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#respuestas">Respuestas</a>
          <a href="#cobertura">Cobertura</a>
          <a className="desktop-nav__strong" href="#empresas">Empresas</a>
        </nav>
        <div className="header-actions">
          <PendingWhatsAppButton compact onPending={announcePendingChannel} />
          <button className="menu-button" type="button" aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menuOpen} aria-controls="navegacion-movil" onClick={() => setMenuOpen((open) => !open)}>
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
        {menuOpen && (
          <nav className="mobile-nav" id="navegacion-movil" aria-label="Navegación móvil">
            <a href="#como-funciona" onClick={() => setMenuOpen(false)}>Cómo funciona</a>
            <a href="#respuestas" onClick={() => setMenuOpen(false)}>Respuestas</a>
            <a href="#cobertura" onClick={() => setMenuOpen(false)}>Cobertura</a>
            <a href="#empresas" onClick={() => setMenuOpen(false)}>Empresas</a>
          </nav>
        )}
      </header>

      <main id="contenido">
        <section className="hero section-shell" aria-labelledby="hero-title">
          <div className="hero__copy">
            <Eyebrow hero>VERIFICACIÓN DE QR EN WHATSAPP</Eyebrow>
            <h1 id="hero-title">Que un QR funcione no significa que sea el correcto.</h1>
            <p className="hero__description">Antes de pagar o abrir un enlace, enviá una foto por WhatsApp. QRSafe contrasta el código, la organización declarada y el lugar donde aparece.</p>
            <div className="hero__actions">
              <PendingWhatsAppButton onPending={announcePendingChannel} />
              <a className="button button--secondary" href="#como-funciona"><ArrowDown aria-hidden="true" />Ver cómo funciona</a>
            </div>
            <p className="safety-copy"><Info aria-hidden="true" />QRSafe nunca te escribe primero. No pedimos datos ni cobramos por WhatsApp.</p>
          </div>
          <BindingVisual />
        </section>

        <section className="problem dark-section" aria-labelledby="problem-title">
          <div className="problem__header section-shell">
            <Eyebrow>EL PROBLEMA NO SIEMPRE ESTÁ DENTRO DEL QR</Eyebrow>
          </div>
          <div className="problem__steps section-shell">
            {problemSteps.map((step, index) => (
              <div className="problem-step" key={step}>
                <span className="technical">{String(index + 1).padStart(2, '0')}</span>
                <h2>{step}</h2>
              </div>
            ))}
          </div>
          <div className="problem__conclusion section-shell" id="problem-title">
            <CornerDownRight aria-hidden="true" />
            <p>Un código técnicamente válido también puede llevarte al destino equivocado.</p>
          </div>
        </section>

        <section className="thesis soft-section">
          <div className="section-shell split-section">
            <div className="section-copy">
              <Eyebrow>LA TESIS DE QRSAFE</Eyebrow>
              <h2>No verificamos sólo el código. Verificamos la relación.</h2>
              <p>QRSafe compara el contenido exacto del QR con un registro autorizado para ese punto.</p>
            </div>
            <div className="relationship-instrument">
              {relationship.map(({ icon: Icon, title, detail }, index) => (
                <div className="relationship-row" key={title}>
                  <span className="technical">{String(index + 1).padStart(2, '0')}</span>
                  <Icon aria-hidden="true" />
                  <span><strong>{title}</strong><small>{detail}</small></span>
                  {index === relationship.length - 1 ? <BadgeCheck aria-hidden="true" /> : <ArrowDown aria-hidden="true" />}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="how section-shell" id="como-funciona" aria-labelledby="how-title">
          <div className="section-heading">
            <div><Eyebrow>CÓMO FUNCIONA</Eyebrow><h2 id="how-title">Una foto con contexto.<br />{' '}Una respuesta precisa.</h2></div>
            <p>La conversación siempre<br />{' '}la iniciás vos.</p>
          </div>
          <div className="how__steps">
            {howSteps.map(({ icon: Icon, title, body }, index) => (
              <div className="how-step" key={title}>
                <span className="how-step__number">{String(index + 1).padStart(2, '0')}</span>
                <span className="how-step__icon"><Icon aria-hidden="true" /></span>
                <span className="how-step__copy"><strong>{title}</strong><small>{body}</small></span>
                {index < howSteps.length - 1 && <ArrowRight className="how-step__arrow" aria-hidden="true" />}
              </div>
            ))}
          </div>
        </section>

        <section className="responses soft-section" id="respuestas">
          <div className="section-shell split-section split-section--responses">
            <div className="section-copy response-copy">
              <Eyebrow>SISTEMA DE RESPUESTAS</Eyebrow>
              <h2>Decimos qué pudimos comprobar. Y qué no.</h2>
              <p><span className="desktop-copy">Cada resultado combina un nombre, un icono y una explicación. </span>Un QR desconocido no se presenta como fraudulento.</p>
              <div className="evidence-note"><Scale aria-hidden="true" /><strong>QRSafe sólo alerta cuando existe evidencia concreta.</strong></div>
            </div>
            <div className="results-instrument">
              <div className="results-instrument__header"><span>RESULTADO DE LA CONSULTA</span><span>EVIDENCIA / COBERTURA</span></div>
              {results.map(({ icon: Icon, name, detail, mobileDetail, tag, tone }) => (
                <div className={`result-row result-row--${tone}`} key={name}>
                  <Icon aria-hidden="true" />
                  <span><strong>{name}</strong><small><span className="desktop-copy">{detail}</span><span className="mobile-copy">{mobileDetail}</span></small></span>
                  <em>{tag}</em>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="channel dark-section">
          <div className="section-shell split-section">
            <div className="section-copy channel__copy">
              <MessageCircle className="channel__icon" aria-hidden="true" />
              <h2>WhatsApp se usa para verificar. Nada más.</h2>
              <p>El canal acompaña la consulta. El registro, la habilitación y cualquier pago futuro ocurren fuera del chat.</p>
            </div>
            <div className="channel__rules">
              {channelRules.map((rule, index) => (
                <div className="channel-rule" key={rule}>
                  <span className="technical">{String(index + 1).padStart(2, '0')}</span>
                  <Check aria-hidden="true" />
                  <strong>{rule}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="coverage section-shell" id="cobertura" aria-labelledby="coverage-title">
          <div className="section-heading coverage__heading">
            <div><Eyebrow>COBERTURA CONECTADA</Eyebrow><h2 id="coverage-title">La cobertura empieza con organizaciones que registran sus QR.</h2></div>
            <a className="button button--secondary" href="#empresas"><Building2 aria-hidden="true" />Conocer QRSafe para empresas</a>
          </div>
          <p className="coverage__mobile-copy">Las organizaciones construyen cobertura. Las personas la consultan antes de pagar.</p>
          <div className="coverage-flow">
            {coverage.map(({ icon: Icon, title, body }, index) => (
              <div className="coverage-node" key={title}>
                <div><Icon aria-hidden="true" /><span className="technical">{String(index + 1).padStart(2, '0')}</span></div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
          <a className="button button--secondary coverage__mobile-cta" href="#empresas"><Building2 aria-hidden="true" />Conocer QRSafe para empresas</a>
        </section>

        <section className="lead soft-section" id="empresas">
          <div className="section-shell split-section">
            <div className="section-copy lead__copy">
              <Eyebrow>ACCESO Y NOVEDADES</Eyebrow>
              <h2>Quiero probar QRSafe.</h2>
              <p>Dejanos tu email y te avisamos cuando haya acceso disponible.</p>
            </div>
            <form className="lead-form" onSubmit={handleLead}>
              <div className="lead-form__controls">
                <label htmlFor="email">Tu email<input id="email" name="email" type="email" autoComplete="email" required placeholder="tu@correo.com" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
                <button className="button button--primary" type="submit"><Mail aria-hidden="true" />Avisarme cuando tenga acceso</button>
              </div>
              <p>Usaremos tu email únicamente para informarte sobre el acceso a QRSafe.</p>
            </form>
          </div>
        </section>

        <section className="faq section-shell" aria-labelledby="faq-title">
          <div className="section-heading faq__heading">
            <div><Eyebrow>PREGUNTAS FRECUENTES</Eyebrow><h2 id="faq-title">Lo importante, antes de escanear.</h2></div>
            <MessageSquareMore aria-hidden="true" />
          </div>
          <div className="faq__columns">
            {faqs.map(([question, answer]) => (
              <details open key={question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="closing dark-section" aria-labelledby="closing-title">
          <ScanLine aria-hidden="true" />
          <h2 id="closing-title">Antes de pagar, comprobá si ese QR realmente pertenece ahí.</h2>
          <div className="closing__actions">
            <PendingWhatsAppButton inverse compact onPending={announcePendingChannel} />
            <a className="button button--dark" href="#empresas"><Mail aria-hidden="true" />Quiero recibir novedades</a>
          </div>
        </section>
      </main>

      <footer className="site-footer dark-section">
        <Brand light />
        <p>Verifica relaciones registradas. No procesa pagos.</p>
        <span className="technical">PERSONAS · EMPRESAS</span>
      </footer>

      {notice && <div className="channel-notice" id="estado-canal" role="status" tabIndex={-1}>{notice}<button type="button" aria-label="Cerrar aviso" onClick={() => setNotice('')}><X aria-hidden="true" /></button></div>}
    </>
  )
}

export default App
