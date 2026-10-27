-- ============================================================
-- School Clinic Management System — MySQL schema
-- Import this in phpMyAdmin (or via mysql CLI) BEFORE using the app.
-- ============================================================

CREATE DATABASE IF NOT EXISTS school_clinic
  CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

USE school_clinic;

-- ---------- USERS (admin / teacher / clinic) ----------
CREATE TABLE IF NOT EXISTS users (
  id        VARCHAR(40)  PRIMARY KEY,
  name      VARCHAR(150) NOT NULL,
  username  VARCHAR(100) NOT NULL UNIQUE,
  password  VARCHAR(255) NOT NULL,
  role      VARCHAR(20)  NOT NULL,          -- admin | teacher | clinic
  active    TINYINT(1)   NOT NULL DEFAULT 1,
  grade     VARCHAR(50)  NULL,
  section   VARCHAR(50)  NULL
) ENGINE=InnoDB;

-- ---------- STUDENTS ----------
CREATE TABLE IF NOT EXISTS students (
  id          VARCHAR(40)  PRIMARY KEY,      -- e.g. MES-0001
  name        VARCHAR(150) NOT NULL,
  age         INT          NULL,
  sex         VARCHAR(10)  NULL,
  grade       VARCHAR(50)  NULL,
  section     VARCHAR(50)  NULL,
  adviser_id  VARCHAR(40)  NULL,
  FOREIGN KEY (adviser_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------- DAILY HEALTH CHECKS ----------
CREATE TABLE IF NOT EXISTS daily_checks (
  id           VARCHAR(40)   PRIMARY KEY,
  student_id   VARCHAR(40)   NOT NULL,
  date         DATE          NOT NULL,
  time         VARCHAR(10)   NULL,
  temperature  DECIMAL(4,1)  NULL,
  symptoms     TEXT          NULL,
  remarks      TEXT          NULL,
  teacher_id   VARCHAR(40)   NULL,
  status       VARCHAR(30)   NULL,           -- Recorded | Referred | Returned
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------- BMI / NUTRITIONAL STATUS RECORDS ----------
CREATE TABLE IF NOT EXISTS bmi_records (
  id           VARCHAR(40)   PRIMARY KEY,
  student_id   VARCHAR(40)   NOT NULL,
  school_year  VARCHAR(20)   NULL,
  period       VARCHAR(20)   NULL,           -- Beginning | Middle | End
  height       DECIMAL(6,2)  NULL,
  weight       DECIMAL(6,2)  NULL,
  bmi          DECIMAL(5,2)  NULL,
  status       VARCHAR(30)   NULL,
  date         DATE          NULL,
  teacher_id   VARCHAR(40)   NULL,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------- REFERRALS (teacher -> clinic) ----------
CREATE TABLE IF NOT EXISTS referrals (
  id          VARCHAR(40)  PRIMARY KEY,
  daily_id    VARCHAR(40)  NULL,
  student_id  VARCHAR(40)  NOT NULL,
  teacher_id  VARCHAR(40)  NULL,
  date        DATE         NULL,
  status      VARCHAR(30)  NULL,             -- Pending | Reviewed | Returned
  FOREIGN KEY (daily_id)   REFERENCES daily_checks(id) ON DELETE SET NULL,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------- CLINIC ASSESSMENTS ----------
CREATE TABLE IF NOT EXISTS assessments (
  id           VARCHAR(40)  PRIMARY KEY,
  referral_id  VARCHAR(40)  NOT NULL,
  nurse_id     VARCHAR(40)  NULL,
  date         DATE         NULL,
  time         VARCHAR(10)  NULL,
  vital_temp   DECIMAL(4,1) NULL,
  findings     TEXT         NULL,
  treatment    TEXT         NULL,
  notes        TEXT         NULL,
  disposition  VARCHAR(40)  NULL,            -- Return to Class | Under Observation | Send Home | Refer to RHU/Hospital
  FOREIGN KEY (referral_id) REFERENCES referrals(id) ON DELETE CASCADE,
  FOREIGN KEY (nurse_id)    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------- SEND-HOME / RECOMMENDATION FORMS ----------
CREATE TABLE IF NOT EXISTS recommendations (
  id             VARCHAR(40)  PRIMARY KEY,
  referral_id    VARCHAR(40)  NOT NULL,
  reason         TEXT         NULL,
  condition_text TEXT         NULL,
  instructions   TEXT         NULL,
  return_note    TEXT         NULL,
  created_date   DATE         NULL,
  nurse_id       VARCHAR(40)  NULL,
  FOREIGN KEY (referral_id) REFERENCES referrals(id) ON DELETE CASCADE,
  FOREIGN KEY (nurse_id)    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------- MEDICINE INVENTORY ----------
CREATE TABLE IF NOT EXISTS medicines (
  id       VARCHAR(40)  PRIMARY KEY,
  name     VARCHAR(150) NOT NULL,
  purpose  VARCHAR(255) NULL,
  stock    INT          NOT NULL DEFAULT 0
) ENGINE=InnoDB;

-- ---------- MEDICINE DISPENSE LOG ----------
CREATE TABLE IF NOT EXISTS medicine_logs (
  id             VARCHAR(40)  PRIMARY KEY,
  assessment_id  VARCHAR(40)  NOT NULL,
  medicine_id    VARCHAR(40)  NULL,
  medicine_name  VARCHAR(150) NULL,
  dosage         VARCHAR(100) NULL,
  time_given     VARCHAR(10)  NULL,
  remarks        TEXT         NULL,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  FOREIGN KEY (medicine_id)   REFERENCES medicines(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------- NOTIFICATIONS (to teachers) ----------
CREATE TABLE IF NOT EXISTS notifications (
  id          VARCHAR(40)  PRIMARY KEY,
  teacher_id  VARCHAR(40)  NULL,
  type        VARCHAR(40)  NULL,
  message     TEXT         NULL,
  date        DATE         NULL,
  is_read     TINYINT(1)   NOT NULL DEFAULT 0,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- SYSTEM ACTIVITY LOG ----------
CREATE TABLE IF NOT EXISTS activity_logs (
  id         VARCHAR(40)  PRIMARY KEY,
  date       DATE         NULL,
  time       VARCHAR(10)  NULL,
  user_name  VARCHAR(150) NULL,
  action     VARCHAR(255) NULL
) ENGINE=InnoDB;

-- ---------- SCHOOL YEAR SETTINGS (single row) ----------
CREATE TABLE IF NOT EXISTS settings (
  id            INT PRIMARY KEY DEFAULT 1,
  school_year   VARCHAR(20) NOT NULL,
  school_years  TEXT        NOT NULL         -- JSON array of strings, e.g. ["2025-2026"]
) ENGINE=InnoDB;
