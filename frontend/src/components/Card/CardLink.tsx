import React from 'react'
import Card, { type RowProps } from './primary/Card'
import link from '../../assets/ic_card_link.svg'

type CardLinkProps = {
  data: {
    icon: string
    textH2: string
    textP: string
    iconSrc: string
    onclick:()=>void
  }
}

const CardLink = ({ 
  data
}: CardLinkProps) => {
  const cardData: RowProps[] = [
    {
      justify: 'between',
      tags: [
        [
          'other',
          <div className="flex gap-3">
            <img src={data.icon} />
            <ul>
              <li>
                <h2 className='type-h2'>{data.textH2}</h2>
              </li>
              <li ><p className='type-body-sm text-ink-600'>{data.textP}</p ></li>
            </ul>
          </div>,
        ],
        ['img', link],
      ],
    },
  ]

  return (
    <div onClick={data.onclick}>
      <Card data={cardData} />
    </div >
)

}

export default CardLink
