import "./App.css";
import RedButton from "./components/RedButton";
import { ChevronRight } from "lucide-react";

function App() {
  return (
    <RedButton
      // color="danger"
      redButton={[
        <div className="flex items-center gap-1">
          <span className="font-bold">NT$ 1,420</span>
          <ChevronRight className="w-5 h-5" />
        </div>,
        <div className="flex items-center gap-1">
          <span className="font-bold">NT$ 1,420</span>
          <ChevronRight className="w-5 h-5" />
        </div>,
      ]}
    />
  );
}

export default App;
