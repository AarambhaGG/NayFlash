interface StepIndicatorProps {
  currentStep: number;
}

const steps = [
  { num: 1, label: "Select" },
  { num: 2, label: "Download" },
  { num: 3, label: "Flash" },
];

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => (
        <div key={step.num} className="flex items-center gap-2">
          {/* Step dot + label */}
          <div className="flex items-center gap-1.5">
            <div
              className={`transition-all duration-300 rounded-full ${
                currentStep === step.num
                  ? "w-2 h-2 bg-accent shadow-glow-sm"
                  : currentStep > step.num
                  ? "w-1.5 h-1.5 bg-accent/40"
                  : "w-1.5 h-1.5 bg-zinc-700"
              }`}
            />
            <span
              className={`text-[11px] font-medium tracking-wide transition-colors duration-300 ${
                currentStep === step.num
                  ? "text-white"
                  : currentStep > step.num
                  ? "text-zinc-500"
                  : "text-zinc-600"
              }`}
            >
              {step.label}
            </span>
          </div>

          {/* Connector line */}
          {i < steps.length - 1 && (
            <div className="w-6 h-px relative">
              <div className="absolute inset-0 bg-zinc-800" />
              <div
                className="absolute inset-y-0 left-0 bg-accent/40 transition-all duration-500"
                style={{ width: currentStep > step.num ? '100%' : '0%' }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
