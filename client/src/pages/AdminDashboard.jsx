const keyMetrics = [
  { label: 'Karyawan aktif', value: '346', tone: 'primary' },
  { label: 'Kehadiran hari ini', value: '92%', tone: 'success' },
  { label: 'Pengajuan tertunda', value: '18', tone: 'warning' },
  { label: 'Cabang aktif', value: '6', tone: 'neutral' },
]

const operationalNotes = [
  'Monitoring cabang dan jadwal kerja akan terhubung ke tabel cabang, karyawan, dan jadwal_kerja.',
  'Koreksi absensi dan persetujuan pengajuan akan mengikuti alur bisnis yang sudah ditentukan.',
  'Laporan bulanan akan dikembangkan dengan filter cabang dan periode tertentu.',
]

export function AdminDashboard() {
  return (
    <div className="dashboard-stack">
      <section className="stats-grid four-up">
        {keyMetrics.map((item) => (
          <article key={item.label} className="stat-card admin">
            <p>{item.label}</p>
            <strong>{item.value}</strong>
            <span className={`tag ${item.tone}`}>{item.tone}</span>
          </article>
        ))}
      </section>

      <section className="content-grid two-up">
        <div className="panel-block">
          <div className="panel-header compact">
            <div>
              <p className="section-kicker">Operasional</p>
              <h3>Area admin</h3>
            </div>
          </div>

          <ul className="info-list">
            {operationalNotes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="panel-block">
          <div className="panel-header compact">
            <div>
              <p className="section-kicker">Arsitektur</p>
              <h3>Data source</h3>
            </div>
          </div>

          <div className="mini-stack">
            <div className="mini-tile">
              <span>Cabang</span>
              <strong>public.cabang</strong>
            </div>
            <div className="mini-tile">
              <span>Pengguna</span>
              <strong>public.pengguna</strong>
            </div>
            <div className="mini-tile">
              <span>Absensi</span>
              <strong>public.absensi</strong>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
