import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  CircleAlert,
  FileCheck2,
  Fingerprint,
  LoaderCircle,
  LogOut,
  MapPin,
  Plus,
  QrCode,
  Radio,
  ScanLine,
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

type BusyAction = 'auth' | 'business' | 'verification' | 'point' | 'preview' | 'binding' | null

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.'
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
      <section className="auth-story" aria-label="QRSafe">
        <a className="brand brand-on-dark" href="/" aria-label="QRSafe, inicio">
          <span className="brand-mark"><ScanLine size={21} aria-hidden="true" /></span>
          <span>QRSafe</span>
        </a>
        <div className="radar" aria-hidden="true">
          <span className="radar-sweep" />
          <span className="radar-node radar-node-a" />
          <span className="radar-node radar-node-b" />
          <Fingerprint className="radar-center" size={42} strokeWidth={1.2} />
        </div>
        <div className="auth-copy">
          <h1>Tu operación de cobro, identificada.</h1>
          <p>Registra los QR autorizados por tu empresa y ofrece una respuesta verificable antes de cada pago.</p>
        </div>
        <div className="signal-line">
          <Fingerprint size={15} aria-hidden="true" />
          Registro de identidad QRSafe
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-form-wrap">
          <div className="auth-heading">
            <span className="instrument-label">ACCESO MERCHANT</span>
            <h2>{mode === 'signup' ? 'Crea tu cuenta' : 'Continúa tu operación'}</h2>
            <p>{mode === 'signup' ? 'Empieza registrando a la persona responsable.' : 'Ingresa con las credenciales de tu empresa.'}</p>
          </div>

          <div className="mode-switch" aria-label="Tipo de acceso">
            <button className={mode === 'signup' ? 'active' : ''} type="button" aria-pressed={mode === 'signup'} onClick={() => setMode('signup')}>Crear cuenta</button>
            <button className={mode === 'signin' ? 'active' : ''} type="button" aria-pressed={mode === 'signin'} onClick={() => setMode('signin')}>Iniciar sesión</button>
          </div>

          <form className="stack-form" onSubmit={handleSubmit}>
            <label>
              Correo electrónico
              <input name="email" type="email" autoComplete="email" placeholder="nombre@empresa.com" required />
            </label>
            <label>
              Contraseña
              <input name="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={8} placeholder="Mínimo 8 caracteres" required />
            </label>
            {error && <div className="inline-message error" role="alert"><CircleAlert size={18} />{error}</div>}
            {notice && <div className="inline-message notice" role="status"><FileCheck2 size={18} />{notice}</div>}
            <button className="primary-button full" disabled={busy} type="submit">
              {busy ? <LoaderCircle className="spin" size={19} /> : <ArrowRight size={19} />}
              {busy ? 'Verificando…' : mode === 'signup' ? 'Crear cuenta merchant' : 'Ingresar al panel'}
            </button>
          </form>
          <p className="auth-footnote">QRSafe nunca solicita datos bancarios ni realiza cobros desde este panel.</p>
        </div>
      </section>
    </main>
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
    async function loadWorkspace() {
      setLoading(true)
      setError(null)
      try {
        const token = session?.access_token ?? ''
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
      setSelectedPointId(result.paymentPoint.id)
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
  const completed = [Boolean(business), isVerified, points.length > 0, activeBindings.length > 0]
  const completedCount = completed.filter(Boolean).length
  const pointById = new Map(points.map((point) => [point.id, point]))
  const receipt = lastBinding ?? (!registerAnother ? activeBindings.at(-1) ?? null : null)
  const verificationLabel = business?.verification_status === 'submitted'
    ? 'En revisión manual'
    : business?.verification_status === 'rejected'
      ? 'Revisión requerida'
      : isVerified
        ? 'Empresa verificada'
        : 'Verificación por enviar'

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand brand-on-dark" href="/" aria-label="QRSafe, inicio">
          <span className="brand-mark"><ScanLine size={21} /></span>
          <span>QRSafe</span>
        </a>
        <nav className="side-nav" aria-label="Panel merchant">
          <a className="active" href="#operacion"><Radio size={18} />Operación</a>
          <a href="#puntos"><MapPin size={18} />Puntos de cobro</a>
          <a href="#bindings"><QrCode size={18} />QR registrados</a>
        </nav>
        <div className="sidebar-status">
          <Radio size={16} aria-hidden="true" />
          <div><strong>Verificación B2C</strong><span>Canal WhatsApp</span></div>
        </div>
        <button className="logout-button" type="button" onClick={logout}><LogOut size={17} />Cerrar sesión</button>
      </aside>

      <main className="workspace" id="operacion">
        <header className="workspace-header">
          <div>
            <span className="instrument-label">PANEL MERCHANT</span>
            <h1>{business?.name ?? 'Configura tu empresa'}</h1>
          </div>
          <div className={`verification-badge ${isVerified ? 'verified' : business?.verification_status === 'rejected' ? 'rejected' : ''}`}>
            {isVerified ? <ShieldCheck size={18} /> : business?.verification_status === 'rejected' ? <CircleAlert size={18} /> : <LoaderCircle size={18} />}
            {verificationLabel}
          </div>
        </header>

        <section className="flight-strip" aria-label="Progreso de configuración">
          <div className="flight-readout">
            <span>OPERATIVIDAD</span>
            <strong>{completedCount}/4</strong>
          </div>
          <div className="flight-steps">
            {['Empresa', 'Identidad', 'Punto', 'Binding'].map((label, index) => (
              <div className={completed[index] ? 'flight-step complete' : 'flight-step'} key={label}>
                <span>{completed[index] ? <Check size={14} /> : index + 1}</span>
                {label}
              </div>
            ))}
          </div>
        </section>

        {error && <div className="page-error" role="alert"><CircleAlert size={20} /><span>{error}</span><button type="button" onClick={() => setError(null)}>Cerrar</button></div>}

        {loading ? (
          <section className="loading-state"><LoaderCircle className="spin" size={30} /><p>Sincronizando tu operación…</p></section>
        ) : !business ? (
          <section className="task-stage">
            <div className="stage-copy">
              <span className="stage-marker">PRIMERA COMPROBACIÓN</span>
              <h2>Identifica a la empresa que autoriza el cobro.</h2>
              <p>Estos datos serán la referencia que QRSafe mostrará al verificar uno de tus QR registrados.</p>
            </div>
            <form className="operation-form" onSubmit={handleBusiness}>
              <label>Nombre comercial<input name="name" placeholder="Ej. Café del Centro" maxLength={200} required /></label>
              <label>CUIT<input name="taxId" placeholder="30-12345678-9" maxLength={30} required /></label>
              <label>Persona responsable<input name="representativeName" placeholder="Nombre y apellido" maxLength={200} required /></label>
              <button className="primary-button" disabled={busy === 'business'} type="submit">
                {busy === 'business' ? <LoaderCircle className="spin" size={19} /> : <ArrowRight size={19} />}
                Guardar y continuar
              </button>
            </form>
          </section>
        ) : !isVerified ? (
          <section className="task-stage verification-stage">
            <div className="identity-seal"><Building2 size={36} /><span>{business.name.slice(0, 2).toUpperCase()}</span></div>
            <div className="stage-copy">
              <span className="stage-marker">REVISIÓN DE IDENTIDAD</span>
              <h2>La empresa está lista para su comprobación.</h2>
              <p>Para este piloto, la identidad comercial y la autoridad del representante serán revisadas manualmente.</p>
              <dl className="review-list">
                <div><dt>Empresa</dt><dd>{business.name}</dd></div>
                <div><dt>Identificación fiscal</dt><dd>{business.tax_id}</dd></div>
                <div><dt>Representante</dt><dd>{business.representative_name}</dd></div>
                <div><dt>Modalidad</dt><dd>Revisión manual · Piloto</dd></div>
              </dl>
              {business.verification_status === 'submitted' ? (
                <div className="inline-message review-wait" role="status"><LoaderCircle size={18} />La revisión manual fue enviada. Te avisaremos cuando esté aprobada.</div>
              ) : (
              <button className="primary-button" disabled={busy === 'verification'} type="button" onClick={handleVerification}>
                {busy === 'verification' ? <LoaderCircle className="spin" size={19} /> : <FileCheck2 size={19} />}
                {business.verification_status === 'rejected' ? 'Volver a enviar' : 'Enviar a verificación'}
              </button>
              )}
            </div>
          </section>
        ) : (
          <div className="operations-console">
            <section className="control-grid" id="puntos">
              <div className="control-heading">
                <div><span className="instrument-label">PUNTOS DE COBRO</span><h2>¿Dónde opera este QR?</h2></div>
                <button className="secondary-button" type="button" onClick={() => setShowPointForm((value) => !value)}><Plus size={17} />Nuevo punto</button>
              </div>

              {showPointForm && (
                <form className="inline-form" onSubmit={handlePoint}>
                  <label>Nombre<input name="name" placeholder="Sucursal Centro" maxLength={160} required /></label>
                  <label>Dirección<input name="address" placeholder="Av. Siempre Viva 123" maxLength={300} /></label>
                  <button className="primary-button compact" disabled={busy === 'point'} type="submit">{busy === 'point' ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />}Crear punto</button>
                </form>
              )}

              {points.length === 0 ? (
                <button className="empty-point" type="button" onClick={() => setShowPointForm(true)}><MapPin size={28} /><strong>Crea tu primer punto de cobro</strong><span>Puede ser una sucursal, caja, mesa o mostrador.</span></button>
              ) : (
                <div className="point-selector" role="radiogroup" aria-label="Punto seleccionado">
                  {points.map((point) => (
                      <button className={selectedPointId === point.id ? 'point-option selected' : 'point-option'} type="button" role="radio" aria-checked={selectedPointId === point.id} onClick={() => { setSelectedPointId(point.id); setPreview(null); setLastBinding(null); setRegisterAnother(false) }} key={point.id}>
                      <span className="point-icon"><MapPin size={20} /></span>
                      <span><strong>{point.name}</strong><small>{point.address || 'Sin dirección informada'}</small></span>
                      <span className="radio-mark" />
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="binding-console" id="bindings">
              <div className="console-header">
                <div><span className="instrument-label">REGISTRO DE BINDING</span><h2>Conecta el QR con tu empresa.</h2></div>
                <div className="console-counter"><strong>{activeBindings.length}</strong><span>activos</span></div>
              </div>

              {!selectedPointId ? (
                <div className="console-empty"><MapPin size={30} /><p>Primero crea y selecciona un punto de cobro.</p></div>
              ) : receipt ? (
                <div className="binding-receipt" role="status" aria-live="polite">
                  <div className="receipt-seal"><ShieldCheck size={38} /><span>ACTIVO</span></div>
                  <div className="receipt-copy">
                    <span className="stage-marker">BINDING CONFIRMADO</span>
                    <h3>Este QR ya puede verificarse.</h3>
                    <p>Quedó registrado como medio de cobro autorizado por <strong>{business.name}</strong> para <strong>{pointById.get(receipt.payment_point_id)?.name ?? 'el punto seleccionado'}</strong>.</p>
                    <div className="receipt-fingerprint"><Fingerprint size={17} /><span>{receipt.payload_sha256}</span></div>
                  </div>
                  <button className="secondary-button" type="button" onClick={() => { setRegisterAnother(true); setLastBinding(null) }}><Plus size={17} />Registrar otro QR</button>
                </div>
              ) : preview ? (
                <div className="preview-layout">
                  <div className="preview-signal">
                    <div className="scan-frame"><QrCode size={54} /><span className="scan-beam" /></div>
                    <div><span>LECTURA COMPLETA</span><strong>{preview.summary.declaredName || 'Sin nombre declarado'}</strong><small>{preview.decode.attempts} intentos de lectura</small></div>
                  </div>
                  <div className="preview-data">
                    <dl>
                      <div><dt>Tipo</dt><dd>{preview.summary.isStatic ? 'QR EMV estático' : 'QR no admitido'}</dd></div>
                      <div><dt>País / moneda</dt><dd>{preview.summary.country || '—'} / {preview.summary.currency === '032' ? 'ARS' : preview.summary.currency || '—'}</dd></div>
                      <div><dt>Destino detectado</dt><dd className="technical-value">{preview.summary.accounts[0]?.value || 'No disponible'}</dd></div>
                      <div><dt>Esquema</dt><dd>{preview.summary.accounts[0]?.scheme || 'No declarado'}</dd></div>
                    </dl>
                    <label className="confirmation-check">
                      <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
                      <span><strong>Confirmo que este destino está autorizado por mi empresa.</strong><small>QRSafe registrará el payload exacto de este QR.</small></span>
                    </label>
                    <div className="preview-actions">
                      <button className="text-button" type="button" onClick={() => setPreview(null)}>Elegir otra imagen</button>
                      <button className="primary-button" disabled={!confirmed || !preview.summary.isStatic || preview.summary.accounts.length === 0 || busy === 'binding'} type="button" onClick={handleBinding}>{busy === 'binding' ? <LoaderCircle className="spin" size={19} /> : <ShieldCheck size={19} />}Activar binding</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="upload-zone">
                  <input ref={fileInput} id="qr-file" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void handleFile(event.target.files?.[0])} />
                  <label htmlFor="qr-file" className={busy === 'preview' ? 'upload-label busy' : 'upload-label'}>
                    {busy === 'preview' ? <LoaderCircle className="spin" size={32} /> : <Upload size={32} />}
                    <strong>{busy === 'preview' ? 'Leyendo el código…' : 'Sube una foto del QR estático'}</strong>
                    <span>PNG, JPG o WEBP · Hasta 20 MB</span>
                  </label>
                </div>
              )}

              {bindings.length > 0 && (
                <div className="binding-list">
                  <div className="binding-list-heading"><span>Bindings registrados</span><span>Punto de cobro</span><span>Estado</span></div>
                  {bindings.map((binding) => (
                    <div className="binding-row" key={binding.id}>
                      <span className="binding-id"><Fingerprint size={18} />{binding.payload_sha256.slice(0, 12)}…</span>
                      <span>{pointById.get(binding.payment_point_id)?.name ?? 'Punto registrado'}</span>
                      <span className={binding.status === 'active' ? 'active-state' : 'inactive-state'}>{binding.status === 'active' ? <CheckCircle2 size={16} /> : <CircleAlert size={16} />}{binding.status === 'active' ? 'Activo' : 'Inactivo'}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
