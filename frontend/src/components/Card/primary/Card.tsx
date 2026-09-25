import React from "react";

export type borderProps =
    | "primary"
    | "CardTight"
    | "CardFlat";

export type rowProps =
    | "start"
    | "center"
    | "end"
    | "between";

export type tagProps =
    | "h2"
    | "p"
    | "img"
    | "other";

export type itemProps = [tagProps, React.ReactNode];

export type RowProps = {
    tags: itemProps[];
    justify?: rowProps;
};

export type CardProps = {
    data?: RowProps[];
    border?: borderProps;
};

const p: Record<rowProps, string> = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
    between: "justify-between",
};

const Card = ({
    data = [],
    border = "primary",
}: CardProps) => {

    const borders: Record<borderProps, string> = {
        primary: 'shadow-card p-card',
        CardTight: 'shadow-card p-row',
        CardFlat: 'p-card',
    };

    const tag: Record<tagProps, (val: React.ReactNode) => React.ReactNode> = {
        h2: (val) => <h2 className="type-h2">{val}</h2>,
        p: (val) => <p className="type-body">{val}</p>,
        img: (val) => <img src={String(val)} alt="" />,
        other: (val) => val,
    };

    const rows = data.map((row, rowIdx) => {
        const a = p[row.justify ?? "start"];
        return (
            <div key={rowIdx} className={`flex items-center flex-wrap gap-tag w-full ${a}`}>
                {row.tags.map(([K, V], idx) => (
                    <div key={idx}>
                        {tag[K](V)}
                    </div>
                ))}
            </div>
        );
    });

    return (
        <div className={`
            border border-line bg-surface rounded-card w-full
            flex flex-col gap-row ${borders[border]}`}>
            {rows}
        </div>
    );
};

export default Card;