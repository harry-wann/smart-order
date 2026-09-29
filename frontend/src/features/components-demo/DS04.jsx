import DemoPage from './DemoPage'
import OptionRadioGroup from '../../components/optionRadio/OptionRadioGroup'
import OptionCheckboxGroup from '../../components/optionCheckbox/OptionCheckboxGroup'

export default function DS04() {
  return (
    <DemoPage code="DS-04" title="選擇元件" description="放置單選、多選、下拉選單與選擇後的狀態。">
      <div className="flex flex-col gap-2">
        <h3 className="type-h3">OPTION CARD 單選</h3>
        <OptionRadioGroup
          name="portion"
          defaultValue="full"
          options={[
            { value: 'half', title: '半份 約120g', desc: '+NT$40' },
            { value: 'full', title: '全份 約220g', desc: '+NT$80' },
            { value: 'double', title: '雙份 約440g', desc: '今日已售完', disabled: true },
          ]}
        />

        <hr />

        <h3 className="type-h3">OPTION CARD 複選</h3>
        <OptionCheckboxGroup
          name="toppings"
          defaultValue={['scallion-flower']}
          options={[
            { value: 'scallion-flower', title: '加蔥花', desc: '+NT$ 10' },
            { value: 'garlic', title: '加蒜泥', desc: '+NT$ 10' },
          ]}
        />
      </div>
    </DemoPage>
  )
}
