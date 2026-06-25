"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Monitor, Server, Database, Cpu, Activity, Play, AlertTriangle } from "lucide-react";

// --- Types & Data ---
type NodeId = "browser" | "api" | "engine" | "ws" | "postgres";
type EngineState = "healthy" | "crashed" | "recovering";
type PipeState = "idle" | "flowing" | "buffering" | "flushing";

const NODES = [
  {
    id: "browser", title: "Client UI", icon: Monitor, 
    x: 15, y: 50, // Left corner
    tooltipClass: "bottom-full mb-4 left-0 origin-bottom-left",
    code: (
      <pre className="text-xs font-mono leading-relaxed">
        <span className="text-zinc-500">POST /api/v1/order</span><br />
        <span className="text-slate-300">{"{"}</span><br />
        <span className="text-blue-400">  "market"</span>: <span className="text-green-400">"BTC_USDC"</span>,<br />
        <span className="text-blue-400">  "price"</span>: <span className="text-orange-400">65000</span><br />
        <span className="text-slate-300">{"}"}</span>
      </pre>
    ),
  },
  {
    id: "api", title: "API Gateway", icon: Server, 
    x: 50, y: 15, // Top corner
    tooltipClass: "top-full mt-4 left-1/2 -translate-x-1/2 origin-top",
    description: "Stateless Node.js instances. Validates balance, applies rate limits, and delegates the payload to the internal network.",
  },
  {
    id: "engine", title: "The Engine", icon: Cpu, 
    x: 85, y: 50, // Right corner
    tooltipClass: "bottom-full mb-4 right-0 origin-bottom-right",
    code: (
      <pre className="text-xs font-mono leading-relaxed">
        <span className="text-zinc-500">// In-Memory Execution</span><br />
        <span className="text-slate-300">{"{"}</span><br />
        <span className="text-blue-400">  "event"</span>: <span className="text-green-400">"MATCHED"</span>,<br />
        <span className="text-blue-400">  "fillPrice"</span>: <span className="text-orange-400">65000</span><br />
        <span className="text-slate-300">{"}"}</span>
      </pre>
    ),
  },
  {
    id: "ws", title: "WebSocket Server", icon: Activity, 
    x: 50, y: 85, // Bottom corner
    tooltipClass: "bottom-full mb-4 left-1/2 -translate-x-1/2 origin-bottom",
    description: "Maintains thousands of concurrent persistent connections to push live orderbook depth to users.",
  },
  {
    id: "postgres", title: "PostgreSQL Worker", icon: Database, 
    x: 85, y: 85, // Drops straight down from the Engine
    tooltipClass: "bottom-full mb-4 right-0 origin-bottom-right",
    description: "Asynchronous background worker. Handles heavy disk I/O to save state without blocking the matching engine.",
  }
];

// Coordinates carefully mapped to trace the exact Diamond without intersecting
const PIPELINES = [
  { 
    id: "p1", start: [15, 50], end: [50, 15], protocol: "HTTP/REST", 
    desc: "Standard synchronous POST request. The gateway holds the connection just long enough to validate and queue the order." 
  },
  { 
    id: "p2", start: [50, 15], end: [85, 50], protocol: "Redis Queue (TCP)", 
    desc: "THE SAFETY NET: Decouples ingestion from execution. If the matching engine crashes, orders buffer safely here in strict FIFO sequence. Zero data loss." 
  },
  { 
    id: "p3", start: [85, 50], end: [50, 85], protocol: "Redis Pub/Sub", 
    desc: "Fire-and-forget sub-millisecond broadcast. Pushes state changes to all WS instances instantly." 
  },
  { 
    id: "p4", start: [85, 50], end: [85, 85], protocol: "TCP (pg.query)", 
    desc: "Standard database connection. The engine fires the event to the DB worker and immediately moves to the next trade." 
  },
  { 
    id: "p5", start: [50, 85], end: [15, 50], protocol: "WebSocket (WSS)", 
    desc: "Persistent bi-directional stream. Pushes the matched trade back to the client UI." 
  },
];

