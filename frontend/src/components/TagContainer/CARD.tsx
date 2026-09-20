import React from "react";

type CardStyle =
    | "primary"
    | "CardTigth"
    | "CardFlat";

type CardRow =
    | "1"
    | "2"
    | "3"
    | "4"
    | "5"
    | "6"
    | "7";

type TagType =
    | "h2"
    | "p"
    | "img"
    | "orther";

type TagItem = [
    TagType,
    React.ReactNode
];


type CardProps = {
    TAG?: TagItem[];
    src?: string;
    STYLE?: CardStyle;
    ROW?: CardRow;
};



const CARD = ({
    TAG = [],
    STYLE="primary",
    ROW="1",

}:CardProps) => {


    const STYLES: Record<CardStyle, string> = {
        primary: 'shadow-[var(--shadow-card)] p-[var(--spacing-card)]',
        CardTigth: 'shadow-[var(--shadow-card)] p-[var(--spacing-row)]',
        CardFlat: 'p-[var(--spacing-card)]'
    }

    const tag: Record<TagType, (val: React.ReactNode) => React.ReactNode> = {
        h2: (val) => <h2 className="type-h2">{val}</h2>,
        p: (val) => <p className="type-body">{val}</p>,
        img: (val) => <img src={String(val)} />,
        orther: (val) => val
    }

    const a = TAG.map(([K,V],idx) => {
            if(tag[K]){
                return <div key={idx}>{tag[K](V)}</div >;
            }else{
               return null
            }
    });


        const ROWS: Record<CardRow, string> = {
        1: "grid-cols-1",
        2: "grid-cols-2",
        3: "grid-cols-3",
        4: "grid-cols-4",
        5: "grid-cols-5",
        6: "grid-cols-6",
        7: "grid-cols-7",
    };

    return (
        <div className={`border border-[var(--color-line)] bg-[var(--color-surface)] rounded-[var(--radius-card)] w-full flex items-center justify-start ${STYLES[STYLE]}`}>
            <div className={`grid ${ROWS[ROW]} gap-[var(--spacing-row)]`}>
                {a}
            </div>
        </div>
    )
}

export default CARD;


/*
CARD使用規則

陰影內距選擇
STYLES:primary,CardTigth,CardFlat


標籤每行幾個最多7個
ROW:1,2,3,4,5,6,7

建立標籤 (可重複使用)
預設有h1,p,img
[標籤,值]
h1,p=>值填入標籤內容
img=>值填入src位置

自訂標籤 orther
[標籤,值(填入完整標籤 或倒入的元件)]
    ["orther", <CheckIcon/>]

TAG={[
        ["h2","card 一塊獨立資訊"],
        ["orther", <a href="#">test</a>],
        ["orther", <CheckIcon/>]
    ]}



<CARD
    STYLE="primary"
    ROW="1"
        TAG={[
        ["h2","card 一塊獨立資訊"],
        ["orther", <CheckIcon/>]
        ]}
    />

*/