import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 200);
    const t2 = setTimeout(() => setPhase(2), 800);
    const t3 = setTimeout(() => setPhase(3), 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-surface select-none relative overflow-hidden">
      {/* Ambient orb */}
      <div
        className="absolute w-[400px] h-[400px] rounded-full transition-all duration-[2000ms] ease-out"
        style={{
          background: 'radial-gradient(circle, rgba(0, 212, 255, 0.08) 0%, transparent 70%)',
          opacity: phase >= 1 ? 1 : 0,
          transform: phase >= 1 ? 'scale(1)' : 'scale(0.5)',
        }}
      />

      {/* Logo */}
      <div
        className="relative transition-all duration-700 ease-out"
        style={{
          opacity: phase >= 1 ? 1 : 0,
          transform: phase >= 1 ? 'translateY(0)' : 'translateY(16px)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full bg-accent transition-all duration-500"
            style={{
              boxShadow: phase >= 2 ? '0 0 20px rgba(0, 212, 255, 0.5)' : 'none',
            }}
          />
          <h1 className="text-4xl font-bold text-white tracking-tight">
            nayflash
          </h1>
        </div>
      </div>

      {/* Tagline */}
      <p
        className="mt-5 text-sm text-zinc-500 font-mono tracking-wide transition-all duration-700 ease-out"
        style={{
          opacity: phase >= 2 ? 1 : 0,
          transform: phase >= 2 ? 'translateY(0)' : 'translateY(8px)',
        }}
      >
        flash &middot; boot &middot; go
      </p>

      {/* Minimal loading indicator */}
      <div
        className="mt-10 flex gap-1.5 transition-opacity duration-500"
        style={{ opacity: phase >= 3 ? 1 : 0 }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1 h-1 rounded-full bg-accent/50"
            style={{
              animation: phase >= 3 ? `breathe 1.5s ease-in-out ${i * 0.2}s infinite` : 'none',
            }}
          />
        ))}
      </div>
    </div>
  );
}
