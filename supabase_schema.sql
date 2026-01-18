-- SQL Migration for Supabase (Case-Sensitive fix)
-- Run this in the Supabase SQL Editor: https://app.supabase.com/project/ovvbatorquhewhqxbewv/sql

-- 1. DROP old tables (Caution: this deletes data)
DROP TABLE IF EXISTS evidence;
DROP TABLE IF EXISTS logs;
DROP TABLE IF EXISTS records;

-- 2. Create Tables with quoted identifiers for CamelCase
CREATE TABLE records (
  id TEXT PRIMARY KEY,
  "detaineeName" TEXT,
  age INTEGER,
  gender TEXT,
  "dateTimeDetained" TEXT,
  location TEXT,
  reason TEXT,
  status TEXT,
  "policeStation" TEXT,
  "officerInCharge" TEXT,
  "riskLevel" TEXT,
  "isArchived" BOOLEAN DEFAULT FALSE
);

CREATE TABLE logs (
  id TEXT PRIMARY KEY,
  "recordId" TEXT REFERENCES records(id) ON DELETE CASCADE,
  timestamp TEXT,
  action TEXT,
  "performedBy" TEXT,
  notes TEXT,
  "isInternal" BOOLEAN DEFAULT FALSE
);

CREATE TABLE evidence (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "recordId" TEXT REFERENCES records(id) ON DELETE CASCADE,
  filename TEXT,
  type TEXT -- 'MEDICAL' or 'EVIDENCE'
);

-- 3. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE records;
ALTER PUBLICATION supabase_realtime ADD TABLE logs;
ALTER PUBLICATION supabase_realtime ADD TABLE evidence;

-- 4. Set up RLS
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow Public Access" ON records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow Public Access" ON logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow Public Access" ON evidence FOR ALL USING (true) WITH CHECK (true);

-- 5. Initial Seed Data
INSERT INTO records (id, "detaineeName", age, gender, "dateTimeDetained", location, reason, status, "policeStation", "officerInCharge", "riskLevel", "isArchived")
VALUES ('CASE-8821-B', 'John Doe', 32, 'Male', '2026-01-18T10:00:00Z', 'Central Park', 'Loitering without permit', 'Detained', 'Precinct 5', 'Officer Smith', 'Low', false);

INSERT INTO logs (id, "recordId", timestamp, action, "performedBy", notes, "isInternal")
VALUES ('init-1', 'CASE-8821-B', '2026-01-18T10:05:00Z', 'Intake Protocol Initialized', 'Officer Smith', 'Subject admitted to holding cell 4', false);
