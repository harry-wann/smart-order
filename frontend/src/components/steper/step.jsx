import Counter from "./counter.jsx";


function Step() {
  return (
    <div className="flex flex-col items-start gap-10 p-10">

      {/* 小型：102 × 30 */}
      <Counter size="small" initialCount={10} />

      {/* 大型：186 × 58 */}
      <Counter size="large" initialCount={1} />

      {/* 尚未選擇：28 × 28 */}
      <Counter size="small" initialCount={0} />

    </div>
  );
}

export default Step;