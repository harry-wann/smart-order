import React from "react";
import CardLink from "../../../components/Card/CardLink";
import { SvgIconMap } from "@/assets/SvgIconMap"

// 原檔名 callmenu.jsx
// 原 component 名 CallMenu

const ServiceBell = ({ open, onclick }) => {
  if (!open) return null;

  const card = {
    icon: SvgIconMap.CallmenuService,
    textH2: "呼叫服務生",
    textP: "有事情要問",
    onclick:()=>navigate("/order/index")
  }

  const ent = {
    icon: SvgIconMap.CallmenuSoup,
    textH2: "加湯",
    textP: "湯底煮到剩一半了",
    onclick:()=>navigate("/member")
  }
  const member = {
    icon: SvgIconMap.CallmenuChange,
    textH2: "換鍋撈渣",
    textP: "湯變濁了想換一鍋",
    onclick:()=>navigate("/member")
  }

  return (

    <div
      className="fixed inset-0 z-50 bg-ink-900/50"
      onClick={onclick}
    >
      <div
        className="
          fixed
          bottom-0
          left-0
          w-full
          rounded-t-sheet
          bg-surface
          p-5
        "
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-5">
          <div className="h-1 w-10 rounded-full bg-line" />
        </div>

        <div className="flex items-center justify-between">
          <h2 className="type-h1 text-ink-900">
            需要什麼？
          </h2>

          <button
            type="button"
            onClick={onclick}
            className="text-2xl"
          >
            x
          </button>
        </div>
        <p className="mt-2 text-ink-600">
          按下去櫃檯會馬上看到，不用舉手等人經過。
        </p>
        <div className="mt-5">
          <div className="grid grid-cols-1 gap-3">
            <CardLink data={card} />
            <CardLink data={ent} />
            <CardLink data={member} />
            <p className="text-center text-ink-600">請到櫃台結帳</p>
          </div >
        </div>
      </div>
    </div>
  );  
};

export default ServiceBell;


/*
導入
import ServiceBell

設定切換開關
const [open, setOpen] = useState(false);



觸發條件
onClick={() => setOpen(true)}


組件帶入 是否開啟open 以及設定關閉
<ServiceBell
        open={open}
        onclick={() => setOpen(false)}
      />
*/