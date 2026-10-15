package tw.ispan.smartorder.config;

import jakarta.persistence.EntityManagerFactory;
import java.util.Map;
import javax.sql.DataSource;
import org.hibernate.boot.model.naming.CamelCaseToUnderscoresNamingStrategy;
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

/**
 * 專題本身的資料庫（smartorder）。Entity 放 tw.ispan.smartorder.entity、Repository 放 tw.ispan.smartorder.repository 才會被這一組管理；
 * 用功能分套件的（例如 reservation）要把它的 entity、repository 套件加進下面兩處。
 * 設成 @Primary：沒有特別指定的 @Transactional、Flyway 都用這一組。
 */
@Configuration
@EnableJpaRepositories(
        basePackages = {"tw.ispan.smartorder.repository", "tw.ispan.smartorder.reservation.repository"},
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
        return properties.initializeDataSourceBuilder().build();
    }

    @Bean(ENTITY_MANAGER_FACTORY)
    @Primary
    LocalContainerEntityManagerFactoryBean entityManagerFactory(
            @Qualifier("smartOrderDataSource") DataSource dataSource) {
        LocalContainerEntityManagerFactoryBean factory = new LocalContainerEntityManagerFactoryBean();
        factory.setDataSource(dataSource);
        factory.setPackagesToScan("tw.ispan.smartorder.entity", "tw.ispan.smartorder.reservation.entity");
        factory.setPersistenceUnitName("smartorder");
        factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
        // 資料表由 Flyway 管理，Hibernate 不自動改表；欄位用 snake_case
        factory.setJpaPropertyMap(Map.of(
                "hibernate.hbm2ddl.auto", "none",
                "hibernate.physical_naming_strategy", CamelCaseToUnderscoresNamingStrategy.class.getName()
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
