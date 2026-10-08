SET search_path TO student_attendance, public;

INSERT INTO users (username, password_hash, full_name, role)
VALUES
  (
    'admin',
    'pbkdf2_sha256$600000$6cba97ec06b4f51e26774c5058936648$af509d460f606ec7b3e9af6e74d003fb2abae89a01e55ab6d623a8ca7d87ed23',
    'អ្នកគ្រប់គ្រងប្រព័ន្ធ',
    'admin'
  ),
  (
    'teacher1',
    'pbkdf2_sha256$600000$ac84c8951bdf0aa6b3636df38b0a3dea$3358ea32ac36e942259576d6ae8105553a1277c0d4f1c032d0062db3f98118e4',
    'គ្រូគំរូ',
    'teacher'
  )
ON CONFLICT (username) DO NOTHING;

INSERT INTO classes (class_name, grade, section, academic_year)
VALUES
  ('ថ្នាក់ទី ១០A', 10, 'A', '2026-2027'),
  ('ថ្នាក់ទី ១១A', 11, 'A', '2026-2027'),
  ('ថ្នាក់ទី ១២A', 12, 'A', '2026-2027')
ON CONFLICT (grade, section, academic_year)
DO UPDATE SET class_name = EXCLUDED.class_name;

INSERT INTO students (
  student_code, first_name, last_name, gender, date_of_birth,
  phone, email, address, class_id, status
)
VALUES
  ('ST001', 'ដារ៉ា', 'សុខ', 'male', '2010-02-14', '012000001', 'st001@example.invalid', 'ភ្នំពេញ', (SELECT id FROM classes WHERE grade = 10 AND section = 'A' AND academic_year = '2026-2027'), 'active'),
  ('ST002', 'វណ្ណា', 'ចាន់', 'female', '2010-05-21', '012000002', 'st002@example.invalid', 'ភ្នំពេញ', (SELECT id FROM classes WHERE grade = 10 AND section = 'A' AND academic_year = '2026-2027'), 'active'),
  ('ST003', 'មុនី', 'ហេង', 'male', '2010-08-09', '012000003', 'st003@example.invalid', 'កណ្ដាល', (SELECT id FROM classes WHERE grade = 10 AND section = 'A' AND academic_year = '2026-2027'), 'active'),
  ('ST004', 'ពៅ', 'ស្រី', 'female', '2010-11-03', '012000004', 'st004@example.invalid', 'ភ្នំពេញ', (SELECT id FROM classes WHERE grade = 10 AND section = 'A' AND academic_year = '2026-2027'), 'active'),
  ('ST005', 'សុភា', 'គឹម', 'female', '2009-01-18', '012000005', 'st005@example.invalid', 'កណ្ដាល', (SELECT id FROM classes WHERE grade = 11 AND section = 'A' AND academic_year = '2026-2027'), 'active'),
  ('ST006', 'វិចិត្រ', 'ឡេង', 'male', '2009-04-26', '012000006', 'st006@example.invalid', 'ភ្នំពេញ', (SELECT id FROM classes WHERE grade = 11 AND section = 'A' AND academic_year = '2026-2027'), 'active'),
  ('ST007', 'រតនា', 'សេង', 'male', '2009-09-12', '012000007', 'st007@example.invalid', 'កណ្ដាល', (SELECT id FROM classes WHERE grade = 11 AND section = 'A' AND academic_year = '2026-2027'), 'active'),
  ('ST008', 'សុវណ្ណា', 'នី', 'female', '2008-03-30', '012000008', 'st008@example.invalid', 'ភ្នំពេញ', (SELECT id FROM classes WHERE grade = 12 AND section = 'A' AND academic_year = '2026-2027'), 'active'),
  ('ST009', 'ដារ៉ា', 'យ៉េង', 'male', '2008-07-07', '012000009', 'st009@example.invalid', 'កណ្ដាល', (SELECT id FROM classes WHERE grade = 12 AND section = 'A' AND academic_year = '2026-2027'), 'active'),
  ('ST010', 'ស្រី', 'ផល្លា', 'female', '2008-12-19', '012000010', 'st010@example.invalid', 'ភ្នំពេញ', (SELECT id FROM classes WHERE grade = 12 AND section = 'A' AND academic_year = '2026-2027'), 'active')
ON CONFLICT (student_code)
DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  gender = EXCLUDED.gender,
  class_id = EXCLUDED.class_id,
  status = EXCLUDED.status;

INSERT INTO attendance (
  student_id, attendance_date, check_in_time, status, confidence
)
SELECT
  students.id,
  CURRENT_DATE,
  sample.check_in_time,
  sample.status,
  sample.confidence
FROM (VALUES
  ('ST001', TIME '07:35:00', 'present', 98.40),
  ('ST002', TIME '07:42:00', 'present', 97.80),
  ('ST003', TIME '07:51:00', 'present', 96.20),
  ('ST004', TIME '08:12:00', 'late', 95.70),
  ('ST005', TIME '07:48:00', 'present', 98.10),
  ('ST006', TIME '08:06:00', 'late', 94.90),
  ('ST007', TIME '07:56:00', 'present', 96.80),
  ('ST008', TIME '07:39:00', 'present', 97.40),
  ('ST009', NULL::TIME, 'absent', NULL::NUMERIC),
  ('ST010', NULL::TIME, 'absent', NULL::NUMERIC)
) AS sample(student_code, check_in_time, status, confidence)
JOIN students ON students.student_code = sample.student_code
ON CONFLICT (student_id, attendance_date)
DO UPDATE SET
  check_in_time = EXCLUDED.check_in_time,
  status = EXCLUDED.status,
  confidence = EXCLUDED.confidence;
