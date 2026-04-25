import Link from 'next/link';
import StarfieldWrapper from './components/StarfieldWrapper';

export default function Home() {
  return (
    <div className="min-h-screen text-[#e2e8f0] flex flex-col relative" style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(124,58,237,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(6,182,212,0.06) 0%, transparent 50%), #040408' }}>
      <StarfieldWrapper />

      {/* Nav */}
      <header className="relative z-10 flex items-center justify-between px-8 py-4" style={{ borderBottom: '1px solid #1e1e35', background: 'rgba(4,4,8,0.7)', backdropFilter: 'blur(8px)' }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#7c3aed]" style={{ boxShadow: '0 0 8px #7c3aed' }} />
          <span className="text-sm font-bold tracking-widest uppercase" style={{ fontFamily: 'var(--font-space, sans-serif)' }}>Roocket</span>
        </div>
        <Link href="/designer" className="btn-primary text-xs font-semibold px-4 py-2 rounded">
          Launch App →
        </Link>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 text-center py-20">
        <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-8 tracking-widest uppercase" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', color: '#7c3aed' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed] inline-block" style={{ boxShadow: '0 0 4px #7c3aed' }} />
          Rocket Physics Simulator
        </div>

        <h1 className="text-5xl sm:text-7xl font-black tracking-tight mb-6 leading-none" style={{ fontFamily: 'var(--font-space, sans-serif)' }}>
          Design a rocket.<br />
          <span style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Physics
          </span>{' '}
          will judge it.
        </h1>

        <p className="text-lg text-[#64748b] max-w-lg mb-10 leading-relaxed">
          Drag and drop rocket parts, configure propellant and thrust, run a rigorous simulation.
          Real atmosphere, real drag, real Tsiolkovsky. No mercy.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-16">
          <Link href="/designer" className="btn-primary px-8 py-4 rounded text-base font-bold">
            Get Started →
          </Link>
          <a href="#how" className="px-8 py-4 rounded text-base font-semibold transition-colors border border-[#1e1e35] hover:border-[#7c3aed] text-[#e2e8f0]">
            How it works
          </a>
        </div>

        {/* Mini stat pills */}
        <div className="flex flex-wrap justify-center gap-3">
          {['US Standard Atmosphere 1976', 'Tsiolkovsky Δv', 'Euler Integration', 'Max Q Tracking', 'Drag Coefficient by Mach'].map(s => (
            <div key={s} className="text-[10px] px-3 py-1 rounded-full text-[#64748b]" style={{ border: '1px solid #1e1e35', background: 'rgba(18,18,30,0.6)' }}>{s}</div>
          ))}
        </div>
      </main>

      {/* How it works */}
      <section id="how" className="relative z-10 py-20 px-4" style={{ borderTop: '1px solid #1e1e35' }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12" style={{ fontFamily: 'var(--font-space, sans-serif)' }}>How it works</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { n: '01', title: 'Design', body: 'Drag parts onto the canvas — nose cones, fuel tanks, engines. Parts snap together and auto-populate all physics parameters.' },
              { n: '02', title: 'Simulate', body: 'US Standard Atmosphere 1976, Tsiolkovsky Δv, Euler-integrated trajectory, Max Q tracking. 0.5s timestep, 4000 steps.' },
              { n: '03', title: 'Verdict', body: 'LEO? Suborbital? Never left the pad? Exact numbers, ruthless copy, design analysis with actionable fixes. Compare against Electron, Falcon 1.' },
            ].map(s => (
              <div key={s.n} className="glass-card rounded-xl p-6">
                <div className="text-3xl font-black mb-3" style={{ fontFamily: 'var(--font-space, sans-serif)', background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{s.n}</div>
                <h3 className="text-base font-bold mb-2">{s.title}</h3>
                <p className="text-sm text-[#64748b] leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Physics specs */}
      <section className="relative z-10 py-16 px-4" style={{ borderTop: '1px solid #1e1e35' }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold text-center mb-8 text-[#64748b]">Physics Specs</h2>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            {[
              'US Standard Atmosphere 1976 — all 7 layers',
              'Altitude-interpolated Isp (sea level → vacuum)',
              'Mach-dependent drag coefficient (Ogive/Conical/Blunt)',
              'Dynamic pressure (Max Q) tracking with fatal threshold',
              'Euler integration at 0.5s timestep, 4000 steps',
              'Gravity inverse-square law',
              'LOX/RP-1, LOX/LH2, UDMH/N2O4, Solid propellants',
              'LEO: ≥200km + ≥7,800 m/s orbital velocity',
              'Tank wall material affects structural fraction',
              'Engine presets: Merlin 1D, Rutherford, RS-25, Raptor 2',
              'CoM/CoP stability indicator in designer',
              'Intelligent design analysis on every verdict',
            ].map(item => (
              <div key={item} className="flex items-center gap-2 text-[#64748b]">
                <span style={{ color: '#7c3aed' }}>✓</span> {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-20 px-4 text-center" style={{ borderTop: '1px solid #1e1e35' }}>
        <h2 className="text-3xl font-black mb-4" style={{ fontFamily: 'var(--font-space, sans-serif)' }}>Ready to fly?</h2>
        <p className="text-[#64748b] mb-8">Your rocket is 0km from the pad. Physics is ready.</p>
        <Link href="/designer" className="btn-primary px-8 py-4 rounded text-base font-bold inline-block">
          Launch App →
        </Link>
      </section>

      <footer className="relative z-10 py-6 px-8 text-center text-xs text-[#64748b]" style={{ borderTop: '1px solid #1e1e35' }}>
        Roocket — Rocket Viability Calculator. All physics client-side. No database. No spacecraft were harmed.
      </footer>
    </div>
  );
}
