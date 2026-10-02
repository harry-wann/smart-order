/**
 * ⚠️ 此檔案由 `scripts/generate-icon-map.mjs` 自動產生，禁止手動編輯。
 * 手動產生：在 frontend 目錄執行 `npm run generate:icons`。
 * 來源：`src/assets/` 及其子目錄內，符合 `ic_{page}_{icon}.svg` 命名規則的 SVG。
 * 執行 dev、build、typecheck 前會自動產生；dev 時新增或刪除 SVG 也會更新。
 * 直接修改本檔會在下次產生時被覆蓋。
 */
import CardCheckIcon from "./ic_card_check.svg?react";
import CartTimeIcon from "./ic_cart_time.svg?react";
import CheckoutBlackpeopleIcon from "./ic_Checkout_blackpeople.svg?react";
import CounterMinusIcon from "./ic_counter_minus.svg?react";
import CounterNoplusIcon from "./ic_counter_noplus.svg?react";
import CounterPlusIcon from "./ic_counter_plus.svg?react";
import CounterRedplusIcon from "./ic_counter_redplus.svg?react";
import CounterRedtrashIcon from "./ic_counter_redtrash.svg?react";
import DashboardBackIcon from "./ic_dashboard_back.svg?react";
import DashboardCalendarIcon from "./ic_dashboard_calendar.svg?react";
import DashboardInventoryIcon from "./ic_dashboard_inventory.svg?react";
import DashboardKitchenIcon from "./ic_dashboard_kitchen.svg?react";
import DashboardListIcon from "./ic_dashboard_list.svg?react";
import DashboardMenuIcon from "./ic_dashboard_menu.svg?react";
import DashboardOptionsIcon from "./ic_dashboard_options.svg?react";
import DashboardReportsIcon from "./ic_dashboard_reports.svg?react";
import DashboardSeatsIcon from "./ic_dashboard_seats.svg?react";
import DashboardTablesIcon from "./ic_dashboard_tables.svg?react";
import InfoboxCheckIcon from "./icons/ic_infobox_check.svg?react";
import InfoboxCircleIcon from "./icons/ic_infobox_circle.svg?react";
import InfoxboxTriangleIcon from "./icons/ic_infoxbox_triangle.svg?react";
import OrderShoppingCartIcon from "./ic_order_shopping_cart.svg?react";
import OrdercartGraytrashIcon from "./ic_ordercart_graytrash.svg?react";
import OrdercartLessthanIcon from "./ic_ordercart_lessthan.svg?react";
import OrdercartPeopleIcon from "./ic_ordercart_people.svg?react";
import OrdercartPersonIcon from "./ic_ordercart_person.svg?react";
import OrderHeaderBellIcon from "./ic_OrderHeader_bell.svg?react";
import OrderHeaderReddotIcon from "./ic_OrderHeader_reddot.svg?react";
import OrderRecordOkIcon from "./ic_OrderRecord_ok.svg?react";
import OrderRecordWaitIcon from "./ic_OrderRecord_wait.svg?react";
import SoldOutStampIcon from "./ic_sold_out_stamp.svg?react";
import ToastCheckIcon from "./ic_toast_check.svg?react";
import ToastInfoIcon from "./ic_toast_info.svg?react";

export const SvgIconMap = {
  // card
  CardCheck: CardCheckIcon,

  // cart
  CartTime: CartTimeIcon,

  // checkout
  CheckoutBlackpeople: CheckoutBlackpeopleIcon,

  // counter
  CounterMinus: CounterMinusIcon,
  CounterNoplus: CounterNoplusIcon,
  CounterPlus: CounterPlusIcon,
  CounterRedplus: CounterRedplusIcon,
  CounterRedtrash: CounterRedtrashIcon,

  // dashboard
  DashboardBack: DashboardBackIcon,
  DashboardCalendar: DashboardCalendarIcon,
  DashboardInventory: DashboardInventoryIcon,
  DashboardKitchen: DashboardKitchenIcon,
  DashboardList: DashboardListIcon,
  DashboardMenu: DashboardMenuIcon,
  DashboardOptions: DashboardOptionsIcon,
  DashboardReports: DashboardReportsIcon,
  DashboardSeats: DashboardSeatsIcon,
  DashboardTables: DashboardTablesIcon,

  // infobox
  InfoboxCheck: InfoboxCheckIcon,
  InfoboxCircle: InfoboxCircleIcon,

  // infoxbox
  InfoxboxTriangle: InfoxboxTriangleIcon,

  // order
  OrderShoppingCart: OrderShoppingCartIcon,

  // ordercart
  OrdercartGraytrash: OrdercartGraytrashIcon,
  OrdercartLessthan: OrdercartLessthanIcon,
  OrdercartPeople: OrdercartPeopleIcon,
  OrdercartPerson: OrdercartPersonIcon,

  // orderheader
  OrderHeaderBell: OrderHeaderBellIcon,
  OrderHeaderReddot: OrderHeaderReddotIcon,

  // orderrecord
  OrderRecordOk: OrderRecordOkIcon,
  OrderRecordWait: OrderRecordWaitIcon,

  // sold
  SoldOutStamp: SoldOutStampIcon,

  // toast
  ToastCheck: ToastCheckIcon,
  ToastInfo: ToastInfoIcon,
} as const;

/**
 * SvgIconComponent 是 SvgIconMap 內所有 SVG 元件的型別。
 * typeof SvgIconMap 取得 map 的型別；keyof 取得所有 key；
 * 再用這些 key 取出對應的元件型別。
 * 更新本檔：在 frontend 目錄執行 `npm run generate:icons`。
 */
export type SvgIconComponent = (typeof SvgIconMap)[keyof typeof SvgIconMap];

