import type { SelectedInputType } from "@/lib/app-types";
import { ChoiceButton } from "@/components/ChoiceButton";

type InputTypePickerProps = {
  selected: SelectedInputType | null;
  disabled: boolean;
  showShortOption: boolean;
  onSelect: (type: SelectedInputType) => void;
};

export function InputTypePicker({
  selected,
  disabled,
  showShortOption,
  onSelect,
}: InputTypePickerProps) {
  return (
    <section aria-labelledby="input-type-heading">
      <h2
        id="input-type-heading"
        className="mb-3 text-sm font-medium text-zinc-400"
      >
        סוג התוכן
      </h2>
      <div
        className={`grid grid-cols-1 gap-2 ${
          showShortOption ? "sm:grid-cols-3" : "sm:grid-cols-2"
        }`}
      >
        {showShortOption ? (
          <ChoiceButton
            selected={selected === "short"}
            disabled={disabled}
            onClick={() => onSelect("short")}
          >
            הודעה קצרה
          </ChoiceButton>
        ) : null}
        {selected !== "pdf" ? (
          <ChoiceButton
            selected={selected === "long"}
            disabled={disabled}
            onClick={() => onSelect("long")}
          >
            הודעה / מסמך ארוך
          </ChoiceButton>
        ) : null}
        <ChoiceButton
          selected={selected === "pdf"}
          disabled={disabled}
          onClick={() => onSelect("pdf")}
        >
          הוספת PDF
        </ChoiceButton>
      </div>
    </section>
  );
}
