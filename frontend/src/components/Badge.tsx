import React from "react";

type BadgeColorProps =
  | "rec"
  | "sold"
  | "done"
  | "hot"
  | "veg"
  | "wait"
  | "pri"
  | "info"
  | "plain";

type BadgePaddingProps = "primary" | "soldOut";

type BadgeProps = {
  text?: string;
  col?: BadgeColorProps;
  p?: BadgePaddingProps;
};

const Badge = ({ text = "", col = "rec", p = "primary" }: BadgeProps) => {
  const cols: Record<BadgeColorProps, string> = {
    rec: "bg-brand-500 text-ink-900",
    sold: "bg-danger text-surface",
    done: "bg-success text-surface",
    hot: "border border-danger bg-surface text-danger",
    veg: "border border-success-line bg-success-bg text-success",
    wait: "border border-warning-line bg-warning-bg text-hold-ink",
    pri: "border border-accent-600 bg-brand-500 text-ink-900",
    info: "border border-info-line bg-info-bg text-info",
    plain: "border border-line bg-surface-2 text-ink-600",
  };

  const pd: Record<BadgePaddingProps, string> = {
    primary: "px-10 py-2",
    soldOut: "px-8 py-2",
  };

  return (
    <div>
      <span
        className={`font-sans font-medium text-xs 
                    ${pd[p]} rounded-full ${cols[col]} `}
      >
        {text}
      </span>
    </div>
  );
};

export default Badge;

