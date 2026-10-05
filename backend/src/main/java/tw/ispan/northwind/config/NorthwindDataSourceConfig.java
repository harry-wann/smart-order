package tw.ispan.northwind.config;

import jakarta.persistence.EntityManagerFactory;
import java.util.Map;
import javax.sql.DataSource;
import org.hibernate.boot.model.naming.PhysicalNamingStrategyStandardImpl;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.jdbc.autoconfigure.DataSourceProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.FullyQualifiedAnnotationBeanNameGenerator;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.PlatformTransactionManager;

/**
 * Northwind 練習資料庫，只給 tw.ispan.northwind 底下的 demo API 使用。
 * Service 的 @Transactional 要指定 TRANSACTION_MANAGER，否則會用到 smartorder 那一組。
 */
@Configuration
@EnableJpaRepositories(
        basePackages = "tw.ispan.northwind.repository",
        entityManagerFactoryRef = NorthwindDataSourceConfig.ENTITY_MANAGER_FACTORY,
        transactionManagerRef = NorthwindDataSourceConfig.TRANSACTION_MANAGER,
        nameGenerator = FullyQualifiedAnnotationBeanNameGenerator.class
)
public class NorthwindDataSourceConfig {

    public static final String ENTITY_MANAGER_FACTORY = "northwindEntityManagerFactory";
    public static final String TRANSACTION_MANAGER = "northwindTransactionManager";

    @Bean
    @ConfigurationProperties("app.datasource.northwind")
    DataSourceProperties northwindDataSourceProperties() {
        return new DataSourceProperties();
    }

    @Bean
    DataSource northwindDataSource(
            @Qualifier("northwindDataSourceProperties") DataSourceProperties properties) {
        return properties.initializeDataSourceBuilder().build();
    }

    @Bean(ENTITY_MANAGER_FACTORY)
    LocalContainerEntityManagerFactoryBean northwindEntityManagerFactory(
            @Qualifier("northwindDataSource") DataSource dataSource) {
        LocalContainerEntityManagerFactoryBean factory = new LocalContainerEntityManagerFactoryBean();
        factory.setDataSource(dataSource);
        factory.setPackagesToScan("tw.ispan.northwind.entity");
        factory.setPersistenceUnitName("northwind");
        factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
        // Northwind 是既有的練習資料庫：不讓 Hibernate 改表，表名欄位名照 @Table、@Column 原樣使用
        factory.setJpaPropertyMap(Map.of(
                "hibernate.hbm2ddl.auto", "none",
                "hibernate.physical_naming_strategy", PhysicalNamingStrategyStandardImpl.class.getName()
        ));
        return factory;
    }

    @Bean(TRANSACTION_MANAGER)
    PlatformTransactionManager northwindTransactionManager(
            @Qualifier(ENTITY_MANAGER_FACTORY) EntityManagerFactory entityManagerFactory) {
        return new JpaTransactionManager(entityManagerFactory);
    }
}
