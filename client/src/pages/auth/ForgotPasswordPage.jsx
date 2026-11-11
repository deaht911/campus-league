import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword, getErrorMessage, resetPassword } from '../../services/api';

const EMAIL_REGEX = /^[a-z0-9._%+-]+@uab\.edu\.bo$/i;

export default function ForgotPasswordPage() {
  const [paso, setPaso] = useState(1);
  const [correo, setCorreo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [otpDesarrollo, setOtpDesarrollo] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [listo, setListo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const solicitar = async (e) => {
    e.preventDefault();
    setError('');
    if (!EMAIL_REGEX.test(correo.trim())) return setError('Debe usar un correo institucional @uab.edu.bo');
    setEnviando(true);
    try {
      const r = await forgotPassword(correo.trim());
      setOtpDesarrollo(r.otpDesarrollo || '');
      setInfo(r.message);
      setPaso(2);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setEnviando(false);
    }
  };

  const restablecer = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres');
    if (password !== confirmar) return setError('Las contraseñas no coinciden');
    setEnviando(true);
    try {
      await resetPassword({ correo: correo.trim(), codigo: codigo.trim(), password });
      setListo(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#121E2D] px-6 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center gap-2">
          <span className="font-display flex h-9 w-9 items-center justify-center rounded-lg bg-[#00C16E] text-sm font-extrabold text-[#0B2545]">
            CL
          </span>
          <span className="font-display text-lg font-semibold text-white">Campus League</span>
        </Link>

        <h1 className="font-display text-3xl font-bold text-white">Recuperar contraseña</h1>

        {listo ? (
          <div className="mt-6 space-y-4">
            <div className="alert-ok" role="status">
              Contraseña actualizada. Ya puedes iniciar sesión.
            </div>
            <Link to="/login" className="btn-primary w-full px-4 py-3">
              Ir a Iniciar Sesión
            </Link>
          </div>
        ) : paso === 1 ? (
          <form onSubmit={solicitar} className="mt-6 space-y-4" noValidate>
            <p className="text-sm text-gray-400">Te enviaremos un código de 6 dígitos a tu correo institucional.</p>
            {error && (
              <div className="alert-error" role="alert">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="fp-correo" className="label-dark">
                Correo universitario
              </label>
              <input
                id="fp-correo"
                type="email"
                autoComplete="email"
                className="input-dark"
                placeholder="nombre@uab.edu.bo"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary w-full px-4 py-3" disabled={enviando}>
              {enviando ? 'Enviando...' : 'Enviar código'}
            </button>
          </form>
        ) : (
          <form onSubmit={restablecer} className="mt-6 space-y-4" noValidate>
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
              <label htmlFor="fp-codigo" className="label-dark">
                Código de 6 dígitos
              </label>
              <input
                id="fp-codigo"
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                className="input-dark text-center text-lg tracking-[0.5em]"
                placeholder="000000"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <div>
              <label htmlFor="fp-pass" className="label-dark">
                Nueva contraseña
              </label>
              <input
                id="fp-pass"
                type="password"
                autoComplete="new-password"
                className="input-dark"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="fp-conf" className="label-dark">
                Confirmar contraseña
              </label>
              <input
                id="fp-conf"
                type="password"
                autoComplete="new-password"
                className="input-dark"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary w-full px-4 py-3" disabled={enviando || codigo.length !== 6}>
              {enviando ? 'Guardando...' : 'Restablecer contraseña'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-400">
          <Link to="/login" className="font-semibold text-white hover:text-[#34E08F]">
            Volver a Iniciar Sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
