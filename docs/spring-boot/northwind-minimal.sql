-- 只供單元 10 練習的最小資料集，不是完整 Northwind。
-- 請在全新的 northwind 資料庫匯入；已有課程版 Northwind 時不要執行。
CREATE TABLE Categories (
    CategoryID INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    CategoryName VARCHAR(15) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE Products (
    ProductID INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    ProductName VARCHAR(40) NOT NULL,
    UnitPrice DECIMAL(19,4) NULL,
    UnitsInStock INT NULL,
    Discontinued TINYINT(1) NOT NULL DEFAULT 0,
    CategoryID INT NULL,
    CONSTRAINT fk_products_category FOREIGN KEY (CategoryID)
        REFERENCES Categories (CategoryID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO Categories (CategoryID, CategoryName) VALUES (1, 'Beverages');
INSERT INTO Products
    (ProductID, ProductName, UnitPrice, UnitsInStock, Discontinued, CategoryID)
VALUES
    (1, 'Chai', 18.0000, 39, 0, 1);
