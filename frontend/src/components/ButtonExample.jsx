import Button from './Button'
import testPicture from '../assets/testPicture.svg'

function ButtonExample() {
  return (
    <>
      <Button
        type="danger"
        content={[
          <div key="param-1" className="flex items-center gap-1">
            <img src={testPicture}></img>
            <span className="font-bold">參數一</span>
          </div>,
          <div key="param-2" className="flex items-center gap-1">
            <span className="font-bold">參數二</span>
            <img src={testPicture}></img>
          </div>,
        ]}
      />
      <Button
        type="ghost"
        content={[
          <div key="param-1" className="flex items-center gap-1">
            <img src={testPicture}></img>
            <span className="font-bold">參數一</span>
          </div>,
          <div key="param-2" className="flex items-center gap-1">
            <span className="font-bold">參數二</span>
            <img src={testPicture}></img>
          </div>,
        ]}
      />
      <Button
        type="secondary"
        content={[
          <div key="param-1" className="flex items-center gap-1">
            <img src={testPicture}></img>
            <span className="font-bold">參數一</span>
          </div>,
          <div key="param-2" className="flex items-center gap-1">
            <span className="font-bold">參數二</span>
            <img src={testPicture}></img>
          </div>,
        ]}
      />
      <Button text={['純文字1', '純文字2']} />
    </>
  )
}

export default ButtonExample
