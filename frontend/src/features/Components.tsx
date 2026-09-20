import { useState } from 'react'
type Props = {}

export default function Components({}: Props) {
  
  return (
    <div className="w-full h-full p-4 flex flex-col">

      <article className="w-full h-full flex flex-col">
        <h1>DS-02｜按鈕</h1>

      </article>

      <article className="w-full h-full flex flex-col">
        <h1>DS-03｜輸入元件</h1>

      </article>

      <article className="w-full h-full flex flex-col">
        <h1>DS-04｜選擇元件</h1>

      </article>

      <article className="w-full h-full flex flex-col">
        <h1>DS-05｜標籤與容器</h1>

      </article>

      <article className="w-full h-full flex flex-col">
        <h1>DS-06｜品項列與通知</h1>
        
      </article>

    </div>
  )
}
