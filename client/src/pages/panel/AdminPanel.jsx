import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage, getUsers, updateUserRole, updateUserStatus } from '../../services/api';

const ROLES = {
  jugador: 'Jugador',
  capitan: 'Capitán',
  organizador: 'Organizador',
  arbitro: 'Árbitro',
  administrador: 'Administrador',
};

const LIMITE = 10;

export default function AdminPanel() {
  const { user } = useAuth();
  const [filtros, setFiltros] = useState({ q: '', rol: '', activo: '', page: 1 });
  const [busqueda, setBusqueda] = useState('');
  const [version, setVersion] = useState(0);
  const [datos, setDatos] = useState({ clave: '', users: [], total: 0, pages: 1, error: '' });
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // Espera 400 ms tras dejar de escribir antes de buscar
  useEffect(() => {
    const t = setTimeout(() => setFiltros((f) => (f.q === busqueda ? f : { ...f, q: busqueda, page: 1 })), 400);
    return () => clearTimeout(t);
  }, [busqueda]);

  const clave = `${filtros.q}|${filtros.rol}|${filtros.activo}|${filtros.page}|${version}`;

  useEffect(() => {
    let activo = true;
    const params = { page: filtros.page, limit: LIMITE };
    if (filtros.q) params.q = filtros.q;
    if (filtros.rol) params.rol = filtros.rol;
    if (filtros.activo) params.activo = filtros.activo;
    getUsers(params)
      .then((d) => activo && setDatos({ clave, users: d.users, total: d.total, pages: d.pages, error: '' }))
      .catch((err) => activo && setDatos({ clave, users: [], total: 0, pages: 1, error: getErrorMessage(err) }));
    return () => {
      activo = false;
    };
  }, [filtros, clave]);

  const cargando = datos.clave !== clave;

  const ejecutar = async (accion, textoOk) => {
    setMensaje({ tipo: '', texto: '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      await accion();
      setMensaje({ tipo: 'ok', texto: textoOk });
      setVersion((v) => v + 1);
    } catch (err) {
      setMensaje({ tipo: 'error', texto: getErrorMessage(err) });
    }
  };

  const cambiarRol = (u, rol) => {
    if (rol === u.rol) return;
    ejecutar(() => updateUserRole(u._id, rol), `Rol de ${u.nombre} actualizado a ${ROLES[rol]}.`);
  };

  const alternarEstado = (u) =>
    ejecutar(
      () => updateUserStatus(u._id, !u.activo),
      u.activo ? `Cuenta de ${u.nombre} desactivada.` : `Cuenta de ${u.nombre} activada.`
    );

  const cambiarFiltro = (campo, valor) => setFiltros((f) => ({ ...f, [campo]: valor, page: 1 }));

  return (
    <div>
      <header className="border-b border-[#24405f] bg-[#0B2545]">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
          <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">Panel de Administración</h1>
          <p className="mt-2 text-gray-300">Gestiona usuarios, roles y estado de las cuentas.</p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        {mensaje.texto && (
          <div className={mensaje.tipo === 'ok' ? 'alert-ok' : 'alert-error'} role={mensaje.tipo === 'ok' ? 'status' : 'alert'}>
            {mensaje.texto}
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-2xl border border-[#24405f] bg-[#0f1824] p-4 sm:flex-row">
          <input
            type="search"
            className="input-dark flex-1"
            placeholder="Buscar por nombre, correo o código..."
            aria-label="Buscar usuarios"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <select
            className="input-dark sm:w-48"
            aria-label="Filtrar por rol"
            value={filtros.rol}
            onChange={(e) => cambiarFiltro('rol', e.target.value)}
          >
            <option value="">Todos los roles</option>
            {Object.entries(ROLES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            className="input-dark sm:w-44"
            aria-label="Filtrar por estado"
            value={filtros.activo}
            onChange={(e) => cambiarFiltro('activo', e.target.value)}
          >
            <option value="">Todas las cuentas</option>
            <option value="true">Activas</option>
            <option value="false">Desactivadas</option>
          </select>
        </div>

        {datos.error && (
          <div className="alert-error" role="alert">
            {datos.error}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-[#24405f] bg-[#0f1824]">
          <div className="flex items-center justify-between border-b border-[#24405f] px-6 py-4">
            <h2 className="font-display text-lg font-semibold text-white">Usuarios ({datos.total})</h2>
          </div>

          {cargando ? (
            <p className="p-6 text-sm text-gray-400" role="status">
              Cargando usuarios...
            </p>
          ) : datos.users.length === 0 ? (
            <p className="p-6 text-sm text-gray-400">No hay usuarios que coincidan con los filtros.</p>
          ) : (
            <div className="table-wrap rounded-none border-0">
              <table className="table-dark">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Facultad</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th className="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.users.map((u) => {
                    const esYo = u._id === user._id;
                    return (
                      <tr key={u._id}>
                        <td>
                          <p className="font-semibold text-white">
                            {u.nombre}
                            {esYo && <span className="badge ml-2">Tú</span>}
                          </p>
                          <p className="text-xs text-gray-500">
                            {u.correo}
                            {u.codigoEstudiantil ? ` · ${u.codigoEstudiantil}` : ''}
                          </p>
                        </td>
                        <td className="text-xs">{u.facultad || '–'}</td>
                        <td>
                          <select
                            aria-label={`Rol de ${u.nombre}`}
                            className="input-dark px-2 py-1"
                            value={u.rol}
                            disabled={esYo}
                            onChange={(e) => cambiarRol(u, e.target.value)}
                          >
                            {Object.entries(ROLES).map(([k, v]) => (
                              <option key={k} value={k}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              u.activo ? 'bg-[#00C16E]/20 text-[#34E08F]' : 'bg-red-500/20 text-red-300'
                            }`}
                          >
                            {u.activo ? 'Activa' : 'Desactivada'}
                          </span>
                          {!u.verificado && <p className="mt-1 text-xs text-amber-400">Sin verificar</p>}
                        </td>
                        <td className="whitespace-nowrap text-right">
                          {esYo ? (
                            <span className="text-xs text-gray-500">–</span>
                          ) : (
                            <button
                              type="button"
                              className={
                                u.activo
                                  ? 'rounded-lg border border-red-500/50 px-3 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/10'
                                  : 'btn-primary px-3 py-1 text-xs'
                              }
                              onClick={() => alternarEstado(u)}
                            >
                              {u.activo ? 'Desactivar' : 'Activar'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {datos.pages > 1 && (
            <div className="flex items-center justify-between border-t border-[#24405f] px-6 py-3 text-sm text-gray-400">
              <button
                type="button"
                className="btn-outline px-3 py-1 text-xs"
                disabled={filtros.page <= 1}
                onClick={() => setFiltros((f) => ({ ...f, page: f.page - 1 }))}
              >
                Anterior
              </button>
              <span>
                Página {filtros.page} de {datos.pages}
              </span>
              <button
                type="button"
                className="btn-outline px-3 py-1 text-xs"
                disabled={filtros.page >= datos.pages}
                onClick={() => setFiltros((f) => ({ ...f, page: f.page + 1 }))}
              >
                Siguiente
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
