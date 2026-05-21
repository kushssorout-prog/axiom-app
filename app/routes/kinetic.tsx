import { useState, useEffect, useRef } from 'react';
import { AppLayout } from '~/components/AppLayout';
import { authFetch } from '~/lib/api';

type Zone = 'safe' | 'boundary' | 'critical';
type Speed = 'slow' | 'normal' | 'fast';

interface Position { x: number; y: number; z: number; energy: number }
interface HaltEntry { frame: number; maxEnergy: number; timestamp: string; reason: string }

const SVG_W = 400;
const SVG_H = 300;

// Map logical coords (-1..1) to SVG px
const toSvg = (v: number, max: number) => ((v + 1) / 2) * max;

function computePosition(zone: Zone, frame: number, speed: Speed): Position {
  const s = speed === 'slow' ? 0.5 : speed === 'fast' ? 2 : 1;
  const t = (frame * s * 0.08);

  if (zone === 'safe') {
    const x = 0.55 * Math.sin(t);
    const y = 0.28 * Math.sin(2 * t);
    return { x, y, z: 0, energy: 10 + Math.abs(x) * 15 + Math.abs(y) * 10 };
  }
  if (zone === 'boundary') {
    const r = Math.min(0.85, 0.1 + frame * s * 0.004);
    const x = r * Math.cos(t);
    const y = r * Math.sin(t);
    return { x, y, z: 0, energy: 20 + r * 70 };
  }
  // critical — goes into top-right corner
  const r = Math.min(1.1, 0.1 + frame * s * 0.006);
  const x = r * 0.85;
  const y = r * 0.85;
  return { x, y, z: 0, energy: 30 + r * 80 };
}

function inRedZone(pos: Position): boolean {
  return (pos.x > 0.65 && pos.y > 0.65) || (pos.x < -0.65 && pos.y < -0.65);
}

