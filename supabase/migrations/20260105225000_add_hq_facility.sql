-- Add HQ facility
INSERT INTO facilities (name, code)
VALUES ('株式会社Infrared', 'HQ001')
ON CONFLICT (code) DO NOTHING;
