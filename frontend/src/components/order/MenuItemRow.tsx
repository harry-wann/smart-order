import type { ReactNode } from 'react';
import { SvgIconMap } from '@/assets/SvgIconMap';

interface MenuItemRowProps {
  img?: string | null,
  title: string,
  desc: string,
  price: number,
  isSoldOut: boolean,
  isPopular: boolean,
  isVegetarian?: boolean | null,
  containsBeef?: boolean | null,
  spicyLevel?: number | null,
  onClick?: () => void,
  // 價格右邊的操作區（例如菜單上的 [+] 加入購物車按鈕）。放什麼、怎麼運作由使用的畫面決定，
  // 這個元件只負責留位置；售完的品項要不要顯示也由使用的畫面決定
  action?: ReactNode
}

enum TagType {
  popular, soldOut
}

export default function MenuItemRow(props: MenuItemRowProps) {

  const formatter = new Intl.NumberFormat('zh-TW')
  let formattedPrice = formatter.format(props.price)
  let isSoldOut = props.isSoldOut;

  return <article onClick={ isSoldOut ? undefined : props.onClick } className="w-full min-h-36 p-card rounded-card border border-line bg-surface">
    <div className="h-full flex gap-4 items-center">

      {/* 沒有照片也留照片框：版面不會因為有沒有圖而跑掉，售完的灰階與印章也才有地方放 */}
      <Photo src={ props.img } isSoldOut={isSoldOut} />

      <div className="min-w-0 h-full flex flex-col flex-1">
        <div className="min-w-0 flex flex-1 flex-col">
          <div className="flex gap-2 items-center">
            <h3 className={`min-w-0 type-h3 truncate ${isSoldOut ? 'text-ink-400' : ''}`}>{props.title}</h3>
            { props.isPopular && <Tag type={TagType.popular} /> }
            { isSoldOut && <Tag type={TagType.soldOut} /> }
          </div>
          <p className={`type-body-sm text-ink-600 line-clamp-2 ${isSoldOut ? 'text-ink-400' : ''}`}>{props.desc}</p>
          <div className={`mt-1 flex flex-wrap gap-1 type-caption ${isSoldOut ? 'text-ink-400' : 'text-ink-600'}`}>
            {props.isVegetarian === true && <span className="rounded-pill bg-surface-2 px-2 py-0.5">素食</span>}
            {props.containsBeef === false && <span className="rounded-pill bg-surface-2 px-2 py-0.5">不含牛</span>}
            {Number.isInteger(props.spicyLevel) && props.spicyLevel != null && props.spicyLevel >= 0 && props.spicyLevel <= 3 && (
              <span className="rounded-pill bg-surface-2 px-2 py-0.5">
                {['不辣', '小辣', '中辣', '大辣'][props.spicyLevel]}
              </span>
            )}
          </div>
        </div>

        <div className="flex h-8 items-center justify-between gap-2">
          {/* 售完：價格灰色加劃線 */}
          <span className={`type-price ${isSoldOut ? 'text-ink-400 line-through' : 'text-brand-600'}`}>{`NT$ ${formattedPrice}`}</span>
          { props.action }
        </div>
      </div>
    </div>
  </article>
}

// 照片框固定 80×80、圓角 12px，印章只畫在框裡面（overflow-hidden），不會蓋到旁邊的文字，
// 窄螢幕（320px）上框的大小也不變，所以不會跑版。
// pointer-events-none：框是 relative 定位，會畫在菜單頁蓋滿整列的透明按鈕上面，不關掉的話點照片會被框擋住、進不了詳情頁
function Photo({ src, isSoldOut }: { src?: string | null, isSoldOut: boolean }) {
  return <div className="pointer-events-none relative size-20 shrink-0 overflow-hidden rounded-card bg-surface-2">
    { src
      ? <img
          className={`size-full object-cover ${isSoldOut ? 'grayscale opacity-55' : ''}`}
          src={src}
          alt=""
        />
      : <span className="flex size-full items-center justify-center rounded-card border border-dashed border-line-strong type-caption text-ink-400">
          無圖片
        </span>
    }
    { isSoldOut && <SvgIconMap.SoldOutStamp aria-hidden="true" className="pointer-events-none absolute inset-0 m-auto max-h-full max-w-full" /> }
  </div>
}

function Tag({ type }: { type: TagType }) {

  const TAG_STYLE = {
    [TagType.popular]: { text: '人氣', className: 'bg-accent-500 text-ink-900' },
    [TagType.soldOut]: { text: '售完', className: 'bg-danger text-white' },
  };

  const { text, className } = TAG_STYLE[type];

  return <span className={`h-6 px-2.5 shrink-0 flex items-center rounded-pill type-caption ${className}`}>
    {text}
  </span>
}
