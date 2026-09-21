import React from "react";
import ProductImg, {
    type ProductArea,
    type ProductRow,
    type TagItem} from "./primary/ProductImg";


export interface ProductImgData {
    id: number;
    TAG?: TagItem[];
    AREA?: ProductArea;
    ROW?: ProductRow;
    SRC?: string;
}


type ProductImgRows =
    | "1"
    | "2"
    | "3"
    | "4";


interface ProductImgMapProps {
    DATA: ProductImgData[];
    ROW?: ProductImgRows;
}


const ProductImgMap = ({
    DATA,
    ROW = "2"
}: ProductImgMapProps) => {

    const ROWS: Record<ProductImgRows, string> = {
        1: "grid-cols-1",
        2: "grid-cols-2",
        3: "grid-cols-3",
        4: "grid-cols-4"
    };


    return (
        <div className={`grid ${ROWS[ROW]} gap-card`}>
            {DATA.map((item) => (
                <ProductImg
                    key={item.id}
                    TAG={item.TAG}
                    AREA={item.AREA}
                    ROW={item.ROW}
                    SRC={item.SRC}
                />
            ))}
        </div>
    );
};


export default ProductImgMap;