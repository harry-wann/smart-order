package tw.ispan.smartorder.config;

import com.zaxxer.hikari.HikariDataSource;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.boot.model.naming.PhysicalNamingStrategySnakeCaseImpl;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.jdbc.autoconfigure.DataSourceProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.FullyQualifiedAnnotationBeanNameGenerator;
import org.springframework.context.annotation.Primary;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.PlatformTransactionManager;

import javax.sql.DataSource;
import java.util.Map;

/**
 * 專題本身的資料庫（smartorder）。Entity 一律放 tw.ispan.smartorder.entity、Repository 放 tw.ispan.smartorder.repository 才會被這一組管理；
 * 用功能分套件的（例如 reservation）要把它的 repository 套件加進下面的 basePackages。
 * 設成 @Primary：沒有特別指定的 @Transactional、Flyway 都用這一組。
 */
@Configuration
@EnableJpaRepositories(
        basePackages = {
                "tw.ispan.smartorder.repository",
                "tw.ispan.smartorder.reservation.repository",
                "tw.ispan.smartorder.staff.repository"
        },
        entityManagerFactoryRef = SmartOrderDataSourceConfig.ENTITY_MANAGER_FACTORY,
        transactionManagerRef = SmartOrderDataSourceConfig.TRANSACTION_MANAGER,
        nameGenerator = FullyQualifiedAnnotationBeanNameGenerator.class
)
public class SmartOrderDataSourceConfig {

    public static final String ENTITY_MANAGER_FACTORY = "entityManagerFactory";
    public static final String TRANSACTION_MANAGER = "transactionManager";

    @Bean
    @Primary
    @ConfigurationProperties("app.datasource.smartorder")
    DataSourceProperties smartOrderDataSourceProperties() {
        return new DataSourceProperties();
    }

    @Bean
    @Primary
    DataSource smartOrderDataSource(
            @Qualifier("smartOrderDataSourceProperties") DataSourceProperties properties) {
        HikariDataSource dataSource = properties.initializeDataSourceBuilder().type(HikariDataSource.class).build();
        // 每條連線建立時，把「這條連線」的時區設成台北。
        // MySQL 的 NOW()、CURRENT_TIMESTAMP 和欄位的 DEFAULT CURRENT_TIMESTAMP 用的是連線的時區，
        // MySQL 沒設定時區時跟著主機走，backend/compose.yaml 的 Docker 容器、雲端主機都是 UTC，寫進去的時間會比台北早 8 小時；
        // 程式這邊 LocalDateTime.now() 是台北時間（JVM 時區在 SmartOrderApplication 固定），兩種寫法混在同一張表就對不起來
        // （實測：order_ticket.placed_at 由程式寫、order_item.served_at 由 SQL 寫，出餐時間比下單時間早 8 小時）。
        // 兩邊都要設：只設 JVM，SQL 寫的時間還是 UTC；只設這裡，部署在 UTC 機器上時程式寫的時間又會錯。
        // 寫 '+08:00' 不寫 'Asia/Taipei'：用時區名稱要 MySQL 先載入時區資料表，很多人的 MySQL 沒載入，會連不上；
        // 台灣沒有日光節約時間，兩者結果一樣。只改 smartorder 這組連線，不動 MySQL 全域設定，也不影響 northwind
        dataSource.setConnectionInitSql("SET time_zone = '+08:00'");
        return dataSource;
    }

    @Bean(ENTITY_MANAGER_FACTORY)
    @Primary
    LocalContainerEntityManagerFactoryBean entityManagerFactory(
            @Qualifier("smartOrderDataSource") DataSource dataSource) {
        LocalContainerEntityManagerFactoryBean factory = new LocalContainerEntityManagerFactoryBean();
        factory.setDataSource(dataSource);
        factory.setPackagesToScan("tw.ispan.smartorder.entity");
        factory.setPersistenceUnitName("smartorder");
        factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
        // 資料表由 Flyway 管理，Hibernate 不自動改表；欄位用 snake_case
        factory.setJpaPropertyMap(Map.of(
                "hibernate.hbm2ddl.auto", "none",
                "hibernate.physical_naming_strategy", PhysicalNamingStrategySnakeCaseImpl.class.getName()
        ));
        return factory;
    }

    @Bean(TRANSACTION_MANAGER)
    @Primary
    PlatformTransactionManager transactionManager(
            @Qualifier(ENTITY_MANAGER_FACTORY) EntityManagerFactory entityManagerFactory) {
        return new JpaTransactionManager(entityManagerFactory);
    }
}
