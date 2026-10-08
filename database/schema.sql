CREATE SCHEMA IF NOT EXISTS student_attendance;
SET search_path TO student_attendance, public;

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(80) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(160) NOT NULL,
  role VARCHAR(10) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_users_username UNIQUE (username),
  CONSTRAINT user_role CHECK (role IN ('admin', 'teacher'))
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

CREATE TABLE IF NOT EXISTS classes (
  id BIGSERIAL PRIMARY KEY,
  class_name VARCHAR(100) NOT NULL,
  grade SMALLINT NOT NULL,
  section VARCHAR(20) NOT NULL,
  academic_year VARCHAR(9) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_classes_grade_section_year UNIQUE (grade, section, academic_year),
  CONSTRAINT chk_classes_grade CHECK (grade BETWEEN 1 AND 12)
);

CREATE INDEX IF NOT EXISTS idx_classes_name ON classes (class_name);

CREATE TABLE IF NOT EXISTS students (
  id BIGSERIAL PRIMARY KEY,
  student_code VARCHAR(40) NOT NULL,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  gender VARCHAR(10) NOT NULL,
  date_of_birth DATE NULL,
  phone VARCHAR(30) NULL,
  email VARCHAR(254) NULL,
  address TEXT NULL,
  photo VARCHAR(512) NULL,
  class_id BIGINT NOT NULL,
  status VARCHAR(8) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_students_student_code UNIQUE (student_code),
  CONSTRAINT uq_students_email UNIQUE (email),
  CONSTRAINT student_gender CHECK (gender IN ('male', 'female', 'other')),
  CONSTRAINT student_status CHECK (status IN ('active', 'inactive')),
  CONSTRAINT fk_students_class FOREIGN KEY (class_id) REFERENCES classes (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_students_class_status ON students (class_id, status);
CREATE INDEX IF NOT EXISTS idx_students_name ON students (last_name, first_name);

CREATE TABLE IF NOT EXISTS face_encodings (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL,
  encoding_data JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_face_encodings_student FOREIGN KEY (student_id) REFERENCES students (id)
    ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_face_encodings_student ON face_encodings (student_id);

CREATE TABLE IF NOT EXISTS attendance (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL,
  attendance_date DATE NOT NULL,
  check_in_time TIME NULL,
  check_out_time TIME NULL,
  status VARCHAR(7) NOT NULL,
  confidence NUMERIC(5, 2) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_attendance_student_date UNIQUE (student_id, attendance_date),
  CONSTRAINT attendance_status CHECK (status IN ('present', 'absent', 'late')),
  CONSTRAINT chk_attendance_confidence CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 100),
  CONSTRAINT fk_attendance_student FOREIGN KEY (student_id) REFERENCES students (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_attendance_date_status ON attendance (attendance_date, status);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_students_updated_at ON students;
CREATE TRIGGER trg_students_updated_at BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_face_encodings_updated_at ON face_encodings;
CREATE TRIGGER trg_face_encodings_updated_at BEFORE UPDATE ON face_encodings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
