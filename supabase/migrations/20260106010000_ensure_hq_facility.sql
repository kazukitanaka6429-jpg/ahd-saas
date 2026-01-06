-- Ensure HQ facility exists and is named '本社'
INSERT INTO facilities (name, code)
VALUES ('本社', 'HQ001')
ON CONFLICT (code) 
DO UPDATE SET name = '本社';
