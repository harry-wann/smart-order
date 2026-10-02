package tw.ispan.smartorder.config

import jakarta.persistence.EntityManagerFactory
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.boot.jdbc.DataSourceBuilder
import org.springframework.boot.jpa.EntityManagerFactoryBuilder
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.data.jpa.repository.config.EnableJpaRepositories
import org.springframework.orm.jpa.JpaTransactionManager
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean
import org.springframework.transaction.PlatformTransactionManager
import org.springframework.transaction.annotation.EnableTransactionManagement
import javax.sql.DataSource

@Configuration
@EnableTransactionManagement
@EnableJpaRepositories(
    basePackages = ["tw.ispan.smartorder.repository.northwind"],
    entityManagerFactoryRef = "northwindEntityManagerFactory",
    transactionManagerRef = "northwindTransactionManager"
)
class DbNorthwindConfig {

    // ==============================
    // Northwind DataSource
    // ==============================
    @Bean("northwindDataSource")
    @ConfigurationProperties("spring.datasource.northwind")
    fun dataSource(): DataSource {
        return DataSourceBuilder
            .create()
            .build()
    }


    // ==============================
    // Northwind EntityManagerFactory
    // ==============================
    @Bean("northwindEntityManagerFactory")
    fun entityManagerFactory(
        builder: EntityManagerFactoryBuilder,
        @Qualifier("northwindDataSource")
        dataSource: DataSource
    ): LocalContainerEntityManagerFactoryBean {
        return builder
            .dataSource(dataSource)
            .packages("tw.ispan.smartorder.entity.northwind")
            .persistenceUnit("northwind")
            .build()
    }


    // ==============================
    // Northwind TransactionManager
    // ==============================
    @Bean("northwindTransactionManager")
    fun transactionManager(
        @Qualifier("northwindEntityManagerFactory")
        entityManagerFactory: EntityManagerFactory
    ): PlatformTransactionManager {

        return JpaTransactionManager(entityManagerFactory)
    }
}