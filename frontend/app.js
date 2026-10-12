/* CareerGrid frontend — plain JavaScript and same-origin Flask API calls. */
(() => {
  'use strict';

  const API = '/api';
  const app = document.getElementById('app');
  const toastRoot = document.getElementById('toast-root');
  const state = {
    role: sessionStorage.getItem('cgRole') || '',
    studentId: sessionStorage.getItem('cgStudentId') || '',
    adminId: sessionStorage.getItem('cgAdminId') || '',
    student: null,
    applicationFilter: 'All',
    opportunityFilters: { search: '', type: '', location: '', eligible: '' },
    accessRole: 'student',
    requestNumber: 0,
  };

  const icon = (name, extra = '') => `<svg class="icon ${extra}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const initials = (value) => String(value || '?').trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const titleCase = (value) => String(value || '').replace(/\b\w/g, (letter) => letter.toUpperCase());
  const money = (value, currency = 'INR') => value == null ? 'Not disclosed' : new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(value));
  const dateFormat = (value, options = { day: 'numeric', month: 'short', year: 'numeric' }) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('en-IN', options).format(date);
  };
  const interviewDate = (value) => {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
    return match
      ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), Number(match[6] || 0))
      : new Date(value);
  };
  const timeFormat = (value) => {
    const date = interviewDate(value);
    return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(date);
  };
  const safeWebsite = (value) => {
    if (!value) return '';
    try { const parsed = new URL(value); return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : ''; }
    catch { return ''; }
  };
  const daysLeft = (value) => {
    const days = Math.ceil((new Date(value).getTime() - Date.now()) / 86400000);
    return days < 0 ? 'Closed' : days === 0 ? 'Closes today' : `${days} day${days === 1 ? '' : 's'} left`;
  };
  const badgeClass = (status) => {
    if (['Selected', 'Accepted', 'Joined', 'Passed', 'Open'].includes(status)) return 'green';
    if (['Rejected', 'Withdrawn', 'Failed', 'No Show', 'Cancelled'].includes(status)) return 'red';
    if (['Interview', 'Under Review', 'Shortlisted', 'Offer Pending', 'Draft', 'Closed'].includes(status)) return 'amber';
    return 'blue';
  };
  const badge = (status) => `<span class="badge ${badgeClass(status)}">${esc(status || 'Pending')}</span>`;
  const dateTimeInput = (value) => String(value || '').replace(' ', 'T').slice(0, 19);

  async function api(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) },
    });
    let result;
    try { result = await response.json(); } catch { throw new Error(`The server returned an unreadable response (${response.status}).`); }
    if (!response.ok || result.success !== true) {
      const error = new Error(result?.error?.message || `Request failed (${response.status}).`);
      error.status = response.status;
      error.code = result?.error?.code;
      throw error;
    }
    return result.data;
  }

  function toast(message, type = 'success') {
    const node = document.createElement('div');
    node.className = `toast ${type === 'error' ? 'error' : type === 'info' ? 'info' : ''}`;
    node.innerHTML = `${icon(type === 'error' ? 'close' : type === 'info' ? 'spark' : 'check', 'icon-sm')}<span>${esc(message)}</span>`;
    toastRoot.append(node);
    window.setTimeout(() => node.remove(), 4200);
  }

  function setBusy(button, busy, label = 'Working…') {
    if (!button) return;
    if (busy) {
      button.dataset.originalText = button.innerHTML;
      button.disabled = true;
      button.innerHTML = `<span class="spinner"></span>${label}`;
    } else {
      button.disabled = false;
      if (button.dataset.originalText) button.innerHTML = button.dataset.originalText;
    }
  }

  const currentRoute = () => location.hash.replace(/^#\/?/, '') || (state.role ? (state.role === 'admin' ? 'admin' : 'dashboard') : 'welcome');
  const go = (path) => { location.hash = `/${path}`; };
  const studentOnly = ['dashboard', 'applications', 'interviews', 'placements', 'profile'];

  function navLink(path, label, iconName, active) {
    return `<a href="#/${path}" class="nav-link ${active ? 'active' : ''}">${icon(iconName)}<span>${label}</span></a>`;
  }

  function shell(content, pageTitle, active, role = state.role) {
    const admin = role === 'admin';
    const name = admin ? 'Placement admin · demo' : (state.student?.full_name || `Student #${state.studentId}`);
    const mobileItems = admin
      ? [['admin', 'Home', 'grid'], ['admin/opportunities', 'Jobs', 'compass'], ['admin/applications', 'Apps', 'file']]
      : [['dashboard', 'Home', 'grid'], ['opportunities', 'Explore', 'compass'], ['applications', 'Applied', 'file'], ['profile', 'Profile', 'user']];
    return `<div class="app-shell">
      <aside class="sidebar" id="sidebar">
        <a class="brand" href="#/${admin ? 'admin' : 'dashboard'}"><span class="brand-mark">c</span><span>careergrid<small>Find your next step</small></span></a>
        <div class="nav-label">Workspace</div>
        <nav class="nav-list" aria-label="Main navigation">${admin
          ? navLink('admin', 'Overview', 'grid', active === 'admin') + navLink('admin/opportunities', 'Opportunities', 'compass', active === 'admin/opportunities') + navLink('admin/applications', 'Applications & interviews', 'file', active === 'admin/applications')
          : navLink('dashboard', 'Overview', 'grid', active === 'dashboard') + navLink('opportunities', 'Find opportunities', 'compass', active === 'opportunities') + navLink('applications', 'My applications', 'file', active === 'applications') + navLink('interviews', 'Interviews', 'chat', active === 'interviews') + navLink('placements', 'Offers & placements', 'award', active === 'placements') + navLink('profile', 'My profile', 'user', active === 'profile')}
        </nav>
        <div class="sidebar-bottom">
          ${admin ? '<div class="workspace-note"><strong><span class="dot"></span>Local demo access</strong>Admin routes currently have no authentication. Do not expose this demo on a public network.</div>' : '<div class="workspace-note"><strong><span class="dot"></span>Live CareerGrid records</strong>Your opportunities and progress come from the existing CareerGrid API.</div>'}
          <div class="sidebar-user"><span class="avatar">${esc(initials(name))}</span><span><span class="sidebar-user-name">${esc(name)}</span><span class="sidebar-user-meta">${admin ? `Admin ID ${esc(state.adminId)}` : esc(state.student?.department || 'Student account')}</span></span><button class="logout" type="button" data-action="signout" title="Switch account">${icon('close')}</button></div>
        </div>
      </aside>
      <main class="main">
        <header class="topbar"><div class="top-left"><button class="icon-button menu-toggle" data-action="menu" aria-label="Open menu">${icon('menu')}</button><span class="breadcrumb">${admin ? 'Admin workspace' : 'Student workspace'}&nbsp; / &nbsp;</span><span class="top-title">${esc(pageTitle)}</span></div><div class="top-actions"><span class="health-pill" id="health-pill"><span class="dot"></span>API connected</span><button class="icon-button" data-action="refresh" title="Refresh page data">${icon('spark')}</button></div></header>
        <section class="content" id="page-content">${content}</section>
      </main>
      <nav class="mobile-nav" aria-label="Mobile navigation">${mobileItems.map(([path, label, glyph]) => `<a href="#/${path}" class="${active === path ? 'active' : ''}">${icon(glyph)}<span>${label}</span></a>`).join('')}</nav>
    </div>`;
  }

  function welcomePage(error = '') {
    return `<main class="landing"><nav class="landing-nav"><a href="#/welcome" class="landing-brand"><span class="brand-mark">c</span>careergrid</a><div class="landing-nav-links"><a href="#/opportunities">Explore roles</a><a class="hide-mobile" href="#/welcome">For students</a><a class="button button-sm" href="#access">Sign in ${icon('arrow', 'icon-sm')}</a></div></nav>
      <div class="landing-main"><div class="landing-copy"><span class="landing-badge">${icon('spark', 'icon-sm')} BUILT FOR YOUR NEXT BIG MOVE</span><h1 class="landing-title">A good career<br>starts with <em>one yes.</em></h1><p class="landing-description">Find internships that challenge you, placements that excite you, and a clearer path from where you are to where you want to be.</p><a class="button" href="#/opportunities">Explore opportunities ${icon('arrow', 'icon-sm')}</a><div class="landing-points"><span class="landing-point"><span class="check">✓</span> Roles from real employers</span><span class="landing-point"><span class="check">✓</span> Track every application</span><span class="landing-point"><span class="check">✓</span> Your next step, in one place</span></div><div class="landing-visual"></div></div>
      <section class="access-card" id="access"><div class="eyebrow">WELCOME TO CAREERGRID</div><h2>Pick up where you left off</h2><p class="page-subtitle">Use your CareerGrid record to open your workspace.</p><div class="access-tabs"><button class="access-tab ${state.accessRole === 'student' ? 'active' : ''}" data-action="access-role" data-role="student">Student</button><button class="access-tab ${state.accessRole === 'admin' ? 'active' : ''}" data-action="access-role" data-role="admin">Placement cell</button></div>
      ${state.accessRole === 'student' ? `<form class="access-form" id="student-access-form"><div class="field"><label for="student-id">Student ID</label><input class="input" id="student-id" name="student_id" type="number" min="1" placeholder="Enter your database student ID" required><span class="form-help">Your student record is checked against CareerGrid before opening the dashboard.</span></div>${error ? `<div class="form-error">${esc(error)}</div>` : ''}<button class="button" type="submit">Continue to my dashboard ${icon('arrow', 'icon-sm')}</button></form><div class="notice">This project version uses your student ID to load a real profile. It does not have password-based sign-in yet.</div>` : `<form class="access-form" id="admin-access-form"><div class="field"><label for="admin-id">Placement admin ID</label><input class="input" id="admin-id" name="admin_id" type="number" min="1" placeholder="Enter your placement admin ID" required><span class="form-help">The current API has no admin login or identity-check endpoint.</span></div>${error ? `<div class="form-error">${esc(error)}</div>` : ''}<button class="button" type="submit">Open demo workspace ${icon('arrow', 'icon-sm')}</button></form><div class="notice warning">Demo access only. Admin endpoints are unauthenticated in this backend. Do not expose this app publicly.</div>`}</section></div>
      <footer class="landing-footer"><span>© CareerGrid · Built for the journey ahead</span><span>Internships, placements and progress in one place</span></footer></main>`;
  }

  function statCard(label, value, foot, glyph) {
    return `<article class="card stat-card"><div class="stat-top"><span>${esc(label)}</span><span class="stat-icon">${icon(glyph)}</span></div><div class="stat-value">${esc(value)}</div><div class="stat-foot">${esc(foot)}</div></article>`;
  }

  function companyMark(name) { return `<span class="company-mark">${esc(initials(name))}</span>`; }

  function jobRow(job) {
    const compensation = job.opportunity_type === 'Internship' ? job.stipend : job.salary;
    return `<article class="job-row" tabindex="0" role="link" data-action="open-job" data-id="${Number(job.opportunity_id)}" data-search="${esc(`${job.title} ${job.company_name} ${job.location || ''} ${job.opportunity_type}`.toLowerCase())}" aria-label="View ${esc(job.title)} at ${esc(job.company_name)}">${companyMark(job.company_name)}<div class="job-main"><h3 class="job-title">${esc(job.title)}</h3><div class="job-meta"><span>${esc(job.company_name)}</span><span class="meta-item">${icon('pin', 'icon-sm')}${esc(job.location || job.company_location || 'Location not listed')}</span><span>${esc(job.opportunity_type)}</span></div></div><div class="job-side"><span class="compensation">${esc(money(compensation))}${compensation != null && job.opportunity_type === 'Internship' ? '/mo' : compensation != null ? '/yr' : ''}</span><span class="badge">${esc(daysLeft(job.deadline))}</span></div>${icon('arrow', 'icon-sm muted')}</article>`;
  }

  function statusProgress(status) {
    const order = ['Applied', 'Under Review', 'Shortlisted', 'Interview', 'Selected'];
    let index = order.indexOf(status);
    if (index < 0) index = status === 'Rejected' || status === 'Withdrawn' ? 1 : 0;
    return `<div class="progress-steps">${order.map((label, i) => `<div class="progress-step ${i <= index ? 'done' : ''}"><span class="step-dot">${i < index ? '✓' : i + 1}</span>${i < order.length - 1 ? '<span class="step-line"></span>' : ''}</div>`).join('')}</div><div class="progress-labels">${order.map((label) => `<span>${label === 'Under Review' ? 'Review' : label}</span>`).join('')}</div>`;
  }

  async function loadStudent() {
    if (!state.studentId) return null;
    try { state.student = await api(`/students/${encodeURIComponent(state.studentId)}`); return state.student; }
    catch (error) { console.warn('Could not refresh student profile:', error.message); return state.student; }
  }

  async function checkHealth() {
    const pill = document.getElementById('health-pill');
    if (!pill) return;
    pill.classList.add('checking');
    pill.innerHTML = '<span class="dot"></span>Checking API';
    try {
      const health = await api('/health/db');
      pill.classList.remove('checking', 'offline');
      pill.title = `${health.database_name} · MySQL ${health.mysql_version}`;
      pill.innerHTML = '<span class="dot"></span>API connected';
    } catch {
      pill.classList.remove('checking'); pill.classList.add('offline');
      pill.title = 'Could not reach the CareerGrid database';
      pill.innerHTML = '<span class="dot"></span>API offline';
    }
  }

  async function dashboardPage() {
    const student = await loadStudent();
    if (!student) return `<div class="empty"><span class="empty-icon">${icon('user')}</span><h3>Student profile unavailable</h3><p>Switch account and enter a Student ID that exists in CareerGrid.</p><button class="button button-outline" data-action="signout">Return to sign in</button></div>`;
    const id = encodeURIComponent(state.studentId);
    const [applicationsResult, interviewsResult, placementsResult, opportunitiesResult, skillsResult] = await Promise.allSettled([
      api(`/students/${id}/applications`), api(`/students/${id}/interviews`), api(`/students/${id}/placements`), api('/opportunities'), api(`/students/${id}/skills`),
    ]);
    const applications = applicationsResult.status === 'fulfilled' ? applicationsResult.value : [];
    const interviews = interviewsResult.status === 'fulfilled' ? interviewsResult.value : [];
    const placements = placementsResult.status === 'fulfilled' ? placementsResult.value : [];
    const opportunities = opportunitiesResult.status === 'fulfilled' ? opportunitiesResult.value.slice(0, 3) : [];
    const skills = skillsResult.status === 'fulfilled' ? skillsResult.value : [];
    const nextInterview = interviews.find((item) => !item.result && interviewDate(item.scheduled_at) >= new Date());
    const activeOffers = placements.filter((item) => !['Declined', 'Withdrawn'].includes(item.placement_status)).length;
    const completionFields = ['full_name', 'email', 'phone', 'department', 'graduation_year', 'cgpa'].filter((key) => student[key] !== null && student[key] !== '').length;
    const completion = Math.round(completionFields / 6 * 100);
    const recent = applications.slice(0, 4);
    return `<div class="hero-card"><div class="hero-copy"><div class="hero-kicker">${icon('spark', 'icon-sm')} YOUR CAREER JOURNEY</div><h1>Hey ${esc((student.full_name || 'there').split(' ')[0])}, your next chapter is waiting.</h1><p>Keep exploring, keep applying. Every small step gets you closer to the work you want to do.</p><button class="button button-light" data-nav="opportunities">Find your next opportunity ${icon('arrow', 'icon-sm')}</button></div><div class="hero-decoration"></div></div>
      <div class="grid grid-4" style="margin-top:17px">${statCard('Applications sent', applications.length, 'Across all opportunities', 'file')}${statCard('Interviews', interviews.length, nextInterview ? `Next · ${timeFormat(nextInterview.scheduled_at)}` : 'Rounds on your applications', 'chat')}${statCard('Offers to consider', activeOffers, 'Including multiple offers', 'award')}${statCard('Profile strength', `${completion}%`, `${skills.length} skills added`, 'user')}</div>
      <div class="dashboard-columns"><section><div class="section-heading"><div><h2>Recommended for you</h2><p>Open roles from CareerGrid</p></div><button class="link-button" data-nav="opportunities">View all ${icon('arrow', 'icon-sm')}</button></div>${opportunities.length ? `<div class="job-list">${opportunities.map(jobRow).join('')}</div>` : `<div class="card card-pad">${emptyState('No open opportunities yet', 'New roles will appear here when they are available.', 'compass')}</div>`}
      <div class="section-heading"><div><h2>Application activity</h2><p>Your most recent applications</p></div><button class="link-button" data-nav="applications">See all ${icon('arrow', 'icon-sm')}</button></div><div class="card list-card">${recent.length ? recent.map((item) => `<div class="application-mini"><span class="job-title">${esc(item.opportunity_title)}</span>${badge(item.status)}<span class="mini-sub">${esc(item.company_name)} · applied ${dateFormat(item.applied_at)}</span></div>`).join('') : emptyState('Your story starts here', 'Browse open opportunities and apply when something feels right.', 'file', 'Explore roles', 'opportunities')}</div></section>
      <aside><div class="section-heading"><div><h2>Profile snapshot</h2><p>A little about you</p></div><button class="link-button" data-nav="profile">Edit ${icon('arrow', 'icon-sm')}</button></div><div class="card card-pad"><div class="profile-completion"><div class="completion-ring" style="--progress:${completion}"><span>${completion}%</span></div><div><h3 style="margin:0 0 4px">Make your profile shine</h3><p class="small muted" style="margin:0">Complete your profile so employers can see what you bring.</p></div></div><div class="progress-line"><div class="progress-track"><span style="width:${completion}%"></span></div><span class="tiny muted">${completionFields}/6</span></div><div class="chip-list" style="margin-top:16px">${skills.length ? skills.slice(0, 6).map((skill) => `<span class="skill-chip">${esc(skill.skill_name)}</span>`).join('') : '<span class="small muted">Add skills to your profile.</span>'}</div></div>
      <div class="section-heading"><div><h2>Coming up</h2><p>Interview schedule</p></div><button class="link-button" data-nav="interviews">View all ${icon('arrow', 'icon-sm')}</button></div><div class="card card-pad">${nextInterview ? `<div class="interview-card" style="padding:0"><div class="date-tile"><strong>${esc(interviewDate(nextInterview.scheduled_at).getDate())}</strong><span>${esc(new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(interviewDate(nextInterview.scheduled_at)))}</span></div><div class="interview-content"><h3>${esc(nextInterview.opportunity_title)}</h3><div class="small muted">${esc(nextInterview.company_name)} · Round ${esc(nextInterview.round_number)}</div><div class="small muted" style="margin-top:6px">${icon('clock', 'icon-sm')} ${esc(timeFormat(nextInterview.scheduled_at))} · ${esc(nextInterview.mode)}</div></div></div>` : emptyState('No interviews scheduled', 'When a company schedules a round, you will find the details here.', 'chat')}</div></aside></div>`;
  }

  function emptyState(title, copy, glyph = 'spark', buttonLabel = '', route = '') {
    return `<div class="empty"><span class="empty-icon">${icon(glyph)}</span><h3>${esc(title)}</h3><p>${esc(copy)}</p>${buttonLabel ? `<button class="button button-outline button-sm" data-nav="${esc(route)}">${esc(buttonLabel)} ${icon('arrow', 'icon-sm')}</button>` : ''}</div>`;
  }

  async function opportunitiesPage() {
    const filters = state.opportunityFilters;
    const params = new URLSearchParams();
    if (filters.type) params.set('type', filters.type);
    if (filters.location.trim()) params.set('location', filters.location.trim());
    if (filters.eligible) params.set('eligible_cgpa', filters.eligible);
    let rows = [];
    let loadError = '';
    try { rows = await api(`/opportunities${params.size ? `?${params}` : ''}`); }
    catch (error) { loadError = error.message; }
    if (filters.search.trim()) {
      const query = filters.search.trim().toLowerCase();
      rows = rows.filter((job) => [job.title, job.company_name, job.location, job.opportunity_type].some((text) => String(text || '').toLowerCase().includes(query)));
    }
    return `<div class="page-head"><div><div class="eyebrow">MAKE YOUR NEXT MOVE</div><h1>Opportunities</h1><p class="page-subtitle">Find a role that fits what you are curious about.</p></div><span class="badge green">${rows.length} open ${rows.length === 1 ? 'role' : 'roles'}</span></div>
      <div class="filter-bar"><div class="input-wrap">${icon('search')}<input class="input" name="job-search" value="${esc(filters.search)}" placeholder="Search role, company or keyword…" aria-label="Search opportunities"></div><select class="select" name="job-type" aria-label="Opportunity type"><option value="">All types</option><option ${filters.type === 'Internship' ? 'selected' : ''}>Internship</option><option ${filters.type === 'Placement' ? 'selected' : ''}>Placement</option></select><input class="input" style="width:145px" name="job-location" value="${esc(filters.location)}" placeholder="Location" aria-label="Filter by location"><input class="input" style="width:130px" name="job-eligible" type="number" min="0" max="10" step="0.01" value="${esc(filters.eligible)}" placeholder="Your CGPA" aria-label="Filter by eligible CGPA">${icon('filter')}</div>
      ${loadError ? `<div class="notice warning">Could not load opportunities from CareerGrid: ${esc(loadError)}</div>` : rows.length ? `<div class="job-list">${rows.map(jobRow).join('')}</div><p class="pagination-note">Showing all active opportunities returned by CareerGrid.</p>` : `<div class="empty"><span class="empty-icon">${icon('search')}</span><h3>No roles match these filters</h3><p>Try a different keyword or clear one of the filters.</p><button class="button button-outline button-sm" data-action="clear-opportunity-filters">Clear filters</button></div>`}`;
  }

  async function opportunityDetailPage(id) {
    let job;
    let error = '';
    try { job = await api(`/opportunities/${encodeURIComponent(id)}`); } catch (err) { error = err.message; }
    if (!job) return `<div class="page-head"><div><div class="eyebrow">OPPORTUNITY</div><h1>Role details</h1></div><button class="button button-outline" data-nav="opportunities">${icon('arrow', 'icon-sm')} Back to opportunities</button></div><div class="card card-pad">${emptyState('Could not load this opportunity', error || 'The opportunity may have been removed.', 'compass', 'Browse opportunities', 'opportunities')}</div>`;
    const compensation = job.opportunity_type === 'Internship' ? job.stipend : job.salary;
    return `<div class="page-head"><div><button class="link-button" data-action="back-opportunities">${icon('arrow', 'icon-sm')} Back to opportunities</button></div><span class="badge">${esc(job.opportunity_type)}</span></div>
      <div class="two-col"><div><section class="detail-banner">${companyMark(job.company_name)}<h1>${esc(job.title)}</h1><div class="job-meta"><span>${esc(job.company_name)}</span><span class="meta-item">${icon('pin', 'icon-sm')}${esc(job.location || job.company_location || 'Location not listed')}</span><span>${esc(job.industry || 'Industry not listed')}</span></div><div class="detail-stats"><div class="detail-stat"><span>Compensation</span><strong>${esc(money(compensation))}${compensation != null ? (job.opportunity_type === 'Internship' ? ' / month' : ' / year') : ''}</strong></div><div class="detail-stat"><span>Minimum CGPA</span><strong>${job.minimum_cgpa == null ? 'Not specified' : `${esc(job.minimum_cgpa)} / 10`}</strong></div><div class="detail-stat"><span>Application deadline</span><strong>${esc(dateFormat(job.deadline))}</strong></div></div></section>
      <section class="card card-pad" style="margin-top:16px"><div class="eyebrow">THE ROLE</div><h2>About this opportunity</h2><p class="detail-copy">${esc(job.description || 'The employer has not added a role description yet.')}</p></section><section class="card card-pad" style="margin-top:14px"><h2>About ${esc(job.company_name)}</h2><div class="job-meta" style="margin-top:12px"><span>${esc(job.industry || 'Industry not listed')}</span><span>${esc(job.company_location || job.location || 'Location not listed')}</span>${safeWebsite(job.website) ? `<a href="${esc(safeWebsite(job.website))}" rel="noopener noreferrer" target="_blank">Company website ↗</a>` : ''}</div></section></div>
      <aside class="detail-side"><section class="card card-pad"><div class="eyebrow">READY TO TAKE A STEP?</div><h2>Make it yours.</h2><p class="page-subtitle" style="margin:8px 0 17px">Your application is checked against CareerGrid's eligibility rules when you submit.</p><button class="button" data-action="apply" data-id="${Number(job.opportunity_id)}">${icon('file', 'icon-sm')} Apply to this role</button><div class="notice" style="margin-top:13px">${icon('clock', 'icon-sm')} ${esc(daysLeft(job.deadline))}. The database checks opportunity dates, status and CGPA.</div><ul><li>Applications are unique per student and opportunity.</li><li>Your application status appears in My applications.</li><li>Interview rounds and offer updates appear in your workspace.</li></ul></section></aside></div>`;
  }

  async function applicationsPage() {
    let rows = [];
    let error = '';
    try { rows = await api(`/students/${encodeURIComponent(state.studentId)}/applications`); } catch (err) { error = err.message; }
    const shown = state.applicationFilter === 'All' ? rows : rows.filter((row) => row.status === state.applicationFilter);
    const filters = ['All', ...new Set(rows.map((row) => row.status))];
    return `<div class="page-head"><div><div class="eyebrow">YOUR JOB SEARCH</div><h1>My applications</h1><p class="page-subtitle">Every application and update, together in one place.</p></div><button class="button" data-nav="opportunities">Explore roles ${icon('arrow', 'icon-sm')}</button></div>
      ${error ? `<div class="notice warning">Could not load applications: ${esc(error)}</div>` : ''}<section class="card table-card"><div class="table-card-head"><div><h2 style="margin:0 0 4px">Application tracker</h2><p class="small muted" style="margin:0">${rows.length} total</p></div><div class="status-tabs">${filters.map((status) => `<button class="status-tab ${state.applicationFilter === status ? 'active' : ''}" data-action="app-filter" data-status="${esc(status)}">${esc(status)}</button>`).join('')}</div></div>${shown.length ? `<div class="table-wrap"><table><thead><tr><th>Role</th><th>Company</th><th>Applied</th><th>Status</th><th>Progress</th><th></th></tr></thead><tbody>${shown.map((row) => `<tr><td><strong>${esc(row.opportunity_title)}</strong><div class="tiny muted">${esc(row.opportunity_type)}</div></td><td>${esc(row.company_name)}</td><td>${esc(dateFormat(row.applied_at))}</td><td>${badge(row.status)}</td><td style="min-width:170px">${statusProgress(row.status)}</td><td>${['Selected', 'Rejected', 'Withdrawn'].includes(row.status) ? '' : `<button class="button button-danger button-sm" data-action="withdraw" data-id="${Number(row.application_id)}">Withdraw</button>`}</td></tr>`).join('')}</tbody></table></div>` : error ? '' : emptyState('No applications in this view', state.applicationFilter === 'All' ? 'When you apply to a role, it will show up here.' : `No applications currently have the status “${state.applicationFilter}”.`, 'file', state.applicationFilter === 'All' ? 'Explore roles' : '', 'opportunities')}</section>`;
  }

  async function interviewsPage() {
    let rows = [];
    let error = '';
    try { rows = await api(`/students/${encodeURIComponent(state.studentId)}/interviews`); } catch (err) { error = err.message; }
    const upcoming = rows.filter((item) => !item.result && interviewDate(item.scheduled_at) >= new Date()).sort((a, b) => interviewDate(a.scheduled_at) - interviewDate(b.scheduled_at));
    const past = rows.filter((item) => !upcoming.includes(item)).sort((a, b) => interviewDate(b.scheduled_at) - interviewDate(a.scheduled_at));
    return `<div class="page-head"><div><div class="eyebrow">YOUR NEXT CONVERSATION</div><h1>Interviews & status</h1><p class="page-subtitle">Round schedules, results and feedback from your applications.</p></div><span class="badge green">${rows.length} ${rows.length === 1 ? 'round' : 'rounds'}</span></div>${error ? `<div class="notice warning">${esc(error)}</div>` : ''}
      <div class="section-heading"><div><h2>Upcoming</h2><p>Get ready to show what you can do.</p></div></div>${upcoming.length ? `<div class="grid grid-2">${upcoming.map(interviewCard).join('')}</div>` : emptyState('Nothing on the calendar', 'When an interview is scheduled for one of your applications, it will appear here.', 'chat')}
      <div class="section-heading"><div><h2>Past rounds & updates</h2><p>Keep track of how each conversation went.</p></div></div>${past.length ? `<div class="grid grid-2">${past.map(interviewCard).join('')}</div>` : '<div class="card card-pad"><p class="small muted" style="margin:0">Completed interview rounds will appear here.</p></div>'}
      <div class="section-heading"><div><h2>Application status guide</h2><p>Each opportunity follows its own selection process.</p></div></div><div class="card card-pad"><div class="timeline">${[['Applied', 'Your application has been submitted to the company.'], ['Under Review', 'The company is reviewing applications.'], ['Shortlisted', 'You have progressed to the next step.'], ['Interview', 'An interview round is in progress.'], ['Selected', 'The application was selected and an offer record was created.']].map(([title, copy]) => `<div class="timeline-item"><span class="timeline-mark">${icon('check', 'icon-sm')}</span><div><div class="timeline-title">${title}</div><div class="timeline-copy">${copy}</div></div></div>`).join('')}</div></div>`;
  }

  function interviewCard(item) {
    const date = interviewDate(item.scheduled_at);
    return `<article class="card interview-card"><div class="date-tile"><strong>${esc(date.getDate())}</strong><span>${esc(new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(date))}</span></div><div class="interview-content"><div style="display:flex;justify-content:space-between;gap:8px"><h3>${esc(item.opportunity_title)}</h3>${item.result ? badge(item.result) : badge('Scheduled')}</div><div class="small muted">${esc(item.company_name)} · Round ${esc(item.round_number)}</div><div class="job-meta" style="margin-top:9px"><span class="meta-item">${icon('clock', 'icon-sm')}${esc(timeFormat(item.scheduled_at))}</span><span>${esc(item.mode)}</span></div>${item.feedback ? `<div class="notice" style="margin-top:11px"><strong>Feedback</strong><br>${esc(item.feedback)}</div>` : ''}</div></article>`;
  }

  async function placementsPage() {
    let rows = [];
    let error = '';
    try { rows = await api(`/students/${encodeURIComponent(state.studentId)}/placements`); } catch (err) { error = err.message; }
    return `<div class="page-head"><div><div class="eyebrow">YOUR OPTIONS, YOUR CALL</div><h1>Offers & placements</h1><p class="page-subtitle">Review each offer independently and keep its status up to date.</p></div><span class="badge green">${rows.length} ${rows.length === 1 ? 'offer' : 'offers'}</span></div>${error ? `<div class="notice warning">${esc(error)}</div>` : ''}
      ${rows.length ? `<div class="grid grid-2">${rows.map((offer) => `<article class="card offer-card"><div class="offer-top"><div>${companyMark(offer.company_name)}<h3 style="margin-top:12px">${esc(offer.opportunity_title)}</h3><p class="small muted" style="margin:0">${esc(offer.company_name)} · Application #${esc(offer.application_id)}</p></div>${badge(offer.placement_status)}</div><div class="offer-amount">${esc(money(offer.offered_compensation))}</div><div class="small muted">Annual compensation, when disclosed</div><div class="offer-meta"><div><span>Offer date</span><strong>${esc(dateFormat(offer.offer_date))}</strong></div><div><span>Joining date</span><strong>${esc(dateFormat(offer.joining_date))}</strong></div></div><div class="field" style="margin-top:16px"><label for="offer-state-${Number(offer.placement_id)}">Update your decision</label><div style="display:flex;gap:8px"><select class="select" id="offer-state-${Number(offer.placement_id)}" data-offer-state="${Number(offer.placement_id)}">${['Offer Pending', 'Accepted', 'Declined', 'Joined', 'Withdrawn'].map((status) => `<option ${offer.placement_status === status ? 'selected' : ''}>${status}</option>`).join('')}</select><button class="button button-sm" data-action="offer-update" data-id="${Number(offer.placement_id)}">Save</button></div></div></article>`).join('')}</div>` : error ? '' : emptyState('Offers will show up here', 'When an application is selected, CareerGrid creates an offer record for you to review.', 'award', 'View applications', 'applications')}
      <div class="notice" style="margin-top:17px">A student can have multiple offers. Update each opportunity on its own; your choice is saved to the existing PLACEMENT record.</div>`;
  }

  async function profilePage() {
    const student = await loadStudent();
    let skills = [];
    let error = '';
    try { skills = await api(`/students/${encodeURIComponent(state.studentId)}/skills`); } catch (err) { error = err.message; }
    if (!student) return emptyState('Profile unavailable', 'Could not load the student record.', 'user');
    return `<div class="page-head"><div><div class="eyebrow">YOUR STORY, YOUR SKILLS</div><h1>My profile</h1><p class="page-subtitle">Keep your details and skills up to date.</p></div></div>${error ? `<div class="notice warning">Could not load skills: ${esc(error)}</div>` : ''}
      <div class="two-col"><div><section class="card profile-head"> <span class="profile-large">${esc(initials(student.full_name))}</span><div><h2>${esc(student.full_name)}</h2><p class="small muted" style="margin:0">${esc(student.department)} · Class of ${esc(student.graduation_year)}</p><p class="tiny muted" style="margin:5px 0 0">Roll no. ${esc(student.roll_no)}</p></div></section><form class="card card-pad form-stack" id="profile-form" style="margin-top:14px"><div class="list-card-head"><div><h2>Personal information</h2><p class="small muted" style="margin:0">These details are saved to your CareerGrid profile.</p></div></div><div class="form-grid"><div class="field"><label>Full name</label><input class="input" name="full_name" maxlength="100" value="${esc(student.full_name)}" required></div><div class="field"><label>Email</label><input class="input" name="email" type="email" maxlength="254" value="${esc(student.email)}" required></div><div class="field"><label>Phone</label><input class="input" name="phone" maxlength="20" value="${esc(student.phone || '')}"></div><div class="field"><label>Date of birth</label><input class="input" name="date_of_birth" type="date" value="${esc(String(student.date_of_birth || '').slice(0, 10))}"></div><div class="field"><label>Department</label><input class="input" name="department" maxlength="80" value="${esc(student.department)}" required></div><div class="field"><label>Graduation year</label><input class="input" name="graduation_year" type="number" min="2000" max="9999" value="${esc(student.graduation_year)}" required></div><div class="field"><label>CGPA (out of 10)</label><input class="input" name="cgpa" type="number" min="0" max="10" step="0.01" value="${esc(student.cgpa ?? '')}"></div></div><div><button class="button" type="submit">Save profile changes</button></div></form></div>
      <aside><section class="card card-pad"><div class="list-card-head"><div><h2>Skills</h2><p class="small muted" style="margin:0">Your linked CareerGrid skills</p></div><button class="button button-outline button-sm" data-action="add-skill">${icon('plus', 'icon-sm')} Add skill</button></div>${skills.length ? `<div class="chip-list">${skills.map((skill) => `<span class="skill-chip">${esc(skill.skill_name)}${skill.proficiency_level ? `<small>· ${esc(skill.proficiency_level)}</small>` : ''}<button class="logout" style="color:#7e9381;padding:0 0 0 2px" data-action="remove-skill" data-id="${Number(skill.skill_id)}" title="Remove ${esc(skill.skill_name)}">${icon('close', 'icon-sm')}</button></span>`).join('')}</div>` : emptyState('Add a skill to get started', 'Your current skill associations will appear here.', 'spark')}</section><section class="card card-pad" style="margin-top:14px"><div class="eyebrow">ACADEMICS</div><h2>Eligibility snapshot</h2><p class="small muted">Your current CGPA is <strong>${student.cgpa == null ? 'not recorded' : `${esc(student.cgpa)} / 10`}</strong>. Opportunity eligibility is checked again by the database when you apply.</p><button class="button button-quiet button-sm" data-nav="opportunities">Find eligible roles ${icon('arrow', 'icon-sm')}</button></section></aside></div>`;
  }

  async function adminDashboardPage() {
    const results = await Promise.allSettled([api('/reports/overview'), api('/reports/application-statistics'), api('/reports/placement-statistics'), api('/admin/applications')]);
    const data = results.map((item) => item.status === 'fulfilled' ? item.value : []);
    const overview = data[0] || {};
    const statuses = data[1] || [];
    const placements = data[2] || [];
    const apps = data[3] || [];
    const failed = results.some((result) => result.status === 'rejected');
    return `<div class="page-head"><div><div class="eyebrow">PLACEMENT CELL</div><h1>Admin overview</h1><p class="page-subtitle">A live view of the opportunities and applications in CareerGrid.</p></div><span class="demo-ribbon">${icon('bell', 'icon-sm')} DEMO ADMIN · ID ${esc(state.adminId)}</span></div>${failed ? '<div class="notice warning" style="margin-bottom:16px">Some report data could not be loaded. Check your connection and refresh.</div>' : ''}
      <div class="grid grid-4">${statCard('Opportunities', overview.opportunity_count ?? '—', 'All records in CareerGrid', 'compass')}${statCard('Applications', overview.application_count ?? '—', 'Across every opportunity', 'file')}${statCard('Offers', overview.offer_count ?? '—', 'Placement records created', 'award')}${statCard('Joined', overview.joined_count ?? '—', 'Students marked as joined', 'check')}</div>
      <div class="dashboard-columns"><section><div class="section-heading"><div><h2>Application pipeline</h2><p>Current status counts from the database</p></div><button class="link-button" data-nav="admin/applications">Review applications ${icon('arrow', 'icon-sm')}</button></div><div class="card card-pad">${statuses.length ? statuses.map((row) => `<div class="application-mini"><span class="job-title">${esc(row.status)}</span><span class="badge ${badgeClass(row.status)}">${esc(row.application_count)}</span><span class="mini-sub">Applications currently in this stage</span></div>`).join('') : emptyState('No applications yet', 'Application counts will appear when students apply.', 'file')}</div>
      <div class="section-heading"><div><h2>Offers by company</h2><p>Offer counts and disclosed compensation</p></div></div><div class="card table-card"><div class="table-wrap"><table><thead><tr><th>Company</th><th>Type</th><th>Offers</th><th>Average compensation</th></tr></thead><tbody>${placements.length ? placements.map((row) => `<tr><td><strong>${esc(row.company_name)}</strong></td><td>${esc(row.opportunity_type)}</td><td>${esc(row.offer_count)}</td><td>${esc(money(row.average_compensation))}</td></tr>`).join('') : '<tr><td colspan="4" class="muted">No offer statistics yet.</td></tr>'}</tbody></table></div></div></section>
      <aside><div class="section-heading"><div><h2>Quick actions</h2><p>Manage the recruitment cycle</p></div></div><div class="card card-pad form-stack"><button class="button" data-nav="admin/opportunities">${icon('plus', 'icon-sm')} Create an opportunity</button><button class="button button-outline" data-nav="admin/applications">${icon('file', 'icon-sm')} Review applications</button><div class="notice warning">Admin endpoints do not authenticate the operator. This workspace is suitable only for a local demo.</div></div><div class="section-heading"><div><h2>Placement statistics</h2><p>Offers can include multiple records per student.</p></div></div><div class="card card-pad">${placements.length ? `<div class="timeline">${placements.slice(0, 5).map((row) => `<div class="timeline-item"><span class="timeline-mark">${icon('award', 'icon-sm')}</span><div><div class="timeline-title">${esc(row.company_name)} · ${esc(row.opportunity_type)}</div><div class="timeline-copy">${esc(row.offer_count)} offers · average ${esc(money(row.average_compensation))}</div></div></div>`).join('')}</div>` : '<p class="small muted">Statistics will appear when selection creates offer records.</p>'}</div></aside></div>`;
  }

  async function adminOpportunitiesPage() {
    let companies = [];
    let rows = [];
    let loadError = '';
    const results = await Promise.allSettled([api('/admin/companies'), api('/admin/opportunities')]);
    if (results[0].status === 'fulfilled') companies = results[0].value;
    else loadError = results[0].reason.message;
    if (results[1].status === 'fulfilled') rows = results[1].value;
    else loadError = results[1].reason.message;
    return `<div class="page-head"><div><div class="eyebrow">OPPORTUNITY MANAGEMENT</div><h1>Roles & openings</h1><p class="page-subtitle">Create openings and update opportunities across every status.</p></div><button class="button" data-action="create-opportunity">${icon('plus', 'icon-sm')} New opportunity</button></div>${loadError ? `<div class="notice warning">${esc(loadError)}</div>` : ''}
      <section class="card table-card"><div class="table-card-head"><div><h2 style="margin:0 0 3px">All opportunities</h2><p class="small muted" style="margin:0">${rows.length} total records</p></div></div>${rows.length ? `<div class="table-wrap"><table><thead><tr><th>Role</th><th>Company</th><th>Type</th><th>Status</th><th>Location</th><th>Deadline</th><th>Eligibility</th><th></th></tr></thead><tbody>${rows.map((job) => `<tr><td><strong>${esc(job.title)}</strong><div class="tiny muted">#${esc(job.opportunity_id)}</div></td><td>${esc(job.company_name)}</td><td>${esc(job.opportunity_type)}</td><td>${badge(job.status)}</td><td>${esc(job.location || '—')}</td><td>${esc(dateFormat(job.deadline))}</td><td>${job.minimum_cgpa == null ? '—' : `${esc(job.minimum_cgpa)}+`}</td><td><button class="button button-outline button-sm" data-action="edit-opportunity" data-id="${Number(job.opportunity_id)}">Edit</button></td></tr>`).join('')}</tbody></table></div>` : loadError ? '' : emptyState('No opportunities yet', 'Create an opportunity record to get started. The database will validate company and administrator references.', 'compass', 'Create opportunity', '')}</section>
      <div class="notice" style="margin-top:14px">Company choices come directly from <code>GET /api/admin/companies</code>. To create an opportunity, the existing API requires the operator’s admin ID and the existing database must contain that admin.</div>`;
  }

  async function adminApplicationsPage() {
    let rows = [];
    let error = '';
    try { rows = await api('/admin/applications'); } catch (err) { error = err.message; }
    const options = ['Applied', 'Under Review', 'Shortlisted', 'Interview', 'Selected', 'Rejected', 'Withdrawn'];
    return `<div class="page-head"><div><div class="eyebrow">REVIEW & SCHEDULE</div><h1>Applications</h1><p class="page-subtitle">Review each application, schedule interview rounds and record results.</p></div><span class="badge green">${rows.length} records</span></div>${error ? `<div class="notice warning">${esc(error)}</div>` : ''}<section class="card table-card"><div class="table-card-head"><div><h2 style="margin:0 0 3px">All applications</h2><p class="small muted" style="margin:0">Data from student_application_tracking</p></div><div class="input-wrap" style="max-width:280px">${icon('search')}<input class="input" id="admin-app-search" placeholder="Filter this list…" aria-label="Filter applications"></div></div>${rows.length ? `<div class="table-wrap"><table id="admin-app-table"><thead><tr><th>Student</th><th>Opportunity</th><th>Company</th><th>Applied</th><th>Status</th><th></th></tr></thead><tbody>${rows.map((row) => `<tr data-search="${esc(`${row.student_name} ${row.opportunity_title} ${row.company_name} ${row.application_status}`.toLowerCase())}"><td><strong>${esc(row.student_name)}</strong><div class="tiny muted">Student #${esc(row.student_id)}</div></td><td><strong>${esc(row.opportunity_title)}</strong><div class="tiny muted">${esc(row.opportunity_type)} · #${esc(row.application_id)}</div></td><td>${esc(row.company_name)}</td><td>${esc(dateFormat(row.applied_at))}</td><td>${badge(row.application_status)}</td><td><button class="button button-outline button-sm" data-action="manage-application" data-id="${Number(row.application_id)}" data-student="${Number(row.student_id)}" data-status="${esc(row.application_status)}" data-title="${esc(row.opportunity_title)}">Manage</button></td></tr>`).join('')}</tbody></table></div>` : error ? '' : emptyState('No applications to review', 'Student applications will appear here as they are submitted.', 'file')}</section>
      <div class="notice" style="margin-top:14px">Changing an application to <strong>Selected</strong> triggers the existing database rule that creates one pending offer record for that application.</div>`;
  }

  async function render() {
    const route = currentRoute();
    if (route === 'welcome' || route === 'access') {
      app.innerHTML = welcomePage();
      return;
    }
    if (route.startsWith('opportunity/')) {
      const opportunityId = route.split('/')[1];
      if (!opportunityId) { go('opportunities'); return; }
      app.innerHTML = shell('<div class="inline-loading"><span class="spinner"></span>Loading opportunity details…</div>', 'Opportunity details', 'opportunities', state.role || 'student');
      const content = await opportunityDetailPage(opportunityId);
      app.innerHTML = shell(content, 'Opportunity details', 'opportunities', state.role || 'student');
      checkHealth();
      return;
    }
    if (!state.role) { go('welcome'); return; }
    if (studentOnly.includes(route) && state.role !== 'student') { go('admin'); return; }
    if (route.startsWith('admin') && state.role !== 'admin') { go('dashboard'); return; }
    if (!['dashboard', 'opportunities', 'applications', 'interviews', 'placements', 'profile', 'admin', 'admin/opportunities', 'admin/applications', 'admin-opportunities', 'admin-applications'].includes(route)) { go(state.role === 'admin' ? 'admin' : 'dashboard'); return; }

    const token = ++state.requestNumber;
    const admin = state.role === 'admin';
    const loadingTitle = admin ? 'Admin workspace' : titleCase(route);
    app.innerHTML = shell('<div class="inline-loading"><span class="spinner"></span>Loading your workspace…</div>', loadingTitle, route);
    let content = '';
    let title = loadingTitle;
    try {
      if (route === 'dashboard') { title = 'Overview'; content = await dashboardPage(); }
      else if (route === 'opportunities') { title = 'Opportunities'; content = await opportunitiesPage(); }
      else if (route === 'applications') { title = 'My applications'; content = await applicationsPage(); }
      else if (route === 'interviews') { title = 'Interviews & status'; content = await interviewsPage(); }
      else if (route === 'placements') { title = 'Offers & placements'; content = await placementsPage(); }
      else if (route === 'profile') { title = 'My profile'; content = await profilePage(); }
      else if (route === 'admin') { title = 'Admin overview'; content = await adminDashboardPage(); }
      else if (route === 'admin/opportunities' || route === 'admin-opportunities') { title = 'Roles & openings'; content = await adminOpportunitiesPage(); }
      else if (route === 'admin/applications' || route === 'admin-applications') { title = 'Applications'; content = await adminApplicationsPage(); }
    } catch (error) {
      content = `<div class="card card-pad">${emptyState('We could not load this page', error.message || 'Check the Flask server and try again.', 'spark', 'Refresh', '')}</div>`;
    }
    if (token === state.requestNumber) { app.innerHTML = shell(content, title, route); checkHealth(); }
  }

  function showModal(title, body, onSubmit, submitLabel = 'Save changes') {
    const existing = document.querySelector('.modal-backdrop');
    if (existing) existing.remove();
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `<section class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header class="modal-head"><h2 style="margin:0">${esc(title)}</h2><button class="icon-button" type="button" data-action="close-modal" aria-label="Close">${icon('close')}</button></header><form id="modal-form"><div class="modal-body">${body}</div><footer class="modal-foot"><button class="button button-outline" type="button" data-action="close-modal">Cancel</button><button class="button" type="submit">${esc(submitLabel)}</button></footer></form></section>`;
    document.body.append(backdrop);
    backdrop.addEventListener('click', (event) => { if (event.target === backdrop) backdrop.remove(); });
    const form = backdrop.querySelector('#modal-form');
    if (form) form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = form.querySelector('[type="submit"]');
      setBusy(button, true);
      try { await onSubmit(new FormData(form), backdrop); }
      catch (error) { toast(error.message, 'error'); setBusy(button, false); }
    });
  }

  async function skillModal() {
    showModal('Add a skill', `<div class="form-stack"><div class="field"><label for="skill-id">Skill</label><select class="select" name="skill_id" id="skill-id" required disabled><option value="">Loading skills…</option></select><span id="skill-catalog-status" class="form-help" role="status">Loading available skills…</span></div><div class="field"><label for="skill-level">Proficiency</label><select class="select" name="proficiency_level" id="skill-level"><option value="">Not specified</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></div><div class="field"><label for="skill-date">Acquired on</label><input class="input" name="acquired_on" id="skill-date" type="date"></div></div>`, async (form, modal) => {
      const payload = { skill_id: Number(form.get('skill_id')), proficiency_level: form.get('proficiency_level') || null, acquired_on: form.get('acquired_on') || null };
      await api(`/students/${encodeURIComponent(state.studentId)}/skills`, { method: 'POST', body: JSON.stringify(payload) });
      modal.remove(); toast('Skill added to your profile.'); render();
    }, 'Add skill');
    const modal = document.querySelector('.modal-backdrop');
    const select = modal?.querySelector('#skill-id');
    const status = modal?.querySelector('#skill-catalog-status');
    const submit = modal?.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;
    try {
      const skills = await api('/skills');
      if (!select || !status || !modal.isConnected) return;
      if (!skills.length) {
        select.innerHTML = '<option value="">No skills are available</option>';
        status.textContent = 'There are no skills in the CareerGrid catalog yet.';
        return;
      }
      select.innerHTML = '<option value="">Choose a skill</option>' + skills.map((skill) => `<option value="${Number(skill.skill_id)}">${esc(skill.skill_name)}${skill.skill_category ? ` · ${esc(skill.skill_category)}` : ''}</option>`).join('');
      select.disabled = false;
      status.textContent = 'Choose a skill from the CareerGrid catalog.';
      if (submit) submit.disabled = false;
    } catch (error) {
      if (!select || !status || !modal.isConnected) return;
      select.innerHTML = '<option value="">Skills could not be loaded</option>';
      status.textContent = `Could not load available skills. ${error.message}`;
      if (submit) submit.disabled = true;
    }
  }

  async function applicationModal(opportunityId) {
    if (!state.role || state.role !== 'student') {
      toast('Sign in with your Student ID before applying.', 'info');
      go('welcome');
      return;
    }
    let job;
    try { job = await api(`/opportunities/${encodeURIComponent(opportunityId)}`); }
    catch (error) { toast(error.message, 'error'); return; }
    showModal('Apply to this opportunity', `<div class="notice" style="margin-bottom:15px"><strong>${esc(job.title)}</strong><br>${esc(job.company_name)} · ${esc(job.opportunity_type)}</div><div class="field"><label for="resume-ref">Resume reference <span class="muted">(optional)</span></label><input class="input" id="resume-ref" name="resume_reference" maxlength="255" placeholder="Resume filename or reference"><span class="form-help">The current API stores a reference only; it does not upload a resume file.</span></div><p class="form-help" style="margin-top:12px">CareerGrid’s database checks whether this opportunity is open, within its application window, and eligible for your CGPA. Duplicate applications are rejected.</p>`, async (form, modal) => {
      await api(`/students/${encodeURIComponent(state.studentId)}/applications`, { method: 'POST', body: JSON.stringify({ opportunity_id: Number(opportunityId), resume_reference: form.get('resume_reference') || null }) });
      modal.remove(); toast('Application submitted successfully.'); go('applications');
    }, 'Submit application');
  }

  function opportunityModal(editJob = null, companies = []) {
    const job = editJob || {};
    const isEdit = Boolean(editJob);
    const companyOptions = companies.map((company) => `<option value="${Number(company.company_id)}" ${Number(job.company_id) === Number(company.company_id) ? 'selected' : ''}>${esc(company.company_name)} · #${esc(company.company_id)}</option>`).join('');
    const body = `<div class="form-grid"><div class="field"><label>Company</label><select class="select" name="company_id" required ${isEdit ? 'disabled' : ''}>${isEdit ? '' : '<option value="">Choose a company</option>'}${companyOptions}</select>${isEdit ? `<input type="hidden" name="company_id" value="${Number(job.company_id)}">` : ''}</div><div class="field"><label>Created by admin ID</label><input class="input" name="created_by_admin_id" type="number" min="1" value="${esc(isEdit ? job.created_by_admin_id : state.adminId)}" required ${isEdit ? 'readonly' : ''}><span class="form-help">This ID is not authenticated by the API.</span></div><div class="field span-2"><label>Role title</label><input class="input" name="title" maxlength="150" value="${esc(job.title)}" required></div><div class="field"><label>Opportunity type</label><select class="select" name="opportunity_type" required><option ${job.opportunity_type === 'Internship' ? 'selected' : ''}>Internship</option><option ${job.opportunity_type === 'Placement' ? 'selected' : ''}>Placement</option></select></div><div class="field"><label>Status</label><select class="select" name="status">${['Draft', 'Open', 'Closed', 'Cancelled'].map((status) => `<option ${job.status === status ? 'selected' : ''}>${status}</option>`).join('')}</select></div><div class="field"><label>Location</label><input class="input" name="location" maxlength="120" value="${esc(job.location)}"></div><div class="field"><label>Minimum CGPA</label><input class="input" name="minimum_cgpa" type="number" min="0" max="10" step="0.01" value="${esc(job.minimum_cgpa ?? '')}"></div><div class="field"><label>Internship stipend</label><input class="input" name="stipend" type="number" min="0" step="0.01" value="${esc(job.stipend ?? '')}" placeholder="Internship only"></div><div class="field"><label>Placement salary</label><input class="input" name="salary" type="number" min="0" step="0.01" value="${esc(job.salary ?? '')}" placeholder="Placement only"></div><div class="field"><label>Application opens</label><input class="input" name="open_date" type="datetime-local" step="1" value="${esc(dateTimeInput(job.open_date))}" required></div><div class="field"><label>Application deadline</label><input class="input" name="deadline" type="datetime-local" step="1" value="${esc(dateTimeInput(job.deadline))}" required></div><div class="field span-2"><label>Description</label><textarea class="textarea" name="description" maxlength="65535">${esc(job.description)}</textarea></div></div>`;
    showModal(isEdit ? 'Edit opportunity' : 'Create opportunity', body, async (form, modal) => {
      const nullable = (name) => form.get(name) === '' ? null : form.get(name);
      const payload = {
        company_id: Number(form.get('company_id')),
        created_by_admin_id: Number(form.get('created_by_admin_id')),
        title: form.get('title').trim(), opportunity_type: form.get('opportunity_type'), status: form.get('status'),
        location: nullable('location'), description: nullable('description'), minimum_cgpa: nullable('minimum_cgpa'),
        stipend: nullable('stipend'), salary: nullable('salary'),
        open_date: form.get('open_date').replace('T', ' '), deadline: form.get('deadline').replace('T', ' '),
      };
      await api(isEdit ? `/admin/opportunities/${encodeURIComponent(job.opportunity_id)}` : '/admin/opportunities', {
        method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(payload),
      });
      modal.remove(); toast(isEdit ? 'Opportunity updated.' : 'Opportunity created.'); render();
    }, isEdit ? 'Save opportunity' : 'Create opportunity');
  }

  async function editOpportunity(id) {
    try {
      const [job, companies] = await Promise.all([api(`/opportunities/${encodeURIComponent(id)}`), api('/admin/companies')]);
      opportunityModal(job, companies);
    } catch (error) { toast(error.message, 'error'); }
  }

  async function createOpportunity() {
    try { opportunityModal(null, await api('/admin/companies')); }
    catch (error) { toast(error.message, 'error'); }
  }

  async function manageApplication(id, studentId, status, title) {
    let interviews = [];
    let loadError = '';
    try { interviews = await api(`/students/${encodeURIComponent(studentId)}/interviews`); interviews = interviews.filter((item) => Number(item.application_id) === Number(id)); }
    catch (error) { loadError = error.message; }
    const appInterviews = interviews.map((item) => `<div class="application-mini"><span class="job-title">Round ${esc(item.round_number)} · ${esc(timeFormat(item.scheduled_at))}</span>${item.result ? badge(item.result) : badge('Scheduled')}<span class="mini-sub">${esc(item.mode)}${item.feedback ? ` · ${esc(item.feedback)}` : ''}</span><button class="button button-quiet button-sm" style="grid-column:1/-1;justify-self:start" data-action="edit-interview" data-id="${Number(item.interview_id)}" data-result="${esc(item.result || '')}" data-feedback="${esc(item.feedback || '')}">Record result / feedback</button></div>`).join('');
    const body = `<div class="notice" style="margin-bottom:14px"><strong>${esc(title)}</strong> · Application #${esc(id)}<br>Student #${esc(studentId)}</div><div class="form-stack"><div class="field"><label>Application status</label><select class="select" name="status">${['Applied', 'Under Review', 'Shortlisted', 'Interview', 'Selected', 'Rejected', 'Withdrawn'].map((option) => `<option ${status === option ? 'selected' : ''}>${option}</option>`).join('')}</select><span class="form-help">Changing status to Selected invokes the existing placement-creation trigger.</span></div><div class="field"><label>Administrator remarks</label><textarea class="textarea" name="remarks" maxlength="500" placeholder="Optional note for the application record"></textarea></div><div class="section-heading"><div><h3>Interview rounds</h3><p>Schedule a round or update a result.</p></div></div>${loadError ? `<div class="notice warning">${esc(loadError)}</div>` : appInterviews || '<p class="small muted">No rounds scheduled yet.</p>'}<div class="notice">Student interview records are visible via the student API. This local demo can use them to show the rounds associated with this application.</div></div>`;
    showModal('Manage application', body, async (form, modal) => {
      const update = { status: form.get('status') };
      if (form.get('remarks')) update.remarks = form.get('remarks');
      await api(`/admin/applications/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(update) });
      modal.remove(); toast('Application updated.'); render();
    }, 'Save application');
    const modalBody = document.querySelector('.modal-body');
    const schedule = document.createElement('button');
    schedule.className = 'button button-outline button-sm'; schedule.type = 'button'; schedule.textContent = 'Schedule another round';
    schedule.dataset.action = 'schedule-interview'; schedule.dataset.application = String(id); modalBody?.append(schedule);
  }

  function interviewModal(id, result = '', feedback = '') {
    showModal('Update interview result', `<div class="form-stack"><div class="field"><label>Result</label><select class="select" name="result"><option value="">Not recorded</option>${['Passed', 'Failed', 'No Show'].map((option) => `<option ${result === option ? 'selected' : ''}>${option}</option>`).join('')}</select></div><div class="field"><label>Feedback</label><textarea class="textarea" name="feedback" maxlength="500">${esc(feedback)}</textarea></div></div>`, async (form, modal) => {
      await api(`/admin/interviews/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ result: form.get('result') || null, feedback: form.get('feedback') || null }) });
      modal.remove(); toast('Interview round updated.'); render();
    }, 'Save interview');
  }

  function scheduleModal(applicationId) {
    showModal('Schedule interview round', `<div class="form-stack"><div class="field"><label>Round number</label><input class="input" name="round_number" type="number" min="1" max="65535" required></div><div class="field"><label>Scheduled date and time</label><input class="input" name="scheduled_at" type="datetime-local" required></div><div class="field"><label>Mode</label><select class="select" name="mode"><option>Online</option><option>In Person</option><option>Phone</option></select></div></div>`, async (form, modal) => {
      await api(`/admin/applications/${encodeURIComponent(applicationId)}/interviews`, { method: 'POST', body: JSON.stringify({ round_number: Number(form.get('round_number')), scheduled_at: form.get('scheduled_at').replace('T', ' '), mode: form.get('mode') }) });
      modal.remove(); toast('Interview round scheduled.'); render();
    }, 'Schedule round');
  }

  function signOut() {
    state.role = ''; state.studentId = ''; state.adminId = ''; state.student = null;
    sessionStorage.removeItem('cgRole'); sessionStorage.removeItem('cgStudentId'); sessionStorage.removeItem('cgAdminId');
    go('welcome');
  }

  async function handleClick(event) {
    const nav = event.target.closest('[data-nav]');
    if (nav) { event.preventDefault(); const route = nav.dataset.nav; if (route) go(route); return; }
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    if (action === 'access-role') { state.accessRole = button.dataset.role; app.innerHTML = welcomePage(); }
    else if (action === 'signout') signOut();
    else if (action === 'menu') document.getElementById('sidebar')?.classList.toggle('open');
    else if (action === 'refresh') render();
    else if (action === 'open-job') go(`opportunity/${button.dataset.id}`);
    else if (action === 'back-opportunities') go('opportunities');
    else if (action === 'clear-opportunity-filters') { state.opportunityFilters = { search: '', type: '', location: '', eligible: '' }; render(); }
    else if (action === 'apply') applicationModal(button.dataset.id);
    else if (action === 'app-filter') { state.applicationFilter = button.dataset.status; render(); }
    else if (action === 'withdraw') {
      if (!window.confirm('Withdraw this application? This changes its status in CareerGrid.')) return;
      try { await api(`/students/${encodeURIComponent(state.studentId)}/applications/${encodeURIComponent(button.dataset.id)}`, { method: 'PATCH', body: JSON.stringify({}) }); toast('Application withdrawn.'); render(); }
      catch (error) { toast(error.message, 'error'); }
    } else if (action === 'offer-update') {
      const select = document.querySelector(`[data-offer-state="${CSS.escape(button.dataset.id)}"]`);
      try { await api(`/students/${encodeURIComponent(state.studentId)}/placements/${encodeURIComponent(button.dataset.id)}`, { method: 'PATCH', body: JSON.stringify({ placement_status: select?.value }) }); toast('Offer status updated.'); render(); }
      catch (error) { toast(error.message, 'error'); }
    } else if (action === 'add-skill') skillModal();
    else if (action === 'remove-skill') {
      if (!window.confirm('Remove this skill from your profile?')) return;
      try { await api(`/students/${encodeURIComponent(state.studentId)}/skills/${encodeURIComponent(button.dataset.id)}`, { method: 'DELETE' }); toast('Skill removed.'); render(); }
      catch (error) { toast(error.message, 'error'); }
    } else if (action === 'create-opportunity') createOpportunity();
    else if (action === 'edit-opportunity') editOpportunity(button.dataset.id);
    else if (action === 'manage-application') manageApplication(button.dataset.id, button.dataset.student, button.dataset.status, button.dataset.title);
    else if (action === 'edit-interview') interviewModal(button.dataset.id, button.dataset.result, button.dataset.feedback);
    else if (action === 'schedule-interview') scheduleModal(button.dataset.application);
    else if (action === 'close-modal') button.closest('.modal-backdrop')?.remove();
  }

  function handleSubmit(event) {
    const form = event.target;
    if (form.id === 'student-access-form') {
      event.preventDefault();
      const button = form.querySelector('[type="submit"]');
      const studentId = form.elements.student_id.value.trim();
      if (!/^\d+$/.test(studentId) || Number(studentId) < 1) { toast('Enter a valid Student ID.', 'error'); return; }
      setBusy(button, true, 'Checking your profile…');
      api(`/students/${encodeURIComponent(studentId)}`).then((student) => {
        state.role = 'student'; state.studentId = studentId; state.student = student;
        sessionStorage.setItem('cgRole', state.role); sessionStorage.setItem('cgStudentId', studentId);
        toast(`Welcome, ${student.full_name.split(' ')[0]}.`); go('dashboard');
      }).catch((error) => { setBusy(button, false); toast(error.status === 404 ? 'No student record was found for that ID.' : error.message, 'error'); });
    } else if (form.id === 'admin-access-form') {
      event.preventDefault();
      const adminId = form.elements.admin_id.value.trim();
      if (!/^\d+$/.test(adminId) || Number(adminId) < 1) { toast('Enter a valid placement admin ID.', 'error'); return; }
      state.role = 'admin'; state.adminId = adminId;
      sessionStorage.setItem('cgRole', 'admin'); sessionStorage.setItem('cgAdminId', adminId);
      toast('Opening local demo workspace.', 'info'); go('admin');
    } else if (form.id === 'profile-form') {
      event.preventDefault();
      const button = form.querySelector('[type="submit"]');
      const values = new FormData(form);
      const payload = Object.fromEntries(values.entries());
      payload.cgpa = payload.cgpa === '' ? null : Number(payload.cgpa);
      payload.graduation_year = Number(payload.graduation_year);
      payload.date_of_birth = payload.date_of_birth || null;
      setBusy(button, true, 'Saving…');
      api(`/students/${encodeURIComponent(state.studentId)}`, { method: 'PUT', body: JSON.stringify(payload) }).then((student) => {
        state.student = student.data || student;
        toast('Profile saved.'); render();
      }).catch((error) => { setBusy(button, false); toast(error.message, 'error'); });
    }
  }

  let filterTimer;
  function handleInput(event) {
    const target = event.target;
    if (target.name === 'job-search') {
      state.opportunityFilters.search = target.value;
      const query = target.value.trim().toLowerCase();
      let visible = 0;
      document.querySelectorAll('.job-row[data-search]').forEach((row) => { row.hidden = !row.dataset.search.includes(query); if (!row.hidden) visible += 1; });
      const count = document.querySelector('.page-head .badge');
      if (count) count.textContent = `${visible} open ${visible === 1 ? 'role' : 'roles'}`;
      const list = document.querySelector('.job-list');
      let noMatch = document.getElementById('job-no-match');
      if (!visible && list && !noMatch) {
        noMatch = document.createElement('div');
        noMatch.id = 'job-no-match'; noMatch.className = 'empty';
        noMatch.innerHTML = `<span class="empty-icon">${icon('search')}</span><h3>No matching roles</h3><p>Try another search or clear the current filters.</p><button class="button button-outline button-sm" data-action="clear-opportunity-filters">Clear filters</button>`;
        list.after(noMatch);
      } else if (visible && noMatch) noMatch.remove();
    } else if (target.name === 'job-location' || target.name === 'job-eligible') {
      if (target.name === 'job-location') state.opportunityFilters.location = target.value;
      if (target.name === 'job-eligible') state.opportunityFilters.eligible = target.value;
      clearTimeout(filterTimer);
      filterTimer = setTimeout(() => {
        const fieldName = target.name;
        const cursor = target.type === 'text' ? target.selectionStart : null;
        render().then(() => {
          const replacement = document.querySelector(`[name="${fieldName}"]`);
          replacement?.focus();
          if (replacement?.setSelectionRange && cursor != null) replacement.setSelectionRange(cursor, cursor);
        });
      }, 450);
    } else if (target.id === 'admin-app-search') {
      const query = target.value.toLowerCase().trim();
      document.querySelectorAll('#admin-app-table tbody tr').forEach((row) => { row.hidden = !row.dataset.search.includes(query); });
    }
  }

  function handleChange(event) {
    if (event.target.name === 'job-type') {
      state.opportunityFilters.type = event.target.value;
      render();
    }
  }

  document.addEventListener('click', handleClick);
  app.addEventListener('submit', handleSubmit);
  app.addEventListener('input', handleInput);
  app.addEventListener('change', handleChange);
  app.addEventListener('keydown', (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-action="open-job"]')) {
      event.preventDefault(); go(`opportunity/${event.target.dataset.id}`);
    }
  });
  window.addEventListener('hashchange', render);

  if (state.role === 'student' && state.studentId) loadStudent();
  render();
})();
