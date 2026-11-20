-- =========================================================================
-- SWABHIMAN - PRODUCTION-READY DUMMY DATA FOR NEON SQL EDITOR
-- Paste and Run directly in the Neon Console (SQL Editor)
-- =========================================================================

-- 1. Insert New Employers
INSERT INTO accounts (email, name, password, role, demo)
VALUES 
  ('anand.deshmukh@swabhiman.in', 'Anand Deshmukh', '', 'employer', false),
  ('sneha.kulkarni@swabhiman.in', 'Sneha Kulkarni', '', 'employer', false),
  ('vikram.more@swabhiman.in', 'Vikram More', '', 'employer', false)
ON CONFLICT (email) DO NOTHING;

-- 2. Insert New Skilled Workers
INSERT INTO accounts (email, name, password, role, demo)
VALUES 
  ('rajesh.plumbing@swabhiman.in', 'Rajesh Kadam (Master Plumber)', '', 'worker', false),
  ('sunil.electric@swabhiman.in', 'Sunil Gaikwad (Licensed Wireman)', '', 'worker', false),
  ('ganesh.carpentry@swabhiman.in', 'Ganesh Salve (Wood Craftsman)', '', 'worker', false),
  ('sanjay.painter@swabhiman.in', 'Sanjay Jadhav (Interior Finisher)', '', 'worker', false),
  ('balu.masonry@swabhiman.in', 'Balu Chavan (Tile & Mason)', '', 'worker', false),
  ('nitin.helper@swabhiman.in', 'Nitin Pawar (All-Round Helper)', '', 'worker', false)
ON CONFLICT (email) DO NOTHING;

-- 3. Insert Worker Profiles (links dynamically via account email)
INSERT INTO profiles (account, category, area, rate, bio, available, lat, lng)
SELECT a.id, 'plumbing', 'CIDCO', 35000, 
  '12+ years experience in bathroom sanitary fitting, concealed pipeline repair, tap replacements, and water tank overflow fixes.', 
  true, 19.876, 75.368
FROM accounts a WHERE a.email = 'rajesh.plumbing@swabhiman.in'
ON CONFLICT (account) DO UPDATE SET available = true;

INSERT INTO profiles (account, category, area, rate, bio, available, lat, lng)
SELECT a.id, 'electrical', 'Chikalthana', 45000, 
  'PWD Licensed wireman. 3-phase line distribution, MCB tripping issues, LED lighting setups, fan installations, and earthing.', 
  true, 19.871, 75.410
FROM accounts a WHERE a.email = 'sunil.electric@swabhiman.in'
ON CONFLICT (account) DO UPDATE SET available = true;

INSERT INTO profiles (account, category, area, rate, bio, available, lat, lng)
SELECT a.id, 'carpentry', 'Waluj MIDC', 40000, 
  'Specialist in modular kitchen assembly, wooden door repairs, wardrobe sliding tracks, hydraulic hinges, and custom shelves.', 
  true, 19.835, 75.234
FROM accounts a WHERE a.email = 'ganesh.carpentry@swabhiman.in'
ON CONFLICT (account) DO UPDATE SET available = true;

INSERT INTO profiles (account, category, area, rate, bio, available, lat, lng)
SELECT a.id, 'painting', 'Aurangpura', 30000, 
  'Wall putty finishing, water-resistant exterior coating, enamel door painting, and modern interior texture wall painting.', 
  true, 19.888, 75.324
FROM accounts a WHERE a.email = 'sanjay.painter@swabhiman.in'
ON CONFLICT (account) DO UPDATE SET available = true;

INSERT INTO profiles (account, category, area, rate, bio, available, lat, lng)
SELECT a.id, 'masonry', 'Kranti Chowk', 50000, 
  'Granite counter fixing, vitrified tile laying, bathroom waterproofing, wall plaster crack repair, and masonry modifications.', 
  true, 19.874, 75.335
FROM accounts a WHERE a.email = 'balu.masonry@swabhiman.in'
ON CONFLICT (account) DO UPDATE SET available = true;

INSERT INTO profiles (account, category, area, rate, bio, available, lat, lng)
SELECT a.id, 'general', 'Beed Bypass', 25000, 
  'Dependable general labor for loading/unloading, event setup assistance, warehouse inventory stacking, and home clearance.', 
  true, 19.845, 75.362
FROM accounts a WHERE a.email = 'nitin.helper@swabhiman.in'
ON CONFLICT (account) DO UPDATE SET available = true;

-- 4. Approve Verification (Identity & Electrical Trade License)
INSERT INTO verification_cases (account, kind, method, status, provider_result, consent_version, valid_until)
SELECT a.id, 'identity', 'alternative', 'approved', 'passed', '2026-11-v1', now() + interval '2 years'
FROM accounts a 
WHERE a.email IN ('rajesh.plumbing@swabhiman.in','sunil.electric@swabhiman.in','ganesh.carpentry@swabhiman.in','sanjay.painter@swabhiman.in','balu.masonry@swabhiman.in','nitin.helper@swabhiman.in')
ON CONFLICT DO NOTHING;

