import soldOutImg from '@/assets/ic_sold_out_stamp.svg'; 

interface MenuItemRowProps {
  img?: string | null,
  title: string,
  desc: string,
  price: number,
  isSoldOut: boolean,
  isPopular: boolean,
  onClick: () => void
}

enum TagType {
  popular, soldOut
}

export default function MenuItemRow(props: MenuItemRowProps) {

  const formatter = new Intl.NumberFormat('zh-TW')
  let formattedPrice = formatter.format(props.price)
  let isSoldOut = props.isSoldOut;

  return <article onClick={ isSoldOut ? undefined : props.onClick } className="w-full h-36 p-card rounded-card border border-line bg-surface">
    <div className="h-full flex gap-4 items-center">
      
      { props.img && <Img src={ props.img } isSoldOut={isSoldOut} /> }
      
      <div className="min-w-0 h-full flex flex-col flex-1">
        <div className="min-w-0 flex flex-1 flex-col"> 
          <div className="flex gap-2 items-center">
            <h3 className={`min-w-0 type-h3 truncate ${isSoldOut ? 'text-ink-400' : ''}`}>{props.title}</h3>
            { props.isPopular && <Tag type={TagType.popular} /> }
            { isSoldOut && <Tag type={TagType.soldOut} /> }  
          </div>
          <p className={`type-body-sm text-ink-600 line-clamp-2 ${isSoldOut ? 'text-ink-400' : ''}`}>{props.desc}</p>
        </div>
        
        <div className="flex h-8 items-center justify-between">
          <span className={`type-price ${isSoldOut ? 'text-ink-400' : 'text-brand-600'}`}>{`NT$ ${formattedPrice}`}</span>
          
        </div>
      </div>
    </div>
  </article>
}

function Img({ src, isSoldOut }: { src: string, isSoldOut: boolean }) {
  return <div className="size-22 relative shrink-0 bg-surface-2 border border-dashed border-line-strong rounded-card">
    <img 
      className={`rounded-card object-cover ${isSoldOut ? 'grayscale opacity-55' : ''}`}
      src={src}
    />
    { isSoldOut && <img className="absolute inset-0 m-auto" src={soldOutImg} /> }
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