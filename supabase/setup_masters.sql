-- ============================================================================
-- setup_masters.sql
-- マスタデータベース再構築スクリプト
-- 
-- 【重要】このスクリプトは public スキーマを完全にリセットしてから
-- クリーンな状態でテーブルを再作成します。
-- ============================================================================

-- ============================================================================
-- 0. 完全リセット (Reset)
-- ============================================================================
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- デフォルト権限の復元
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;

-- UUID拡張機能の有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;

-- ============================================================================
-- 1. ENUM型の定義
-- ============================================================================
CREATE TYPE public.staff_role AS ENUM ('admin', 'manager', 'staff');
CREATE TYPE public.staff_status AS ENUM ('active', 'retired');
CREATE TYPE public.resident_status AS ENUM ('in_facility', 'hospitalized', 'home_stay', 'left');

-- ============================================================================
-- 2. 全テーブル作成（RLSポリシーは後で追加）
-- ============================================================================

-- 2-1. organizations テーブル
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2-2. facilities テーブル
CREATE TABLE public.facilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    provider_number VARCHAR(20),
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, code)
);

-- 2-3. qualifications テーブル
CREATE TABLE public.qualifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    is_medical_coord_iv_target BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2-4. staffs テーブル
CREATE TABLE public.staffs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    facility_id UUID REFERENCES public.facilities(id) ON DELETE SET NULL,
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    role public.staff_role NOT NULL DEFAULT 'staff',
    status public.staff_status NOT NULL DEFAULT 'active',
    qualification_id UUID REFERENCES public.qualifications(id) ON DELETE SET NULL,
    qualifications_text VARCHAR(500),
    job_types TEXT[],
    invite_token VARCHAR(255) UNIQUE,
    join_date DATE,
    leave_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2-5. staff_facilities テーブル（兼務用中間テーブル）
CREATE TABLE public.staff_facilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES public.staffs(id) ON DELETE CASCADE,
    facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
    role_in_facility public.staff_role,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(staff_id, facility_id)
);

-- 2-6. residents テーブル
CREATE TABLE public.residents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    status public.resident_status NOT NULL DEFAULT 'in_facility',
    care_level VARCHAR(10),
    primary_insurance VARCHAR(50),
    public_expense_1 VARCHAR(50),
    public_expense_2 VARCHAR(50),
    limit_application_class VARCHAR(10),
    sputum_suction BOOLEAN NOT NULL DEFAULT FALSE,
    severe_disability_addition BOOLEAN NOT NULL DEFAULT FALSE,
    ventilator BOOLEAN NOT NULL DEFAULT FALSE,
    table_7 BOOLEAN NOT NULL DEFAULT FALSE,
    table_8 BOOLEAN NOT NULL DEFAULT FALSE,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2-7. daily_records テーブル
CREATE TABLE public.daily_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
    resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    is_gh BOOLEAN NOT NULL DEFAULT FALSE,
    is_gh_night BOOLEAN NOT NULL DEFAULT FALSE,
    hospitalization_status BOOLEAN NOT NULL DEFAULT FALSE,
    overnight_stay_status BOOLEAN NOT NULL DEFAULT FALSE,
    meal_breakfast BOOLEAN NOT NULL DEFAULT FALSE,
    meal_lunch BOOLEAN NOT NULL DEFAULT FALSE,
    meal_dinner BOOLEAN NOT NULL DEFAULT FALSE,
    data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(facility_id, resident_id, date)
);

-- 2-8. daily_shifts テーブル
CREATE TABLE public.daily_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    day_staff_ids UUID[],
    night_staff_ids UUID[],
    night_shift_plus BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(facility_id, date)
);

-- 2-9. medical_coord_v_daily テーブル
CREATE TABLE public.medical_coord_v_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    nurse_count INTEGER NOT NULL DEFAULT 0,
    calculated_units INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(facility_id, date)
);

-- 2-10. medical_cooperation_records テーブル
CREATE TABLE public.medical_cooperation_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
    resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    staff_id UUID REFERENCES public.staffs(id) ON DELETE SET NULL,
    medical_coord_v_daily_id UUID REFERENCES public.medical_coord_v_daily(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(facility_id, resident_id, date)
);

