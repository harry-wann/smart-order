import React from "react";
import InfoBox from "../../components/InfoBox/InfoBox";



const InfoBoxTs=()=>{

    return(
        <>
            <InfoBox ICON="CHECK" col="GREEN" TEXT="A" classname=""/>
            <InfoBox ICON="TRIANGLE" col="RED" TEXT="E"  
        DESTINE={{
        TABLE:"A06",
        TIME:"19:30",
        NAME:"陳小姐",
        MANY:4
    }}/>
        </>
    )
}

export default InfoBoxTs