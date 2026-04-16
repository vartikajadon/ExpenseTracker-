-- Database Schema for AI Expense Tracker

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    category VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    note TEXT,
    currency VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. OTP Verifications Table
CREATE TABLE IF NOT EXISTS otp_verifications (
    id SERIAL PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL, -- Email or Phone
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- Optional (Linked after signup or for reset)
    otp_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL
);

-- 4. User Profile / Settings (For Budget & Income)
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    monthly_budget DECIMAL(12, 2) DEFAULT 0,
    monthly_income DECIMAL(12, 2) DEFAULT 0,
    base_currency VARCHAR(10) DEFAULT '₹'
);
