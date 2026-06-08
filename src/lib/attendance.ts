// src/lib/attendance.ts
// Helper utilities to normalize attendance rows and support both
// `santri_id` and legacy `student_id` column names.

export function normalizeAttendanceRow(row: any) {
  if (!row || typeof row !== 'object') {
    return row;
  }

  const id = row.santri_id ?? row.student_id;
  return {
    ...row,
    santri_id: id,
    student_id: id,
  };
}

export function normalizeAttendanceRows(rows: any[] | null | undefined) {
  return (rows ?? []).map(normalizeAttendanceRow);
}

function isColumnDoesNotExistError(error: any, column: string) {
  const message = String(error?.message ?? '').toLowerCase();
  const normalizedColumn = column.toLowerCase();
  const regex = new RegExp(
    `column\\s+(?:\\"[^\\"]+\\"\\.)?(?:\\"${normalizedColumn}\\"|(?:[^.\\s]+\\.)?${normalizedColumn})\\s+does not exist`
  );
  return regex.test(message);
}

export function isMissingSantriIdError(error: any) {
  return isColumnDoesNotExistError(error, 'santri_id');
}

export function isMissingStudentIdError(error: any) {
  return isColumnDoesNotExistError(error, 'student_id');
}

export async function queryAttendanceByStudent(
  supabase: any,
  studentId: string,
  dateFrom?: string,
  dateTo?: string
) {
  const buildQuery = (column: string) => {
    let query = supabase.from('attendances').select('*').eq(column, studentId);
    if (dateFrom) query = query.gte('date', dateFrom);
    if (dateTo) query = query.lte('date', dateTo);
    return query.order('date', { ascending: false });
  };

  let result = await buildQuery('santri_id');
  if (!result.error || !isMissingSantriIdError(result.error)) {
    return { data: normalizeAttendanceRows(result.data), error: result.error };
  }

  result = await buildQuery('student_id');
  return { data: normalizeAttendanceRows(result.data), error: result.error };
}

export async function queryAttendanceByStudentMaybeSingle(
  supabase: any,
  studentId: string,
  date: string
) {
  const buildQuery = (column: string) =>
    supabase.from('attendances').select('id').eq(column, studentId).eq('date', date).maybeSingle();

  let result = await buildQuery('santri_id');
  if (!result.error || !isMissingSantriIdError(result.error)) {
    return { data: result.data, error: result.error };
  }

  result = await buildQuery('student_id');
  return { data: result.data, error: result.error };
}

export async function insertAttendanceRecord(
  supabase: any,
  studentId: string,
  date: string,
  status: string
) {
  const firstAttempt = await supabase.from('attendances').insert({
    santri_id: studentId,
    date,
    status,
  });
  if (!firstAttempt.error || !isMissingSantriIdError(firstAttempt.error)) {
    return firstAttempt;
  }

  return supabase.from('attendances').insert({
    student_id: studentId,
    date,
    status,
  });
}
