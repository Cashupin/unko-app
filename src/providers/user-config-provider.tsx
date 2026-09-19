"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { upsertUserConfig } from "@/lib/user-config";

const CACHE_KEY = "uc_v1";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h en ms

type Cache = { data: Record<string, string>; expiresAt: number };

function readCache(): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as Cache;
    if (Date.now() > cache.expiresAt) return null;
    return cache.data;
  } catch {
    return null;
  }
}

function writeCache(data: Record<string, string>) {
  try {
    const cache: Cache = { data, expiresAt: Date.now() + CACHE_TTL };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

type UserConfigCtx = {
  configs: Record<string, string>;
  get: (key: string) => string | undefined;
  set: (key: string, value: string) => Promise<void>;
};

const Ctx = createContext<UserConfigCtx>({
  configs: {},
  get: () => undefined,
  set: async () => {},
});

export function UserConfigProvider({ children }: { children: React.ReactNode }) {
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    // Try cache first
    const cached = readCache();
    if (cached) {
      setConfigs(cached);
      return;
    }

    // Cache miss → fetch from DB and populate cache
    fetch("/api/user/config")
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: Record<string, string>) => {
        setConfigs(data);
        writeCache(data);
      })
      .catch(() => {});
  }, []);

  async function set(key: string, value: string) {
    // Optimistic update + write-through cache (reset TTL)
    const next = { ...configs, [key]: value };
    setConfigs(next);
    writeCache(next);
    // Fire-and-forget to DB
    await upsertUserConfig(key, value);
  }

  function get(key: string) {
    return configs[key];
  }

  return <Ctx.Provider value={{ configs, get, set }}>{children}</Ctx.Provider>;
}

export function useUserConfig() {
  return useContext(Ctx);
}
