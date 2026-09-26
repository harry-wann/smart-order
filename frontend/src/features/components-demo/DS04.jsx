import DemoPage from './DemoPage';
import OptionCard from '../../components/OptionCard/OptionCard';

export default function DS04() {
  return (
    <DemoPage
      code="DS-04"
      title="選擇元件"
      description="放置單選、多選、下拉選單與選擇後的狀態。"
    >

    <OptionCard label="半份 約120g" />
    <OptionCard label="全份 約220g" 
      selected={true}
      price="+NT$80"
    />
    <OptionCard label="雙份 約440g" 
      disabled={true}
      price="今日已售完"
    />



      </DemoPage>
  );
}
