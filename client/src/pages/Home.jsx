import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMatches, getTournaments } from '../services/api';

const DISCIPLINAS = [
  { icono: '⚽', nombre: 'Fútbol', texto: 'Competencias de 11 y fútbol sala entre todas las facultades.' },
  { icono: '🏀', nombre: 'Baloncesto', texto: 'Torneos 5×5 con tabla de posiciones y estadísticas.' },
  { icono: '🏐', nombre: 'Voleibol', texto: 'Ligas mixtas y por categorías durante todo el semestre.' },
  { icono: '🏓', nombre: 'Tenis de Mesa', texto: 'Torneos relámpago individuales y de dobles.' },
];

export default function Home() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let activo = true;
    const cargar = async () => {
      try {
        const [torneos, partidos] = await Promise.all([
          getTournaments(),
          getMatches({ estado: 'finalizado', limit: 300 }),
        ]);
        if (!activo) return;
        const vigentes = torneos.tournaments.filter((t) =>
          ['inscripcion', 'inscripcion_cerrada', 'en_curso'].includes(t.estado)
        ).length;
        setStats({ torneos: vigentes, partidos: partidos.count });
      } catch {
        // Las estadísticas son opcionales: si falla la API no se muestran
      }
    };
    cargar();
    return () => {
      activo = false;
    };
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0B2545] via-[#0B192C] to-[#0B192C]">
        <img
          src="/hero-balon.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-25"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B192C] via-[#0B192C]/80 to-transparent" />

        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:py-28">
          <span className="badge">
            <span className="h-2 w-2 rounded-full bg-[#00C16E]" />
            Temporada Deportiva 2025/2026 Activa
          </span>

          <h1 className="font-display mt-6 max-w-2xl text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
            La Liga
            <br />
            <span className="text-[#00C16E]">Universitaria</span>
            <br />
            Empieza Aquí.
          </h1>

          <p className="mt-6 max-w-xl text-base text-gray-300 sm:text-lg">
            Gestiona torneos, consulta resultados, sigue la tabla de posiciones y forma parte del deporte universitario.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/torneos" className="btn-primary px-6 py-3">
              Ver Torneos Activos
            </Link>
            <Link to="/registro" className="btn-outline px-6 py-3">
              Registrarse
            </Link>
          </div>

          {stats && (
            <dl className="mt-12 grid max-w-md grid-cols-2 gap-4 rounded-xl border border-[#24405f] bg-[#0B192C]/70 p-5 text-center backdrop-blur">
              <div>
                <dd className="font-display text-3xl font-bold text-[#00C16E]">{stats.torneos}</dd>
                <dt className="mt-1 text-xs text-gray-400">Torneos Activos</dt>
              </div>
              <div>
                <dd className="font-display text-3xl font-bold text-[#00C16E]">{stats.partidos}</dd>
                <dt className="mt-1 text-xs text-gray-400">Partidos Jugados</dt>
              </div>
            </dl>
          )}
        </div>
      </section>

      {/* Disciplinas */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-3xl font-bold text-white">Disciplinas deportivas</h2>
        <p className="mt-2 text-gray-400">Encuentra el torneo que se adapta a tu deporte.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DISCIPLINAS.map((d) => (
            <Link
              key={d.nombre}
              to="/torneos"
              className="group rounded-2xl border border-[#24405f] bg-[#0B2545] p-6 transition hover:border-[#00C16E]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-2xl" aria-hidden="true">
                {d.icono}
              </span>
              <h3 className="font-display mt-4 text-lg font-semibold text-white group-hover:text-[#34E08F]">
                {d.nombre}
              </h3>
              <p className="mt-1 text-sm text-gray-400">{d.texto}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
