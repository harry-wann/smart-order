import RedButton from "./RedButton";
import { ChevronRight } from "lucide-react";

function RedButtonExample() {
  return (
    <RedButton 
      color="danger" 
      redButton={[
        <div key="param-1" className="flex items-center gap-1">
          <span className="font-bold">參數一</span>
          <ChevronRight className="w-5 h-5" />
        </div>,
        <div key="param-2" className="flex items-center gap-1">
          <span className="font-bold">參數二</span>
          <ChevronRight className="w-5 h-5" />
        </div>,
      ]}
    />
  );
}

export default RedButtonExample;