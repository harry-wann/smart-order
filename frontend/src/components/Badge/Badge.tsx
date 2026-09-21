import React from "react";

type BadgeColorProps =
    | "ORG"
    | "RED"
    | "GREEN"
    | "RED_FFF"
    | "GREEN_GREEN"
    | "BROWN_BROWN"
    | "BROWN_ORG"
    | "BLUE_BLUE"
    | "GRAY_BROWN";

type BadgePaddingProps =
    | "primary"
    | "soldOut"; 

type BadgeProps = {
    text?: string;
    col?: BadgeColorProps;
    p?: BadgePaddingProps;
    classname?: string;
};


const Badge=({
    text="",
    col="ORG",
    p="primary",
    classname=""}:BadgeProps)=>{

    const cols: Record<BadgeColorProps, string> ={
        ORG: 'bg-brand-500 text-ink-900',
        RED: 'bg-danger text-surface',
        GREEN: 'bg-success text-surface',
        RED_FFF: 'border border-danger bg-surface text-danger',
        GREEN_GREEN: 'border border-success-line bg-success-bg text-success',
        BROWN_BROWN: 'border border-warning-line bg-warning-bg text-hold-ink',
        BROWN_ORG: 'border border-accent-600 bg-brand-500 text-ink-900',
        BLUE_BLUE: 'border border-info-line bg-info-bg text-info',
        GRAY_BROWN: 'border border-line bg-surface-2 text-ink-600',
        }

    const pd: Record<BadgePaddingProps, string> ={
        primary:'px-10 py-2',
        soldOut:'px-8 py-2'
    }

    return(
        <div>
          <span 
            className={
                    `font-sans font-medium text-xs 
                    ${pd[p]} rounded-full ${cols[col]} 
                    ${classname}`}>
                        {text}
            </span>
        </div>
    )
}

export default Badge;


/*
BADGE說明

text:輸入任意字串

命名方式: 外框_背景色(有外框) 、 背景色(無外框)  (顏色單字可能有誤)
col:ORG,RED,GREEN,RED_FFF,GREEN_GREEN,BROWN_BROWN,BROWN_ORG,BLUE_BLUE,GRAY_BROWN

狀態售完才需填寫否則用預設primary就好
p="soldOut"

額外外觀設定(有需求才需要寫)
classname=""

<BADGE text="售完" col="RED" p="soldOut"/>

*/