package tw.ispan.smartorder.reservation.repository

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import tw.ispan.smartorder.entity.DiningTableEntity

@Repository
interface ReservationTableRepository : JpaRepository<DiningTableEntity, Long> {

    @Query(
        """
        select t from DiningTableEntity t
        where t.active = true and t.reservable = true and t.seats >= :partySize
        order by t.seats, t.tableNo
        """
    )
    fun findReservable(partySize: Int): List<DiningTableEntity>

    // 依 id 排序上鎖，兩筆訂位同時進來時鎖的順序一致，不會互相卡死。
    // 用原生 SQL：Hibernate 7 的 @Lock 會產生 MySQL 5.7 不支援的 FOR UPDATE OF
    @Query(
        nativeQuery = true,
        value = """
        select * from dining_table
        where active = 1 and reservable = 1 and seats >= :partySize
        order by id
        for update
        """
    )
    fun findReservableForUpdate(partySize: Int): List<DiningTableEntity>

    @Query(
        """
        select t from DiningTableEntity t
        where t.active = true and t.status = 'AVAILABLE' and t.seats >= :partySize
        order by t.seats, t.tableNo
        """
    )
    fun findAvailable(partySize: Int): List<DiningTableEntity>

    // 開桌要先鎖桌位，兩個櫃檯同時開同一張只會成功一個
    @Query(nativeQuery = true, value = "select * from dining_table where id = :id and active = 1 for update")
    fun findByIdForUpdate(id: Long): DiningTableEntity?
}
