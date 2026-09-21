import ProductImgMap, {
    type ProductImgData
} from "../../components/ProductImg/ProductImgMap";

import check from "../../assets/icons/check.svg";


const ProductImgTs = () => {

    const productData: ProductImgData[] = [
    {
        id: 1,
        AREA: "A11",
        ROW: "1",
        SRC: check,
        TAG: [
            ["h2", "test"],
            ["p", "test"]
        ]
    },

    {
        id: 2,
        AREA: "A11",
        ROW: "2",
        SRC: check,
        TAG: [
            ["h2", "test"],
            ["orther", <button>aaa</button>]
        ]
    },
    {
        id: 3,
        AREA: "A169",
        ROW: "1",
        SRC: check,
        TAG: [
            ["h2", "test"],
            ["p", "test"]
        ]
    }
];

return (
    <ProductImgMap
        DATA={productData}
        ROW="2"
    />
);
}

export default ProductImgTs;