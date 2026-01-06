-- Rename HQ facility to '本社'
UPDATE facilities 
SET name = '本社' 
WHERE code = 'HQ001';
