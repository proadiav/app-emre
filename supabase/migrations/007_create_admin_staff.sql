-- Create admin staff record for adiavdic@outlook.com
INSERT INTO staff (id, email, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE email = 'adiavdic@outlook.com'
ON CONFLICT (id) DO NOTHING;
