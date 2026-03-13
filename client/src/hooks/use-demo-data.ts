import { useState, useEffect } from "react";

type DemoDataModule = typeof import("@/lib/demo-data");

let cachedModule: DemoDataModule | null = null;

/**
 * Lazy-loads the demo data module only when demo mode is active.
 * Caches the module after first load so subsequent calls are synchronous.
 * Returns null when not in demo mode or while loading.
 */
export function useDemoData(isDemo?: boolean): DemoDataModule | null {
  const [mod, setMod] = useState<DemoDataModule | null>(cachedModule);

  useEffect(() => {
    if (!isDemo || cachedModule) return;
    import("@/lib/demo-data").then((m) => {
      cachedModule = m;
      setMod(m);
    });
  }, [isDemo]);

  return isDemo ? mod : null;
}
