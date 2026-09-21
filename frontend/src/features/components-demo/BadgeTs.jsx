import React from "react";
import Badge from "../../components/Badge/Badge";



const BadgeTs = () => {
    return (
        <div className="grid gap-3 p-3">
            <Badge text="C1" col="ORG" />
            <Badge text="C2" col="RED" p="soldOut" />
            <Badge text="C3" col="GREEN" />
            <Badge text="C4" col="RED_FFF" />
            <Badge text="C5" col="GREEN_GREEN" />
            <Badge text="C6" col="BROWN_BROWN" />
            <Badge text="C7" col="BROWN_ORG" />
            <Badge text="C8" col="BLUE_BLUE" />
            <Badge text="C9" col="GRAY_BROWN" />

        </div>
    )
}

export default BadgeTs;