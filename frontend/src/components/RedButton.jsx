import React from "react";
// 加圖 父元件要 import { icon } from "lucide-react";
// 用法: <RedButton redButton={[tag1, tag2]} />
// ex. <RedButton redButton={[
//     <div className="flex items-center gap-1">
//       <span className="font-bold">NT$ 1,420</span>
//       <ChevronRight className="w-5 h-5" />
//     </div>,
//   ]}
//  />
function RedButton({ redButton, onClick }) {
  const childCount = React.Children.count(redButton);
  const justifyClass = childCount > 1 ? "justify-between" : "justify-center";

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center px-4 py-2 text-white rounded h-[36px] md:h-[44px] lg:h-[52px] bg-red-btn transition-all duration-300 hover:bg-[color-mix(in_srgb,var(--color-red-btn),black_8%)] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${justifyClass}`}
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
