-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3.1 マスタ (Masters)

-- facilities (施設)
CREATE TABLE facilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- staffs (職員)
CREATE TABLE staffs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id UUID NOT NULL REFERENCES facilities(id),
    auth_user_id UUID, -- Link to Supabase Auth
    name TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'manager', 'staff')) NOT NULL DEFAULT 'staff',
    status TEXT CHECK (status IN ('active', 'retired')) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- residents (利用者)
CREATE TABLE residents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id UUID NOT NULL REFERENCES facilities(id),
    name TEXT NOT NULL,
    care_level TEXT,
    status TEXT CHECK (status IN ('in_facility', 'hospitalized', 'home_stay')) NOT NULL DEFAULT 'in_facility',
    start_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.2 業務データ (Transaction Data)

-- report_entries (日誌明細 - 縦持ち構造)
CREATE TABLE report_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id UUID NOT NULL REFERENCES facilities(id), -- Partitioning consideration
    resident_id UUID NOT NULL REFERENCES residents(id),
    date DATE NOT NULL,
    item_category TEXT NOT NULL,
    item_key TEXT NOT NULL,
    value TEXT, -- Stores number or string
    value_json JSONB, -- Optional complexity handling
    updated_by UUID REFERENCES staffs(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(facility_id, resident_id, date, item_key) -- Ensure idempotency per item
);

-- 3.3 コミュニケーション (Communication)

-- comments (指摘チャット)
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_entry_id UUID NOT NULL REFERENCES report_entries(id),
    facility_id UUID NOT NULL REFERENCES facilities(id),
    author_id UUID NOT NULL REFERENCES staffs(id),
    content TEXT NOT NULL,
    status TEXT CHECK (status IN ('open', 'pending', 'resolved')) NOT NULL DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_report_entries_facility_date ON report_entries(facility_id, date);
CREATE INDEX idx_comments_report_entry ON comments(report_entry_id);
