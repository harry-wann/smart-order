export type ReservationContact = {
  name: string
  phone: string
  email?: string
}

export type ReservationConfirmation = {
  id: string
  reservationNo: string
  date: string
  time: string
  partySize: number
  tableNo: string
  contact?: ReservationContact
}

export type ReservationRouteState = {
  reservation: ReservationConfirmation
}
