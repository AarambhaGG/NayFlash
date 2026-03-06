import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-black select-none">
      <div
        className="transition-opacity duration-1000"
        style={{ opacity: show ? 1 : 0 }}
      >
        <h1 className="text-7xl font-black text-white tracking-tighter leading-none">
          NayFlash
        </h1>
        <p className="mt-4 text-xl text-neutral-500 font-normal tracking-wide">
          Every OS journey begins here.
        </p>
      </div>
    </div>
  );
}
