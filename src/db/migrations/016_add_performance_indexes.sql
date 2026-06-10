-- 016_add_performance_indexes.sql
-- Composite indexes untuk meningkatkan performa query

-- Attendances: query filter by student_id + date (scan, today, bulanan)
CREATE INDEX IF NOT EXISTS idx_attendances_student_date
  ON attendances(student_id, date);

-- Attendances: composite untuk monitoring (status + date)
CREATE INDEX IF NOT EXISTS idx_attendances_status_date
  ON attendances(status, date);

-- Hafalan: query filter by student_id + tanggal (list, export)
CREATE INDEX IF NOT EXISTS idx_hafalan_student_tanggal
  ON hafalan(student_id, tanggal);

-- Tahsin: query filter by student_id + tanggal (list)
CREATE INDEX IF NOT EXISTS idx_tahsin_student_tanggal
  ON tahsin(student_id, tanggal);

-- Santri: QR code lookup untuk absensi scan
CREATE INDEX IF NOT EXISTS idx_santri_qr_code
  ON santri(qr_code);

-- Santri: class_id + status untuk kelas/list count query
CREATE INDEX IF NOT EXISTS idx_santri_class_status
  ON santri(class_id, status);

-- Santri: assigned_teacher_id + status untuk teacher filtering
CREATE INDEX IF NOT EXISTS idx_santri_teacher_status
  ON santri(assigned_teacher_id, status);
