import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  CircleAlert,
  FileCheck2,
  Fingerprint,
  Info,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  Plus,
  QrCode,
  ScanLine,
  Send,
  ShieldCheck,
  Upload,
} from 'lucide-react'
import './App.css'
import {
  ApiError,
  clearSession,
  createBinding,
  createBusiness,
  createPaymentPoint,
  getBindings,
  getBusiness,
  getPaymentPoints,
  previewQr,
  readSession,
  signIn,
  signUp,
  storeSession,
  submitBusiness,
} from './api'
import type { Business, PaymentPoint, QrBinding, QrPreview, Session } from './types'

type BusyAction = 'business' | 'verification' | 'point' | 'preview' | 'binding' | null

const steps = ['Organización', 'Revisión', 'Punto de cobro', 'QR autorizado']

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.'
}

function ErrorNotice({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="error-notice" role="alert">
      <CircleAlert size={19} aria-hidden="true" />
      <span>{message}</span>
      <button type="button" onClick={onClose}>Cerrar</button>
    </div>
  )
}

function Brand({ light = false }: { light?: boolean }) {
  return (
    <a className={`brand${light ? ' brand--light' : ''}`} href="/" aria-label="QRSafe, inicio">
      <ScanLine aria-hidden="true" />
      <span>QRSafe</span>
    </a>
  )
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (session: Session) => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signup')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '')
    const password = String(form.get('password') ?? '')

    try {
      const result = mode === 'signup' ? await signUp(email, password) : await signIn(email, password)
      if (!result.session) {
        setNotice('Cuenta creada. Revisa tu correo para confirmar el acceso y luego inicia sesión.')
        setMode('signin')
        return
      }
      storeSession(result.session)
      onAuthenticated(result.session)
    } catch (caught) {
      setError(messageOf(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-story" aria-label="QRSafe para organizaciones">
        <Brand light />
        <div className="auth-story-copy">
          <h1>Registro verificable para cada QR expuesto.</h1>
          <p>Vinculá la identidad de tu organización, cada punto de cobro y el código exacto que autorizaste.</p>
        </div>
        <div className="evidence-chain" aria-label="Cadena de evidencia">
          <div><small>01</small><Building2 aria-hidden="true" /><span><strong>Organización</strong>Identidad comercial revisada</span></div>
          <div><small>02</small><MapPin aria-hidden="true" /><span><strong>Punto de cobro</strong>Ubicación declarada</span></div>
          <div><small>03</small><QrCode aria-hidden="true" /><span><strong>QR autorizado</strong>Payload exacto registrado</span></div>
        </div>
        <p className="auth-story-note">QRSafe registra relaciones declaradas y verificables. No procesa pagos.</p>
      </section>

      <section className="auth-panel">
        <div className="auth-form-wrap">
          <header>
            <h2>{mode === 'signup' ? 'Ingresá al panel de tu organización.' : 'Continuá tu operación.'}</h2>
            <p>Administrá puntos de cobro y registrá los QR estáticos autorizados para cada ubicación.</p>
          </header>
          <div className="mode-switch" aria-label="Tipo de acceso">
            <button className={mode === 'signup' ? 'active' : ''} type="button" aria-pressed={mode === 'signup'} onClick={() => setMode('signup')}>Crear cuenta</button>
            <button className={mode === 'signin' ? 'active' : ''} type="button" aria-pressed={mode === 'signin'} onClick={() => setMode('signin')}>Iniciar sesión</button>
          </div>
          <form className="stack-form" onSubmit={handleSubmit}>
            <label>
              Email laboral
              <span className="input-with-icon"><Mail size={18} aria-hidden="true" /><input name="email" type="email" autoComplete="email" placeholder="nombre@organizacion.com" required /></span>
            </label>
            <label>
              Contraseña
              <span className="input-with-icon"><LockKeyhole size={18} aria-hidden="true" /><input name="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={8} placeholder="Mínimo 8 caracteres" required /></span>
            </label>
            {error && <ErrorNotice message={error} onClose={() => setError(null)} />}
            {notice && <div className="notice" role="status"><FileCheck2 size={18} aria-hidden="true" />{notice}</div>}
            <button className="primary-button full" disabled={busy} type="submit">
              {busy ? <LoaderCircle className="spin" size={19} /> : <ArrowRight size={19} />}
              {busy ? 'Verificando…' : mode === 'signup' ? 'Crear cuenta' : 'Ingresar al panel'}
            </button>
          </form>
          <p className="auth-footnote">La revisión de identidad del piloto es manual.</p>
        </div>
      </section>
    </main>
  )
}

function VerificationBadge({ business }: { business: Business | null }) {
  const status = business?.verification_status
  const state = status === 'verified' ? 'verified' : status === 'rejected' ? 'rejected' : status === 'submitted' ? 'pending' : 'draft'
  const label = status === 'verified'
    ? 'Organización verificada'
    : status === 'rejected'
      ? 'Revisión requerida'
      : status === 'submitted'
        ? 'En revisión'
        : 'Verificación por enviar'

  return (
    <div className={`verification-badge verification-badge--${state}`}>
      {state === 'verified' ? <ShieldCheck size={16} /> : state === 'rejected' ? <CircleAlert size={16} /> : <FileCheck2 size={16} />}
      {label}
    </div>
  )
}

function StepProgress({ completed, current }: { completed: boolean[]; current: number }) {
  return (
    <ol className="setup-progress" aria-label="Progreso de configuración">
      {steps.map((label, index) => {
        const state = completed[index] ? 'complete' : index === current ? 'current' : 'pending'
        return (
          <li className={`setup-progress__step setup-progress__step--${state}`} key={label}>
            <span>{completed[index] ? <Check size={14} aria-hidden="true" /> : index + 1}</span>
            <strong>{label}</strong>
            <small>{['Datos básicos', 'Identidad manual', 'Ubicación', 'Binding activo'][index]}</small>
          </li>
        )
      })}
    </ol>
  )
}

function ReviewStage({ business, busy, error, onSubmit, onClearError }: {
  business: Business
  busy: BusyAction
  error: string | null
  onSubmit: () => void
  onClearError: () => void
}) {
  if (business.verification_status === 'submitted') {
    return (
      <section className="review-stage review-stage--pending">
        <div className="review-main">
          <span className="status-seal status-seal--pending"><FileCheck2 size={28} /></span>
          <h2>Recibimos la solicitud de verificación.</h2>
          <p>El equipo está revisando la identidad comercial y la autoridad de la persona responsable. Te avisaremos cuando la organización quede habilitada.</p>
          <div className="review-timeline" role="status">
            <div><CheckCircle2 size={18} /><span><strong>Solicitud enviada</strong><small>Completado</small></span></div>
            <div><FileCheck2 size={18} /><span><strong>Revisión manual</strong><small>En curso</small></span></div>
            <div><LockKeyhole size={18} /><span><strong>Operación habilitada</strong><small>Pendiente</small></span></div>
          </div>
        </div>
        <aside className="review-aside">
          <h3>Datos enviados</h3>
          <dl>
            <div><dt>Organización</dt><dd>{business.name}</dd></div>
            <div><dt>CUIT</dt><dd>{business.tax_id || 'No informado'}</dd></div>
            <div><dt>Representante</dt><dd>{business.representative_name}</dd></div>
          </dl>
        </aside>
      </section>
    )
  }

  const rejected = business.verification_status === 'rejected'
  return (
    <section className="review-stage">
      <div className="review-main">
        <span className={`status-seal${rejected ? ' status-seal--rejected' : ''}`}><Building2 size={28} /></span>
        <h2>{rejected ? 'Necesitamos revisar nuevamente la identidad.' : 'Revisá la identidad antes de enviarla.'}</h2>
        <p>{rejected
          ? 'La presentación anterior no pudo aprobarse. Verificá que los datos declarados sigan vigentes y volvé a enviarlos al equipo.'
          : 'Para este piloto, la identidad comercial y la autoridad de la persona responsable se comprueban manualmente.'}</p>
        <dl className="review-dossier">
          <div><dt>Organización</dt><dd>{business.name}</dd></div>
          <div><dt>Identificación fiscal</dt><dd>{business.tax_id || 'No informado'}</dd></div>
          <div><dt>Representante</dt><dd>{business.representative_name}</dd></div>
          <div><dt>Modalidad</dt><dd>Revisión manual · Piloto</dd></div>
        </dl>
        {rejected && <div className="review-warning"><Info size={18} /><span>El MVP no muestra un motivo específico. Si necesitás corregir los datos, contactá al equipo antes de reenviar.</span></div>}
        {error && <ErrorNotice message={error} onClose={onClearError} />}
        <button className="primary-button" disabled={busy === 'verification'} type="button" onClick={onSubmit}>
          {busy === 'verification' ? <LoaderCircle className="spin" size={18} /> : <Send size={18} />}
          {busy === 'verification' ? 'Enviando…' : rejected ? 'Volver a enviar' : 'Enviar a verificación'}
        </button>
      </div>
      <aside className="review-aside">
        <LockKeyhole size={24} aria-hidden="true" />
        <h3>{rejected ? 'La operación sigue bloqueada.' : 'La organización todavía no está verificada.'}</h3>
        <p>No podrás crear puntos ni registrar QR hasta que la organización sea aprobada.</p>
        <small>Estado de cobertura: sin publicar</small>
      </aside>
    </section>
  )
}

function App() {
  const [session, setSession] = useState<Session | null>(() => readSession())
  const [business, setBusiness] = useState<Business | null>(null)
  const [points, setPoints] = useState<PaymentPoint[]>([])
  const [bindings, setBindings] = useState<QrBinding[]>([])
  const [selectedPointId, setSelectedPointId] = useState('')
  const [preview, setPreview] = useState<QrPreview | null>(null)
  const [lastBinding, setLastBinding] = useState<QrBinding | null>(null)
  const [registerAnother, setRegisterAnother] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading] = useState(Boolean(session))
  const [busy, setBusy] = useState<BusyAction>(null)
  const [error, setError] = useState<string | null>(null)
  const [showPointForm, setShowPointForm] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!session) return
    let cancelled = false
    const token = session.access_token

    async function loadWorkspace() {
      setLoading(true)
      setError(null)
      try {
        const businessResult = await getBusiness(token)
        if (cancelled) return
        setBusiness(businessResult.business)
        if (businessResult.business) {
          const [pointResult, bindingResult] = await Promise.all([
            getPaymentPoints(token),
            getBindings(token),
          ])
          if (cancelled) return
          setPoints(pointResult.paymentPoints)
          setBindings(bindingResult.bindings)
          setSelectedPointId((current) => current || pointResult.paymentPoints[0]?.id || '')
        }
      } catch (caught) {
        if (caught instanceof ApiError && caught.status === 401) {
          clearSession()
          setSession(null)
        } else if (!cancelled) {
          setError(messageOf(caught))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadWorkspace()
    return () => { cancelled = true }
  }, [session])

  function logout() {
    clearSession()
    setSession(null)
    setBusiness(null)
    setPoints([])
    setBindings([])
    setSelectedPointId('')
    setPreview(null)
    setLastBinding(null)
    setRegisterAnother(false)
    setConfirmed(false)
    setError(null)
    setShowPointForm(false)
  }

  function selectPoint(pointId: string) {
    setSelectedPointId(pointId)
    setPreview(null)
    setLastBinding(null)
    setRegisterAnother(false)
    setConfirmed(false)
    setError(null)
  }

  async function handleBusiness(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!session) return
    setBusy('business')
    setError(null)
    const form = new FormData(event.currentTarget)
    try {
      const result = await createBusiness(session.access_token, {
        name: String(form.get('name') ?? ''),
        taxId: String(form.get('taxId') ?? ''),
        representativeName: String(form.get('representativeName') ?? ''),
      })
      setBusiness(result.business)
    } catch (caught) {
      setError(messageOf(caught))
    } finally {
      setBusy(null)
    }
  }

  async function handleVerification() {
    if (!session) return
    setBusy('verification')
    setError(null)
    try {
      const result = await submitBusiness(session.access_token)
      setBusiness(result.business)
    } catch (caught) {
      setError(messageOf(caught))
    } finally {
      setBusy(null)
    }
  }

  async function handlePoint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!session) return
    setBusy('point')
    setError(null)
    const form = new FormData(event.currentTarget)
    try {
      const result = await createPaymentPoint(session.access_token, {
        name: String(form.get('name') ?? ''),
        address: String(form.get('address') ?? ''),
      })
      setPoints((current) => [...current, result.paymentPoint])
      selectPoint(result.paymentPoint.id)
      setShowPointForm(false)
      event.currentTarget.reset()
    } catch (caught) {
      setError(messageOf(caught))
    } finally {
      setBusy(null)
    }
  }

  async function handleFile(file: File | undefined) {
    if (!session || !selectedPointId || !file) return
    setBusy('preview')
    setError(null)
    setPreview(null)
    setConfirmed(false)
    try {
      setPreview(await previewQr(session.access_token, selectedPointId, file))
    } catch (caught) {
      setError(messageOf(caught))
    } finally {
      setBusy(null)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function handleBinding() {
    if (!session || !preview || !selectedPointId || !confirmed) return
    setBusy('binding')
    setError(null)
    try {
      const result = await createBinding(session.access_token, {
        paymentPointId: selectedPointId,
        payload: preview.payload,
        destinationConfirmed: true,
      })
      setBindings((current) => [...current, result.binding])
      setLastBinding(result.binding)
      setRegisterAnother(false)
      setPreview(null)
      setConfirmed(false)
    } catch (caught) {
      setError(messageOf(caught))
    } finally {
      setBusy(null)
    }
  }

  if (!session) return <AuthScreen onAuthenticated={setSession} />

  const isVerified = business?.verification_status === 'verified'
  const activeBindings = bindings.filter((binding) => binding.status === 'active')
  const selectedPoint = points.find((point) => point.id === selectedPointId) ?? null
  const selectedBindings = bindings.filter((binding) => binding.payment_point_id === selectedPointId)
  const selectedActiveBindings = selectedBindings.filter((binding) => binding.status === 'active')
  const completed = [Boolean(business), isVerified, points.length > 0, activeBindings.length > 0]
  const currentStep = !business ? 0 : !isVerified ? 1 : points.length === 0 ? 2 : 3
  const receipt = !registerAnother
    ? lastBinding?.payment_point_id === selectedPointId
      ? lastBinding
      : selectedActiveBindings.at(-1) ?? null
    : null

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <Brand light />
          <nav className="side-nav" aria-label="Panel de organización">
            <a className="active" href="#operacion"><Building2 size={18} />Operación</a>
            <a href="#puntos"><MapPin size={18} />Puntos de cobro</a>
            <a href="#bindings"><QrCode size={18} />QR registrados</a>
          </nav>
        </div>
        <div className="sidebar-bottom">
          <div className="coverage-note"><span><CheckCircle2 size={16} />Consulta por WhatsApp</span><p>Las personas consultan la cobertura que tu organización registra.</p></div>
          <div className="account-row"><span>{business?.name.slice(0, 2).toUpperCase() || 'OR'}</span><div><strong>{business?.name || 'Organización'}</strong><button type="button" onClick={logout}>Cerrar sesión</button></div><LogOut size={17} aria-hidden="true" /></div>
        </div>
      </aside>

      <main className="workspace" id="operacion">
        <header className="workspace-header">
          <div><h1>{business?.name ?? 'Configuración inicial'}</h1><p>{business ? 'Administrá la cobertura registrada de tu organización.' : 'Prepará la cobertura verificable de tu organización.'}</p></div>
          <VerificationBadge business={business} />
        </header>
        <StepProgress completed={completed} current={currentStep} />

        {loading ? (
          <section className="loading-state" aria-live="polite"><LoaderCircle className="spin" size={30} /><p>Sincronizando tu operación…</p></section>
        ) : !business ? (
          <section className="organization-stage">
            <div className="organization-stage__context">
              <Building2 size={25} aria-hidden="true" />
              <h2>Registrá la organización que autoriza estos cobros.</h2>
              <p>Estos datos serán la referencia visible cuando una persona consulte uno de tus QR registrados.</p>
              <div className="relationship-list"><span><Building2 size={17} />Organización <strong>A definir</strong></span><span><MapPin size={17} />Punto <strong>Bloqueado</strong></span><span><QrCode size={17} />QR <strong>Bloqueado</strong></span></div>
            </div>
            <form className="organization-stage__form" onSubmit={handleBusiness}>
              <div><h2>Datos de la organización</h2><p>Usá la identidad que sostendrá la cobertura registrada.</p></div>
              <label>Nombre comercial<input name="name" placeholder="Ej. Café del Centro" maxLength={200} required /></label>
              <label>CUIT<input name="taxId" placeholder="30-12345678-9" maxLength={30} required /></label>
              <label>Persona responsable<input name="representativeName" placeholder="Nombre y apellido" maxLength={200} required /></label>
              {error && <ErrorNotice message={error} onClose={() => setError(null)} />}
              <footer><small>Podrás revisar los datos antes de enviarlos.</small><button className="primary-button" disabled={busy === 'business'} type="submit">{busy === 'business' ? <LoaderCircle className="spin" size={18} /> : <ArrowRight size={18} />}Guardar y continuar</button></footer>
            </form>
          </section>
        ) : !isVerified ? (
          <ReviewStage business={business} busy={busy} error={error} onSubmit={handleVerification} onClearError={() => setError(null)} />
        ) : (
          <div className="operations">
            <section className="points-panel" id="puntos">
              <header><div><h2>Puntos de cobro</h2><p>Elegí el lugar exacto donde opera el código.</p></div><button className="secondary-button" type="button" aria-expanded={showPointForm} aria-controls="point-form" onClick={() => setShowPointForm((value) => !value)}><Plus size={17} />Nuevo punto</button></header>
              {showPointForm && (
                <form className="point-form" id="point-form" onSubmit={handlePoint}>
                  <label>Nombre del punto<input name="name" placeholder="Sucursal Centro" maxLength={160} required /></label>
                  <label>Dirección<input name="address" placeholder="Av. Corrientes 1234, CABA" maxLength={300} /></label>
                  <div className="point-form__actions"><button className="text-button" type="button" onClick={() => setShowPointForm(false)}>Cancelar</button><button className="primary-button" disabled={busy === 'point'} type="submit">{busy === 'point' ? <LoaderCircle className="spin" size={17} /> : <Plus size={17} />}Crear punto</button></div>
                </form>
              )}
              {error && (showPointForm || points.length === 0) && <ErrorNotice message={error} onClose={() => setError(null)} />}
              {points.length === 0 ? (
                <button className="empty-point" type="button" onClick={() => setShowPointForm(true)}><MapPin size={28} /><strong>Creá tu primer punto de cobro</strong><span>Puede ser una sucursal, caja, mesa o mostrador.</span></button>
              ) : (
                <fieldset className="point-selector"><legend>Seleccioná un punto de cobro</legend>{points.map((point) => (
                  <label className={`point-option${selectedPointId === point.id ? ' selected' : ''}`} key={point.id}>
                    <input type="radio" name="payment-point" checked={selectedPointId === point.id} onChange={() => selectPoint(point.id)} />
                    <MapPin size={20} aria-hidden="true" /><span><strong>{point.name}</strong><small>{point.address || 'Sin dirección informada'}</small></span><CheckCircle2 size={18} aria-hidden="true" />
                  </label>
                ))}</fieldset>
              )}
            </section>

            <section className="binding-panel" id="bindings">
              <header className="binding-panel__header"><div><span><QrCode size={18} />Registro QR autorizado</span><h2>{selectedPoint ? `QR para ${selectedPoint.name}` : 'Seleccioná un punto de cobro'}</h2></div>{selectedPoint && <small>{selectedActiveBindings.length} {selectedActiveBindings.length === 1 ? 'QR activo' : 'QR activos'} en este punto</small>}</header>
              {!selectedPoint ? (
                <div className="binding-empty"><MapPin size={28} /><p>Primero creá y seleccioná un punto de cobro.</p></div>
              ) : receipt ? (
                <div className="binding-receipt" role="status" aria-live="polite">
                  <div className="receipt-seal"><ShieldCheck size={34} /><span>Binding activo</span></div>
                  <div className="receipt-copy"><h3>QR autorizado para {selectedPoint.name}.</h3><p>El payload quedó registrado como medio de cobro autorizado por <strong>{business.name}</strong> para <strong>{selectedPoint.name}</strong>.</p><div className="receipt-fingerprint"><Fingerprint size={17} /><code>{receipt.payload_sha256}</code></div><div className="receipt-context"><span><Building2 size={16} />{business.name}</span><span><MapPin size={16} />{selectedPoint.name}</span></div></div>
                  <button className="primary-button" type="button" onClick={() => { setRegisterAnother(true); setLastBinding(null); setError(null) }}><Plus size={17} />Registrar otro QR</button>
                </div>
              ) : preview ? (
                <div className="preview-layout">
                  <div className="preview-readout"><div className="qr-readout"><QrCode size={58} /></div><span><CheckCircle2 size={16} />Lectura completa</span><h3>{preview.summary.declaredName || business.name}</h3><p>{preview.decode.attempts} {preview.decode.attempts === 1 ? 'intento' : 'intentos'}{preview.decode.dimensions ? ` · ${preview.decode.dimensions.width} × ${preview.decode.dimensions.height} px` : ''}</p><code>{preview.payload.slice(0, 28)}…{preview.payload.slice(-8)}</code></div>
                  <div className="preview-data"><h3>Confirmá el destino detectado</h3><p>Activá el binding sólo si reconocés este destino como autorizado.</p><dl><div><dt>Tipo</dt><dd>QR EMV estático</dd></div><div><dt>País / moneda</dt><dd>{preview.summary.country || '—'} / {preview.summary.currency === '032' ? 'ARS' : preview.summary.currency || '—'}</dd></div>{preview.summary.accounts.map((account, index) => <div key={`${account.template}-${account.value}`}><dt>{preview.summary.accounts.length > 1 ? `Destino ${index + 1}` : 'Destino detectado'}</dt><dd><code>{account.value}</code><small>{account.scheme || 'Esquema no declarado'}</small></dd></div>)}</dl><label className="confirmation-check"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span><strong>Confirmo que este destino está autorizado por mi organización.</strong><small>QRSafe registrará el payload exacto sin recortarlo ni normalizarlo.</small></span></label>{error && <ErrorNotice message={error} onClose={() => setError(null)} />}<footer><button className="text-button" type="button" onClick={() => { setPreview(null); setConfirmed(false) }}>Elegir otra imagen</button><button className="primary-button" disabled={!confirmed || busy === 'binding'} type="button" onClick={handleBinding}>{busy === 'binding' ? <LoaderCircle className="spin" size={18} /> : <ShieldCheck size={18} />}Activar binding</button></footer></div>
                </div>
              ) : (
                <div className="upload-layout"><aside><h3>Relación que vas a registrar</h3><span><Building2 size={18} />{business.name}</span><span><MapPin size={18} />{selectedPoint.name}</span><span><QrCode size={18} />Esperando imagen</span></aside><div className="upload-zone">{error && <ErrorNotice message={error} onClose={() => setError(null)} />}<input ref={fileInput} id="qr-file" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void handleFile(event.target.files?.[0])} /><label htmlFor="qr-file" className={busy === 'preview' ? 'upload-label busy' : 'upload-label'}>{busy === 'preview' ? <LoaderCircle className="spin" size={32} /> : <Upload size={32} />}<strong>{busy === 'preview' ? 'Leyendo el código…' : 'Subí una foto del QR estático'}</strong><span>PNG, JPG o WEBP · Hasta 20 MB</span><b>{busy === 'preview' ? 'Analizando…' : 'Elegir imagen'}</b></label></div></div>
              )}
              {selectedPoint && selectedBindings.length > 0 && <div className="binding-list"><header><h3>QR registrados en {selectedPoint.name}</h3><small>Mostrando sólo el punto seleccionado</small></header><div className="binding-table"><div className="binding-table__heading"><span>Fingerprint</span><span>Destino</span><span>Registrado</span><span>Estado</span></div>{selectedBindings.map((binding) => <div className="binding-row" key={binding.id}><span><Fingerprint size={16} /><code>{binding.payload_sha256.slice(0, 16)}…</code></span><code>{binding.extracted_data.accounts[0]?.value || 'No declarado'}</code><time dateTime={binding.created_at}>{new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(binding.created_at))}</time><span className={binding.status === 'active' ? 'binding-status binding-status--active' : 'binding-status'}>{binding.status === 'active' ? <CheckCircle2 size={16} /> : <CircleAlert size={16} />}{binding.status === 'active' ? 'Activo' : 'Inactivo'}</span></div>)}</div></div>}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
