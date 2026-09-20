import React from "react";
import CheckIcon from "./icons/CheckIcon.tsx";
import ExclamationCircleIcon from "./icons/ExclamationCircleIcon.tsx";
import ExclamationTriangleIcon from "./icons/ExclamationTriangleIcon.tsx";


type IconType =
    | "CHECK"
    | "CIRCLE"
    | "TRIANGLE";

type InfoColor =
    | "GREEN"
    | "ORG"
    | "BLUE"
    | "BROWN"
    | "RED";

type TextType =
    | "A"
    | "B"
    | "C"
    | "D"
    | "E"
    | "F";

type Destine = {
    TABLE: string;
    TIME: string;
    NAME: string;
    MANY: number;
};

type InfoBoxProps = {
    ICON?: IconType;
    col?: InfoColor;
    TEXT?: TextType;
    VERIFY?: string;
    DESTINE?: Destine;
    CUSTOMTEXT?: string;
    classname?: string;
};



const INFOBOX=({
    ICON,
    col="ORG",
    TEXT="A",
    VERIFY="",
    DESTINE={
        TABLE:"",
        TIME:"",
        NAME:"",
        MANY:0
    },
    CUSTOMTEXT="",
    classname="",

}: InfoBoxProps)=>{

    const ICONS: Record<IconType, React.ComponentType> = {
    CHECK: CheckIcon,
    CIRCLE: ExclamationCircleIcon,
    TRIANGLE: ExclamationTriangleIcon
    };

    const cols: Record<InfoColor, string>={
        GREEN:'bg-[var(--color-success-bg)] text-[var(--color-success-ink)] ',
        ORG:'bg-[var(--color-warning-bg)]  text-[var(--color-warning-ink)]',
        BLUE:'bg-[var(--color-info-bg)] text-[var(--color-info-ink)] ',
        BROWN:'bg-[var(--color-surface-2)] text-[var(--color-ink-600)] ',
        RED:'border border-[var(--color-danger)] bg-[var(--color-danger-bg)] text-[var(--color-danger-ink)]'
    }

    const TEXTS: Record<
        TextType,
        (
            VERIFY: string,
            DESTINE: Destine,
            CUSTOMTEXT: string
        ) => string
    >={
        A:()=>'這桌櫃檯已經開好了，直接開始點就可以。',
        B:()=>'訂位保留 10 分鐘，逾時視同未到，需現場候位。',
        C:(VERIFY)=>`教學專題・模擬簡訊。驗證碼是 ${VERIFY}，直接顯示在這裡。`,
        D:()=>'驗證碼 5 分鐘內有效，連續錯 3 次會作廢。',
        E:(VERIFY,DESTINE)=>`${DESTINE.TABLE} 在 ${DESTINE.TIME} 有訂位（${DESTINE.NAME} ${DESTINE.MANY} 位）。`,
        F:(VERIFY, DESTINE,CUSTOMTEXT)=>CUSTOMTEXT
    }

    const a=TEXTS[TEXT](VERIFY, DESTINE,CUSTOMTEXT);

    const Icon = ICON
        ? ICONS[ICON]
        : null;

    return(
        <><div className={`w-full h-[47.8px] pl-[16px] flex items-center text-left text-[14px] gap-[16px] rounded-[8px] px-[16px] ${cols[col]} ${classname}`}>{Icon && <Icon />} {a}</div> 
        <br />
        
        </>
    )
}

export default INFOBOX;

/*  
infobox說明

相關變數需要使用在填寫

---------------------------------------------
一般使用

cols:GREEN,ORG,BLUE,BROWN,RED
TEXT:A,B,C,D,E,F

有ICON需求才寫
ICONS:CHECK,CIRCLE,TRIANGLE

額外外觀設定(特殊需求才寫)
classname=""


<INFOBOX ICON="CHECK" col="GREEN" TEXT="A" classname=""/>


---------------------------------------------
定位警示


DESTINE={
        TABLE:"",
        TIME:"",
        NAME:"",
        MANY:0
    },
A06 在 19:30 有訂位（陳小姐 4 位）。

<INFOBOX ICON="TRIANGLE" col="RED" TEXT="E"  
        DESTINE={{
        TABLE:"A06",
        TIME:"19:30",
        NAME:"陳小姐",
        MANY:4
    }}/>

-------------------------------------------------

VERIFY=""

教學專題・模擬簡訊。驗證碼是 482913，直接顯示在這裡。

<INFOBOX ICON="CIRCLE" col="BLUE" TEXT="C" VERIFY="482913"/>



-------------------------------------------------
自訂輸入內容


CUSTOMTEXT=""

ABCDEFG

<INFOBOX ICON="CIRCLE" col="BLUE" TEXT="F" CUSTOMTEXT="ABCDEFG"/>





*/