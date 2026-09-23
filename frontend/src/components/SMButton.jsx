export default function SMButton({
  text = null,
  content = null,
  type = "default",
  ...props
}) {
  const justifyClass =
    Array.isArray(text) && text.length > 1
      ? "justify-between"
      : "justify-center";
  const contentClass =
    Array.isArray(content) && content.length > 1
      ? "justify-between"
      : "justify-center";

  const themeClass = {
    danger:
      "bg-danger text-surface hover:bg-[color-mix(in_srgb,var(--color-danger),black_8%)]",
    ghost: "bg-transparent border border-transparent text-ink-600",
    secondary: "bg-surface border border-brand-600 text-brand-600",
    default:
      "bg-brand-600 text-surface hover:bg-[color-mix(in_srgb,var(--color-brand-600),black_8%)]",
  };

  return (
    <button
      className={`flex h-9 w-full items-center rounded px-4 py-2 md:h-11 lg:h-13 ${themeClass[type]} transition-all duration-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40`}
      {...props}
    >
      {text !== null ? (
        <div className={`flex w-full ${justifyClass}`}>
          {Array.isArray(text) ? (
            text.map((item, index) => (
              <span key={index} className="flex items-center">
                {item}
              </span>
            ))
          ) : (
            <span className="flex items-center">{text}</span>
          )}
        </div>
      ) : (
        <div className={`flex w-full ${contentClass}`}>
          {Array.isArray(content) ? (
            content.map((item, index) => (
              <div key={index} className="flex items-center">
                {item}
              </div>
            ))
          ) : (
            <div className="flex items-center">{content}</div>
          )}
        </div>
      )}
    </button>
  );
}