export default function KineticPage() {
  const [zone, setZone] = useState<Zone>('safe');
  const [speed, setSpeed] = useState<Speed>('normal');
  const [running, setRunning] = useState(false);
  const [frame, setFrame] = useState(0);
  const [pos, setPos] = useState<Position>({ x: 0, y: 0, z: 0, energy: 10 });
  const [trail, setTrail] = useState<Position[]>([]);
  const [halted, setHalted] = useState(false);
  const [haltLog, setHaltLog] = useState<HaltEntry[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameRef = useRef(0);
  const posRef = useRef(pos);
  posRef.current = pos;

  const stopSim = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRunning(false);
  };

  const triggerHalt = (f: number, energy: number) => {
    stopSim();
    setHalted(true);
    const entry: HaltEntry = {
      frame: f,
      maxEnergy: Math.round(energy),
      timestamp: new Date().toLocaleString(),
      reason: `Trajectory breached restricted zone at frame ${f}`,
    };
    setHaltLog(prev => [entry, ...prev].slice(0, 10));
    // Fire-and-forget POST
    authFetch('/api/kinetic/halt', {
      method: 'POST',
      body: JSON.stringify({ frame: f, energy, zone, sessionId: `sim-${Date.now()}` }),
    }).catch(() => {});
  };

  const startSim = () => {
    setHalted(false);
    setFrame(0);
    frameRef.current = 0;
    setTrail([]);
    setRunning(true);
    intervalRef.current = setInterval(() => {
      frameRef.current += 1;
      const newPos = computePosition(zone, frameRef.current, speed);
      setPos(newPos);
      setFrame(frameRef.current);
      setTrail(prev => [...prev.slice(-19), newPos]);
      if (inRedZone(newPos)) {
        triggerHalt(frameRef.current, newPos.energy);
      }
    }, 100);
  };

  useEffect(() => () => stopSim(), []);

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-slate-900">Kinetic FLNW</h1>
              <span className="text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full">Simulation Mode</span>
            </div>
            <p className="text-sm text-slate-500">Formal Logic Neural Wrapper — Robotic telemetry interceptor</p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex gap-3">
          <span className="text-blue-500 text-lg flex-shrink-0 mt-0.5">ℹ</span>
          <p className="text-sm text-blue-800 leading-relaxed">
            This module simulates the Kinetic FLNW governance layer. In production, real sensor feeds and V-JEPA model
            inference replace the simulated coordinate stream. The compliance boundary logic is identical.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Control Panel */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Trajectory Simulation</h2>

              <div className="mb-4">
                <p className="text-xs text-slate-500 mb-2 font-medium">Zone Preset</p>
                <div className="flex gap-2 flex-wrap">
                  {(['safe', 'boundary', 'critical'] as Zone[]).map(z => (
                    <button
                      key={z}
                      onClick={() => { setZone(z); setHalted(false); }}
                      disabled={running}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-50 ${
                        zone === z
                          ? z === 'safe' ? 'bg-emerald-600 text-white border-emerald-600'
                            : z === 'boundary' ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-red-600 text-white border-red-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {z === 'safe' ? 'Safe Path' : z === 'boundary' ? 'Boundary Approach' : 'Critical Breach'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-5">
                <p className="text-xs text-slate-500 mb-2 font-medium">Speed</p>
                <div className="flex gap-2">
                  {(['slow', 'normal', 'fast'] as Speed[]).map(sp => (
                    <button
                      key={sp}
                      onClick={() => setSpeed(sp)}
                      disabled={running}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-50 ${
                        speed === sp ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {sp.charAt(0).toUpperCase() + sp.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={startSim}
                  disabled={running}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  ▶ Start Simulation
                </button>
                <button
                  onClick={stopSim}
                  disabled={!running}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  ⏹ Stop
                </button>
              </div>
            </div>

            {/* Live Stats */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Live Telemetry</h2>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Frame Count</span>
                  <span className="text-sm font-mono font-bold text-slate-900">{frame}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Position X</span>
                  <span className="text-sm font-mono text-slate-700">{pos.x.toFixed(4)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Position Y</span>
                  <span className="text-sm font-mono text-slate-700">{pos.y.toFixed(4)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Position Z</span>
                  <span className="text-sm font-mono text-slate-700">{pos.z.toFixed(4)}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                  <span className="text-xs font-semibold text-slate-600">Energy Score</span>
                  <span className={`text-sm font-bold font-mono ${
                    pos.energy >= 80 ? 'text-red-600' : pos.energy >= 40 ? 'text-amber-600' : 'text-emerald-600'
                  }`}>{pos.energy.toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Visualization */}
          <div className="lg:col-span-3">
            <div className={`bg-white border-2 rounded-xl p-5 transition-all ${halted ? 'border-red-500' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-slate-700">Live Coordinate Visualization</h2>
                {running && (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                  </span>
                )}
              </div>

              {/* HALT Banner */}
              {halted && (
                <div className="bg-red-600 text-white rounded-xl px-4 py-3 mb-4 text-center font-bold text-sm animate-in slide-in-from-top-2 duration-300">
                  ⛔ HALT_EXECUTION SIGNAL SENT — Frame {frame} — Zone breach detected
                </div>
              )}

              <div className="flex justify-center">
                <svg width={SVG_W} height={SVG_H} className="rounded-lg bg-slate-50 border border-slate-100">
                  {/* Safe zone boundary */}
                  <rect x={40} y={30} width={SVG_W - 80} height={SVG_H - 60} fill="none" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="6,3" rx={4} />

                  {/* Restricted red zones */}
                  <rect x={SVG_W - 40 - 90} y={30} width={90} height={90} fill="rgba(239,68,68,0.15)" stroke="rgba(239,68,68,0.4)" strokeWidth={1} rx={3} />
                  <rect x={40} y={SVG_H - 30 - 90} width={90} height={90} fill="rgba(239,68,68,0.15)" stroke="rgba(239,68,68,0.4)" strokeWidth={1} rx={3} />
                  <text x={SVG_W - 40 - 45} y={80} textAnchor="middle" fill="rgba(239,68,68,0.7)" fontSize={9} fontWeight="600">RESTRICTED</text>
                  <text x={85} y={SVG_H - 30 - 35} textAnchor="middle" fill="rgba(239,68,68,0.7)" fontSize={9} fontWeight="600">RESTRICTED</text>

                  {/* Axis labels */}
                  <text x={SVG_W / 2} y={SVG_H - 8} textAnchor="middle" fill="#94a3b8" fontSize={10}>X Axis</text>
                  <text x={14} y={SVG_H / 2} textAnchor="middle" fill="#94a3b8" fontSize={10} transform={`rotate(-90, 14, ${SVG_H / 2})`}>Y Axis</text>

                  {/* Trail */}
                  {trail.map((p, i) => (
                    <circle
                      key={i}
                      cx={toSvg(p.x, SVG_W)}
                      cy={toSvg(-p.y, SVG_H)}
                      r={2.5}
                      fill={`rgba(59,130,246,${(i / trail.length) * 0.6})`}
                    />
                  ))}

                  {/* Current dot */}
                  <circle
                    cx={toSvg(pos.x, SVG_W)}
                    cy={toSvg(-pos.y, SVG_H)}
                    r={7}
                    fill={halted ? '#ef4444' : inRedZone(pos) ? '#f97316' : '#3b82f6'}
                    stroke="white"
                    strokeWidth={2}
                  />
                  {running && (
                    <circle
                      cx={toSvg(pos.x, SVG_W)}
                      cy={toSvg(-pos.y, SVG_H)}
                      r={12}
                      fill="none"
                      stroke={halted ? '#ef4444' : '#3b82f6'}
                      strokeWidth={1}
                      opacity={0.4}
                    />
                  )}
                </svg>
              </div>

              <div className="mt-3 flex items-center gap-4 text-[11px] text-slate-400">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-200 border border-dashed border-slate-400 inline-block" /> Safe Zone</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 inline-block" /> Restricted</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Actuator</span>
              </div>
            </div>
          </div>
        </div>

        {/* Trajectory Log */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-4">Trajectory Halt Log</h2>
          {haltLog.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">No halts recorded in this session. Run a Critical Breach simulation to generate events.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Frame</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Max Energy</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Timestamp</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {haltLog.map((h, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono text-slate-700">{h.frame}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-semibold text-red-600">{h.maxEnergy}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-xs">{h.timestamp}</td>
                      <td className="py-2.5 px-3 text-slate-600 text-xs">{h.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
