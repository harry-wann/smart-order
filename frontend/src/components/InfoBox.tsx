import React from "react";
import check from "../assets/icons/ic_infobox_check.svg";
import circle from "../assets/icons/ic_infobox_circle.svg";
import triangle from "../assets/icons/ic_infoxbox_triangle.svg";

type IconTypeProps = "check" | "circle" | "triangle";

type InfoColorProps = "ok" | "warn" | "info" | "quiet" | "danger";

type TextTypeProps = "A" | "B" | "C" | "D" | "E" | "F";

type DestineProps = {
  table: string;
  time: string;
  name: string;
  many: number;
};

type verificationTimeProps = {
  time: string;
  remain: number;
};

type InfoBoxProps = {
  icon?: IconTypeProps;
  col?: InfoColorProps;
  text?: TextTypeProps;
  verify?: string;
  verificationTime?: verificationTimeProps;
  destine?: DestineProps;
  custimtext?: string;
  classname?: string;
};

const InfoBox = ({
  icon,
  col = "ok",
  text = "A",
  verify = "",
  verificationTime = {
    time: "",
    remain: 0,
  },
  destine = {
    table: "",
    time: "",
    name: "",
    many: 0,
  },
  custimtext = "",
  classname = "",
}: InfoBoxProps) => {
  const icons: Record<IconTypeProps, string> = {
    check: check,
    circle: circle,
    triangle: triangle,
  };

  const cols: Record<InfoColorProps, string> = {
    ok: "bg-success-bg text-success-ink",
    warn: "bg-warning-bg text-warning-ink",
    info: "bg-info-bg text-info-ink",
    quiet: "bg-surface-2 text-ink-600",
    danger: "border border-danger bg-danger-bg text-danger-ink",
  };

  const tests: Record<
    TextTypeProps,
    ( verify: string,
      verificationTime: verificationTimeProps,
      destine: DestineProps,
      text: string,
    ) => string
  > = {
    A: () => "這桌櫃檯已經開好了，直接開始點就可以。",
    B: () => "訂位保留 10 分鐘，逾時視同未到，需現場候位。",
    C: (verify) => `教學專題・模擬簡訊。驗證碼是 ${verify}，直接顯示在這裡。`,
    D: (verify, verificationTime) =>
      `驗證碼 ${verificationTime.time} 分鐘內有效，連續錯 ${verificationTime.remain} 次會作廢。`,
    E: (verify, verificationTime, destine) =>
      `${destine.table} 在 ${destine.time} 有訂位（${destine.name} ${destine.many} 位）。`,
    F: (verify, verificationTime, destine, text) => text,
  };

  const a = tests[text](verify, verificationTime, destine, custimtext);

  const Icon = icon ? icons[icon] : null;

  return (
    <>
      <div
        className={`w-full h-[47.8px] pl-[16px] flex items-center 
             text-left text-[14px] gap-[16px] rounded-[8px] px-[16px] 
             ${cols[col]} ${classname}`}
      >
        {Icon && (
          <span
            className=" inline-block w-5 h-5 shrink-0 bg-current mask-no-repeat mask-center mask-contain "
            style={{
              maskImage: `url("${Icon}")`,
              WebkitMaskImage: `url("${Icon}")`,
            }}
          />
        )}
        {a}
      </div>
      <br />
    </>
  );
};

export default InfoBox;
