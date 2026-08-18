"use client";

import { RotateCcw } from "lucide-react";
import { useSettingsStore } from "@/store/settingsStore";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface SliderRowProps {
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}

function SliderRow({
  label,
  description,
  min,
  max,
  step,
  value,
  onChange,
  format,
}: SliderRowProps) {
  return (
    <div className="py-2.5">
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink dark:text-neutral-100">
            {label}
          </p>
          <p className="text-xs text-ink-tertiary dark:text-neutral-500 mt-0.5">
            {description}
          </p>
        </div>
        <span className="flex-shrink-0 text-xs font-semibold tabular-nums bg-neutral-100 dark:bg-dark-tertiary px-2 py-0.5 rounded-md text-ink dark:text-neutral-200">
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-neutral-900 dark:accent-neutral-100 cursor-pointer"
        aria-label={label}
      />
    </div>
  );
}

export default function AdvancedSettings() {
  const {
    temperature,
    setTemperature,
    topP,
    setTopP,
    topK,
    setTopK,
    maxTokens,
    setMaxTokens,
    presencePenalty,
    setPresencePenalty,
    frequencyPenalty,
    setFrequencyPenalty,
    resetGenerationParams,
  } = useSettingsStore();

  return (
    <div className="space-y-6 max-w-xl">
      <section>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-medium text-ink dark:text-neutral-100">
              Generation Parameters
            </h3>
            <p className="text-xs text-ink-tertiary dark:text-neutral-500 mt-0.5">
              Advanced sampling controls — applied to every chat and compare
              request.
            </p>
          </div>
          <Button
            variant="ghost"
            size="xs"
            onClick={resetGenerationParams}
            className="flex-shrink-0"
          >
            <RotateCcw className="size-3" />
            Reset
          </Button>
        </div>

        <div className="rounded-xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-secondary px-4 py-1 divide-y divide-neutral-100 dark:divide-dark-border">
          <SliderRow
            label="Temperature"
            description="Randomness of the output — lower is focused, higher is creative."
            min={0}
            max={2}
            step={0.1}
            value={temperature}
            onChange={setTemperature}
            format={(v) => v.toFixed(1)}
          />
          <SliderRow
            label="Top P"
            description="Nucleus sampling — cuts off the least likely tokens."
            min={0}
            max={1}
            step={0.05}
            value={topP}
            onChange={setTopP}
            format={(v) => v.toFixed(2)}
          />
          <SliderRow
            label="Top K"
            description="Only consider the K most likely tokens (0 = disabled)."
            min={0}
            max={100}
            step={1}
            value={topK}
            onChange={setTopK}
            format={(v) => (v === 0 ? "off" : String(v))}
          />
          <SliderRow
            label="Presence penalty"
            description="Discourages the model from repeating topics already mentioned."
            min={-2}
            max={2}
            step={0.1}
            value={presencePenalty}
            onChange={setPresencePenalty}
            format={(v) => (v === 0 ? "off" : v.toFixed(1))}
          />
          <SliderRow
            label="Frequency penalty"
            description="Discourages repeating the same words and phrases."
            min={-2}
            max={2}
            step={0.1}
            value={frequencyPenalty}
            onChange={setFrequencyPenalty}
            format={(v) => (v === 0 ? "off" : v.toFixed(1))}
          />

          {/* Max tokens — number input */}
          <div className="py-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink dark:text-neutral-100">
                  Max tokens
                </p>
                <p className="text-xs text-ink-tertiary dark:text-neutral-500 mt-0.5">
                  Cap on response length (0 = model default; free models are
                  capped at 4096 automatically).
                </p>
              </div>
              <input
                type="number"
                min={0}
                max={32768}
                value={maxTokens}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setMaxTokens(Number.isFinite(v) && v >= 0 ? Math.min(v, 32768) : 0);
                }}
                className={cn(
                  "w-24 flex-shrink-0 text-xs rounded-lg border px-2 py-1.5 text-right tabular-nums",
                  "border-neutral-200 dark:border-dark-border bg-neutral-50 dark:bg-dark-tertiary",
                  "text-ink dark:text-neutral-100 outline-none focus:border-neutral-300 dark:focus:border-neutral-700",
                )}
                aria-label="Max tokens"
              />
            </div>
          </div>
        </div>

        <p className="text-xs text-ink-muted dark:text-neutral-600 mt-2">
          Non-default values are only sent when set (temperature is always
          sent). Models that don&apos;t support a parameter ignore it.
        </p>
      </section>
    </div>
  );
}
