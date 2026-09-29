import React, { useState } from "react";
import Card, { type borderProps, type RowProps }  from "../../components/Card/primary/Card";
import SOFormInput,{ SOFormInputType }  from "../../components/input/SOFormInput";
import SOButton from "../../components/SOButton";
import accountic from "../../assets/ic_login_account.svg"
import passwd from "../../assets/ic_login_password.svg"



export const Login=()=>{

  const[account,setAccount]=useState("");
  const[password,setPassword]=useState("");


  const handleLogin = async () => {

    const data = {
      account,
      password,
    };
    const response = await fetch("http://localhost:8080/member/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account, password }),
    });
    const result = await response.json();

    console.log(result.test);
  };


  const condata: RowProps[]=[
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
        <SOFormInput
          icon={accountic}
          placeholder="請輸入密碼"
          onChange={(val: string) => setAccount(val)} 
          />],
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
          <SOFormInput
           type={SOFormInputType.PASSWORD}
          icon={passwd}
          placeholder="請輸入密碼"
          onChange={(val: string) => setPassword(val)} 
          />],
      ],
    },
    {
      justify: "center",
      tags: [
        ["other",
          <SOButton
          text="登入"
          onClick={()=>handleLogin()}
        />],
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