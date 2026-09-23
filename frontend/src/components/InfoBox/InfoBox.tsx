import React from "react";
import Check from "../../assets/icons/Check.svg";
import Cir from '../../assets/icons/Cir.svg';
import Tri from "../../assets/icons/Tri.svg";


type IconTypeProps =
    | "Check"
    | "Cir"
    | "Tri"

type InfoColorProps =
    | "GREEN"
    | "ORG"
    | "BLUE"
    | "BROWN"
    | "RED";

type TextTypeProps =
    | "A"
    | "B"
    | "C"
    | "D"
    | "E"
    | "F";

type DestineProps = {
    TABLE: string;
    TIME: string;
    NAME: string;
    MANY: number;
};

type InfoBoxProps = {
    ICON?: IconTypeProps;
    col?: InfoColorProps;
    TEXT?: TextTypeProps;
    VERIFY?: string;
    DESTINE?: DestineProps;
    CUSTOMTEXT?: string;
    classname?: string;
};



const InfoBox=({
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

    const ICONS: Record<IconTypeProps,string> = {
    Check: Check,
    Cir: Cir,
    Tri:Tri
    };

    const cols: Record<InfoColorProps, string>={
        GREEN: 'bg-success-bg text-success-ink',
        ORG: 'bg-warning-bg text-warning-ink',
        BLUE: 'bg-info-bg text-info-ink',
        BROWN: 'bg-surface-2 text-ink-600',
        RED: 'border border-danger bg-danger-bg text-danger-ink'
    }

    const TEXTS: Record<
        TextTypeProps,
        (
            VERIFY: string,
            DESTINE: DestineProps,
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
        <><div className={`
                w-full 
                h-[47.8px] 
                pl-[16px] 
                flex 
                items-center 
                text-left 
                text-[14px] 
                gap-[16px] 
                rounded-[8px] 
                px-[16px] 
                ${cols[col]} 
                ${classname}`}>
                    {Icon && 
                    <span
                        className="
                            inline-block
                            w-5 h-5
                            shrink-0
                            bg-current
                            mask-no-repeat
                            mask-center
                            mask-contain
                        "
                        style={{
                            maskImage: `url("${Icon}")`,
                            WebkitMaskImage: `url("${Icon}")`,
                        }}
                    />}
                    {a}
            </div> 
        <br />
        
        </>
    )
}

export default InfoBox;

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