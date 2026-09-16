"use client";

import ToolLayout from "./tool-layout";
import controls from "./tool-controls.module.css";

import styles from "./dice-roller.module.css";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

const DICE_COUNT_OPTIONS = [1, 2, 3, 4, 5, 6];
const ROLL_DURATION_MS = 500;
const ROLL_TICK_MS = 70;

// Standard six-sided die pip layouts, positioned on a 3x3 grid (top/middle/bottom x left/center/right).
const PIP_LAYOUTS: Record<number, string[]> = {
  1: ["mc"],
  2: ["tl", "br"],
  3: ["tl", "mc", "br"],
  4: ["tl", "tr", "bl", "br"],
  5: ["tl", "tr", "mc", "bl", "br"],
  6: ["tl", "tr", "ml", "mr", "bl", "br"],
};

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function DiceFace({ value, rolling }: { value: number; rolling: boolean }) {
  return (
    <span className={[styles["dice-face"], rolling && styles["dice-face-rolling"]].filter(Boolean).join(" ")}>
      {PIP_LAYOUTS[value].map(position => (
        <span key={position} className={[styles["dice-pip"], styles[`dice-pip-${position}`], value === 1 && styles["dice-pip-one"]].filter(Boolean).join(" ")} />
      ))}
    </span>
  );
}

export default function DiceRoller() {
  const t = useTranslations("App");
  const [diceCount, setDiceCount] = useState(2);
  const [values, setValues] = useState<number[] | null>(null);
  const [rolling, setRolling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function performRoll(count: number) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setRolling(true);
    intervalRef.current = setInterval(() => {
      setValues(Array.from({ length: count }, () => randomInt(1, 6)));
    }, ROLL_TICK_MS);
    timeoutRef.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setValues(Array.from({ length: count }, () => randomInt(1, 6)));
      setRolling(false);
    }, ROLL_DURATION_MS);
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function updateDiceCount(count: number) {
    setDiceCount(count);
    performRoll(count);
  }

  const total = values?.reduce((sum, value) => sum + value, 0) ?? 0;

  return (
    <ToolLayout title={t("diceTitle")} layout="spacious">
      <label className={controls.field} htmlFor="dice-count">
        <span className={controls.fieldLabel}>{t("diceCountLabel")}</span>
        <select
          id="dice-count"
          className={styles["dice-select"]}
          value={diceCount}
          onChange={event => updateDiceCount(Number(event.target.value))}
        >
          {DICE_COUNT_OPTIONS.map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </label>

      <div className={styles["dice-results"]} aria-live="polite">
        {values === null
          ? <p className={styles["dice-idle"]}>{t("diceIdle")}</p>
          : values.map((value, index) => (
              <DiceFace key={index} value={value} rolling={rolling} />
            ))}
      </div>

      {values !== null && diceCount > 1 && (
        <p className={styles["dice-total"]}>{t("diceTotalLabel")}: <strong>{total}</strong></p>
      )}

      <div className={controls.actions}>
        <button className="auth-link" type="button" onClick={() => performRoll(diceCount)} disabled={rolling}>
          {t("diceRoll")}
        </button>
      </div>
      </ToolLayout>
  );
}
