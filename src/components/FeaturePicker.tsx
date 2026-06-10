import type { SelectedFeature } from "@/lib/app-types";
import { ChoiceButton } from "@/components/ChoiceButton";

type FeaturePickerProps = {
  selected: SelectedFeature | null;
  disabled: boolean;
  onSelect: (feature: SelectedFeature) => void;
};

export function FeaturePicker({
  selected,
  disabled,
  onSelect,
}: FeaturePickerProps) {
  return (
    <section aria-labelledby="feature-heading">
      <h2
        id="feature-heading"
        className="mb-3 text-sm font-medium text-zinc-400"
      >
        מה תרצו לעשות?
      </h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <ChoiceButton
          selected={selected === "summarizer"}
          disabled={disabled}
          onClick={() => onSelect("summarizer")}
        >
          סיכום
        </ChoiceButton>
        <ChoiceButton
          selected={selected === "scam"}
          disabled={disabled}
          onClick={() => onSelect("scam")}
        >
          בדיקת הונאה
        </ChoiceButton>
      </div>
    </section>
  );
}
