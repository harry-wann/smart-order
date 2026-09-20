import React from "react";

type ProductArea =
    | "A169"
    | "A11";

type ProductRow =
    | "1"
    | "2"
    | "3";

type TagType =
    | "h2"
    | "p"
    | "orther";

type TagItem = [
    TagType,
    React.ReactNode
];

type ProductImgProps = {
    TAG?: TagItem[];
    AREA?: ProductArea;
    ROW?: ProductRow;
    SRC?: string;
};

const PRODUCTIMG = ({
    TAG = [],
    AREA = "A169",
    ROW = "1",
    SRC = "",
}: ProductImgProps) => {

    const AREAS: Record<ProductArea, string> = {
        A169: "aspect-[16/9]",
        A11: "aspect-[1/1]"
    };


    const tag: Record<
        TagType,
        (val: React.ReactNode) => React.ReactNode
    > = {
        h2: (val) => <h2 className="type-h3">{val}</h2>,
        p: (val) => <p className="type-body">{val}</p>,
        orther: (val) => val
    }

    const ROWS: Record<ProductRow, string> = {
        1: "grid-cols-1",
        2: "grid-cols-2",
        3: "grid-cols-3"
    };

    const a = TAG.map(([K, V], idx) => {
        if (tag[K]) {
            return <div key={idx}>{tag[K](V)}</div >;
        } else {
            return null
        }
    });

    return (
        <>
            <div className={`
                    ${AREAS[AREA]}
                    grid grid-rows-5
                    gap-[var(--spacing-card-gap)]
                    border border-dashed border-[var(--color-ink-900)]
                    bg-[var(--color-line)]
                    rounded-[var(--radius-card)]
                    p-[var(--spacing-page)]
                    m-[var(--spacing-card-gap)]
                    overflow-y-scroll
                `}>

                <div className="row-span-3 min-h-0 min-w-0 flex justify-center items-center ">
                    <img
                        src={SRC}
                        className="w-full h-full object-contain"
                    />
                </div>

                <div className="row-span-2 min-h-0 min-w-0 ">
                    <div className={`grid ${ROWS[ROW]}`}>
                        {a}
                    </div>
                </div>

            </div>
        </>
    )
}

export default PRODUCTIMG;