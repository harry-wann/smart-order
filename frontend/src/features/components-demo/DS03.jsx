import DemoPage from './DemoPage'
// import SearchIcon from '../../assets/ic_verify_search.svg'

import Verify from '../../components/input/verify'
import Open from '../../components/opentime/open'
import Time from '../../components/opentime/time'
import Counter from '../../components/steper/counter'
import SOFormInput, { SOFormInputType } from '../../components/input/SOFormInput'
import SOTextArea from '../../components/input/SOTextArea'

const timeSlots = [
  { time: '18:00', full: false },
  { time: '18:30', full: true },
  { time: '19:00', full: false },
]
export default function DS03() {
  return (
    <DemoPage code="DS-03" title="其他元件" description="">
      <div className="flex flex-4 flex-col gap-3">
        <SOFormInput
          type={SOFormInputType.NORMAL}
          // icon={SearchIcon} // 不需要icon的時候這列直接註解掉
          defaultValue=""
          placeholder="請輸入姓名"
          onChange={(e) => console.log(e.target.value)}
        />
        <SOFormInput
          type={SOFormInputType.PHONE}
          defaultValue=""
          placeholder="請輸入手機號碼"
          onChange={(e) => console.log(e.target.value)}
        />
        <SOTextArea
          defaultValue=""
          placeholder="請輸入備註"
          onChange={(e) => console.log(e.target.value)}
        />

        <Verify length={6} defaultValue="" onChange={(code) => console.log(code)} />

        {/* 開關 */}
        <Open defaultValue={true} onChange={(value) => console.log(value)} />

        {/* 時段 */}
        <Time timeSlots={timeSlots} defaultValue="18:00" onChange={(time) => console.log(time)} />

        {/* 小：數量 1 顯示垃圾桶 */}
        <Counter size="small" initialCount={1} />

        {/* 大：數量 1 顯示垃圾桶 */}
        <Counter size="large" initialCount={1} />

        {/* 小：數量 1 顯示減號 */}
        <Counter size="small" initialCount={1} showTrash={false} />
      </div>
    </DemoPage>
  )
}
