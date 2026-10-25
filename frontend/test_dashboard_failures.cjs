const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const app = { innerHTML: '', addEventListener() {} };
const toastRoot = { append() {} };
const document = {
  getElementById(id) { return id === 'app' ? app : id === 'toast-root' ? toastRoot : null; },
  addEventListener() {},
};
const window = { addEventListener() {} };
const student = {
  student_id: 11, roll_no: 'CG-11', full_name: 'Student Eleven', email: 'student@example.test',
  phone: null, date_of_birth: null, department: 'CSE', graduation_year: 2027, cgpa: 8.5,
};

async function fakeFetch(url) {
  let payload;
  let status = 200;
  if (url.endsWith('/api/auth/session')) {
    payload = { success: true, data: { authenticated: true, role: 'student', user_id: 11, display_name: student.full_name, csrf_token: 'test-token' } };
  } else if (url.endsWith('/api/students/11')) {
    payload = { success: true, data: student };
  } else {
    status = 503;
    payload = { success: false, data: null, error: { code: 'database_unavailable', message: 'Test API failure' } };
  }
  return { ok: status >= 200 && status < 300, status, async json() { return payload; } };
}

async function main() {
  const source = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
  const context = { document, window, location: { hash: '' }, fetch: fakeFetch, console, setTimeout, clearTimeout };
  vm.runInNewContext(source, context, { filename: 'frontend/app.js' });
  for (let attempt = 0; attempt < 30 && !app.innerHTML.includes('Some dashboard data is unavailable'); attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.match(app.innerHTML, /Some dashboard data is unavailable/);
  assert.match(app.innerHTML, /Applications unavailable/);
  assert.match(app.innerHTML, /data-action="refresh">Retry/);
  assert.match(app.innerHTML, /Applications sent<\/span>[\s\S]*?class="stat-value">—/);
  assert.doesNotMatch(app.innerHTML, /Your story starts here/);
  process.stdout.write('Frontend dashboard API failure test passed.\n');
}

main().catch((error) => { process.stderr.write(`${error.stack}\n`); process.exitCode = 1; });
