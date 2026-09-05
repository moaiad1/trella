import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Input } from "./ui/input";
import { cn } from "./ui/utils";

export type InlineSearchOption = string | { value: string; label: string };

function normalizeOptions(options: InlineSearchOption[]): { value: string; label: string }[] {
  if (!options.length) return [];
  if (typeof options[0] === "string") {
    return (options as string[]).map((s) => ({ value: s, label: s }));
  }
  return options as { value: string; label: string }[];
}

interface InlineSearchSelectProps {
  id?: string;
  options: InlineSearchOption[];
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder: string;
  emptyText: string;
  /** Shown when user types a value not in the list (e.g. “Use …”). Ignored if allowCustom is false. */
  useCustomLabel: (typed: string) => string;
  /** If false, only options from the list can be chosen (e.g. model year). Default true. */
  allowCustom?: boolean;
  disabled?: boolean;
  loading?: boolean;
}

/**
 * Searchable single-line field with a plain dropdown under the input (no Popover portal).
 * Options may be strings or { value, label } for id + display text.
 */
export function InlineSearchSelect({
  id,
  options,
  value,
  onChange,
  onBlur,
  placeholder,
  emptyText,
  useCustomLabel,
  allowCustom = true,
  disabled,
  loading,
}: InlineSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const normalized = useMemo(() => normalizeOptions(options), [options]);

  const displayValue = useMemo(() => {
    if (!value) return "";
    const hit = normalized.find((x) => x.value === value);
    return hit?.label ?? value;
  }, [value, normalized]);

  useEffect(() => {
    if (!open) setQuery(displayValue);
  }, [displayValue, open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return normalized;
    return normalized.filter((o) => o.label.toLowerCase().includes(q));
  }, [normalized, query]);

  const exactMatch = useMemo(
    () =>
      normalized.some((o) => o.label.toLowerCase() === query.trim().toLowerCase()),
    [normalized, query],
  );

  const showCustom =
    allowCustom && Boolean(query.trim()) && !exactMatch && !loading;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery(displayValue);
        onBlur?.();
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, displayValue, onBlur]);

  const pick = (opt: { value: string; label: string }) => {
    onChange(opt.value);
    setQuery(opt.label);
    setOpen(false);
    onBlur?.();
  };

  const inputDisplay = open ? query : displayValue;

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Input
          id={id}
          type="text"
          inputMode="search"
          role="combobox"
          aria-expanded={open}
          aria-busy={loading || undefined}
          autoComplete="off"
          disabled={disabled}
          value={inputDisplay}
          placeholder={placeholder}
          className="pr-9 touch-manipulation"
          onChange={(e) => {
            if (disabled) return;
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (disabled) return;
            setQuery(displayValue);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              setOpen(false);
              setQuery(displayValue);
              onBlur?.();
            }
            if (e.key === "Enter" && showCustom && query.trim()) {
              e.preventDefault();
              pick({ value: query.trim(), label: query.trim() });
            }
          }}
        />
        <ChevronsUpDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
      </div>

      {open && !disabled ? (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-[500] mt-1 max-h-[min(300px,50vh)] overflow-y-auto overflow-x-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md"
        >
          {loading ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">…</div>
          ) : (
            <>
              {showCustom && (
                <button
                  type="button"
                  role="option"
                  className="flex w-full cursor-default items-center px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick({ value: query.trim(), label: query.trim() })}
                >
                  {useCustomLabel(query.trim())}
                </button>
              )}
              {filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  className="flex w-full cursor-default items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(opt)}
                >
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0",
                      value === opt.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{opt.label}</span>
                </button>
              ))}
              {filtered.length === 0 && !showCustom && (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyText}</div>
              )}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
