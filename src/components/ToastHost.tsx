import { useEffect, useState } from "react";
import { setToastListener } from "../lib/notify";

export default function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    setToastListener((m) => {
      setMsg(m);
      setTimeout(() => setMsg(null), 4000);
    });
  }, []);
  if (!msg) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] rounded-xl bg-zinc-900 text-white px-5 py-3 text-sm shadow-xl border border-white/10">
      {msg}
    </div>
  );
}
