import DemoPage from './InfoTs';
import DemoPage2 from './BadgeTs';
import DemoPage3 from './CardTs';
import DemoPage4 from './ProductImgTs';
import CardMap from "../../components/Card/CardMap";
import check from "../../assets/icons/check.svg";

export default function DS05() {


  return (
    <>
      <DemoPage
            code="DS-05"
            title="品項列與通知"
            description="放置品項列、數量操作、價格資訊與通知提示。"
          />
        <DemoPage2
          code="DS-05"
          title="品項列與通知"
          description="放置品項列、數量操作、價格資訊與通知提示。"
        />

        <DemoPage3
          code="DS-05"
          title="品項列與通知"
          description="放置品項列、數量操作、價格資訊與通知提示。"
        />
        <DemoPage4
          code="DS-05"
          title="品項列與通知"
          description="放置品項列、數量操作、價格資訊與通知提示。"
        />

    </>
  );
}