-- Electrical Trade License for Sunil
INSERT INTO verification_cases (account, kind, method, status, provider_result, consent_version, valid_until)
SELECT a.id, 'electrical-license', 'trade', 'approved', 'passed', '2026-11-v1', now() + interval '2 years'
FROM accounts a 
WHERE a.email = 'sunil.electric@swabhiman.in'
ON CONFLICT DO NOTHING;

-- Credentials table for demo compatibility
INSERT INTO credentials (account, kind, method, reference, verified_at)
SELECT a.id, 'identity', 'alternative', 'seed', now()
FROM accounts a 
WHERE a.email IN ('rajesh.plumbing@swabhiman.in','sunil.electric@swabhiman.in','ganesh.carpentry@swabhiman.in','sanjay.painter@swabhiman.in','balu.masonry@swabhiman.in','nitin.helper@swabhiman.in')
ON CONFLICT DO NOTHING;

INSERT INTO credentials (account, kind, method, reference, verified_at)
SELECT a.id, 'electrical-license', 'trade', 'seed', now()
FROM accounts a 
WHERE a.email = 'sunil.electric@swabhiman.in'
ON CONFLICT DO NOTHING;

-- 5. Insert Realistic Active Job Listings (with future start dates)
INSERT INTO jobs (employer, title, category, area, description, amount, starts, hours, lat, lng)
SELECT a.id, 
  'Bathroom flush tank valve repair & tap dripping', 'plumbing', 'CIDCO', 
  'Concealed flush tank water runs continuously. Need to replace inlet ball valve and washer on washbasin tap. Please bring spare washers.', 
  70000, now() + interval '2 days', 2, 19.878, 75.367
FROM accounts a WHERE a.email = 'anand.deshmukh@swabhiman.in'
ON CONFLICT DO NOTHING;

INSERT INTO jobs (employer, title, category, area, description, amount, starts, hours, lat, lng)
SELECT a.id, 
  'Submersible motor starter panel rewire', 'electrical', 'Chikalthana', 
  'Water pump starter contactor is humming loudly and trips MCB. Need an electrician to inspect capacitor and test line voltage.', 
  150000, now() + interval '3 days', 3, 19.872, 75.415
FROM accounts a WHERE a.email = 'sneha.kulkarni@swabhiman.in'
ON CONFLICT DO NOTHING;

INSERT INTO jobs (employer, title, category, area, description, amount, starts, hours, lat, lng)
SELECT a.id, 
  'Main entrance teak door hinge & lock replacement', 'carpentry', 'Waluj MIDC', 
  'Main door is sagging and scraping against tiles. Need to install heavy brass hinges and replace Godrej lock cylinder.', 
  180000, now() + interval '2 days', 4, 19.839, 75.238
FROM accounts a WHERE a.email = 'vikram.more@swabhiman.in'
ON CONFLICT DO NOTHING;

INSERT INTO jobs (employer, title, category, area, description, amount, starts, hours, lat, lng)
SELECT a.id, 
  'Waterproof coating & touch up on balcony ceiling', 'painting', 'Aurangpura', 
  'Damp patch caused by monsoon leakage on balcony ceiling. Scrape peeling flakes, apply Dr. Fixit coat, and paint with white exterior paint.', 
  110000, now() + interval '4 days', 3, 19.885, 75.321
FROM accounts a WHERE a.email = 'anand.deshmukh@swabhiman.in'
ON CONFLICT DO NOTHING;

INSERT INTO jobs (employer, title, category, area, description, amount, starts, hours, lat, lng)
SELECT a.id, 
  'Kitchen backsplash tile alignment and wall repair', 'masonry', 'Kranti Chowk', 
  'Six 30x60 cm wall tiles above kitchen platform fell off during plumbing work. Clean old adhesive and re-affix with tile bond.', 
  140000, now() + interval '5 days', 4, 19.871, 75.333
FROM accounts a WHERE a.email = 'sneha.kulkarni@swabhiman.in'
ON CONFLICT DO NOTHING;

INSERT INTO jobs (employer, title, category, area, description, amount, starts, hours, lat, lng)
SELECT a.id, 
  'Store room clearance & shifting 15 heavy boxes', 'general', 'Beed Bypass', 
  'Need 1 helper for 2 hours to clear old cartons, metal trunk, and spare tyres from store room to ground floor garage.', 
  60000, now() + interval '1 day', 2, 19.849, 75.361
FROM accounts a WHERE a.email = 'vikram.more@swabhiman.in'
ON CONFLICT DO NOTHING;
