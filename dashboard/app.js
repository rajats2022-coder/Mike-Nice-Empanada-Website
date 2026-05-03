const STORAGE_KEY = 'mikeNiceCommandCenter.v1';

const stages = [
  { id: 'new', label: 'New' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'quoted', label: 'Quoted' },
  { id: 'booked', label: 'Booked' },
  { id: 'done', label: 'Done' },
];

const sectionMeta = {
  catering: {
    label: 'Catering',
    accent: 'Event lead',
    empty: 'No catering leads here yet.',
    playbook: [
      'Reply inside the SLA window and confirm event date, guest count, location, and budget.',
      'Move to Quoted after sending package pricing and requested fillings.',
      'Move to Booked only after date, deposit, pickup/service details, and balance timing are confirmed.',
    ],
  },
  frozen: {
    label: 'Frozen Empanadas',
    accent: 'Frozen order',
    empty: 'No frozen orders here yet.',
    playbook: [
      'Confirm pickup day, dozen count, filling mix, and whether sauces are included.',
      'Batch prep by pickup day so Friday/Saturday orders are grouped together.',
      'Move to Done when payment and pickup/delivery are completed.',
    ],
  },
  merch: {
    label: 'Merch',
    accent: 'Merch request',
    empty: 'No merch requests here yet.',
    playbook: [
      'Confirm product, size, color, quantity, and shipping or pickup preference.',
      'Move to Quoted when price and fulfillment timing are sent.',
      'Move to Done after payment and pickup/shipping handoff.',
    ],
  },
};

const defaultSettings = {
  slaHours: 4,
  minGuests: 25,
  depositPercent: 50,
  pickupDays: 'Friday, Saturday, Sunday',
  phone: '(984) 272-2728',
  email: 'mikeniceempanadas@gmail.com',
};

const demoLeads = [
  {
    id: 'lead-001',
    section: 'catering',
    status: 'new',
    customer: 'Alicia Morgan',
    phone: '(919) 555-0182',
    email: 'alicia@example.com',
    source: 'Website form',
    value: 720,
    nextAction: todayPlus(0),
    createdAt: todayPlus(-1),
    details: 'Graduation party in Raleigh. 65 guests. Asked about Birria, Pollo Loco, dessert empanadas, and sauces.',
    notes: ['Needs fast reply. Event is next Saturday.'],
  },
  {
    id: 'lead-002',
    section: 'catering',
    status: 'quoted',
    customer: 'Triangle Tech Office',
    phone: '(984) 555-0144',
    email: 'events@triangletech.example',
    source: 'Email',
    value: 1180,
    nextAction: todayPlus(1),
    createdAt: todayPlus(-4),
    details: 'Corporate lunch for 95. Wants classic and premium mix, two sides, no pork option, invoice needed.',
    notes: ['Quote sent. Waiting on procurement approval.'],
  },
  {
    id: 'lead-003',
    section: 'catering',
    status: 'booked',
    customer: 'Knightdale Parks Pop-Up',
    phone: '(919) 555-0128',
    email: 'parks@example.com',
    source: 'Referral',
    value: 890,
    nextAction: todayPlus(2),
    createdAt: todayPlus(-8),
    details: 'Community pop-up. 80 guests. Deposit confirmed. Needs arrival instructions and final count.',
    notes: ['Prep final count 48 hours before event.'],
  },
  {
    id: 'lead-004',
    section: 'frozen',
    status: 'new',
    customer: 'Derrick H.',
    phone: '(919) 555-0175',
    email: 'derrick@example.com',
    source: 'Instagram',
    value: 180,
    nextAction: todayPlus(0),
    createdAt: todayPlus(0),
    details: 'Asked for two dozen Birria frozen and one dozen Buffalo Chicken for Sunday pickup.',
    notes: ['Confirm pickup location and payment link.'],
  },
  {
    id: 'lead-005',
    section: 'frozen',
    status: 'contacted',
    customer: 'Maya R.',
    phone: '(984) 555-0109',
    email: 'maya@example.com',
    source: 'StreetFoodFinder',
    value: 320,
    nextAction: todayPlus(3),
    createdAt: todayPlus(-2),
    details: 'Family freezer pack request. Mix of classic beef, chicken, and cheese. Wants reheating card.',
    notes: ['Asked if monthly packs are available.'],
  },
  {
    id: 'lead-006',
    section: 'merch',
    status: 'new',
    customer: 'Chris B.',
    phone: '(704) 555-0166',
    email: 'chris@example.com',
    source: 'Website form',
    value: 95,
    nextAction: todayPlus(1),
    createdAt: todayPlus(0),
    details: 'Wants black snapback and red tee. Asked if pickup at the truck is possible.',
    notes: ['Check inventory before confirming.'],
  },
  {
    id: 'lead-007',
    section: 'merch',
    status: 'quoted',
    customer: 'Jasmine Crew Order',
    phone: '(980) 555-0191',
    email: 'jasmine@example.com',
    source: 'Phone call',
    value: 420,
    nextAction: todayPlus(2),
    createdAt: todayPlus(-5),
    details: 'Team order: 8 shirts, 2 hats, 1 apron. Needs sizes confirmed before invoice.',
    notes: ['Send size chart follow-up.'],
  },
];

