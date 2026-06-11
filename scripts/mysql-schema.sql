-- Kat's Beauty Bar — MySQL Schema
-- Run this once against your Xneelo MySQL database to initialise tables.

CREATE TABLE IF NOT EXISTS services (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  description     TEXT NOT NULL,
  price           DECIMAL(10,2) NOT NULL,
  duration_minutes INT NOT NULL,
  category        VARCHAR(255) NOT NULL,
  image_url       VARCHAR(500),
  active          TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS appointments (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  customer_name   VARCHAR(255) NOT NULL,
  email           VARCHAR(255) NOT NULL,
  phone           VARCHAR(50) NOT NULL,
  service_id      INT NOT NULL,
  start_time      DATETIME NOT NULL,
  end_time        DATETIME NOT NULL,
  notes           TEXT,
  status          ENUM('pending','confirmed','completed','cancelled') NOT NULL DEFAULT 'confirmed',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (service_id) REFERENCES services(id)
);

CREATE TABLE IF NOT EXISTS admin_users (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  email           VARCHAR(255) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS business_settings (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  `key`           VARCHAR(255) NOT NULL UNIQUE,
  value           TEXT NOT NULL
);

-- Default admin user (password: admin123)
-- Change this password immediately after first login via the admin dashboard.
INSERT IGNORE INTO admin_users (name, email, password_hash)
VALUES (
  'Admin',
  'admin@katbeautybar.co.za',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
);
