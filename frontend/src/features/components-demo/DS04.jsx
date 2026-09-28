import DemoPage from './DemoPage'
import OptionRadioGroup from '../../components/OptionRadio/OptionRadioGroup'

export default function DS04() {
  return (
    <DemoPage code="DS-04" title="選擇元件" description="放置單選、多選、下拉選單與選擇後的狀態。">
      <div className="flex flex-col gap-2">
        <OptionRadioGroup
          name="portion"
          defaultValue="full"
          options={[
            { value: 'half', title: '半份 約120g', desc: '+NT$40' },
            { value: 'full', title: '全份 約220g', desc: '+NT$80' },
            { value: 'double', title: '雙份 約440g', desc: '今日已售完', disabled: true },
          ]}
        />
      </div>
    </DemoPage>
  )
}
