import FormInput from '../../components/input/forminput'
import DemoPage from './DemoPage'

import Verify from '../../components/input/verify'
import Open from '../../components/opentime/open'
import Step from '../../components/steper/step'
import SMFormInput, { SMFormInputType } from '../../components/input/SMFormInput'

export default function DS03() {
  return (
    <DemoPage code="DS-03" title="其他元件" description="">
      <div className="flex flex-4 flex-col gap-3">
        <SMFormInput
          type={SMFormInputType.NORMAL}
          defaultValue=""
          placeholder="請輸入姓名"
          onChange={(e) => console.log(e.target.value)}
        />

        <SMFormInput
          type={SMFormInputType.PHONE}
          defaultValue=""
          placeholder="請輸入手機號碼"
          onChange={(e) => console.log(e.target.value)}
        />

        <FormInput />
        <Verify />
        <Open />
        <Step />
      </div>
    </DemoPage>
  )
}
