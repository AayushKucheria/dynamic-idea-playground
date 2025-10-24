"use client";

import type { KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";

type OpenRouterKeyDialogProps = {
  isOpen: boolean;
  initialValue?: string;
  onSave: (key: string) => void;
  onCancel: () => void;
  onClear?: () => void;
};

const MIN_KEY_LENGTH = 10;

export function OpenRouterKeyDialog({
  isOpen,
  initialValue = "",
  onSave,
  onCancel,
  onClear,
}: OpenRouterKeyDialogProps) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const validate = (candidate: string) => {
    const trimmed = candidate.trim();

    if (!trimmed) {
      return "Add your API key so the playground can reach OpenRouter.";
    }

    if (!trimmed.startsWith("sk-")) {
      return "Keys usually start with “sk-”. Double-check the value.";
    }

    if (trimmed.length < MIN_KEY_LENGTH) {
      return "That key feels a little short—paste the full value.";
    }

    return null;
  };

  const handleSave = () => {
    const trimmed = value.trim();
    const validationResult = validate(trimmed);

    if (validationResult) {
      setError(validationResult);
      return;
    }

    onSave(trimmed);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSave();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-6 py-8">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 text-slate-100 shadow-[0_24px_60px_rgba(15,23,42,0.45)]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">OpenRouter</p>
            <h2 className="text-2xl font-semibold tracking-tight text-white">Add your API key</h2>
            <p className="text-sm text-slate-300">
              Store your key locally so the playground can reach OpenRouter without interruption.
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-3">
          <label className="flex flex-col gap-2 text-sm text-slate-200">
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">API key</span>
            <input
              ref={inputRef}
              type="password"
              className="w-full rounded-2xl border border-white/20 bg-slate-800 px-4 py-3 text-base text-white placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
              placeholder="sk-..."
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={handleKeyDown}
            />
          </label>
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          {onClear ? (
            <button
              type="button"
              className="text-sm font-semibold text-slate-400 transition hover:text-slate-200"
              onClick={() => {
                onClear();
                setValue("");
                setError(null);
              }}
            >
              Clear stored key
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-full px-5 py-2 text-sm font-semibold text-slate-300 transition hover:text-slate-100"
              onClick={() => {
                setValue(initialValue);
                setError(null);
                onCancel();
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              onClick={handleSave}
            >
              Save key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
