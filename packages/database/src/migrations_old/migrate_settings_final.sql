-- Final Settings Completion Migration

-- 1. Expense Heads (Categories for clinic accounting)
CREATE TABLE IF NOT EXISTS expense_heads (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Message Templates (SMS/WhatsApp)
CREATE TABLE IF NOT EXISTS message_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'SMS', -- 'SMS', 'WhatsApp'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Stock Logs (Inventory history)
CREATE TABLE IF NOT EXISTS stock_logs (
    id SERIAL PRIMARY KEY,
    medicine_id INTEGER NOT NULL, -- Reference to medicines(id), loose for legacy compatibility
    change_type VARCHAR(50) NOT NULL, -- 'INVENTORY_ADD', 'INVENTORY_SUB', 'SALE', 'DISPENSE'
    quantity DECIMAL(10,2) NOT NULL,
    previous_stock DECIMAL(10,2),
    new_stock DECIMAL(10,2),
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_logs_medicine ON stock_logs(medicine_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_type ON message_templates(type);
