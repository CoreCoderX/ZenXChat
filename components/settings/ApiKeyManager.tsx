"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Check,
  X,
  Key,
  AlertCircle,
  Loader2,
  Star,
  Info,
} from "lucide-react";
import { useSettingsStore } from "@/store/settingsStore";
import { maskApiKey } from "@/lib/openrouter";
import { ApiKey } from "@/types";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface KeyInfo {
  label?: string;
  limit?: number | null;
  limit_remaining?: number | null;
  usage?: number;
  is_free_tier?: boolean;
  rate_limit?: { requests: number; interval: string };
}

export default function ApiKeyManager() {
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState("");
  const [keyInfoMap, setKeyInfoMap] = useState<Record<string, KeyInfo>>({});
  const [checking, setChecking] = useState<string | null>(null);

  const {
    apiKeys,
    activeKeyId,
    addApiKey,
    removeApiKey,
    setActiveKey,
    updateKeyStatus,
  } = useSettingsStore();

  // ── Call OpenRouter DIRECTLY — no /api/check-key proxy ───────────────────

  const fetchKeyInfo = async (rawKey: string): Promise<KeyInfo | null> => {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${rawKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) return null;

      const json = (await res.json()) as { data?: KeyInfo };
      return json?.data ?? null;
    } catch (err) {
      console.error("[fetchKeyInfo] failed:", err);
      return null;
    }
  };

  // ── Check an existing key ─────────────────────────────────────────────────

  const checkKey = async (key: ApiKey) => {
    setChecking(key.id);
    try {
      const info = await fetchKeyInfo(key.key);
      if (info) {
        setKeyInfoMap((prev) => ({ ...prev, [key.id]: info }));
        updateKeyStatus(key.id, "valid");
      } else {
        updateKeyStatus(key.id, "invalid");
      }
    } finally {
      setChecking(null);
    }
  };

  // ── Add a new key ─────────────────────────────────────────────────────────

  const handleAdd = async () => {
    const trimmed = newKey.trim();
    if (!trimmed) {
      setError("Please enter an API key");
      return;
    }
    if (!trimmed.startsWith("sk-or-")) {
      setError("OpenRouter keys must start with sk-or-…");
      return;
    }

    setIsValidating(true);
    setError("");

    try {
      const info = await fetchKeyInfo(trimmed);

      if (!info) {
        setError("Invalid API key — could not authenticate with OpenRouter.");
        return;
      }

      // Add the key to store
      addApiKey(trimmed, newLabel.trim() || `Key ${apiKeys.length + 1}`);

      // Store key info after a tick (so the store has the new key's ID)
      setTimeout(() => {
        const added = useSettingsStore
          .getState()
          .apiKeys.find((k) => k.key === trimmed);
        if (added) {
          setKeyInfoMap((prev) => ({ ...prev, [added.id]: info }));
          updateKeyStatus(added.id, "valid");
        }
      }, 100);

      setNewKey("");
      setNewLabel("");
      setIsAdding(false);
    } catch {
      setError("Network error — check your internet connection.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAdd();
    if (e.key === "Escape") {
      setIsAdding(false);
      setNewKey("");
      setNewLabel("");
      setError("");
    }
  };

  const StatusIcon = ({ k }: { k: ApiKey }) => {
    if (checking === k.id)
      return <Loader2 className="size-3 animate-spin text-ink-tertiary" />;
    if (k.status === "valid")
      return <Check className="size-3 text-emerald-500" />;
    if (k.status === "invalid") return <X className="size-3 text-red-500" />;
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-sm font-medium text-ink dark:text-neutral-100">
          API Keys
        </h3>
        <p className="text-xs text-ink-tertiary dark:text-neutral-500 mt-0.5">
          Add multiple OpenRouter keys for automatic fallback. Keys are stored
          locally on this device.
        </p>
      </div>

      {/* Key list */}
      <div className="space-y-2">
        <AnimatePresence>
          {apiKeys.map((key) => {
            const info = keyInfoMap[key.id];
            
            const usageVal = info?.usage != null ? Number(info.usage) : 0;
            const limitVal = info?.limit != null ? Number(info.limit) : null;
            const remainingVal = info?.limit_remaining != null ? Number(info.limit_remaining) : null;
            
            let usedPct = 0;
            if (limitVal !== null && limitVal > 0) {
              const spent = limitVal - (remainingVal ?? 0);
              usedPct = Math.min(100, Math.max(0, Math.round((spent / limitVal) * 100)));
            }

            return (
              <motion.div
                key={key.id}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  "rounded-xl border transition-colors",
                  key.id === activeKeyId
                    ? "border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-dark-tertiary"
                    : "border-neutral-200 dark:border-dark-border",
                )}
              >
                {/* Key row */}
                <div className="flex items-center gap-3 p-3">
                  <div className="size-7 rounded-lg bg-neutral-100 dark:bg-dark-quaternary flex items-center justify-center flex-shrink-0">
                    <Key className="size-3.5 text-ink-tertiary dark:text-neutral-500" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-medium text-ink dark:text-neutral-100">
                        {key.label}
                      </span>
                      {key.id === activeKeyId && (
                        <span className="text-[10px] bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-1.5 py-0.5 rounded-full font-medium">
                          Active
                        </span>
                      )}
                      <StatusIcon k={key} />
                    </div>
                    <span className="text-[11px] font-mono text-ink-muted dark:text-neutral-600">
                      {maskApiKey(key.key)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => checkKey(key)}
                      disabled={checking === key.id}
                      title="Check key details"
                    >
                      <Info className="size-3" />
                    </Button>

                    {key.id !== activeKeyId && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setActiveKey(key.id)}
                        title="Set as active"
                      >
                        <Star className="size-3" />
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => removeApiKey(key.id)}
                      className="text-red-400 hover:text-red-500"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>

                {/* Key info panel */}
                <AnimatePresence>
                  {info && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3">
                        <div className="bg-neutral-50 dark:bg-dark-quaternary rounded-lg p-3.5 space-y-2.5 font-mono text-[10px] border border-neutral-200/50 dark:border-dark-border/30">
                          {/* Core Details */}
                          <div className="space-y-1">
                            <InfoRow label="Key Name" value={info.label ?? key.label ?? "Production"} />
                            <InfoRow 
                              label="Account Tier" 
                              value={info.is_free_tier ? "Free Tier" : "Paid"} 
                              valueClass={info.is_free_tier ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-emerald-600 dark:text-emerald-400 font-semibold"}
                            />
                            <InfoRow label="Total Spent" value={`$${usageVal.toFixed(4)}`} />
                          </div>

                          {/* Budget & Progress Bar */}
                          {limitVal !== null ? (
                            <div className="space-y-2">
                              <div className="h-px bg-neutral-200 dark:bg-dark-border/40 my-1" />
                              <InfoRow label="Credit Limit" value={`$${limitVal.toFixed(2)}`} />
                              <InfoRow 
                                label="Credits Remaining" 
                                value={remainingVal !== null ? `$${remainingVal.toFixed(4)}` : "N/A"} 
                                valueClass={remainingVal !== null && remainingVal <= 0 ? "text-red-500 font-semibold" : "text-emerald-600 dark:text-emerald-400 font-semibold"}
                              />
                              <div className="pt-1 space-y-1">
                                <div className="flex items-center justify-between text-[9px] text-ink-muted dark:text-neutral-500">
                                  <span>Usage Progress</span>
                                  <span className="font-semibold">{usedPct}% Used</span>
                                </div>
                                <div className="h-1.5 w-full bg-neutral-200 dark:bg-dark-tertiary rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-emerald-500 transition-all duration-300"
                                    style={{ width: `${usedPct}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="h-px bg-neutral-200 dark:bg-dark-border/40 my-1" />
                              <InfoRow label="Credit Limit" value="Unlimited / Pay-as-you-go" valueClass="text-ink-secondary dark:text-neutral-400" />
                            </div>
                          )}

                          {/* Warning: free tier with no credits */}
                          {info.is_free_tier &&
                            Number(info.limit_remaining ?? 1) <= 0 && (
                              <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                                <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                                  ⚠ Free tier with $0 balance. Add credits at{" "}
                                  <a
                                    href="https://openrouter.ai/credits"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline font-medium"
                                  >
                                    openrouter.ai/credits
                                  </a>{" "}
                                  to unlock all models.
                                </p>
                              </div>
                            )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Empty state */}
        {apiKeys.length === 0 && !isAdding && (
          <div className="flex flex-col items-center gap-2 py-8 border border-dashed border-neutral-200 dark:border-dark-border rounded-xl">
            <Key className="size-7 text-ink-muted dark:text-neutral-600" />
            <p className="text-xs text-ink-muted dark:text-neutral-600 text-center leading-relaxed">
              No API keys added.
              <br />
              Add your OpenRouter key to start chatting.
            </p>
          </div>
        )}
      </div>

      {/* Add key form */}
      <AnimatePresence>
        {isAdding ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Label (optional, e.g. My Key)"
              className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-tertiary text-ink dark:text-neutral-100 placeholder:text-ink-muted dark:placeholder:text-neutral-600 outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition-colors"
            />
            <input
              type="password"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="sk-or-v1-..."
              autoFocus
              className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-tertiary text-ink dark:text-neutral-100 placeholder:text-ink-muted dark:placeholder:text-neutral-600 outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition-colors"
            />

            {error && (
              <div className="flex items-start gap-1.5 text-xs text-red-500 dark:text-red-400">
                <AlertCircle className="size-3 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleAdd}
                isLoading={isValidating}
                className="flex-1"
              >
                {isValidating ? "Validating…" : "Add Key"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAdding(false);
                  setNewKey("");
                  setNewLabel("");
                  setError("");
                }}
              >
                Cancel
              </Button>
            </div>

            <div className="space-y-1 pt-1">
              <p className="text-[11px] text-ink-muted dark:text-neutral-600">
                Get your key at{" "}
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-ink-secondary transition-colors"
                >
                  openrouter.ai/keys
                </a>
              </p>
              <p className="text-[11px] text-ink-muted dark:text-neutral-600">
                Need credits?{" "}
                <a
                  href="https://openrouter.ai/credits"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-ink-secondary transition-colors"
                >
                  openrouter.ai/credits
                </a>
              </p>
            </div>
          </motion.div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="w-full"
          >
            <Plus className="size-3.5" />
            Add API Key
          </Button>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-ink-tertiary dark:text-neutral-500">
        {label}
      </span>
      <span
        className={cn(
          "text-[11px] font-medium text-ink dark:text-neutral-300",
          valueClass,
        )}
      >
        {value}
      </span>
    </div>
  );
}
