-- Create sample facility
INSERT INTO facilities (id, name, code)
VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'ひまわりケアセンター', 'HIMAWARI_001'),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'さくら介護ステーション', 'SAKURA_002')
ON CONFLICT DO NOTHING;

-- Create sample staffs
INSERT INTO staffs (id, facility_id, name, role, status)
VALUES
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '管理者 太郎', 'manager', 'active'),
  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '介護 花子', 'staff', 'active')
ON CONFLICT DO NOTHING;

-- Create sample residents
INSERT INTO residents (id, facility_id, name, care_level, status, start_date)
VALUES
  ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '田中 トメ', '要介護3', 'in_facility', '2023-04-01'),
  ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '鈴木 一郎', '要介護1', 'in_facility', '2023-05-15')
ON CONFLICT DO NOTHING;
