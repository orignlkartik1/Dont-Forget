/**
 * Don't Forget - Quick Popup Controller
 * Renders quick view, live spotlight countdown, and rapid event capture.
 */

import {
  getEvents,
  saveEvent,
  toggleComplete
} from './storage.js';

let events = [];
let popupInterval = null;

const popupSpotlight = document.getElementById('popupSpotlight');
const popupEventsList = document.getElementById('popupEventsList');
const badgeCount = document.getElementById('badgeCount');
const quickAddForm = document.getElementById('quickAddForm');
const quickTitleInput = document.getElementById('quickTitleInput');
const quickTimeInput = document.getElementById('quickTimeInput');
const openDashboardBtn = document.getElementById('openDashboardBtn');
const footerDashboardBtn = document.getElementById('footerDashboardBtn');

document.addEventListener('DOMContentLoaded', async () => {
  initDefaultQuickTime();
  await refreshPopup();

  popupInterval = setInterval(() => {
    updateCountdowns();
  }, 1000);

  initListeners();
});

function initDefaultQuickTime() {
  const defaultTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const tzOffset = defaultTime.getTimezoneOffset() * 60000;
  quickTimeInput.value = new Date(defaultTime.getTime() - tzOffset).toISOString().slice(0, 16);
}

async function refreshPopup() {
  events = await getEvents();
  renderSpotlight();
  renderUpcomingList();
}

function renderSpotlight() {
  const activeEvents = events.filter(e => !e.isCompleted);

  if (activeEvents.length === 0) {
    popupSpotlight.innerHTML = `
      <div style="text-align: center; padding: 0.5rem 0;">
        <span style="font-size: 0.85rem; color: var(--text-muted);">🎉 No upcoming events!</span>
      </div>
    `;
    return;
  }

  const spotlight = activeEvents[0];
  const now = Date.now();
  const diffMs = new Date(spotlight.targetDate).getTime() - now;
  const isOverdue = diffMs < 0;
  const timeStr = formatDiffShort(diffMs);

  popupSpotlight.innerHTML = `
    <div class="spotlight-header">
      <span class="spotlight-tag">⚡ Next Up</span>
      <span style="font-size:0.7rem; color:var(--text-muted);">${formatTimeOnly(spotlight.targetDate)}</span>
    </div>
    <div class="spotlight-title">${escapeHtml(spotlight.title)}</div>
    <div class="spotlight-timer-row">
      <span class="spotlight-countdown ${isOverdue ? 'overdue' : ''}" id="popupSpotlightTimer" data-target="${spotlight.targetDate}">
        ${isOverdue ? 'Overdue: ' + timeStr : '⏳ ' + timeStr}
      </span>
      <button class="btn-mini-done" id="popupSpotlightDone" data-id="${spotlight.id}">✓ Done</button>
    </div>
  `;

  document.getElementById('popupSpotlightDone')?.addEventListener('click', async (e) => {
    const id = e.currentTarget.dataset.id;
    await toggleComplete(id);
    await refreshPopup();
  });
}

function renderUpcomingList() {
  const activeEvents = events.filter(e => !e.isCompleted);
  badgeCount.textContent = activeEvents.length;

  if (activeEvents.length === 0) {
    popupEventsList.innerHTML = `
      <div style="font-size:0.75rem; color:var(--text-muted); text-align:center; padding: 1rem 0;">
        Nothing scheduled. Add an event above!
      </div>
    `;
    return;
  }

  // Show up to 4 upcoming events
  const displayList = activeEvents.slice(0, 4);

  popupEventsList.innerHTML = displayList.map(evt => {
    const now = Date.now();
    const diffMs = new Date(evt.targetDate).getTime() - now;
    const timeStr = formatDiffShort(diffMs);
    const isOverdue = diffMs < 0;

    return `
      <div class="popup-event-item" data-id="${evt.id}">
        <div class="popup-event-left">
          <button class="popup-checkbox" data-check-id="${evt.id}">✓</button>
          <div class="popup-event-text">
            <span class="popup-event-title">${escapeHtml(evt.title)}</span>
            <span class="popup-event-sub">${new Date(evt.targetDate).toLocaleDateString([], { month: 'short', day: 'numeric' })} • ${formatTimeOnly(evt.targetDate)}</span>
          </div>
        </div>
        <span class="popup-event-time" style="${isOverdue ? 'color: var(--color-urgent);' : ''}">${timeStr}</span>
      </div>
    `;
  }).join('');

  popupEventsList.querySelectorAll('.popup-checkbox').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.checkId;
      await toggleComplete(id);
      await refreshPopup();
    });
  });
}

function updateCountdowns() {
  const now = Date.now();
  const spotlightTimer = document.getElementById('popupSpotlightTimer');
  if (spotlightTimer && spotlightTimer.dataset.target) {
    const diffMs = new Date(spotlightTimer.dataset.target).getTime() - now;
    const isOverdue = diffMs < 0;
    const timeStr = formatDiffShort(diffMs);
    spotlightTimer.textContent = isOverdue ? 'Overdue: ' + timeStr : '⏳ ' + timeStr;
  }
}

function formatDiffShort(diffMs) {
  const abs = Math.abs(diffMs);
  const totalSec = Math.floor(abs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

function formatTimeOnly(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function initListeners() {
  quickAddForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = quickTitleInput.value.trim();
    const timeVal = quickTimeInput.value;
    if (!title || !timeVal) return;

    await saveEvent({
      title,
      targetDate: new Date(timeVal).toISOString(),
      category: 'personal',
      priority: 'medium',
      reminderTiming: 60,
      recurrence: 'none'
    });

    quickTitleInput.value = '';
    initDefaultQuickTime();
    await refreshPopup();
  });

  const openFullDashboard = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  };

  openDashboardBtn.addEventListener('click', openFullDashboard);
  footerDashboardBtn.addEventListener('click', openFullDashboard);
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