export default function ArchitectureFlow() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredPipe, setHoveredPipe] = useState<string | null>(null);
  
  const [engineState, setEngineState] = useState<EngineState>("healthy");
  const [pipeStates, setPipeStates] = useState<Record<string, PipeState>>({
    p1: "idle", p2: "idle", p3: "idle", p4: "idle", p5: "idle"
  });

  const updatePipe = (id: string, state: PipeState) => {
    setPipeStates(prev => ({ ...prev, [id]: state }));
  };
  const resetPipes = () => setPipeStates({ p1: "idle", p2: "idle", p3: "idle", p4: "idle", p5: "idle" });
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  // --- Normal Flow ---
  const handleSimulate = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    setEngineState("healthy");
    resetPipes();

    updatePipe("p1", "flowing");
    await sleep(600);
    updatePipe("p1", "idle"); updatePipe("p2", "flowing");
    await sleep(600);
    
    updatePipe("p2", "idle");
    updatePipe("p3", "flowing"); updatePipe("p4", "flowing");
    await sleep(600);
    
    updatePipe("p3", "idle"); updatePipe("p4", "idle"); updatePipe("p5", "flowing");
    await sleep(800);
    
    updatePipe("p5", "idle");
    setIsPlaying(false);
  };

  // --- Crash Recovery Flow ---
  const handleCrashSimulate = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    resetPipes();

    updatePipe("p1", "flowing");
    await sleep(600);
    
    // Engine crashes while data hits Redis Queue
    setEngineState("crashed");
    updatePipe("p1", "idle"); updatePipe("p2", "buffering"); 
    await sleep(2000); 

    // Rebooting
    setEngineState("recovering");
    await sleep(1000);

    // Engine is back, Redis Queue flushes
    setEngineState("healthy");
    updatePipe("p2", "flushing");
    await sleep(400);

    // Execution continues
    updatePipe("p2", "idle");
    updatePipe("p3", "flowing"); updatePipe("p4", "flowing");
    await sleep(600);
    
    updatePipe("p3", "idle"); updatePipe("p4", "idle"); updatePipe("p5", "flowing");
    await sleep(800);
    
    updatePipe("p5", "idle");
    setIsPlaying(false);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-8 bg-zinc-950/80 rounded-2xl border border-zinc-800 shadow-2xl relative font-sans selection:bg-cyan-500/30">
      
      {/* --- Controls --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 relative z-10">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Activity className="w-6 h-6 text-cyan-400" />
            Infrastructure Pipelines
          </h2>
          <p className="text-zinc-400 mt-1 text-sm max-w-lg">
            Hover over nodes for JSON data, and <strong className="text-cyan-400">hover over pipelines</strong> to inspect underlying protocols.
          </p>
        </div>
        <div className="flex gap-3 mt-4 md:mt-0">
          <button onClick={handleSimulate} disabled={isPlaying} className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${isPlaying ? "bg-zinc-800 text-zinc-500" : "bg-zinc-800/50 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/10 hover:border-cyan-400"}`}>
            <Play className="w-4 h-4 fill-current" /> Normal Flow
          </button>
          <button onClick={handleCrashSimulate} disabled={isPlaying} className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${isPlaying ? "bg-zinc-800 text-zinc-500" : "bg-red-500/10 text-red-400 border border-red-500/50 hover:bg-red-500/20 hover:border-red-400"}`}>
            <AlertTriangle className="w-4 h-4 fill-current" /> Crash Engine
          </button>
        </div>
      </div>

      {/* --- Canvas Area --- */}
      <div className="relative w-full h-[600px] overflow-visible">
        
        {/* SVG Pipelines Layer */}
        <svg className="absolute inset-0 w-full h-full z-0 overflow-visible">
          {PIPELINES.map((pipe) => {
            const state = pipeStates[pipe.id];
            const isHovered = hoveredPipe === pipe.id;
            
            let strokeColor = "#27272a"; 
            let animationDuration = 0;
            let strokeDasharray = "6 6";

            if (state === "flowing") {
              strokeColor = "#22d3ee"; 
              animationDuration = 0.6;
              strokeDasharray = "12 12";
            } else if (state === "buffering") {
              strokeColor = "#eab308"; 
              animationDuration = 0; 
              strokeDasharray = "12 12";
            } else if (state === "flushing") {
              strokeColor = "#4ade80"; 
              animationDuration = 0.2; 
              strokeDasharray = "12 12";
            }

            if (isHovered && state === "idle") strokeColor = "#3f3f46";

            return (
              <g 
                key={pipe.id} 
                onMouseEnter={() => setHoveredPipe(pipe.id)}
                onMouseLeave={() => setHoveredPipe(null)}
                className="cursor-pointer"
              >
                {/* Thick invisible line for easier hovering interaction */}
                <line x1={`${pipe.start[0]}%`} y1={`${pipe.start[1]}%`} x2={`${pipe.end[0]}%`} y2={`${pipe.end[1]}%`} stroke="transparent" strokeWidth="30" />
                
                {/* Visible Animated Line */}
                <motion.line
                  x1={`${pipe.start[0]}%`} y1={`${pipe.start[1]}%`} 
                  x2={`${pipe.end[0]}%`} y2={`${pipe.end[1]}%`}
                  stroke={strokeColor}
                  strokeWidth="3"
                  strokeDasharray={strokeDasharray}
                  initial={{ strokeDashoffset: 0 }}
                  animate={{ strokeDashoffset: animationDuration > 0 ? -48 : 0 }}
                  transition={{
                    repeat: animationDuration > 0 ? Infinity : 0,
                    ease: "linear",
                    duration: animationDuration
                  }}
                  className="transition-colors duration-300"
                  style={{ filter: state !== "idle" ? `drop-shadow(0 0 8px ${strokeColor})` : "none" }}
                />
              </g>
            );
          })}
        </svg>

        {/* --- Nodes Rendering --- */}
        {NODES.map((node) => {
          const isEngine = node.id === "engine";
          
          let nodeBorder = "border-zinc-800";
          let iconColor = "text-zinc-500 group-hover:text-cyan-300";
          let glow = "";

          if (isEngine) {
            if (engineState === "crashed") {
              nodeBorder = "border-red-500 bg-red-950/20";
              iconColor = "text-red-500";
              glow = "shadow-[0_0_30px_rgba(239,68,68,0.3)]";
            } else if (engineState === "recovering") {
              nodeBorder = "border-yellow-500 bg-yellow-950/20";
              iconColor = "text-yellow-500";
              glow = "shadow-[0_0_30px_rgba(234,179,8,0.3)]";
            }
          }
          
          if (hoveredNode === node.id || (isPlaying && hoveredNode === null && !isEngine)) {
             nodeBorder = "border-cyan-500/50";
             iconColor = "text-cyan-400";
             glow = "shadow-[0_0_20px_rgba(6,182,212,0.15)]";
          }

          return (
            <motion.div
              key={node.id}
              animate={isEngine && engineState === "crashed" ? { x: [-5, 5, -5, 5, 0] } : {}}
              transition={{ duration: 0.3 }}
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              <div className={`relative p-5 rounded-xl border transition-all duration-300 bg-zinc-900 backdrop-blur-sm ${nodeBorder} ${glow}`}>
                <node.icon className={`w-8 h-8 mx-auto transition-colors duration-300 ${iconColor}`} />
                <p className="text-xs font-semibold text-center mt-3 text-slate-200 whitespace-nowrap">{node.title}</p>
                
                {isEngine && engineState !== "healthy" && (
                  <span className={`absolute -top-3 -right-3 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${engineState === "crashed" ? "bg-red-500 text-white animate-pulse" : "bg-yellow-500 text-zinc-900"}`}>
                    {engineState === "crashed" ? "!" : "↻"}
                  </span>
                )}
              </div>

              {/* Node Tooltip */}
              {hoveredNode === node.id && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }}
                  className={`absolute w-[320px] z-[100] pointer-events-none ${node.tooltipClass}`}
                >
                  <div className="bg-zinc-950/95 backdrop-blur-xl p-5 rounded-xl border border-zinc-700 shadow-2xl relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-t-xl" />
                    {node.description && <p className="text-sm text-zinc-300 leading-relaxed font-medium">{node.description}</p>}
                    {node.code && <div className="bg-zinc-900/80 rounded-lg p-3 overflow-x-auto border border-zinc-800 shadow-inner mt-2">{node.code}</div>}
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}

        {/* --- Pipe Tooltips --- */}
        {PIPELINES.map((pipe) => {
          if (hoveredPipe !== pipe.id) return null;
          // Calculate midpoint for tooltip placement
          const midX = (pipe.start[0] + pipe.end[0]) / 2;
          const midY = (pipe.start[1] + pipe.end[1]) / 2;

          return (
            <motion.div
              key={`tooltip-${pipe.id}`}
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="absolute z-[100] pointer-events-none -translate-x-1/2 -translate-y-1/2 w-[280px]"
              style={{ left: `${midX}%`, top: `${midY}%` }}
            >
              <div className="bg-zinc-900/95 backdrop-blur-xl p-4 rounded-xl border border-zinc-700 shadow-2xl">
                <span className="text-[10px] font-bold tracking-widest text-cyan-400 uppercase mb-1 block">Pipeline Protocol</span>
                <h4 className="text-lg font-semibold text-slate-100 mb-2">{pipe.protocol}</h4>
                <p className="text-sm text-zinc-400 leading-relaxed">{pipe.desc}</p>
              </div>
            </motion.div>
          );
        })}

      </div>
    </div>
  );
}