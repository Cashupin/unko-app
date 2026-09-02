"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";

export function PrintButton({ isAdmin, includePersonal }: { isAdmin?: boolean; includePersonal?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function toggleParam(key: string, enableValue: string, defaultEnabled: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.get(key);
    const isCurrentlyEnabled = current === null ? defaultEnabled : current === enableValue;
    if (isCurrentlyEnabled) {
      params.set(key, defaultEnabled ? "0" : enableValue);
    } else {
      if (defaultEnabled) params.delete(key);
      else params.set(key, enableValue);
    }
    router.replace(`${pathname}?${params.toString()}`);
  }

  const draftsEnabled = searchParams.get("drafts") === "1";
  const personalEnabled = includePersonal ?? true;

  return (
    <div className="print:hidden fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* Opciones */}
      <div className="flex flex-col gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-lg text-sm">
        <p className="text-xs font-semibold text-zinc-500 mb-1">Opciones de exportación</p>

        <label className="flex cursor-pointer items-center gap-2 text-zinc-700">
          <input
            type="checkbox"
            checked={personalEnabled}
            onChange={() => toggleParam("personal", "1", true)}
            className="rounded accent-zinc-700"
          />
          Incluir Mi Plan
        </label>

        {isAdmin && (
          <label className="flex cursor-pointer items-center gap-2 text-zinc-700">
            <input
              type="checkbox"
              checked={draftsEnabled}
              onChange={() => toggleParam("drafts", "1", false)}
              className="rounded accent-zinc-700"
            />
            Incluir borradores
          </label>
        )}
      </div>

      <button
        type="button"
        onClick={() => window.print()}
        className="flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-zinc-700 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        Guardar PDF
      </button>
    </div>
  );
}
