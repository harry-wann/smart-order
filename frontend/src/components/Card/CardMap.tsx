import React from "react";
import Card, {
    type TagItemProps,
    type CardStyleProps,
    type CardRowProps
} from "./primary/Card";

interface CardData{
    id: number;
    TAG: TagItemProps[];
    STYLE?: CardStyleProps;
    ROW?: CardRowProps;
}

type CardRowProp =
    | "1"
    | "2"
    | "3"
    | "4";

interface CardProps {
    DATA: CardData[];
    COL?: CardRowProp;
}

const CardMap = ({
    DATA,
    COL = "2"
}: CardProps) => {

    const ROW: Record<CardRowProp, string> = {
        1: "grid-cols-1",
        2: "grid-cols-2",
        3: "grid-cols-3",
        4: "grid-cols-4"
    };

    return (
        <div className={`grid ${ROW[COL]} gap-card`}>
            {DATA.map((item) => (
                <Card
                    key={item.id}
                    TAG={item.TAG}
                    STYLE={item.STYLE}
                    ROW={item.ROW}
                />
            ))}
        </div>
    );
};

export default CardMap