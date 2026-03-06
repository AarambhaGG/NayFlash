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
    <div className="flex items-center gap-0">
      {steps.map((step, i) => (
        <div key={step.num} className="flex items-center">
          <span
            className={`text-xs font-bold tracking-wide uppercase ${
              currentStep === step.num
                ? "text-white"
                : currentStep > step.num
                ? "text-neutral-500"
                : "text-neutral-700"
            }`}
          >
            {step.num}. {step.label}
          </span>
          {i < steps.length - 1 && (
            <span className="mx-3 text-neutral-700 text-xs">—</span>
          )}
        </div>
      ))}
    </div>
  );
}