let state = loadState();
let activeView = 'dashboard';
let filters = { catering: 'all', frozen: 'all', merch: 'all' };

const els = {
  sideNav: document.querySelector('#sideNav'),
  viewTitle: document.querySelector('#viewTitle'),
  metricGrid: document.querySelector('#metricGrid'),
  sectionPanels: document.querySelector('#sectionPanels'),
  notificationList: document.querySelector('#notificationList'),
  notificationSummary: document.querySelector('#notificationSummary'),
  followUpList: document.querySelector('#followUpList'),
  todayFocus: document.querySelector('#todayFocus'),
  todaySubtext: document.querySelector('#todaySubtext'),
  leadModal: document.querySelector('#leadModal'),
  leadForm: document.querySelector('#leadForm'),
  detailDrawer: document.querySelector('#detailDrawer'),
  settingsForm: document.querySelector('#settingsForm'),
  playbookList: document.querySelector('#playbookList'),
};

init();

function init() {
  bindNav();
  bindModal();
  bindSettings();
  renderStatusOptions();
  render();
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return JSON.parse(saved);
  return { leads: demoLeads, settings: defaultSettings };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function todayPlus(offset) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function money(value) {
  return Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function byDate(a, b) {
  return new Date(a.nextAction || a.createdAt) - new Date(b.nextAction || b.createdAt);
}

function bindNav() {
  els.sideNav.addEventListener('click', event => {
    const item = event.target.closest('.nav-item');
    if (!item) return;
    activeView = item.dataset.view;
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.toggle('active', btn === item));
    document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === `view-${activeView}`));
    els.viewTitle.textContent = document.querySelector(`#view-${activeView}`).dataset.title;
    render();
  });

  document.querySelectorAll('[data-section-filter]').forEach(row => {
    const section = row.dataset.sectionFilter;
    const chips = [{ id: 'all', label: 'All' }, ...stages];
    row.innerHTML = chips.map(chip => `<button class="filter-chip ${chip.id === 'all' ? 'active' : ''}" data-section="${section}" data-filter="${chip.id}" type="button">${chip.label}</button>`).join('');
  });

  document.body.addEventListener('click', event => {
    const chip = event.target.closest('.filter-chip');
    if (!chip) return;
    filters[chip.dataset.section] = chip.dataset.filter;
    chip.parentElement.querySelectorAll('.filter-chip').forEach(btn => btn.classList.toggle('active', btn === chip));
    renderBoards();
  });
}

function bindModal() {
  document.querySelector('#openLeadModal').addEventListener('click', () => {
    els.leadForm.reset();
    els.leadModal.showModal();
  });

  document.querySelector('#resetDemo').addEventListener('click', () => {
    state = { leads: demoLeads, settings: defaultSettings };
    saveState();
    renderStatusOptions();
    render();
  });

  els.leadForm.addEventListener('submit', event => {
    if (event.submitter?.value === 'cancel') return;
    event.preventDefault();
    const data = Object.fromEntries(new FormData(els.leadForm));
    state.leads.unshift({
      id: `lead-${Date.now()}`,
      section: data.section,
      status: data.status,
      customer: data.customer.trim(),
      phone: data.phone.trim(),
      email: data.email.trim(),
      source: data.source,
      value: Number(data.value || 0),
      nextAction: data.nextAction || todayPlus(1),
      createdAt: todayPlus(0),
      details: data.details.trim() || 'No details entered yet.',
      notes: ['Manually added in dashboard.'],
    });
    saveState();
    els.leadModal.close();
    render();
  });
}

function bindSettings() {
  document.querySelector('#saveSettings').addEventListener('click', () => {
    const data = Object.fromEntries(new FormData(els.settingsForm));
    state.settings = { ...state.settings, ...data };
    saveState();
    renderSettings();
  });
}

function renderStatusOptions() {
  const select = els.leadForm.querySelector('[name="status"]');
  select.innerHTML = stages.map(stage => `<option value="${stage.id}">${stage.label}</option>`).join('');
}

function render() {
  renderSummary();
  renderDashboard();
  renderBoards();
  renderSettings();
}

