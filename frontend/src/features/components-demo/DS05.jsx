import DemoPage from "./DemoPage";
import Badge from "../../components/Badge";
import CardMap from "../../components/Card/CardMap";
import check from "../../assets/icons/ic_infobox_check.svg";
import InfoBox from "../../components/InfoBox";
import ProductImgMap from "../../components/ProductImg/ProductImgMap";

export default function DS05() {
  const cardData = [
    {
      id: 1,
      data: [
        {
          justify: "between",
          tags: [
            ["h2", "標題文字"],
            ["p", "說明文字"],
          ],
        },
        {
          justify: "center",
          tags: [["img", check]],
        },
        {
          justify: "end",
          tags: [
            ["h2", "test"],
            ["other", <a href="#">aaa</a>],
          ],
        },
      ],
    },
  ];

  const productData = [
    {
      id: 1,
      area: "A11",
      row: "1",
      src: check,
      tag: [
        ["h2", "test"],
        ["p", "test"],
      ],
    },

    {
      id: 2,
      area: "A11",
      row: "2",
      src: check,
      tag: [
        ["h2", "test"],
        ["other", <button>aaa</button>],
      ],
    },
    {
      id: 3,
      area: "A169",
      row: "1",
      src: check,
      tag: [
        ["h2", "test"],
        ["p", "test"],
      ],
    },
  ];

  return (
    <>
      <DemoPage
        code="DS-05"
        title="品項列與通知"
        description="放置品項列、數量操作、價格資訊與通知提示。"
      >
        <div className="grid grid-cols-3 gap-3 p-3">
          <Badge text="C1" col="rec" />
          <Badge text="C2" col="sold" p="soldOut" />
          <Badge text="C3" col="done" />
          <Badge text="C4" col="hot" />
          <Badge text="C5" col="veg" />
          <Badge text="C6" col="wait" />
          <Badge text="C7" col="pri" />
          <Badge text="C8" col="info" />
          <Badge text="C9" col="plain" />
        </div>

        <div className="p-5">
          <CardMap data={cardData} col="1" />
        </div>

        <InfoBox icon="check" col="quiet" text="A" classname="" />
        <InfoBox col="ok" text="F" custimtext="自訂文字" />
        <InfoBox icon="circle" col="info" text="C" verify="482913" />
        <InfoBox
          icon="triangle"
          col="warn"
          text="D"
          verificationTime={{
            time: "5",
            remain: 2,
          }}
        />
        <InfoBox
          icon="triangle"
          col="danger"
          text="E"
          destine={{
            table: "A06",
            time: "19:30",
            name: "陳小姐",
            many: 4,
          }}
        />

        <ProductImgMap data={productData} row="2" />
      </DemoPage>
    </>
  );
}
