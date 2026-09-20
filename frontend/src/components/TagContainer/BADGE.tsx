import React from "react";

type BadgeColor =
    | "ORG"
    | "RED"
    | "GREEN"
    | "RED_FFF"
    | "GREEN_GREEN"
    | "BROWN_BROWN"
    | "BROWN_ORG"
    | "BLUE_BLUE"
    | "GRAY_BROWN";

type BadgePadding =
    | "primary"
    | "soldOut"; 

type Badge = {
    text?: string;
    col?: BadgeColor;
    p?: BadgePadding;
    classname?: string;
};


const BADGE=({
    text="",
    col="ORG",
    p="primary",
    classname=""}:Badge)=>{

    const cols: Record<BadgeColor, string> ={
        ORG:'bg-[var(--color-brand-500)] text-[var(--color-ink-900)]',
        RED:'bg-[var(--color-danger)] text-[var(--color-surface)]',
        GREEN:'bg-[var(--color-success)] text-[var(--color-surface)] ',
        RED_FFF:'border border-[var(--color-danger)] bg-[var(--color-surface)] text-[var(--color-danger)]',
        GREEN_GREEN:'border border-[var(--color-success-line)] bg-[var(--color-success-bg)] text-[var(--success)]',
        BROWN_BROWN:'border-[1px] border-[var(--color-warning-line)] bg-[var(--color-warning-bg)] text-[var(--color-hold-ink)]',
        BROWN_ORG:'border-[1px] border-[var(--color-accent-600)] bg-[var(--color-brand-500)] text-[var(--color-ink-900)]',
        BLUE_BLUE:'border-[1px] border-[var(--color-info-line)] bg-[var(--color-info-bg)] text-[var(--color-info)]',
        GRAY_BROWN:'border-[1px] border-[var(--color-line)] bg-[var(--color-surface-2)] text-[var(--color-ink-600)]'
    }

    const pd: Record<BadgePadding, string> ={
        primary:'px-10 py-2',
        soldOut:'px-8 py-2'
    }

    return(
        <div>
          <span className={`font-sans font-medium text-[12px] ${pd[p]} rounded-full ${cols[col]} ${classname}`}>{text}</span>
        </div>
    )
}

export default BADGE;


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