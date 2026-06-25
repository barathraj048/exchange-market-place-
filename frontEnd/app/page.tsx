"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  Activity, Zap, Server, Database, 
  ArrowRight, Cpu, Repeat, ShieldCheck, Code2, Terminal
} from "lucide-react";
import ArchitectureFlow from "./components/architecture"; // Ensure this path matches your setup

// Custom GitHub Icon since Lucide removed brand logos
function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

export default function HighFrequencyExchange() {
  const [activeStage, setActiveStage] = useState(0);

  // Tech stack list for the marquee/grid
  const TECHNOLOGIES = [
    "Node.js", "Express.js", "TypeScript", "Redis (Pub/Sub & Queue)", 
    "PostgreSQL", "WebSockets (ws)", "Next.js 14", "Tailwind CSS", "Framer Motion"
  ];

  return (
    <main className="min-h-screen bg-zinc-950 text-slate-50 font-sans selection:bg-cyan-500/30 relative overflow-hidden">
      
      {/* Background Grid & Glow */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 relative z-10 pt-24 space-y-32 pb-24">
        
        {/* --- 1. HERO SECTION --- */}
        <section className="text-center space-y-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 text-sm text-cyan-400 font-mono shadow-xl backdrop-blur-sm">
              <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></span>
              v1.0.0 Deployed
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-100 via-cyan-100 to-cyan-500">
              Sub-10ms Crypto Trading <br className="hidden md:block" /> Infrastructure.
            </h1>
            <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto font-light">
              A high-concurrency, in-memory matching engine built for scale. 
              <span className="text-cyan-400 font-medium"> 1,000+ trades per second </span> 
              with zero data loss.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            {/* View Architecture Button */}
            <button
              onClick={() => document.getElementById('architecture')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-cyan-500/10 text-cyan-400 font-medium border border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-400 transition-all shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:shadow-[0_0_30px_rgba(6,182,212,0.3)]"
            >
              View Architecture <ArrowRight className="w-4 h-4" />
            </button>

            {/* GitHub Repo Button */}
            <a
              href="https://github.com/barathraj048/exchange-market-place-"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-zinc-900 text-slate-200 font-medium border border-zinc-800 hover:bg-zinc-800 hover:text-white transition-all shadow-lg"
            >
              <GithubIcon className="w-4 h-4" /> View Source
            </a>
          </motion.div>

          {/* Floating Metrics Banner */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 mt-12 bg-zinc-900/50 border border-zinc-800 rounded-2xl backdrop-blur-md shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500/50 via-blue-500/50 to-purple-500/50" />
            {[
              { label: "Req/Sec", value: "1,000.35", icon: Zap, color: "text-yellow-400" },
              { label: "Concurrent VUs", value: "500", icon: Activity, color: "text-blue-400" },
              { label: "Median Latency", value: "3.77ms", icon: Server, color: "text-cyan-400" },
              { label: "Error Rate", value: "0.00%", icon: ShieldCheck, color: "text-green-400", sub: "50,020 requests" },
            ].map((metric, i) => (
              <div key={i} className="flex flex-col items-center justify-center p-4 space-y-2 text-center rounded-xl bg-zinc-950/50 border border-zinc-800/50">
                <metric.icon className={`w-6 h-6 ${metric.color}`} />
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-slate-100">{metric.value}</h3>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">{metric.label}</p>
                  {metric.sub && <p className="text-[10px] text-zinc-600">{metric.sub}</p>}
                </div>
              </div>
            ))}
          </motion.div>
        </section>

        {/* --- 2. TECHNOLOGIES USED --- */}
        <section className="space-y-6 pt-8 border-t border-zinc-800/50">
          <div className="flex items-center gap-2 justify-center text-zinc-400 mb-8">
            <Code2 className="w-5 h-5" />
            <h2 className="text-sm font-semibold uppercase tracking-widest">Core Technologies</h2>
          </div>
          <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
            {TECHNOLOGIES.map((tech, i) => (
              <motion.div 
                key={tech}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="px-4 py-2 bg-zinc-900/80 border border-zinc-800 rounded-lg text-sm text-slate-300 font-medium hover:border-cyan-500/30 hover:text-cyan-400 cursor-default transition-colors"
              >
                {tech}
              </motion.div>
            ))}
          </div>
        </section>

        {/* --- 3. INTERACTIVE ARCHITECTURE FLOW --- */}
        <div id="architecture" className="scroll-mt-24">
          <ArchitectureFlow />
        </div>

        {/* --- 4. BENTO BOX GRID --- */}
        <section className="space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-slate-100">Design Choices & Philosophy</h2>
            <p className="text-zinc-400">Why the engine handles 1k+ TPS with ease.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1: 100% In-Memory State */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="lg:col-span-2 group relative p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800 overflow-hidden hover:border-cyan-500/30 transition-all duration-300"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-20 transition-opacity">
                <Cpu className="w-32 h-32 text-cyan-400" />
              </div>
              <div className="relative z-10 space-y-4 max-w-lg">
                <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 mb-6">
                  <Cpu className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="text-2xl font-bold text-slate-100">100% In-Memory State</h3>
                <p className="text-zinc-400 leading-relaxed">
                  Why not Postgres for matching? <strong className="text-slate-200">Speed.</strong> Balances and Orderbooks live purely in RAM, backed by periodic snapshotting and Redis event-sourcing for instant crash recovery.
                </p>
              </div>
            </motion.div>

            {/* Card 2: Isolated I/O */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="group relative p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800 overflow-hidden hover:border-blue-500/30 transition-all duration-300"
            >
              <div className="relative z-10 space-y-4">
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 mb-6">
                  <Database className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-100">Isolated I/O</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Database writes are a bottleneck. The engine never waits for disk. It delegates all Postgres <code>INSERT</code> operations to a separate asynchronous database worker.
                </p>
              </div>
            </motion.div>

            {/* Card 3: Market Maker Integration */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="group relative p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800 overflow-hidden hover:border-green-500/30 transition-all duration-300"
            >
              <div className="relative z-10 space-y-4">
                <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center border border-green-500/20 mb-6">
                  <Repeat className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-100">Market Maker Ecosystem</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  A custom bot ecosystem continuously fetches real-world prices via Backpack's oracle and injects deep liquidity walls into the engine, ensuring zero cold-start issues.
                </p>
              </div>
            </motion.div>

            {/* Card 4: Unified Order Pipeline */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="lg:col-span-2 group relative p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800 overflow-hidden hover:border-purple-500/30 transition-all duration-300"
            >
               <div className="absolute bottom-0 right-0 p-8 opacity-5 group-hover:opacity-20 transition-opacity">
                <ShieldCheck className="w-32 h-32 text-purple-400" />
              </div>
              <div className="relative z-10 space-y-4 max-w-lg">
                <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20 mb-6">
                  <ShieldCheck className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold text-slate-100">Unified Order Pipeline</h3>
                <p className="text-zinc-400 leading-relaxed">
                  Market orders are dynamically reverse-calculated with slippage buffers and fed into the exact same execution pipeline as Limit orders for strict safety and consistency.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* --- 5. THE CHERRY ON TOP (Terminal Footer) --- */}
        <section className="pt-24 pb-8 flex flex-col items-center justify-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl"
          >
            <div className="flex items-center gap-2 px-4 py-3 bg-zinc-900 border-b border-zinc-800">
              <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
              <span className="ml-2 text-xs text-zinc-500 font-mono flex items-center gap-2">
                <Terminal className="w-3 h-3" /> admin@exchange-engine:~
              </span>
            </div>
            <div className="p-6 font-mono text-sm leading-relaxed overflow-x-auto">
              <p className="text-cyan-400">$ systemctl status engine.service</p>
              <p className="text-zinc-300 mt-2">● engine.service - In-Memory Matching Engine Worker</p>
              <p className="text-zinc-400 pl-4">Loaded: loaded (/etc/systemd/system/engine.service; enabled; vendor preset: enabled)</p>
              <p className="text-zinc-400 pl-4">Active: <span className="text-green-400 font-bold">active (running)</span> since {new Date().toUTCString()}</p>
              <p className="text-zinc-400 pl-4">Docs:   <a href="https://github.com/barathraj048/exchange-market-place-" target="_blank" className="text-blue-400 hover:underline">https://github.com/barathraj048</a></p>
              <p className="text-zinc-400 pl-4">Main PID: 8492 (node)</p>
              <p className="text-zinc-400 pl-4">Tasks: 11 (limit: 4915)</p>
              <p className="text-zinc-400 pl-4">Memory: 48.2M</p>
              <p className="text-zinc-500 mt-4">Jun 25 10:27:13 exchange-node engine[8492]: [INFO] Matching engine initialized successfully.</p>
              <p className="text-zinc-500">Jun 25 10:27:14 exchange-node engine[8492]: [INFO] Redis Pub/Sub connected. Awaiting orders...</p>
            </div>
          </motion.div>
        </section>

      </div>
    </main>
  );
}