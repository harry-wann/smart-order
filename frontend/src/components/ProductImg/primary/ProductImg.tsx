import React from "react";

export type ProductArea = "A169" | "A11";

export type ProductRow = "1" | "2" | "3";

export type TagType = "h2" | "p" | "other";

export type TagItem = [TagType, React.ReactNode];

export type ProductImgProps = {
  tag?: TagItem[];
  area?: ProductArea;
  row?: ProductRow;
  src?: string;
};

const ProductImg = ({
  tag = [],
  area = "A169",
  row = "1",
  src = "",
}: ProductImgProps) => {
  const areas: Record<ProductArea, string> = {
    A169: "aspect-[16/9]",
    A11: "aspect-[1/1]",
  };

  const tags: Record<TagType, (val: React.ReactNode) => React.ReactNode> = {
    h2: (val) => <h2 className="type-h3">{val}</h2>,
    p: (val) => <p className="type-body">{val}</p>,
    other: (val) => val,
  };

  const rows: Record<ProductRow, string> = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
  };

  const a = tag.map(([K, V], idx) => {
    if (tags[K]) {
      return <div key={idx}>{tags[K](V)}</div>;
    } else {
      return null;
    }
  });

  return (
    <>
      <div
        className={`
                    grid grid-rows-5
                    gap-card-gap
                    border border-dashed border-line-strong
                    bg-surface-2
                    rounded-card
                    p-page
                    m-card-gap
                `}
      >
        <div
          className={`${areas[area]} row-span-3 min-h-0 min-w-0 flex justify-center items-center `}
        >
          <img src={src} className="w-full h-full object-contain" />
        </div>

        <div className="row-span-2 min-h-0 min-w-0 ">
          <div className={`grid ${rows[row]}`}>{a}</div>
        </div>
      </div>
    </>
  );
};

export default ProductImg;
