'use client';

import { motion } from 'framer-motion';
import { Terminal, Wind, Flame, Rocket, AlertTriangle } from 'lucide-react';

export default function LandingPage() {
  // Animation variants for a snappy, no-nonsense reveal
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { type: 'spring', stiffness: 400, damping: 30 } 
    },
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 selection:bg-white selection:text-black flex flex-col font-sans overflow-hidden">
      
      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center px-6 pt-32 pb-16 relative">
        
        {/* Subtle grid background for the "internal tool" vibe */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#171717_1px,transparent_1px),linear-gradient(to_bottom,#171717_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 -z-10" />

        <motion.div 
          className="max-w-5xl w-full flex flex-col items-center text-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          
          {/* Eyebrow */}
          <motion.div variants={itemVariants} className="flex items-center gap-2 mb-8">
            <AlertTriangle className="w-4 h-4 text-neutral-500" />
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-400 font-semibold">
              Not a toy. Not a game.
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1 
            variants={itemVariants} 
            className="text-6xl md:text-8xl font-bold tracking-tighter mb-8 text-transparent bg-clip-text bg-gradient-to-b from-white to-neutral-500"
          >
            Will it fly?<br />Or will it melt?
          </motion.h1>

          {/* Subheadline */}
          <motion.p 
            variants={itemVariants} 
            className="text-lg md:text-xl text-neutral-400 max-w-2xl mb-12 leading-relaxed"
          >
            A rigorous orbital mechanics simulator. You provide the specs, our physics engine provides the brutal truth. Powered by real aerospace equations.
          </motion.p>

          {/* CTA */}
          <motion.div variants={itemVariants}>
            <button className="group relative inline-flex h-14 items-center justify-center overflow-hidden rounded-md bg-white px-8 font-mono text-sm font-bold text-neutral-950 transition-all duration-200 hover:bg-neutral-200 hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]">
              <span className="mr-2">&gt;</span>
              INITIALIZE_SIMULATOR
              <Rocket className="ml-3 w-4 h-4 transition-transform duration-200 group-hover:translate-x-1 group-hover:-translate-y-1" />
            </button>
          </motion.div>

          {/* Feature Grid */}
          <motion.div 
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 w-full text-left"
          >
            {/* Feature 1 */}
            <motion.div variants={itemVariants} className="p-6 rounded-lg border border-neutral-800 bg-neutral-900/30 backdrop-blur-sm transition-colors hover:border-neutral-700 hover:bg-neutral-900/50">
              <Flame className="w-6 h-6 text-neutral-300 mb-4 stroke-[1.5]" />
              <h3 className="font-semibold text-lg mb-2 tracking-tight">Real Propellants.</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                LOX/RP-1, hypergolics, and solid motors with actual <span className="font-mono text-xs text-neutral-300 bg-neutral-800 px-1 py-0.5 rounded">Isp</span> values. Chemistry dictates your delta-v.
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div variants={itemVariants} className="p-6 rounded-lg border border-neutral-800 bg-neutral-900/30 backdrop-blur-sm transition-colors hover:border-neutral-700 hover:bg-neutral-900/50">
              <Wind className="w-6 h-6 text-neutral-300 mb-4 stroke-[1.5]" />
              <h3 className="font-semibold text-lg mb-2 tracking-tight">Standard Atmosphere 1976.</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                No simple lookups. Actual density modeling and Max Q calculations. Drag will tear your fairing off if you pitch too hard.
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div variants={itemVariants} className="p-6 rounded-lg border border-neutral-800 bg-neutral-900/30 backdrop-blur-sm transition-colors hover:border-neutral-700 hover:bg-neutral-900/50">
              <Terminal className="w-6 h-6 text-neutral-300 mb-4 stroke-[1.5]" />
              <h3 className="font-semibold text-lg mb-2 tracking-tight">Euler Integration.</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Sub-millisecond timestep simulation. If your <span className="font-mono text-xs text-neutral-300 bg-neutral-800 px-1 py-0.5 rounded">TWR &lt; 1</span>, you're not going to space today.
              </p>
            </motion.div>
          </motion.div>

        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 border-t border-neutral-900 bg-neutral-950 flex justify-center">
        <p className="font-mono text-xs text-neutral-600 tracking-wider">
          // NASA USES THIS. SOURCE: "TRUST ME BRO"
        </p>
      </footer>
    </div>
  );
}