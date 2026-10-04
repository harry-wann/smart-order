import React, { useState } from "react";
import Card from "../../components/Card/primary/Card";
import SOFormInput,{ SOFormInputType }  from "../../components/input/SOFormInput";
import SOButton from "../../components/SOButton";
import accountic from "../../assets/ic_login_account.svg"
import passwd from "../../assets/ic_login_password.svg"



export const Login=()=>{

  const[account,setAccount]=useState("");
  const[password,setPassword]=useState("");




  const condata=[
    {
      justify: "start",
      tags: [
        ["p", "帳號"],
      ],
    },
    {
      justify: "start",
      tags: [
        ["other",
        <div className="w-[334px]">
          <SOFormInput
            icon={accountic}
            placeholder="請輸入帳號"
            onChange={(val) => setAccount(val)} 
            />
        </div >],
      ],
    },
    {
      justify: "start",
      tags: [
        ["p","密碼"],
      ],
    },
    {
       justify: "start",
      tags: [
        ["other",
          <div className="w-[334px]">
            <SOFormInput
             type={SOFormInputType.PASSWORD}
            icon={passwd}
            placeholder="請輸入密碼"
            onChange={(val) => setPassword(val)} 
            />
          </div>],
      ],
    },
    {
      justify: "center",
      tags: [
        ["other",
          <div className="w-[334px]">
            <SOButton
            height="h-12"
            text="登入"
            onClick={()=>console.log("登入")}
          />
          </div>],
      ],
    }
  ]



  return(
    <div className="flex flex-col w-screen h-screen justify-center items-center">
          <h1 className="type-h1">鼎沸鍋物</h1>
          <p className="type-body-sm text-ink-600">SMART ORDER 員工後台</p>
          <div className="py-card-gap text-ink-400">
            <Card data={condata}/>
          </div>
    </div>
  )
}