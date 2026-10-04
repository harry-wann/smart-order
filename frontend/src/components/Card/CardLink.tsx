import React from 'react'
import Card, { type RowProps } from './primary/Card'
import { SvgIconMap, type SvgIconComponent } from '@/assets/SvgIconMap'

type CardLinkProps = {
  data: {
    icon: SvgIconComponent
    textH2: string
    textP: string
    iconSrc: string
    onclick:()=>void
  }
}

const CardLink = ({ 
  data
}: CardLinkProps) => {
  const Icon = data.icon
  const cardData: RowProps[] = [
    {
      justify: 'between',
      tags: [
        [
          'other',
          <div className="flex gap-3">
            <Icon />
            <ul>
              <li>
                <h2 className='type-h2'>{data.textH2}</h2>
              </li>
              <li ><p className='type-body-sm text-ink-600'>{data.textP}</p ></li>
            </ul>
          </div>,
        ],
        ['other', <SvgIconMap.CardLink aria-hidden="true" />],
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
