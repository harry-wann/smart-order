import React from "react";
import CardMap from "../../components/Card/CardMap";
import check from "../../assets/icons/check.svg";


const CardTs=()=>{
    const cardData = [
        {
            id: 1,
            STYLE: "primary",
            ROW: "1",
            TAG: [
                ["h2", "Card 1"],
                ["p", "第一張卡片內容"]
            ]
        },

        {
            id: 2,
            STYLE: "CardTigth",
            ROW: "2",
            TAG: [
                ["h2", "Card 2"],
                ["orther", <button className="bg-red-500 text-white px-4 py-2 rounded-full">
                    第二張卡片內容
                </button>]
            ]
        },

        {
            id: 3,
            STYLE: "CardFlat",
            ROW: "1",
            TAG: [
                ["h2", "Card 3"],
                ["img", check]
            ]
        }
    ];

    return(
            <div className="p-5">
                <CardMap
                    DATA={cardData}
                    COL="1"
                />
            </div>
    )


}
export default CardTs