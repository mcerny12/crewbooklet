-- ============================================================
-- Migration: DB-driven job types
-- Run in Supabase Dashboard → SQL Editor
-- Requires migration-roles.sql to have been run first
-- ============================================================

CREATE TABLE IF NOT EXISTS job_types (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  category   TEXT NOT NULL,
  sort_order INT  NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE job_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_job_types"  ON job_types;
DROP POLICY IF EXISTS "admin_insert_job_types"        ON job_types;
DROP POLICY IF EXISTS "admin_update_job_types"        ON job_types;
DROP POLICY IF EXISTS "admin_delete_job_types"        ON job_types;

-- All authenticated users can read
CREATE POLICY "authenticated_read_job_types" ON job_types
  FOR SELECT TO authenticated USING (true);

-- Only admins can write
CREATE POLICY "admin_insert_job_types" ON job_types
  FOR INSERT TO authenticated WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "admin_update_job_types" ON job_types
  FOR UPDATE TO authenticated USING (get_my_role() = 'admin');

CREATE POLICY "admin_delete_job_types" ON job_types
  FOR DELETE TO authenticated USING (get_my_role() = 'admin');

-- ── Seed: all existing job types ──────────────────────────────
INSERT INTO job_types (name, category, sort_order) VALUES
  -- Production
  ('Executive Producer',      'Production',      1),
  ('Producer',                'Production',      2),
  ('Line Producer',           'Production',      3),
  ('Production Coordinator',  'Production',      4),
  ('Production Assistant',    'Production',      5),
  ('Production Manager',      'Production',      6),
  ('Location Manager',        'Production',      7),
  ('Location Scout',          'Production',      8),
  -- Direction
  ('Director',                'Direction',       10),
  ('1st AD',                  'Direction',       11),
  ('2nd AD',                  'Direction',       12),
  ('3rd AD',                  'Direction',       13),
  ('Script Supervisor',       'Direction',       14),
  -- Camera
  ('Photographer',            'Camera',          20),
  ('Photographers Assistant', 'Camera',          21),
  ('Digital Operator',        'Camera',          22),
  ('1st AC',                  'Camera',          23),
  ('2nd AC',                  'Camera',          24),
  ('DIT',                     'Camera',          25),
  ('Camera Operator',         'Camera',          26),
  ('Steadicam Operator',      'Camera',          27),
  -- Sound
  ('VTR',                     'Sound',           30),
  ('Sound Mixer',             'Sound',           31),
  ('Boom Operator',           'Sound',           32),
  ('Sound Assistant',         'Sound',           33),
  -- Lighting
  ('Gaffer',                  'Lighting',        40),
  ('Electrician',             'Lighting',        41),
  ('Best Boy',                'Lighting',        42),
  ('Lighting Technician',     'Lighting',        43),
  -- Grip
  ('Grip',                    'Grip',            50),
  ('Key Grip',                'Grip',            51),
  ('Dolly Grip',              'Grip',            52),
  -- Art Department
  ('Production Designer',     'Art Department',  60),
  ('Art Director',            'Art Department',  61),
  ('Set Decorator',           'Art Department',  62),
  ('Prop Master',             'Art Department',  63),
  -- Hair & Makeup
  ('Makeup Artist',           'Hair & Makeup',   70),
  ('Hair Stylist',            'Hair & Makeup',   71),
  ('Special Effects Makeup',  'Hair & Makeup',   72),
  -- Wardrobe
  ('Costume Designer',        'Wardrobe',        80),
  ('Wardrobe Stylist',        'Wardrobe',        81),
  ('Wardrobe Assistant',      'Wardrobe',        82),
  -- Post-Production
  ('Editor',                  'Post-Production', 90),
  ('Assistant Editor',        'Post-Production', 91),
  ('Colorist',                'Post-Production', 92),
  ('VFX Supervisor',          'Post-Production', 93),
  ('VFX Artist',              'Post-Production', 94),
  ('Motion Graphics Designer','Post-Production', 95),
  -- Other
  ('Casting Director',        'Other',           100),
  ('Choreographer',           'Other',           101),
  ('Stunt Coordinator',       'Other',           102),
  ('Animal Handler',          'Other',           103),
  ('Medic',                   'Other',           104),
  ('Security',                'Other',           105),
  ('Driver',                  'Other',           106),
  ('Catering',                'Other',           107)
ON CONFLICT (name) DO NOTHING;
