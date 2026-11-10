import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../services/api';

const EMAIL_REGEX = /^[a-z0-9._%+-]+@uab\.edu\.bo$/i;

const FACULTADES = [
  'Ingeniería',
  'Ciencias de la Salud',
  'Ciencias Empresariales',
  'Teología',
  'Ciencias Jurídicas',
  'Humanidades',
];

export default function RegisterPage() {
  const { register, verifyOtp, resendOtp, isAuthenticated } = useAuth();
  const [paso, setPaso] = useState(1);
  const [form, setForm] = useState({
    nombre: '',
    correo: '',
    codigoEstudiantil: '',
    facultad: '',
    password: '',
    confirmar: '',
  });
  const [codigo, setCodigo] = useState('');
  const [otpDesarrollo, setOtpDesarrollo] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const cambiar = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const enviarRegistro = async (e) => {
    e.preventDefault();
    setError('');

    if (!EMAIL_REGEX.test(form.correo.trim())) {
      return setError('Debe usar un correo institucional @uab.edu.bo');
    }
    if (!form.facultad) {
      return setError('Seleccione su facultad');
    }
    if (form.password.length < 8) {
      return setError('La contraseña debe tener al menos 8 caracteres');
    }
    if (form.password !== form.confirmar) {
      return setError('Las contraseñas no coinciden');
    }

    const datos = {
      nombre: form.nombre.trim(),
      correo: form.correo.trim(),
      password: form.password,
      facultad: form.facultad,
    };
    if (form.codigoEstudiantil.trim()) datos.codigoEstudiantil = form.codigoEstudiantil.trim();

    setEnviando(true);
    try {
      const respuesta = await register(datos);
      setOtpDesarrollo(respuesta.otpDesarrollo || '');
      setInfo('Cuenta creada. Ingresa el código de 6 dígitos enviado a tu correo institucional.');
      setPaso(2);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setEnviando(false);
    }
  };

  const enviarCodigo = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setEnviando(true);
    try {
      await verifyOtp(form.correo.trim(), codigo.trim());
    } catch (err) {
      setError(getErrorMessage(err));
      setEnviando(false);
    }
  };

  const reenviar = async () => {
    setError('');
    try {
      const respuesta = await resendOtp(form.correo.trim());
      setOtpDesarrollo(respuesta.otpDesarrollo || '');
      setInfo(respuesta.message);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.25fr]">
      <aside className="hidden flex-col justify-between bg-[#0B2545] p-10 lg:flex">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-display flex h-9 w-9 items-center justify-center rounded-lg bg-[#00C16E] text-sm font-extrabold text-[#0B2545]">
            CL
          </span>
          <span className="font-display text-lg font-semibold text-white">Campus League</span>
        </Link>

        <div>
          <h1 className="font-display text-5xl font-bold leading-tight text-white">
            Únete a la
            <br />
            <span className="text-[#00C16E]">Liga.</span>
          </h1>
          <p className="mt-4 max-w-sm text-base text-gray-300">
            Regístrate y empieza a competir en los torneos deportivos de tu universidad.
          </p>
        </div>

        <p className="text-xs text-gray-400">© 2025 Campus League</p>
      </aside>

      <main className="flex items-center justify-center bg-[#121E2D] px-6 py-10">
        <div className="w-full max-w-lg">
          <Link to="/" className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="font-display flex h-9 w-9 items-center justify-center rounded-lg bg-[#00C16E] text-sm font-extrabold text-[#0B2545]">
              CL
            </span>
            <span className="font-display text-lg font-semibold text-white">Campus League</span>
          </Link>

          {paso === 1 ? (
            <>
              <h2 className="font-display text-3xl font-bold text-white">Crear Cuenta</h2>
              <p className="mt-1 text-sm text-gray-400">Completa tus datos de estudiante universitario.</p>

              <form onSubmit={enviarRegistro} className="mt-6 space-y-4" noValidate>
                {error && (
                  <div className="alert-error" role="alert">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="nombre" className="label-dark">
                    Nombre completo
                  </label>
                  <input
                    id="nombre"
                    name="nombre"
                    required
                    className="input-dark"
                    placeholder="Carlos Martínez"
                    value={form.nombre}
                    onChange={cambiar}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="correo" className="label-dark">
                      Correo universitario
                    </label>
                    <input
                      id="correo"
                      name="correo"
                      type="email"
                      autoComplete="email"
                      required
                      className="input-dark"
                      placeholder="nombre@uab.edu.bo"
                      value={form.correo}
                      onChange={cambiar}
                    />
                  </div>
                  <div>
                    <label htmlFor="codigoEstudiantil" className="label-dark">
                      Código estudiantil
                    </label>
                    <input
                      id="codigoEstudiantil"
                      name="codigoEstudiantil"
                      className="input-dark"
                      placeholder="U20231234"
                      value={form.codigoEstudiantil}
                      onChange={cambiar}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="facultad" className="label-dark">
                    Facultad
                  </label>
                  <select
                    id="facultad"
                    name="facultad"
                    required
                    className="input-dark"
                    value={form.facultad}
                    onChange={cambiar}
                  >
                    <option value="">Seleccionar facultad...</option>
                    {FACULTADES.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="password" className="label-dark">
                      Contraseña
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      className="input-dark"
                      placeholder="••••••••"
                      value={form.password}
                      onChange={cambiar}
                    />
                  </div>
                  <div>
                    <label htmlFor="confirmar" className="label-dark">
                      Confirmar contraseña
                    </label>
                    <input
                      id="confirmar"
                      name="confirmar"
                      type="password"
                      autoComplete="new-password"
                      required
                      className="input-dark"
                      placeholder="••••••••"
                      value={form.confirmar}
                      onChange={cambiar}
                    />
                  </div>
                </div>

                <p className="rounded-lg bg-[#0f1824] px-4 py-3 text-xs text-gray-400">
                  Al registrarte aceptas los <span className="font-semibold text-white">Términos de Uso</span> y la{' '}
                  <span className="font-semibold text-white">Política de Privacidad</span> de Campus League.
                </p>

                <button
                  type="submit"
                  disabled={enviando}
                  className="w-full rounded-lg bg-[#00C16E] px-4 py-3 text-sm font-semibold text-[#0B2545] transition hover:bg-[#34E08F] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {enviando ? 'Creando cuenta...' : 'Crear Cuenta'}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-gray-400">
                ¿Ya tienes cuenta?{' '}
                <Link to="/login" className="font-semibold text-white hover:text-[#34E08F]">
                  Iniciar Sesión
                </Link>
              </p>
            </>
          ) : (
            <>
              <h2 className="font-display text-3xl font-bold text-white">Verifica tu correo</h2>
              <p className="mt-1 text-sm text-gray-400">{form.correo}</p>

              <form onSubmit={enviarCodigo} className="mt-6 space-y-4" noValidate>
                {info && <div className="alert-ok">{info}</div>}
                {otpDesarrollo && (
                  <div className="alert-ok">
                    Modo desarrollo: tu código es <strong>{otpDesarrollo}</strong>
                  </div>
                )}
                {error && (
                  <div className="alert-error" role="alert">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="codigo" className="label-dark">
                    Código OTP
                  </label>
                  <input
                    id="codigo"
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="one-time-code"
                    required
                    className="input-dark text-center text-lg tracking-[0.5em]"
                    placeholder="000000"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                  />
                </div>

                <button
                  type="submit"
                  disabled={enviando || codigo.length !== 6}
                  className="w-full rounded-lg bg-[#00C16E] px-4 py-3 text-sm font-semibold text-[#0B2545] transition hover:bg-[#34E08F] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {enviando ? 'Verificando...' : 'Verificar y entrar'}
                </button>
                <button type="button" onClick={reenviar} className="btn-outline w-full">
                  Reenviar código
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
