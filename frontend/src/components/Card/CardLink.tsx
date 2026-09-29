import React from 'react'
import Card, { type RowProps } from './primary/Card'
import link from '../../assets/ic_link.svg'

type CardLinkProps = {
  data: {
    icon: string
    textH2: string
    textP: string
    iconSrc: string
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
              <li ><p className='type-body-sm'>{data.textP}</p ></li>
            </ul>
          </div>,
        ],
        ['img', link],
      ],
    },
  ]

  return <Card data={cardData} />

}

export default CardLink
