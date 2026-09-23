import DemoPage from './DemoPage';
import Badge from '../../components/Badge/Badge'
import CardMap from '../../components/Card/CardMap';
import check from '../../assets/icons/check.svg';
import InfoBox from '../../components/InfoBox/InfoBox';
import ProductImgMap from '../../components/ProductImg/ProductImgMap';


export default function DS05() {

  const cardData = [
          {
              id: 1,
              STYLE: "primary",
              ROW: "1",
              TAG: [
                  ["h2", "Card 1"],
                  ["p", "第一張卡片內容"]
              ]
          },
  
          {
              id: 2,
              STYLE: "CardTigth",
              ROW: "2",
              TAG: [
                  ["h2", "Card 2"],
                  ["orther", <button className="bg-red-500 text-white px-4 py-2 rounded-full">
                      第二張卡片內容
                  </button>]
              ]
          },
  
          {
              id: 3,
              STYLE: "CardFlat",
              ROW: "1",
              TAG: [
                  ["h2", "Card 3"],
                  ["img", check]
              ]
          }
      ];


       const productData= [
          {
              id: 1,
              AREA: "A11",
              ROW: "1",
              SRC: check,
              TAG: [
                  ["h2", "test"],
                  ["p", "test"]
              ]
          },
      
          {
              id: 2,
              AREA: "A11",
              ROW: "2",
              SRC: check,
              TAG: [
                  ["h2", "test"],
                  ["orther", <button>aaa</button>]
              ]
          },
          {
              id: 3,
              AREA: "A169",
              ROW: "1",
              SRC: check,
              TAG: [
                  ["h2", "test"],
                  ["p", "test"]
              ]
          }
      ];


  return (
    <>
      <DemoPage
            code="DS-05"
            title="品項列與通知"
            description="放置品項列、數量操作、價格資訊與通知提示。"
          >

        <div className="grid grid-cols-3 gap-3 p-3">
            <Badge text="C1" col="ORG" />
            <Badge text="C2" col="RED" p="soldOut" />
            <Badge text="C3" col="GREEN" />
            <Badge text="C4" col="RED_FFF" />
            <Badge text="C5" col="GREEN_GREEN" />
            <Badge text="C6" col="BROWN_BROWN" />
            <Badge text="C7" col="BROWN_ORG" />
            <Badge text="C8" col="BLUE_BLUE" />
            <Badge text="C9" col="GRAY_BROWN" />
        </div>

         <div className="p-5">
                <CardMap
                    DATA={cardData}
                    COL="1"
                />
          </div>

        <InfoBox ICON="Check" col="GREEN" TEXT="A" classname=""/>
        <InfoBox col="BLUE" TEXT="C" VERIFY="482913"/>
        <InfoBox ICON="Tri" col="RED" TEXT="E"  
        DESTINE={{
        TABLE:"A06",
        TIME:"19:30",
        NAME:"陳小姐",
        MANY:4
         }}/>


        <ProductImgMap
                DATA={productData}
                ROW="2"
            />



      </DemoPage>

    </>
  );
}
