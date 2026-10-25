import React, { useState, useEffect } from "react";
import Badge from "../../../components/Badge";
import InfoBox from "../../../components/InfoBox";
import SOButton from "../../../components/SOButton";
import { useParams, useNavigate } from "react-router";
import { customerClient } from "@/services/client/customerClient";
import { joinTable } from "@/services/client/auth";
import { customerTokens } from "@/services/client/tokenStore";

// 原檔名 Movein.jsx
// 原 component 名 Movein

const ORDER_HOME = "/order/menu";

// 依照狀態決定 InfoBox 要顯示什麼（放在 component 外面，因為它不需要用到 state）
function getInfo(status, error) {
  if (error) {
    return { icon: "alert", col: "err", text: error };
  }
  if (!status.open) {
    return { icon: "alert", col: "warn", text: "這桌尚未開桌，請洽櫃檯。" };
  }
  return {
    icon: "check",
    col: "ok",
    text: (
      <>
        這桌櫃檯已經開好了，直接開始點就可以。
        同桌的人掃同一張碼會看到一樣的訂單。
      </>
    ),
  };
}

export function CheckIn() {
  const { tableNo } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);
  // 手上的權杖屬於別桌：先留著（客人可能只是掃錯，回原桌還要靠它認回同一位 guest），加入這桌時不帶
  const [tokensFromOtherTable, setTokensFromOtherTable] = useState(false);


  useEffect(() => {
    async function check() {

      if (customerTokens.session.get()) {
        try {
          const { data } = await customerClient.get("/dining/current");
          if (data.tableNo === tableNo) {
            navigate(ORDER_HOME, { replace: true }); 
            return;
          }
          setTokensFromOtherTable(true);
        } catch {

        }
      }


      const { data } = await customerClient.get(`/tables/${tableNo}/status`, {
        customerAuth: [],
      });
      setStatus(data);
    }

    check().catch((e) => setError(e.message));
  }, [tableNo]);

 
  async function handleJoin() {
    setJoining(true);
    try {
      // 手上還有這桌的用餐權杖與 guest 權杖就一起帶，後端兩個都對得上才會恢復原本的 guest；
      // 沒有或對不上就建立新的 guest（X-Device-Id 只是提示，不會拿來認人）
      const { data } = await customerClient.post(
        `/tables/${tableNo}/join`,
        null,
        { customerAuth: tokensFromOtherTable ? [] : ["session"] }
      );
      joinTable(data.sessionToken, data.guestToken);
      navigate(ORDER_HOME, { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setJoining(false);
    }
  }

  if (!status && !error) return <p>確認中…</p>;

  const info = getInfo(status, error);
  const canOrder = status?.open && !error;

  const val = {
    tab: status?.tableNo ?? tableNo,
  };

  return (
    <>
      <div className="w-full h-[45vh] relative">
        {/* TODO: 店家形象照尚未入庫（ic_test_page.png 已自 repo 移除），先用底色佔位 */}
        <div className="w-full h-full bg-ink-900" />
        <div className="absolute bottom-0 w-full px-4">
          <h2 className="type-h2 text-surface">鼎沸鍋物</h2>
          <p className="type-caption text-surface">中山北路二段 共鍋 32 年</p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center w-full py-section px-field">
        <Badge text="用餐中" col="rec" />
        <h1 className="type-display py-field">{val.tab}桌</h1>
        <InfoBox icon={info.icon} col={info.col} text="F" custimtext={info.text} />

        <SOButton
          height="h-13"
          text={joining ? "加入中…" : "開始點餐"}
          disabled={!canOrder || joining}
          onClick={handleJoin}
        />
        <a>有訂位？查詢我的預約</a>
      </div>

      <div className="flex w-full bg-surface fixed bottom-0 justify-center type-caption pt-2 pb-8">
        桌上的 QR code 是固定的，每次來掃同一張就好
      </div>
    </>
  );
}