-- 2-11. short_stay_records テーブル
CREATE TABLE public.short_stay_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    resident_id UUID REFERENCES public.residents(id) ON DELETE SET NULL,
    period_note VARCHAR(255),
    meal_breakfast BOOLEAN NOT NULL DEFAULT FALSE,
    meal_lunch BOOLEAN NOT NULL DEFAULT FALSE,
    meal_dinner BOOLEAN NOT NULL DEFAULT FALSE,
    meal_provided_lunch BOOLEAN NOT NULL DEFAULT FALSE,
    is_gh BOOLEAN NOT NULL DEFAULT FALSE,
    is_gh_night BOOLEAN NOT NULL DEFAULT FALSE,
    daytime_activity VARCHAR(50),
    other_welfare_service VARCHAR(100),
    entry_time TIME,
    exit_time TIME,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2-12. external_billing_imports テーブル
CREATE TABLE public.external_billing_imports (
    id SERIAL PRIMARY KEY,
    facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
    target_month VARCHAR(7) NOT NULL,
    resident_name VARCHAR(255) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    amount INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. インデックス作成
-- ============================================================================
CREATE INDEX idx_facilities_organization_id ON public.facilities(organization_id);
CREATE INDEX idx_staffs_organization_id ON public.staffs(organization_id);
CREATE INDEX idx_staffs_facility_id ON public.staffs(facility_id);
CREATE INDEX idx_staffs_auth_user_id ON public.staffs(auth_user_id);
CREATE INDEX idx_staff_facilities_staff_id ON public.staff_facilities(staff_id);
CREATE INDEX idx_staff_facilities_facility_id ON public.staff_facilities(facility_id);
CREATE INDEX idx_residents_facility_id ON public.residents(facility_id);
CREATE INDEX idx_daily_records_facility_date ON public.daily_records(facility_id, date);
CREATE INDEX idx_daily_records_resident_date ON public.daily_records(resident_id, date);
CREATE INDEX idx_daily_shifts_facility_date ON public.daily_shifts(facility_id, date);
CREATE INDEX idx_medical_cooperation_records_facility_date ON public.medical_cooperation_records(facility_id, date);
CREATE INDEX idx_short_stay_records_facility_date ON public.short_stay_records(facility_id, date);
CREATE INDEX idx_external_billing_imports_facility_month ON public.external_billing_imports(facility_id, target_month);

-- ============================================================================
-- 4. updated_at 自動更新トリガー
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_facilities BEFORE UPDATE ON public.facilities FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
CREATE TRIGGER set_updated_at_staffs BEFORE UPDATE ON public.staffs FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
CREATE TRIGGER set_updated_at_residents BEFORE UPDATE ON public.residents FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
CREATE TRIGGER set_updated_at_daily_records BEFORE UPDATE ON public.daily_records FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
CREATE TRIGGER set_updated_at_daily_shifts BEFORE UPDATE ON public.daily_shifts FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
CREATE TRIGGER set_updated_at_medical_coord_v_daily BEFORE UPDATE ON public.medical_coord_v_daily FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
CREATE TRIGGER set_updated_at_medical_cooperation_records BEFORE UPDATE ON public.medical_cooperation_records FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
CREATE TRIGGER set_updated_at_short_stay_records BEFORE UPDATE ON public.short_stay_records FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- ============================================================================
-- 5. 初期シードデータ
-- ============================================================================
INSERT INTO public.qualifications (name, is_medical_coord_iv_target) VALUES
    ('正看護師', TRUE),
    ('准看護師', TRUE),
    ('介護福祉士', FALSE),
    ('社会福祉士', FALSE),
    ('介護支援専門員', FALSE),
    ('理学療法士', FALSE),
    ('作業療法士', FALSE),
    ('言語聴覚士', FALSE),
    ('管理栄養士', FALSE),
    ('栄養士', FALSE);

-- ============================================================================
-- 6. RLSを有効化（全テーブル作成後に実行）
-- ============================================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_coord_v_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_cooperation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.short_stay_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_billing_imports ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. RLSポリシー作成（全テーブル作成後に実行）
-- ============================================================================

-- 7-1. organizations ポリシー
CREATE POLICY "organizations_select_own" ON public.organizations
    FOR SELECT TO authenticated
    USING (id IN (SELECT organization_id FROM public.staffs WHERE auth_user_id = auth.uid()));

-- 7-2. facilities ポリシー
CREATE POLICY "facilities_select_own_org" ON public.facilities
    FOR SELECT TO authenticated
    USING (organization_id IN (SELECT organization_id FROM public.staffs WHERE auth_user_id = auth.uid()));

CREATE POLICY "facilities_insert_admin" ON public.facilities
    FOR INSERT TO authenticated
    WITH CHECK (organization_id IN (SELECT organization_id FROM public.staffs WHERE auth_user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "facilities_update_admin" ON public.facilities
    FOR UPDATE TO authenticated
    USING (organization_id IN (SELECT organization_id FROM public.staffs WHERE auth_user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "facilities_delete_admin" ON public.facilities
    FOR DELETE TO authenticated
    USING (organization_id IN (SELECT organization_id FROM public.staffs WHERE auth_user_id = auth.uid() AND role = 'admin'));

-- 7-3. qualifications ポリシー
CREATE POLICY "qualifications_select_authenticated" ON public.qualifications
    FOR SELECT TO authenticated USING (true);

-- 7-4. staffs ポリシー
-- 循環参照を回避するための SECURITY DEFINER 関数
CREATE OR REPLACE FUNCTION get_my_organization_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT organization_id FROM public.staffs WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- 自分のレコード or 同一組織のスタッフを取得可能
CREATE POLICY "staffs_select_self" ON public.staffs
    FOR SELECT TO authenticated
    USING (auth_user_id = auth.uid());

CREATE POLICY "staffs_select_same_org" ON public.staffs
    FOR SELECT TO authenticated
    USING (organization_id = get_my_organization_id());

CREATE POLICY "staffs_insert_admin_manager" ON public.staffs
    FOR INSERT TO authenticated
    WITH CHECK (organization_id = get_my_organization_id());

CREATE POLICY "staffs_update_admin_manager" ON public.staffs
    FOR UPDATE TO authenticated
    USING (organization_id = get_my_organization_id());

CREATE POLICY "staffs_delete_admin" ON public.staffs
    FOR DELETE TO authenticated
    USING (organization_id = get_my_organization_id());

-- 7-5. staff_facilities ポリシー
CREATE POLICY "staff_facilities_select_own_org" ON public.staff_facilities
    FOR SELECT TO authenticated
    USING (staff_id IN (SELECT id FROM public.staffs WHERE organization_id IN (SELECT organization_id FROM public.staffs WHERE auth_user_id = auth.uid())));

CREATE POLICY "staff_facilities_modify_admin_manager" ON public.staff_facilities
    FOR ALL TO authenticated
    USING (staff_id IN (SELECT id FROM public.staffs WHERE organization_id IN (SELECT organization_id FROM public.staffs WHERE auth_user_id = auth.uid() AND role IN ('admin', 'manager'))));

-- 7-6. residents ポリシー
CREATE POLICY "residents_select_own_org" ON public.residents
    FOR SELECT TO authenticated
    USING (facility_id IN (SELECT id FROM public.facilities WHERE organization_id IN (SELECT organization_id FROM public.staffs WHERE auth_user_id = auth.uid())));

CREATE POLICY "residents_insert_facility_or_admin" ON public.residents
    FOR INSERT TO authenticated
    WITH CHECK (facility_id IN (SELECT id FROM public.facilities WHERE organization_id IN (SELECT organization_id FROM public.staffs WHERE auth_user_id = auth.uid())));

CREATE POLICY "residents_update_facility_or_admin" ON public.residents
    FOR UPDATE TO authenticated
    USING (facility_id IN (SELECT id FROM public.facilities WHERE organization_id IN (SELECT organization_id FROM public.staffs WHERE auth_user_id = auth.uid())));

CREATE POLICY "residents_delete_admin" ON public.residents
    FOR DELETE TO authenticated
    USING (facility_id IN (SELECT id FROM public.facilities WHERE organization_id IN (SELECT organization_id FROM public.staffs WHERE auth_user_id = auth.uid() AND role = 'admin')));

-- 7-7. daily_records ポリシー
CREATE POLICY "daily_records_select_own_org" ON public.daily_records
    FOR SELECT TO authenticated
    USING (facility_id IN (SELECT id FROM public.facilities WHERE organization_id IN (SELECT organization_id FROM public.staffs WHERE auth_user_id = auth.uid())));

CREATE POLICY "daily_records_insert_own_facility" ON public.daily_records
    FOR INSERT TO authenticated
    WITH CHECK (facility_id IN (SELECT id FROM public.facilities WHERE organization_id IN (SELECT organization_id FROM public.staffs WHERE auth_user_id = auth.uid())));

CREATE POLICY "daily_records_update_own_facility" ON public.daily_records
    FOR UPDATE TO authenticated
    USING (facility_id IN (SELECT id FROM public.facilities WHERE organization_id IN (SELECT organization_id FROM public.staffs WHERE auth_user_id = auth.uid())));

CREATE POLICY "daily_records_delete_admin" ON public.daily_records
    FOR DELETE TO authenticated
    USING (facility_id IN (SELECT id FROM public.facilities WHERE organization_id IN (SELECT organization_id FROM public.staffs WHERE auth_user_id = auth.uid() AND role = 'admin')));

-- 7-8. daily_shifts ポリシー
CREATE POLICY "daily_shifts_select_own_org" ON public.daily_shifts
    FOR SELECT TO authenticated
    USING (facility_id IN (SELECT id FROM public.facilities WHERE organization_id IN (SELECT organization_id FROM public.staffs WHERE auth_user_id = auth.uid())));

CREATE POLICY "daily_shifts_modify_own_facility" ON public.daily_shifts
    FOR ALL TO authenticated
    USING (facility_id IN (SELECT id FROM public.facilities WHERE organization_id IN (SELECT organization_id FROM public.staffs WHERE auth_user_id = auth.uid())));

-- 7-9. medical_coord_v_daily ポリシー
CREATE POLICY "medical_coord_v_daily_select_own_org" ON public.medical_coord_v_daily
    FOR SELECT TO authenticated
    USING (facility_id IN (SELECT id FROM public.facilities WHERE organization_id IN (SELECT organization_id FROM public.staffs WHERE auth_user_id = auth.uid())));

CREATE POLICY "medical_coord_v_daily_modify_own_facility" ON public.medical_coord_v_daily
    FOR ALL TO authenticated
    USING (facility_id IN (SELECT id FROM public.facilities WHERE organization_id IN (SELECT organization_id FROM public.staffs WHERE auth_user_id = auth.uid())));

-- 7-10. medical_cooperation_records ポリシー
CREATE POLICY "medical_cooperation_records_select_own_org" ON public.medical_cooperation_records
    FOR SELECT TO authenticated
    USING (facility_id IN (SELECT id FROM public.facilities WHERE organization_id IN (SELECT organization_id FROM public.staffs WHERE auth_user_id = auth.uid())));

CREATE POLICY "medical_cooperation_records_modify_own_facility" ON public.medical_cooperation_records
    FOR ALL TO authenticated
    USING (facility_id IN (SELECT id FROM public.facilities WHERE organization_id IN (SELECT organization_id FROM public.staffs WHERE auth_user_id = auth.uid())));

-- 7-11. short_stay_records ポリシー
CREATE POLICY "short_stay_records_select_own_org" ON public.short_stay_records
    FOR SELECT TO authenticated
    USING (facility_id IN (SELECT id FROM public.facilities WHERE organization_id IN (SELECT organization_id FROM public.staffs WHERE auth_user_id = auth.uid())));

CREATE POLICY "short_stay_records_modify_own_facility" ON public.short_stay_records
    FOR ALL TO authenticated
    USING (facility_id IN (SELECT id FROM public.facilities WHERE organization_id IN (SELECT organization_id FROM public.staffs WHERE auth_user_id = auth.uid())));

-- 7-12. external_billing_imports ポリシー
CREATE POLICY "external_billing_imports_select_own_org" ON public.external_billing_imports
    FOR SELECT TO authenticated
    USING (facility_id IN (SELECT id FROM public.facilities WHERE organization_id IN (SELECT organization_id FROM public.staffs WHERE auth_user_id = auth.uid())));

CREATE POLICY "external_billing_imports_modify_admin" ON public.external_billing_imports
    FOR ALL TO authenticated
    USING (facility_id IN (SELECT id FROM public.facilities WHERE organization_id IN (SELECT organization_id FROM public.staffs WHERE auth_user_id = auth.uid() AND role IN ('admin', 'manager'))));

-- ============================================================================
-- 完了
-- ============================================================================
-- 次のステップ:
-- 1. organizations に法人を作成
-- 2. facilities に施設を作成
-- 3. staffs に初期管理者を作成（auth_user_id を紐付け）
