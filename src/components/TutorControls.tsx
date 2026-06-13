import { For } from "solid-js";
import clsx from "clsx";
import { useI18n } from "~/i18n";
import { level, setLevel, mode, setMode } from "~/lib/learner";
import {
  LEARNER_LEVELS,
  TUTOR_MODES,
  type LearnerLevel,
  type TutorMode,
} from "~/lib/agent/types";

function Segmented<T extends string>(props: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  optionLabel: (v: T) => string;
}) {
  return (
    <div class="flex items-center gap-2">
      <span class="text-xs font-medium text-brand-muted">{props.label}</span>
      <div
        class="flex rounded-pill border border-brand-border bg-brand-chip p-0.5"
        role="group"
        aria-label={props.label}
      >
        <For each={props.options}>
          {(opt) => (
            <button
              type="button"
              aria-pressed={props.value === opt}
              onClick={() => props.onChange(opt)}
              class={clsx(
                "px-2.5 py-1 rounded-pill text-xs font-medium transition-colors duration-fast",
                props.value === opt
                  ? "bg-brand-primary text-white"
                  : "text-brand-muted hover:text-brand-text"
              )}
            >
              {props.optionLabel(opt)}
            </button>
          )}
        </For>
      </div>
    </div>
  );
}

export function TutorControls(props: { class?: string }) {
  const { t } = useI18n();
  const levelLabel = (l: LearnerLevel) => t(`common.${l}`);
  const modeLabel = (m: TutorMode) => t(`tutor.${m}`);

  return (
    <div class={clsx("flex flex-wrap items-center gap-x-5 gap-y-2", props.class)}>
      <Segmented
        label={t("tutor.levelLabel")}
        options={LEARNER_LEVELS}
        value={level()}
        onChange={setLevel}
        optionLabel={levelLabel}
      />
      <Segmented
        label={t("tutor.modeLabel")}
        options={TUTOR_MODES}
        value={mode()}
        onChange={setMode}
        optionLabel={modeLabel}
      />
    </div>
  );
}
