import React from "react";
import CardLink from "../../../components/card/CardLink";
import { SvgIconMap } from "@/assets/SvgIconMap"
import { useState } from "react"
import { customerClient } from "@/services/client/customerClient"

const OPTIONS = [
  { type: "CALL_WAITER", icon: SvgIconMap.CallmenuService, textH2: "呼叫服務生", textP: "有事情要問" },
  { type: "ADD_SOUP",    icon: SvgIconMap.CallmenuSoup,    textH2: "加湯",       textP: "湯底煮到剩一半了" },
  { type: "CHANGE_POT",  icon: SvgIconMap.CallmenuChange,  textH2: "換鍋撈渣",   textP: "湯變濁了想換一鍋" },
];

// 原檔名 callmenu.jsx
// 原 component 名 CallMenu

const ServiceBell = ({ open, onclick }) => {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  if (!open) return null;

  async function sendCall(type, label) {
    if (sending) return;              
    setSending(true);
    try {
      await customerClient.post("/dining/service-calls", { type });
      setMessage(`已通知櫃檯：${label}`);
      setTimeout(() => {
        setMessage("");
        onclick();                   
      }, 200);
    } catch (err) {
      setMessage(err.message ?? "送出失敗，請再試一次");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/50" onClick={onclick}>
      <div
        className="fixed bottom-0 left-0 w-full rounded-t-sheet bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex justify-center">
          <div className="h-1 w-10 rounded-full bg-line" />
        </div>

        <div className="flex items-center justify-between">
          <h2 className="type-h1 text-ink-900">需要什麼？</h2>
          <button type="button" onClick={onclick} className="text-2xl">x</button>
        </div>
        <p className="mt-2 text-ink-600">按下去櫃檯會馬上看到，不用舉手等人經過。</p>

        <div className="mt-5 grid grid-cols-1 gap-3">
          {OPTIONS.map((o) => (
            <CardLink key={o.type} data={{ ...o, onclick: () => sendCall(o.type, o.textH2) }} />
          ))}
          {message && <p className="text-center type-body-sm font-bold text-brand-600">{message}</p>}
          <p className="text-center text-ink-600">請到櫃台結帳</p>
        </div>
      </div>
    </div>
  );
};

export default ServiceBell;