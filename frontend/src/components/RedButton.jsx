function RedButton({ redButton, color = "default", ...props }) {
  const justifyClass = redButton.length > 1 ? "justify-between" : "justify-center";
  const themeClass =
    color == "danger"
      ? "bg-danger hover:bg-[color-mix(in_srgb,var(--color-danger),black_8%)]"
      : "bg-brand-600 hover:bg-[color-mix(in_srgb,var(--color-brand-600),black_8%)]";
  return (
    <button
      {...props}
      className={`flex w-full items-center px-4 py-2 text-white rounded h-[36px] md:h-[44px] lg:h-[52px] ${themeClass} transition-all duration-300 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${justifyClass}`}
    >
      {redButton.map((item, index) => {
        return (
          <span key={index} className="flex items-center">
            {item}
          </span>
        );
      })}
    </button>
  );
}

export default RedButton;
