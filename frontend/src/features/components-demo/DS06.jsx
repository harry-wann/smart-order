import DemoPage from "./DemoPage";
import { useState } from "react";
import DropdownNotification from "@/components/DropdownNotification/DropdownNotification";
import DropdownNotificationHost from "@/components/DropdownNotification/DropdownNofificationHost";

export default function DS06() {
  const [incoming, setIncoming] = useState(null);

  return (
    <DemoPage
      code="DS-06"
      title="品項列與通知"
      description="放置品項列、數量操作、價格資訊與通知提示。"
    >
      <div className="flex gap-3">
        <div className="flex flex-col flex-1 p-2"></div>

        <div className="flex flex-col flex-1 p-2">
          <DropdownNotification
            type="add"
            title="已加入購物車"
            desc="安格斯霜降牛五花 ×1・全份"
            onClick={() => {
              console.log("跳轉到購物車");
              setIncoming({
                id: Date.now(),
                type: "add",
                title: "已加入購物車",
                desc: "安格斯霜降牛五花 ×1・全份",
                onClick: () => {},
              });
            }}
          />

          <DropdownNotification
            type="send"
            title="已送出訂單"
            desc="共 5 項，NT$ 2,000"
            onClick={() => {
              console.log("跳轉到點餐紀錄");

              setIncoming({
                id: Date.now(),
                type: "send",
                title: "已送出訂單",
                desc: "共 5 項，NT$ 2,000",
                onClick: () => {},
              });
            }}
          />

          <div className="relative w-full min-h-dvh">
            <DropdownNotificationHost incoming={incoming} />
            {/* <Outlet /> */}
          </div>
        </div>
      </div>
    </DemoPage>
  );
}
