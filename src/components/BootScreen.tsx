import { useEffect, useState } from "react";
import logoAsset from "@/assets/wanda-logo.png.asset.json";

export function BootScreen() {
  const [hidden, setHidden] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setHidden(true), 2000);
    const t2 = setTimeout(() => setGone(true), 2700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (gone) return null;

  return (
    <div
      className={`gold-pattern fixed inset-0 z-[100] flex flex-col items-center justify-center transition-opacity duration-700 ${
        hidden ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      aria-hidden={hidden}
    >
      <img
        src={logoAsset.url}
        alt="Wanda Recruitment and Catering Agency"
        className="w-64 max-w-[70vw] animate-in fade-in zoom-in duration-1000"
      />
      <div className="deco-rule mt-6 w-48" />
      <p className="mt-4 text-[0.6rem] tracking-[0.4em] text-primary uppercase">Nationwide</p>
    </div>
  );
}
