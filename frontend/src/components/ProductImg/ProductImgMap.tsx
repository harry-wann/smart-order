import React from "react";
import ProductImg, {
  type ProductArea,
  type ProductRow,
  type TagItem,
} from "./primary/ProductImg";

export interface ProductImgData {
  id: number;
  tag?: TagItem[];
  area?: ProductArea;
  row?: ProductRow;
  src?: string;
}

type ProductImgRows = "1" | "2" | "3" | "4";

interface ProductImgMapProps {
  data: ProductImgData[];
  row?: ProductImgRows;
}

const ProductImgMap = ({ data, row = "2" }: ProductImgMapProps) => {
  const rows: Record<ProductImgRows, string> = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  };

  return (
    <div className={`grid ${rows[row]} gap-card`}>
      {data.map((item) => (
        <ProductImg
          key={item.id}
          tag={item.tag}
          area={item.area}
          row={item.row}
          src={item.src}
        />
      ))}
    </div>
  );
};

export default ProductImgMap;
