import RedButton from "./RedButton";
import testPicture from "../assets/testPicture.svg"

function RedButtonExample() {
  return (
    <RedButton 
      color="danger" 
      redButton={[
        <div key="param-1" className="flex items-center gap-1">
          <img src= {testPicture}></img>
          <span className="font-bold">參數一</span>
        </div>,
        <div key="param-2" className="flex items-center gap-1">
          <span className="font-bold">參數二</span>
          <img src= {testPicture}></img>
        </div>,
      ]}
    />
  );
}

export default RedButtonExample;