function renderSummary() {
  const newCount = state.leads.filter(lead => lead.status === 'new').length;
  const dueToday = state.leads.filter(lead => lead.nextAction <= todayPlus(0) && !['done'].includes(lead.status)).length;
  const cateringNew = state.leads.filter(lead => lead.section === 'catering' && lead.status === 'new').length;
  els.notificationSummary.textContent = `${newCount} new opportunities, ${dueToday} follow-ups due, ${cateringNew} catering notifications need first action.`;
  els.todayFocus.textContent = `${dueToday} follow-ups`;
  els.todaySubtext.textContent = `${newCount} new items across catering, frozen, and merch.`;
}

function renderDashboard() {
  const totalValue = state.leads.reduce((sum, lead) => sum + Number(lead.value || 0), 0);
  const bookedValue = state.leads.filter(lead => ['booked', 'done'].includes(lead.status)).reduce((sum, lead) => sum + Number(lead.value || 0), 0);
  const due = state.leads.filter(lead => lead.nextAction <= todayPlus(0) && lead.status !== 'done').length;
  const newLeads = state.leads.filter(lead => lead.status === 'new').length;

  els.metricGrid.innerHTML = [
    metric('Pipeline', money(totalValue), 'Estimated value across all sections'),
    metric('Booked', money(bookedValue), 'Confirmed or completed revenue'),
    metric('Due Today', due, 'Needs call, text, quote, or payment link'),
    metric('New Leads', newLeads, 'Fresh notifications to organize'),
  ].join('');

  els.sectionPanels.innerHTML = Object.keys(sectionMeta).map(section => sectionPanel(section)).join('');
  els.notificationList.innerHTML = state.leads.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 7).map(notificationItem).join('');

  const followUps = state.leads.filter(lead => lead.status !== 'done').slice().sort(byDate).slice(0, 7);
  els.followUpList.innerHTML = followUps.map(lead => `
    <button class="task-item" type="button" onclick="openLead('${lead.id}')">
      <strong>${lead.customer}</strong>
      <p>${sectionMeta[lead.section].label} - ${stageLabel(lead.status)} - next action ${lead.nextAction || 'not set'}</p>
    </button>
  `).join('') || '<div class="task-item"><strong>Nothing due</strong><p>All visible work is either completed or waiting on the customer.</p></div>';
}

function metric(label, value, helper) {
  return `<section class="metric-card"><p class="eyebrow">${label}</p><strong>${value}</strong><span>${helper}</span></section>`;
}

function sectionPanel(section) {
  const leads = state.leads.filter(lead => lead.section === section);
  const value = leads.reduce((sum, lead) => sum + Number(lead.value || 0), 0);
  const urgent = leads.filter(lead => lead.nextAction <= todayPlus(0) && lead.status !== 'done').length;
  const latest = leads.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3);
  return `
    <section class="section-card">
      <header>
        <div><p class="eyebrow">${sectionMeta[section].accent}</p><h2>${sectionMeta[section].label}</h2></div>
        <span class="big-number">${leads.length}</span>
      </header>
      <ul>
        <li><span>Pipeline value</span><strong>${money(value)}</strong></li>
        <li><span>Needs action today</span><strong>${urgent}</strong></li>
        <li><span>Booked / done</span><strong>${leads.filter(lead => ['booked', 'done'].includes(lead.status)).length}</strong></li>
      </ul>
      <div class="notification-list">${latest.map(lead => `<button class="notification-item" type="button" onclick="openLead('${lead.id}')"><strong>${lead.customer}</strong><span class="tag red">${stageLabel(lead.status)}</span></button>`).join('')}</div>
      <footer><button class="ghost-btn compact" type="button" onclick="showView('${section}')">Open ${sectionMeta[section].label}</button></footer>
    </section>
  `;
}

function notificationItem(lead) {
  return `
    <button class="notification-item" type="button" onclick="openLead('${lead.id}')">
      <div>
        <strong>${lead.customer}</strong>
        <p>${sectionMeta[lead.section].label} via ${lead.source}. ${lead.details}</p>
      </div>
      <span class="tag ${lead.status === 'new' ? 'red' : 'dark'}">${stageLabel(lead.status)}</span>
    </button>
  `;
}

function renderBoards() {
  ['catering', 'frozen', 'merch'].forEach(section => {
    const board = document.querySelector(`#${section}Board`);
    if (!board) return;
    board.innerHTML = stages.map(stage => renderColumn(section, stage)).join('');
  });
}

