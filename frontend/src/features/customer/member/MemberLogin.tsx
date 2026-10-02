import CustomerTopBar from '@/components/CustomerTopBar'

function MemberLogin() {
  return <div className="flex h-full w-full flex-col">
    <CustomerTopBar
      title="會員"
      showBackButton={true}
    />
    <div>Order Index</div>
  </div>
}

export default MemberLogin
