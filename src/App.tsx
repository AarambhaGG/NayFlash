import { useState, useEffect } from "react";
import SplashScreen from "./components/SplashScreen";
import StepIndicator from "./components/StepIndicator";
import Search from "./steps/Search";
import Download from "./steps/Download";
import Flash from "./steps/Flash";
import type { Distro } from "./types";

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDistro, setSelectedDistro] = useState<Distro | null>(null);
  const [isoPath, setIsoPath] = useState<string>("");

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2800);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashScreen />;
  }

  const handleDistroSelect = (distro: Distro) => {
    setSelectedDistro(distro);
    setCurrentStep(2);
  };

  const handleDownloadComplete = (path: string) => {
    setIsoPath(path);
    setCurrentStep(3);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setSelectedDistro(null);
    setIsoPath("");
  };

  return (
    <div className="h-screen flex flex-col bg-surface noise overflow-hidden">
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-accent/[0.03] rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="relative flex-shrink-0 glow-line z-10">
        <div className="px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-accent/60 shadow-glow-sm" />
            <h1 className="text-sm font-bold text-white/90 tracking-tight">
              nayflash
            </h1>
          </div>

          <StepIndicator currentStep={currentStep} />

          {currentStep > 1 && (
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-accent transition-colors duration-200 font-medium tracking-wide uppercase focus-ring rounded px-2 py-1"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Back
            </button>
          )}
          {currentStep === 1 && <div className="w-16" />}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden relative">
        <div className="h-full animate-fadeIn" key={currentStep}>
          {currentStep === 1 && (
            <Search onSelect={handleDistroSelect} />
          )}
          {currentStep === 2 && selectedDistro && (
            <Download
              distro={selectedDistro}
              onComplete={handleDownloadComplete}
              onBack={handleBack}
            />
          )}
          {currentStep === 3 && selectedDistro && (
            <Flash
              distro={selectedDistro}
              isoPath={isoPath}
              onReset={handleReset}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