function renderColumn(section, stage) {
  const sectionFilter = filters[section];
  const leads = state.leads.filter(lead => lead.section === section && lead.status === stage.id && (sectionFilter === 'all' || lead.status === sectionFilter));
  return `
    <section class="lead-column">
      <div class="column-head"><h3>${stage.label}</h3><span class="count-pill">${leads.length}</span></div>
      <div class="card-stack">
        ${leads.map(leadCard).join('') || `<div class="lead-card"><p>${sectionMeta[section].empty}</p></div>`}
      </div>
    </section>
  `;
}

function leadCard(lead) {
  return `
    <article class="lead-card">
      <header><strong>${lead.customer}</strong><span class="tag red">${money(lead.value)}</span></header>
      <p>${lead.details}</p>
      <div class="meta-row">
        <span class="tag">${lead.source}</span>
        <span class="tag dark">Next: ${lead.nextAction || 'unset'}</span>
      </div>
      <div class="card-actions">
        <button type="button" onclick="openLead('${lead.id}')">Open</button>
        <button type="button" onclick="moveLead('${lead.id}', 1)">Next Stage</button>
      </div>
    </article>
  `;
}

function stageLabel(status) {
  return stages.find(stage => stage.id === status)?.label || status;
}

function moveLead(id, direction) {
  const lead = state.leads.find(item => item.id === id);
  if (!lead) return;
  const index = stages.findIndex(stage => stage.id === lead.status);
  const next = stages[Math.max(0, Math.min(stages.length - 1, index + direction))];
  lead.status = next.id;
  if (!lead.notes) lead.notes = [];
  lead.notes.unshift(`Moved to ${next.label} on ${todayPlus(0)}.`);
  saveState();
  render();
  openLead(id);
}

function openLead(id) {
  const lead = state.leads.find(item => item.id === id);
  if (!lead) return;
  els.detailDrawer.innerHTML = `
    <div class="drawer-head">
      <div><p class="eyebrow">${sectionMeta[lead.section].label}</p><h2>${lead.customer}</h2></div>
      <button class="icon-btn" type="button" onclick="closeLead()">x</button>
    </div>
    <div class="meta-row">
      <span class="tag red">${stageLabel(lead.status)}</span>
      <span class="tag">${money(lead.value)}</span>
      <span class="tag dark">${lead.source}</span>
    </div>
    <section class="detail-section"><h3>Request</h3><p>${lead.details}</p></section>
    <section class="detail-section"><h3>Contact</h3><p>${lead.phone || 'No phone'}<br>${lead.email || 'No email'}</p></section>
    <section class="detail-section"><h3>Next Action</h3><p>${lead.nextAction || 'No date set'}</p></section>
    <section class="detail-section"><h3>Notes</h3><p>${(lead.notes || []).join('<br>') || 'No notes yet.'}</p></section>
    <div class="drawer-actions">
      <button type="button" onclick="moveLead('${lead.id}', -1)">Move Back</button>
      <button class="primary" type="button" onclick="moveLead('${lead.id}', 1)">Move Forward</button>
      <button type="button" onclick="setNextAction('${lead.id}', 1)">Follow Up Tomorrow</button>
      <button type="button" onclick="setNextAction('${lead.id}', 3)">Follow Up in 3 Days</button>
      <button class="danger" type="button" onclick="archiveLead('${lead.id}')">Mark Done</button>
    </div>
  `;
  els.detailDrawer.classList.add('open');
}

function closeLead() {
  els.detailDrawer.classList.remove('open');
}

function setNextAction(id, days) {
  const lead = state.leads.find(item => item.id === id);
  if (!lead) return;
  lead.nextAction = todayPlus(days);
  lead.notes.unshift(`Next follow-up set for ${lead.nextAction}.`);
  saveState();
  render();
  openLead(id);
}

function archiveLead(id) {
  const lead = state.leads.find(item => item.id === id);
  if (!lead) return;
  lead.status = 'done';
  lead.notes.unshift(`Marked done on ${todayPlus(0)}.`);
  saveState();
  render();
  openLead(id);
}

function showView(view) {
  const button = document.querySelector(`.nav-item[data-view="${view}"]`);
  if (button) button.click();
}

function renderSettings() {
  Object.entries(state.settings).forEach(([key, value]) => {
    const input = els.settingsForm.querySelector(`[name="${key}"]`);
    if (input) input.value = value;
  });

  els.playbookList.innerHTML = Object.entries(sectionMeta).map(([section, meta]) => `
    <article class="playbook-item">
      <strong>${meta.label}</strong>
      <p>${meta.playbook.join(' ')}</p>
    </article>
  `).join('');
}

window.openLead = openLead;
window.closeLead = closeLead;
window.moveLead = moveLead;
window.setNextAction = setNextAction;
window.archiveLead = archiveLead;
window.showView = showView;
