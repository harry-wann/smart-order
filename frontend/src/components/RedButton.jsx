function RedButton({ text = null, content = null, type = "default", ...props }) {
  const justifyClass = text?.length > 1 ? "justify-between" : "justify-center";
  const contentClass = content?.length > 1 ? "justify-between" : "justify-center";
  
  const themeClass = type === "danger"
    ? "bg-danger hover:bg-[color-mix(in_srgb,var(--color-danger),black_8%)]"
    : "bg-brand-600 hover:bg-[color-mix(in_srgb,var(--color-brand-600),black_8%)]";

  return (
    <button
      className={`flex w-full items-center px-4 py-2 text-white rounded h-[36px] md:h-[44px] lg:h-[52px] ${themeClass} transition-all duration-300 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed`}
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
              <span key={index} className="flex items-center">
                {item}
              </span>
            ))
          ) : (
            <div className="flex items-center">{content}</div>
          )}
        </div>
      )}
    </button>
  );
}

export default RedButton;