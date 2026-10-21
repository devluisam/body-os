"use client";
import { useId, type ComponentProps } from "react";
// 0–10 answers as a row of taps instead of typed numbers. Native radios keep
// arrow-key navigation and screen-reader semantics; nothing is chosen until
// the athlete chooses, so an untouched scale is "not answered", never a value.
export function Scale({
  name,
  label,
  low,
  high,
  min = 0,
  max = 10,
  defaultValue,
  required = false,
}: {
  name: string;
  label: string;
  low: string;
  high: string;
  min?: number;
  max?: number;
  defaultValue?: number;
  required?: boolean;
}) {
  const id = useId();
  const options = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <fieldset className="scale" aria-describedby={id}>
      <legend>
        {label}
        {!required && <span className="optional"> · opcional</span>}
      </legend>
      <div className="scale-options" data-count={options.length}>
        {options.map((n) => (
          <label key={n}>
            <input
              type="radio"
              name={name}
              value={n}
              defaultChecked={defaultValue === n}
            />
            <span>{n}</span>
          </label>
        ))}
      </div>
      <div className="scale-ends" id={id}>
        <span>
          {min} = {low}
        </span>
        <span>
          {max} = {high}
        </span>
      </div>
    </fieldset>
  );
}
// Decimal entry that accepts "85,4". type="number" on iOS with a pt-BR keypad
// can hand back an empty value for a comma, so this stays text and the form
// parses it with parseDecimal.
export function DecimalInput(
  props: Omit<ComponentProps<"input">, "type" | "inputMode">,
) {
  return (
    <input
      {...props}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      pattern="[0-9]*[.,]?[0-9]*"
    />
  );
}
