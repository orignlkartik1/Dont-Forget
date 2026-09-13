/**
 * Don't Forget - Event Dashboard Controller
 * Modern AI template design, live ticking countdown, audio synth, and search/filtering.
 */

import {
  getEvents,
  saveEvent,
  toggleComplete,
  deleteEvent,
  snoozeEvent,
  clearCompletedEvents,
  getSettings,
  saveSettings,
  exportData,
  importData,
  CATEGORIES,
  PRIORITIES
} from './storage.js';

// State
let events = [];
let settings = {};
let currentTab = 'upcoming';
let currentCategory = 'all';
let currentSort = 'date-asc';
let searchQuery = '';
let viewMode = 'grid'; // 'grid' | 'list'
let timerInterval = null;

// DOM Elements
const greetingText = document.getElementById('greetingText');
const liveTime = document.getElementById('liveTime');
const liveDate = document.getElementById('liveDate');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const quickAddBtn = document.getElementById('quickAddBtn');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeIcon = document.getElementById('themeIcon');
const settingsBtn = document.getElementById('settingsBtn');

const heroSpotlight = document.getElementById('heroSpotlight');
const eventsContainer = document.getElementById('eventsContainer');
const emptyState = document.getElementById('emptyState');
const emptyAddBtn = document.getElementById('emptyAddBtn');

const statTotal = document.getElementById('statTotal');
const statToday = document.getElementById('statToday');
const statOverdue = document.getElementById('statOverdue');
const statCompleted = document.getElementById('statCompleted');

const statusTabs = document.getElementById('statusTabs');
const categoryFilter = document.getElementById('categoryFilter');
const sortBy = document.getElementById('sortBy');
const viewGridBtn = document.getElementById('viewGridBtn');
const viewListBtn = document.getElementById('viewListBtn');

// Modals
const eventModal = document.getElementById('eventModal');
const modalTitle = document.getElementById('modalTitle');
const eventForm = document.getElementById('eventForm');
const eventIdInput = document.getElementById('eventId');
const eventTitleInput = document.getElementById('eventTitleInput');
const eventDateTimeInput = document.getElementById('eventDateTimeInput');
const eventCategorySelect = document.getElementById('eventCategorySelect');
const eventPrioritySelect = document.getElementById('eventPrioritySelect');
const eventReminderSelect = document.getElementById('eventReminderSelect');
const eventRecurrenceSelect = document.getElementById('eventRecurrenceSelect');
const eventDescInput = document.getElementById('eventDescInput');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');

// Settings Modal
const settingsModal = document.getElementById('settingsModal');
const settingUserName = document.getElementById('settingUserName');
const settingTheme = document.getElementById('settingTheme');
const setting24h = document.getElementById('setting24h');
const settingSound = document.getElementById('settingSound');
const settingStartupNotify = document.getElementById('settingStartupNotify');
const settingOpenOnStartup = document.getElementById('settingOpenOnStartup');
const testSoundBtn = document.getElementById('testSoundBtn');
const exportDataBtn = document.getElementById('exportDataBtn');
const importDataBtn = document.getElementById('importDataBtn');
const importFileInput = document.getElementById('importFileInput');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');

const toastContainer = document.getElementById('toastContainer');

/* ==========================================================================
   Initialization
   ========================================================================== */
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  initCategoryDropdowns();
  initEventListeners();
  applyTheme(settings.theme);
  updateClock();

  // 1-second continuous ticker for clock and live countdowns
  timerInterval = setInterval(() => {
    updateClock();
    updateLiveCountdowns();
  }, 1000);

  // Storage event listener
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') {
        loadData();
      }
    });
  }
});

/**
 * Fetch events and settings from storage and re-render
 */
async function loadData() {
  settings = await getSettings();
  events = await getEvents();
  renderGreeting();
  renderStats();
  renderHeroSpotlight();
  renderEvents();
}

/**
 * Populate category dropdowns in filter bar and modal
 */
