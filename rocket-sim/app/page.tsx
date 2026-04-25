import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#e2e8f0] flex flex-col">
      {/* Nav */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-[#1e1e2e]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#7c3aed]" />
          <span className="text-sm font-bold tracking-widest uppercase">Roocket</span>
        </div>
        <Link
          href="/designer"
          className="text-xs font-semibold bg-[#7c3aed] hover:bg-[#6d28d9] text-white px-4 py-2 rounded transition-colors"
        >
          Launch App →
        </Link>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <div className="inline-flex items-center gap-2 bg-[#13131a] border border-[#1e1e2e] text-[#7c3aed] text-xs font-semibold px-3 py-1.5 rounded-full mb-6 tracking-widest uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed] inline-block" />
          Rocket Physics Simulator
        </div>

        <h1 className="text-5xl sm:text-7xl font-black tracking-tight mb-6 leading-none">
          Design a rocket.<br />
          <span className="text-[#7c3aed]">Physics</span> will judge it.
        </h1>

        <p className="text-lg text-[#64748b] max-w-lg mb-10">
          Drag and drop rocket parts, configure propellant and thrust, and run a rigorous simulation.
          Real atmosphere, real drag, real Tsiolkovsky. No mercy.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/designer"
            className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-bold px-8 py-4 rounded text-base tracking-wide transition-colors"
          >
            Get Started →
          </Link>
          <a
            href="#how"
            className="border border-[#1e1e2e] hover:border-[#7c3aed] text-[#e2e8f0] font-semibold px-8 py-4 rounded text-base transition-colors"
          >
            How it works
          </a>
        </div>
      </main>

      {/* How it works */}
      <section id="how" className="border-t border-[#1e1e2e] py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">How it works</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { n: '01', title: 'Design', body: 'Drag parts onto the canvas — nose cones, fuel tanks, engines. Parts snap together and auto-populate all physics parameters.' },
              { n: '02', title: 'Simulate', body: 'US Standard Atmosphere 1976, Tsiolkovsky Δv, Euler-integrated trajectory, Max Q tracking. 0.5s timestep, 4000 steps.' },
              { n: '03', title: 'Verdict', body: 'LEO? Suborbital? Never left the pad? Disintegrated? Exact numbers with ruthless copy. Compare against Electron, Falcon 1, V-2.' },
            ].map(s => (
              <div key={s.n} className="bg-[#13131a] border border-[#1e1e2e] rounded-lg p-6">
                <div className="text-3xl font-black text-[#7c3aed] mb-3">{s.n}</div>
                <h3 className="text-base font-bold mb-2">{s.title}</h3>
                <p className="text-sm text-[#64748b] leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Physics specs */}
      <section className="border-t border-[#1e1e2e] py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold text-center mb-8 text-[#64748b]">Physics Specs</h2>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            {[
              'US Standard Atmosphere 1976 — all 7 layers',
              'Altitude-interpolated Isp (sea level → vacuum)',
              'Mach-dependent drag coefficient',
              'Dynamic pressure (Max Q) tracking',
              'Euler integration at 0.5s timestep',
              'Gravity inverse-square law',
              'LOX/RP-1, LOX/LH2, UDMH/N2O4, Solid propellants',
              'LEO: ≥200km + ≥7,800 m/s velocity',
            ].map(item => (
              <div key={item} className="flex items-center gap-2 text-[#64748b]">
                <span className="text-[#7c3aed]">✓</span>
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[#1e1e2e] py-20 px-4 text-center">
        <h2 className="text-3xl font-black mb-4">Ready to fly?</h2>
        <p className="text-[#64748b] mb-8">Your rocket is 0km from the pad. Physics is ready.</p>
        <Link
          href="/designer"
          className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-bold px-8 py-4 rounded text-base tracking-wide transition-colors inline-block"
        >
          Launch App →
        </Link>
      </section>

      <footer className="border-t border-[#1e1e2e] py-6 px-8 text-center text-xs text-[#64748b]">
        Roocket — Rocket Viability Calculator. All physics client-side. No database. No spacecraft were harmed.
      </footer>
    </div>
  );
}
