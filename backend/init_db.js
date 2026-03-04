const mysql = require('mysql2/promise');
require('dotenv').config();

async function initDB() {
    try {
        const connection = await mysql.createConnection({
            host: "localhost",
            user: "root",
            password: "Kousik@SQL1063",
            database: "ProjectX"
        });

        console.log("Connected to database. Creating tables...");

        await connection.query(`
            CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                price DECIMAL(10, 2) NOT NULL,
                unit VARCHAR(50) NOT NULL,
                moq INT NOT NULL,
                category VARCHAR(100) NOT NULL
            );
        `);

        console.log("products table created/verified.");

        // Check if products exist before inserting mockup data
        const [rows] = await connection.query("SELECT COUNT(*) as count FROM products");
        if (rows[0].count === 0) {
            await connection.query(`
                INSERT INTO products (name, price, unit, moq, category) VALUES 
                ('Premium Maida (Flour)', 45, 'kg', 50, 'flour'),
                ('Sunflower Oil Tin', 1650, 'tin', 2, 'oil'),
                ('Red Onions', 34, 'kg', 25, 'vegetable');
            `);
            console.log("Mock products inserted.");
        } else {
            console.log("Products already exist, skipping mock insert.");
        }

        await connection.query(`
            CREATE TABLE IF NOT EXISTS price_trends (
                id INT AUTO_INCREMENT PRIMARY KEY,
                product_id INT NOT NULL,
                old_price DECIMAL(10, 2) NOT NULL,
                new_price DECIMAL(10, 2) NOT NULL,
                changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(id)
            );
        `);
        console.log("price_trends table created/verified.");

        const [trendRows] = await connection.query("SELECT COUNT(*) as count FROM price_trends");
        if (trendRows[0].count === 0) {
            await connection.query(`
                INSERT INTO price_trends (product_id, old_price, new_price) VALUES 
                (1, 50, 45),
                (2, 1600, 1650),
                (3, 30, 34);
            `);
            console.log("Mock price trends inserted.");
        }

        await connection.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id VARCHAR(50) PRIMARY KEY,
                user_phone VARCHAR(20) NOT NULL,
                total DECIMAL(10, 2) NOT NULL,
                status VARCHAR(50) DEFAULT 'Processing',
                payment_status VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("orders table created/verified.");

        await connection.query(`
            CREATE TABLE IF NOT EXISTS order_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id VARCHAR(50) NOT NULL,
                product_id INT NOT NULL,
                qty INT NOT NULL,
                price DECIMAL(10, 2) NOT NULL,
                FOREIGN KEY (order_id) REFERENCES orders(id)
            );
        `);
        console.log("order_items table created/verified.");

        await connection.end();
        console.log("Database initialization complete.");
    } catch (error) {
        console.error("Error setting up database:", error);
    }
}

initDB();
