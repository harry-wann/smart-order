import React from "react";
import Card, { type borderProps, type RowProps } from "./primary/Card";

interface CardData {
  id: number;
  data: RowProps[];
  border?: borderProps;
}

type CardColProp = "1" | "2" | "3" | "4";

interface CardMapProps {
  data: CardData[];
  col?: CardColProp;
}

const CardMap = ({ data, col = "2" }: CardMapProps) => {
  const cols: Record<CardColProp, string> = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  };

  return (
    <div className={`grid ${cols[col]} gap-card`}>
      {data.map((item) => (
        <Card key={item.id} data={item.data} border={item.border} />
      ))}
    </div>
  );
};

export default CardMap;
