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
    basePackages = ["tw.ispan.smartorder.repository.smartorder"],
    entityManagerFactoryRef = "smartOrderEntityManagerFactory",
    transactionManagerRef = "smartOrderTransactionManager"
)
class DbSmartOrderConfig {

    // ==============================
    // SmartOrder DataSource
    // ==============================
    @Bean("smartOrderDataSource")
    @ConfigurationProperties("spring.datasource.smartorder")
    fun dataSource(): DataSource {
        return DataSourceBuilder
            .create()
            .build()
    }


    // ==============================
    // SmartOrder EntityManagerFactory
    // ==============================
    @Bean("smartOrderEntityManagerFactory")
    fun entityManagerFactory(
        builder: EntityManagerFactoryBuilder,
        @Qualifier("smartOrderDataSource")
        dataSource: DataSource
    ): LocalContainerEntityManagerFactoryBean {
        return builder
            .dataSource(dataSource)
            .packages("tw.ispan.smartorder.entity.smartorder")
            .persistenceUnit("smartOrder")
            .build()
    }


    // ==============================
    // SmartOrder TransactionManager
    // ==============================
    @Bean("smartOrderTransactionManager")
    fun transactionManager(
        @Qualifier("smartOrderEntityManagerFactory")
        entityManagerFactory: EntityManagerFactory
    ): PlatformTransactionManager {
        return JpaTransactionManager(entityManagerFactory)
    }
}