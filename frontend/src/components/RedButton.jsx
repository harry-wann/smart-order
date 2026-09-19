import React from "react";

// 用法: <RedButton redButton={[第一個參數, 第二個參數]} />
function RedButton({ redButton, onClick }) {
  const childCount = React.Children.count(redButton);
  const justifyClass = childCount > 1 ? "justify-between" : "justify-center";

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center px-4 py-2  text-white rounded transition-colors h-[36px] sm:h-[36px] md:h-[44px] lg:h-[52px] ${justifyClass}`}
    >
      {redButton.map((text, index) => {
        return <span key={index}>{text}</span>;
      })}
    </button>
  );
}

export default RedButton;
