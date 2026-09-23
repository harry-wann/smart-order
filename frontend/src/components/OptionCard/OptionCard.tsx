type OptionCardProps = {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  price?: string;
  subLabel?: string;
};

const OptionCard = ({
  label,
  selected = false,
  disabled = false,
  price,
  subLabel,
}: OptionCardProps) => {
  return (
    <div
      className={`border border-line rounded-card min-h-14 px-4 py-3
        ${disabled
          ? "bg-surface border-line opacity-45 cursor-not-allowed"
          : selected
            ? "bg-brand-100 border-brand-600"
            : "bg-surface border-line"
        }
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-3">
          <span>
            {selected ? "●" : "○"}
          </span>

          <div>
            <div className="type-h3">
              {label}
            </div>

            {subLabel && (
              <div className="type-caption">
                {subLabel}
              </div>
            )}
          </div>
        </div>

        {price && (
          <span className="type-caption">
            {price}
          </span>
        )}
      </div>
    </div>
  );
};

export default OptionCard;