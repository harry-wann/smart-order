import React, { useState } from "react";
import { useNavigate } from "react-router";
import { loginStaff } from "@/services/api/staff/staffAuthApi";
import { signInEmployee } from "@/services/client/auth";
import Card from "../../components/card/primary/Card";
import SOFormInput,{ SOFormInputType }  from "../../components/input/SOFormInput";
import SOButton from "../../components/SOButton";
import { SvgIconMap } from "@/assets/SvgIconMap"



export const Login=()=>{

  const[account,setAccount]=useState("");
  const[password,setPassword]=useState("");
  const[error,setError]=useState("");
  const[submitting,setSubmitting]=useState(false);
  const navigate=useNavigate();

  // 登入成功存員工 JWT，之後 employeeClient 的請求都會自動帶上。
  // 密碼打錯後端回 401，但登入請求沒帶 token，employeeClient 不會把人導回登入頁，
  // 「帳號或密碼錯誤」就直接顯示在表單下方
  async function handleLogin() {
    setError("");
    setSubmitting(true);
    try {
      const { token } = await loginStaff(account.trim(), password);
      signInEmployee(token);
      navigate("/admin", { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }




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
            icon={SvgIconMap.LoginAccount}
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
            icon={SvgIconMap.LoginPassword}
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
            text={submitting ? "登入中…" : "登入"}
            disabled={submitting}
            onClick={handleLogin}
          />
          {error && <p className="pt-2 text-center type-body-sm text-danger">{error}</p>}
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