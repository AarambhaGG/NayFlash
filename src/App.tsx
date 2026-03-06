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
    <div className="h-screen flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-neutral-800">
        <div className="px-6 py-3 flex items-center justify-between">
          <h1 className="text-sm font-black text-white tracking-tight">
            NayFlash
          </h1>
          <StepIndicator currentStep={currentStep} />
          {currentStep > 1 && (
            <button
              onClick={handleBack}
              className="text-xs text-neutral-500 hover:text-white transition-colors font-bold uppercase tracking-wide"
            >
              ← Back
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full animate-fadeIn">
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