function initCategoryDropdowns() {
  categoryFilter.innerHTML = `<option value="all">All Categories</option>` + 
    CATEGORIES.map(c => `<option value="${c.id}">${c.icon} ${c.label}</option>`).join('');

  eventCategorySelect.innerHTML = CATEGORIES.map(c => 
    `<option value="${c.id}">${c.icon} ${c.label}</option>`
  ).join('');
}

/* ==========================================================================
   Clock & Greeting
   ========================================================================== */
function updateClock() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  if (settings.timeFormat24h) {
    liveTime.textContent = `${String(hours).padStart(2, '0')}:${minutes}:${seconds}`;
  } else {
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    liveTime.textContent = `${String(h12).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
  }

  const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
  liveDate.textContent = now.toLocaleDateString(undefined, options);
}

function renderGreeting() {
  const hour = new Date().getHours();
  let timeOfDay = 'day';
  if (hour >= 5 && hour < 12) timeOfDay = 'morning';
  else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
  else if (hour >= 17 && hour < 22) timeOfDay = 'evening';
  else timeOfDay = 'night';

  const name = settings.userName && settings.userName.trim() ? settings.userName.trim() : 'Friend';
  greetingText.textContent = `Good ${timeOfDay}, ${name}`;
}

/* ==========================================================================
   Hero Spotlight (Next Imminent Event)
   ========================================================================== */
function renderHeroSpotlight() {
  const now = Date.now();
  const activeEvents = events.filter(e => !e.isCompleted);

  if (activeEvents.length === 0) {
    heroSpotlight.innerHTML = `
      <div class="hero-empty-state">
        <div class="hero-empty-left">
          <h2 class="hero-empty-title">All caught up! ✦</h2>
          <p class="hero-empty-subtitle">You have no upcoming deadlines or scheduled events. Enjoy your time!</p>
        </div>
        <button id="heroAddBtn" class="btn btn-primary">+ Add New Event</button>
      </div>
    `;
    const heroAddBtn = document.getElementById('heroAddBtn');
    if (heroAddBtn) heroAddBtn.addEventListener('click', () => openEventModal());
    return;
  }

  const spotlightEvent = activeEvents[0];
  const targetMs = new Date(spotlightEvent.targetDate).getTime();
  const diffMs = targetMs - now;

  const categoryObj = CATEGORIES.find(c => c.id === spotlightEvent.category) || CATEGORIES[CATEGORIES.length - 1];
  const priorityObj = PRIORITIES.find(p => p.id === spotlightEvent.priority) || PRIORITIES[2];

  const createdMs = new Date(spotlightEvent.createdAt || now).getTime();
  const totalDuration = Math.max(1, targetMs - createdMs);
  const elapsed = Math.max(0, now - createdMs);
  const progressPct = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100)).toFixed(1);

  const parts = getCountdownParts(diffMs);
  const isOverdue = diffMs < 0;

  heroSpotlight.innerHTML = `
    <div class="hero-header">
      <div class="hero-badge-group">
        <span class="hero-spotlight-label">✦ Priority Focus</span>
        <span class="category-badge" style="--cat-bg: ${categoryObj.color}15; --cat-color: ${categoryObj.color}; --cat-border: ${categoryObj.color}35;">
          ${categoryObj.icon} ${categoryObj.label}
        </span>
        <span class="priority-badge" style="--prio-bg: ${priorityObj.color}20; --prio-color: ${priorityObj.color};">
          ${priorityObj.label}
        </span>
      </div>
      <div class="hero-actions">
        <button class="btn btn-secondary btn-sm" id="heroSnoozeBtn" title="Snooze 1 hour">⏰ +1h</button>
        <button class="btn btn-secondary btn-sm" id="heroEditBtn">Edit</button>
        <button class="btn btn-primary btn-sm" id="heroDoneBtn">✓ Mark Done</button>
      </div>
    </div>

    <div class="hero-title-section">
      <h2 class="hero-event-title">${escapeHtml(spotlightEvent.title)}</h2>
      ${spotlightEvent.description ? `<p class="hero-event-desc">${escapeHtml(spotlightEvent.description)}</p>` : ''}
    </div>

    <div class="hero-countdown-grid" id="heroCountdownTimer" data-target="${spotlightEvent.targetDate}">
      ${isOverdue ? `
        <div class="event-countdown-pill status-overdue" style="font-size: 1.05rem; padding: 0.75rem 1.25rem;">
          🚨 Overdue by ${parts.formatted}
        </div>
      ` : `
        <div class="countdown-box">
          <span class="countdown-box-val" id="heroDays">${parts.days}</span>
          <span class="countdown-box-unit">Days</span>
        </div>
        <span class="countdown-separator">:</span>
        <div class="countdown-box">
          <span class="countdown-box-val" id="heroHours">${parts.hours}</span>
          <span class="countdown-box-unit">Hours</span>
        </div>
        <span class="countdown-separator">:</span>
        <div class="countdown-box">
          <span class="countdown-box-val" id="heroMins">${parts.minutes}</span>
          <span class="countdown-box-unit">Minutes</span>
        </div>
        <span class="countdown-separator">:</span>
        <div class="countdown-box">
          <span class="countdown-box-val" id="heroSecs">${parts.seconds}</span>
          <span class="countdown-box-unit">Seconds</span>
        </div>
      `}
    </div>

    <div class="hero-progress-wrapper">
      <div class="hero-progress-bar-bg">
        <div class="hero-progress-fill" style="width: ${progressPct}%;"></div>
      </div>
    </div>

    <div class="hero-footer">
      <div class="hero-meta">
        <span>📅 ${formatDateTime(spotlightEvent.targetDate)}</span>
        ${spotlightEvent.recurrence && spotlightEvent.recurrence !== 'none' ? `<span>🔁 ${spotlightEvent.recurrence}</span>` : ''}
      </div>
      <div class="hero-meta">
        <span>Created: ${new Date(spotlightEvent.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  `;

  document.getElementById('heroDoneBtn')?.addEventListener('click', async () => {
    triggerCelebration();
    await toggleComplete(spotlightEvent.id);
    showToast(`Completed "${spotlightEvent.title}"! 🎉`);
    await loadData();
  });

  document.getElementById('heroSnoozeBtn')?.addEventListener('click', async () => {
    await snoozeEvent(spotlightEvent.id, 60);
    showToast(`Snoozed for 1 hour ⏰`);
    await loadData();
  });

  document.getElementById('heroEditBtn')?.addEventListener('click', () => {
    openEventModal(spotlightEvent);
  });
}

/* ==========================================================================
   Stats Overview
   ========================================================================== */
function renderStats() {
  const now = Date.now();
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const activeEvents = events.filter(e => !e.isCompleted);
  const overdueEvents = activeEvents.filter(e => new Date(e.targetDate).getTime() < now);
  const todayEvents = activeEvents.filter(e => {
    const t = new Date(e.targetDate).getTime();
    return t >= now && t <= endOfDay.getTime();
  });
  const completedEvents = events.filter(e => e.isCompleted);

  statTotal.textContent = activeEvents.length;
  statToday.textContent = todayEvents.length;
  statOverdue.textContent = overdueEvents.length;
  statCompleted.textContent = completedEvents.length;
}

/* ==========================================================================
   Events Grid / List Rendering
   ========================================================================== */
function renderEvents() {
  const filtered = getFilteredAndSortedEvents();

  if (filtered.length === 0) {
    eventsContainer.style.display = 'none';
    emptyState.style.display = 'flex';
    return;
  }

  emptyState.style.display = 'none';
  eventsContainer.style.display = viewMode === 'grid' ? 'grid' : 'flex';
  eventsContainer.className = viewMode === 'grid' ? 'events-grid' : 'events-list';

  eventsContainer.innerHTML = filtered.map(evt => createEventCardHtml(evt)).join('');

  eventsContainer.querySelectorAll('.event-card').forEach(card => {
    const id = card.dataset.id;
    const evt = events.find(e => e.id === id);
    if (!evt) return;

    card.querySelector('.btn-complete-checkbox')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!evt.isCompleted) triggerCelebration();
      await toggleComplete(id);
      showToast(evt.isCompleted ? `Reactivated "${evt.title}"` : `Completed "${evt.title}"! 🎉`);
      await loadData();
    });

    card.querySelector('.btn-edit-event')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openEventModal(evt);
    });

    card.querySelector('.btn-delete-event')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm(`Delete "${evt.title}"?`)) {
        await deleteEvent(id);
        showToast(`Event deleted`);
        await loadData();
      }
    });

    card.querySelector('.btn-snooze-event')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      await snoozeEvent(id, 60);
      showToast(`Snoozed for 1 hour ⏰`);
      await loadData();
    });
  });
}

function createEventCardHtml(event) {
  const now = Date.now();
  const targetMs = new Date(event.targetDate).getTime();
  const diffMs = targetMs - now;
  const isOverdue = diffMs < 0 && !event.isCompleted;
  const isImminent = diffMs > 0 && diffMs <= 60 * 60 * 1000 && !event.isCompleted;

  const categoryObj = CATEGORIES.find(c => c.id === event.category) || CATEGORIES[CATEGORIES.length - 1];
  const priorityObj = PRIORITIES.find(p => p.id === event.priority) || PRIORITIES[2];

  const countdown = getCountdownParts(diffMs);
  let pillClass = '';
  let pillText = '';

  if (event.isCompleted) {
    pillText = `✓ Done`;
  } else if (isOverdue) {
    pillClass = 'status-overdue';
    pillText = `🚨 Overdue by ${countdown.formatted}`;
  } else if (isImminent) {
    pillClass = 'status-imminent';
    pillText = `⚠️ In ${countdown.formatted}`;
  } else {
    pillText = `⏳ In ${countdown.formatted}`;
  }

  return `
    <div class="event-card ${event.isCompleted ? 'completed' : ''}" data-id="${event.id}" style="--card-priority-color: ${priorityObj.color}">
      <div class="event-card-header">
        <div class="event-badges-row">
          <span class="category-badge" style="--cat-bg: ${categoryObj.color}15; --cat-color: ${categoryObj.color}; --cat-border: ${categoryObj.color}35;">
            ${categoryObj.icon} ${categoryObj.label}
          </span>
          <span class="priority-badge" style="--prio-bg: ${priorityObj.color}20; --prio-color: ${priorityObj.color};">
            ${priorityObj.label}
          </span>
          ${event.recurrence && event.recurrence !== 'none' ? `<span class="chip" style="font-size:0.68rem; padding: 0.12rem 0.45rem;">🔁 ${event.recurrence}</span>` : ''}
        </div>

        <button class="btn-complete-checkbox" title="${event.isCompleted ? 'Mark as active' : 'Mark as completed'}">
          ✓
        </button>
      </div>

      <div class="event-card-body">
        <h4 class="event-card-title">${escapeHtml(event.title)}</h4>
        ${event.description ? `<p class="event-card-desc">${escapeHtml(event.description)}</p>` : ''}
      </div>

      <div class="event-countdown-pill ${pillClass}" data-countdown-id="${event.id}">
        ${pillText}
      </div>

      <div class="event-card-footer">
        <span class="event-target-time">
          🕒 ${formatDateTime(event.targetDate)}
        </span>
        <div class="event-card-actions">
          ${!event.isCompleted ? `<button class="card-action-btn btn-snooze-event" title="Snooze 1h">⏰</button>` : ''}
          <button class="card-action-btn btn-edit-event" title="Edit event">✏️</button>
          <button class="card-action-btn btn-delete-event" title="Delete event">🗑️</button>
        </div>
      </div>
    </div>
  `;
}

function updateLiveCountdowns() {
  const now = Date.now();

  const heroGrid = document.getElementById('heroCountdownTimer');
  if (heroGrid && heroGrid.dataset.target) {
    const targetMs = new Date(heroGrid.dataset.target).getTime();
    const diffMs = targetMs - now;
    const parts = getCountdownParts(diffMs);

    const dEl = document.getElementById('heroDays');
    const hEl = document.getElementById('heroHours');
    const mEl = document.getElementById('heroMins');
    const sEl = document.getElementById('heroSecs');

    if (dEl && hEl && mEl && sEl) {
      dEl.textContent = parts.days;
      hEl.textContent = parts.hours;
      mEl.textContent = parts.minutes;
      sEl.textContent = parts.seconds;
    }
  }

  document.querySelectorAll('.event-countdown-pill[data-countdown-id]').forEach(pill => {
    const id = pill.dataset.countdownId;
    const evt = events.find(e => e.id === id);
    if (!evt || evt.isCompleted) return;

    const diffMs = new Date(evt.targetDate).getTime() - now;
    const parts = getCountdownParts(diffMs);

    if (diffMs < 0) {
      pill.className = 'event-countdown-pill status-overdue';
      pill.textContent = `🚨 Overdue by ${parts.formatted}`;
    } else if (diffMs <= 60 * 60 * 1000) {
      pill.className = 'event-countdown-pill status-imminent';
      pill.textContent = `⚠️ In ${parts.formatted}`;
    } else {
      pill.className = 'event-countdown-pill';
      pill.textContent = `⏳ In ${parts.formatted}`;
    }
  });
}

function getFilteredAndSortedEvents() {
  const now = Date.now();
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  return events.filter(evt => {
    const targetMs = new Date(evt.targetDate).getTime();

    if (currentTab === 'upcoming') {
      if (evt.isCompleted || targetMs < now) return false;
    } else if (currentTab === 'today') {
      if (evt.isCompleted || targetMs < now || targetMs > endOfDay.getTime()) return false;
    } else if (currentTab === 'overdue') {
      if (evt.isCompleted || targetMs >= now) return false;
    } else if (currentTab === 'completed') {
      if (!evt.isCompleted) return false;
    }

    if (currentCategory !== 'all' && evt.category !== currentCategory) {
      return false;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (evt.title || '').toLowerCase().includes(q);
      const matchDesc = (evt.description || '').toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }

    return true;
  }).sort((a, b) => {
    if (currentSort === 'date-asc') {
      return new Date(a.targetDate) - new Date(b.targetDate);
    } else if (currentSort === 'date-desc') {
      return new Date(b.targetDate) - new Date(a.targetDate);
    } else if (currentSort === 'priority-desc') {
      const rankA = PRIORITIES.find(p => p.id === a.priority)?.rank || 0;
      const rankB = PRIORITIES.find(p => p.id === b.priority)?.rank || 0;
      return rankB - rankA;
    } else if (currentSort === 'created-desc') {
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    } else if (currentSort === 'title-asc') {
      return (a.title || '').localeCompare(b.title || '');
    }
    return 0;
  });
}

function getCountdownParts(diffMs) {
  const absDiff = Math.abs(diffMs);
  const totalSeconds = Math.floor(absDiff / 1000);

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let formatted = '';
  if (days > 0) {
    formatted = `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    formatted = `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    formatted = `${minutes}m ${seconds}s`;
  } else {
    formatted = `${seconds}s`;
  }

  return {
    days: String(days).padStart(2, '0'),
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
    formatted
  };
}

function formatDateTime(isoString) {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return 'Invalid date';

  const dateStr = d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    weekday: 'short'
  });

  const timeStr = d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !settings.timeFormat24h
  });

  return `${dateStr} • ${timeStr}`;
}

function toLocalDatetimeInputValue(date) {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

function openEventModal(eventToEdit = null) {
  eventForm.reset();

  if (eventToEdit) {
    modalTitle.textContent = 'Edit Event';
    eventIdInput.value = eventToEdit.id;
    eventTitleInput.value = eventToEdit.title;
    eventDateTimeInput.value = toLocalDatetimeInputValue(new Date(eventToEdit.targetDate));
    eventCategorySelect.value = eventToEdit.category || 'work';
    eventPrioritySelect.value = eventToEdit.priority || 'medium';
    eventReminderSelect.value = String(eventToEdit.reminderTiming ?? 60);
    eventRecurrenceSelect.value = eventToEdit.recurrence || 'none';
    eventDescInput.value = eventToEdit.description || '';
  } else {
    modalTitle.textContent = 'Schedule Event';
    eventIdInput.value = '';
    const defaultTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
    eventDateTimeInput.value = toLocalDatetimeInputValue(defaultTime);
    eventCategorySelect.value = 'work';
    eventPrioritySelect.value = 'medium';
    eventReminderSelect.value = '60';
    eventRecurrenceSelect.value = 'none';
  }

  eventModal.style.display = 'flex';
  setTimeout(() => eventTitleInput.focus(), 100);
}

function closeEventModal() {
  eventModal.style.display = 'none';
}

eventForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = eventTitleInput.value.trim();
  const dateTimeVal = eventDateTimeInput.value;

  if (!title || !dateTimeVal) {
    showToast('Please provide an event title and target date/time', 'warning');
    return;
  }

  const targetDate = new Date(dateTimeVal).toISOString();

  const eventData = {
    title,
    targetDate,
    category: eventCategorySelect.value,
    priority: eventPrioritySelect.value,
    reminderTiming: Number(eventReminderSelect.value),
    recurrence: eventRecurrenceSelect.value,
    description: eventDescInput.value.trim()
  };

  if (eventIdInput.value) {
    eventData.id = eventIdInput.value;
  }

  await saveEvent(eventData);
  closeEventModal();
  showToast(eventData.id ? 'Event updated!' : 'Event scheduled! 🎯');
  await loadData();
});

document.querySelectorAll('.preset-chips .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const preset = chip.dataset.preset;
    const now = new Date();
    let target = new Date();

    if (preset === 'in-2h') {
      target = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    } else if (preset === 'tonight') {
      target.setHours(20, 0, 0, 0);
      if (target <= now) target.setDate(target.getDate() + 1);
    } else if (preset === 'tomorrow') {
      target.setDate(target.getDate() + 1);
      target.setHours(9, 0, 0, 0);
    } else if (preset === 'in-3d') {
      target = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    } else if (preset === 'in-1w') {
      target = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    eventDateTimeInput.value = toLocalDatetimeInputValue(target);
  });
});

function openSettingsModal() {
  settingUserName.value = settings.userName || '';
  settingTheme.value = settings.theme || 'system';
  setting24h.checked = !!settings.timeFormat24h;
  settingSound.checked = settings.soundEnabled !== false;
  settingStartupNotify.checked = settings.notifyOnStartup !== false;
  settingOpenOnStartup.checked = settings.openTabOnStartup !== false;

  settingsModal.style.display = 'flex';
}

function closeSettingsModal() {
  settingsModal.style.display = 'none';
}

saveSettingsBtn.addEventListener('click', async () => {
  const updates = {
    userName: settingUserName.value.trim() || 'Friend',
    theme: settingTheme.value,
    timeFormat24h: setting24h.checked,
    soundEnabled: settingSound.checked,
    notifyOnStartup: settingStartupNotify.checked,
    openTabOnStartup: settingOpenOnStartup.checked
  };

  settings = await saveSettings(updates);
  applyTheme(settings.theme);
  renderGreeting();
  updateClock();
  closeSettingsModal();
  showToast('Settings saved');
});

testSoundBtn.addEventListener('click', () => {
  playGentleChime();
});

exportDataBtn.addEventListener('click', async () => {
  const jsonStr = await exportData();
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dont_forget_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup downloaded! 📥');
});

importDataBtn.addEventListener('click', () => importFileInput.click());
importFileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    const res = await importData(event.target.result);
    if (res.success) {
      showToast(`Successfully imported ${res.count} events!`);
      await loadData();
    } else {
      showToast(`Import error: ${res.error}`, 'error');
    }
  };
  reader.readAsText(file);
  importFileInput.value = '';
});

clearCompletedBtn.addEventListener('click', async () => {
  if (confirm('Clear all completed tasks from history?')) {
    await clearCompletedEvents();
    showToast('Completed tasks cleared');
    await loadData();
  }
});

function applyTheme(theme) {
  let activeTheme = theme;
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    activeTheme = prefersDark ? 'dark' : 'light';
  }

  document.documentElement.setAttribute('data-theme', activeTheme);
  themeIcon.textContent = activeTheme === 'dark' ? '☀️' : '🌙';
}

themeToggleBtn.addEventListener('click', async () => {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  settings.theme = next;
  await saveSettings({ theme: next });
  applyTheme(next);
});

function playGentleChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const notes = [523.25, 659.25, 783.99];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

      gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + idx * 0.08 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.08);
      osc.stop(ctx.currentTime + idx * 0.08 + 0.9);
    });
  } catch (_) {}
}

function triggerCelebration() {
  if (settings.soundEnabled) {
    playGentleChime();
  }

  for (let i = 0; i < 24; i++) {
    const particle = document.createElement('div');
    const colors = ['#0284c7', '#38bdf8', '#34d399', '#f59e0b', '#818cf8'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    particle.style.position = 'fixed';
    particle.style.left = '50%';
    particle.style.top = '40%';
    particle.style.width = `${Math.random() * 8 + 6}px`;
    particle.style.height = `${Math.random() * 8 + 6}px`;
    particle.style.backgroundColor = color;
    particle.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    particle.style.zIndex = '9999';
    particle.style.pointerEvents = 'none';

    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 220 + 80;
    const destX = Math.cos(angle) * distance;
    const destY = Math.sin(angle) * distance;

    particle.animate([
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: `translate(${destX}px, ${destY + 120}px) scale(0.2)`, opacity: 0 }
    ], {
      duration: Math.random() * 600 + 700,
      easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      fill: 'forwards'
    });

    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 1400);
  }
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  const icon = type === 'warning' ? '⚠️' : type === 'error' ? '❌' : '✦';
  toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function initEventListeners() {
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
    renderEvents();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.style.display = 'none';
    renderEvents();
  });

  statusTabs.querySelectorAll('.status-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      statusTabs.querySelectorAll('.status-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.dataset.tab;
      renderEvents();
    });
  });

  document.querySelectorAll('.stat-card[data-filter]').forEach(card => {
    card.addEventListener('click', () => {
      const targetFilter = card.dataset.filter;
      const matchingTab = statusTabs.querySelector(`.status-tab[data-tab="${targetFilter}"]`);
      if (matchingTab) matchingTab.click();
    });
  });

  categoryFilter.addEventListener('change', (e) => {
    currentCategory = e.target.value;
    renderEvents();
  });

  sortBy.addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderEvents();
  });

  viewGridBtn.addEventListener('click', () => {
    viewGridBtn.classList.add('active');
    viewListBtn.classList.remove('active');
    viewMode = 'grid';
    renderEvents();
  });

  viewListBtn.addEventListener('click', () => {
    viewListBtn.classList.add('active');
    viewGridBtn.classList.remove('active');
    viewMode = 'list';
    renderEvents();
  });

  quickAddBtn.addEventListener('click', () => openEventModal());
  emptyAddBtn.addEventListener('click', () => openEventModal());
  closeModalBtn.addEventListener('click', closeEventModal);
  cancelModalBtn.addEventListener('click', closeEventModal);

  settingsBtn.addEventListener('click', openSettingsModal);
  closeSettingsBtn.addEventListener('click', closeSettingsModal);

  eventModal.addEventListener('click', (e) => {
    if (e.target === eventModal) closeEventModal();
  });
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) closeSettingsModal();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== searchInput && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      searchInput.focus();
    }
    if ((e.key === 'n' || e.key === 'N') && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      openEventModal();
    }
    if (e.key === 'Escape') {
      closeEventModal();
      closeSettingsModal();
    }
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

