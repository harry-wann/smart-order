import FormInput from '../../components/input/forminput'
import DemoPage from './DemoPage'

import Verify from '../../components/input/verify'
import Open from '../../components/opentime/open'
import Step from '../../components/steper/step'

export default function DS03() {
  return (
    <DemoPage code="DS-07" title="其他元件" description="放置尚未分類的共用元件與互動模式。">
      <div>
        <FormInput />
        <Verify />
        <Open />
        <Step />
      </div>
    </DemoPage>
  )
}
