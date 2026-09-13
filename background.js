/**
 * Don't Forget - Background Service Worker (Manifest V3)
 * Handles alarms, notifications, startup events (opens reminder tab once on browser launch),
 * and extension badge updates.
 */

import {
  initializeStorageIfEmpty,
  getEvents,
  getSettings,
  syncAlarmsForEvents
} from './storage.js';

// Setup on extension install or update
chrome.runtime.onInstalled.addListener(async (details) => {
  await initializeStorageIfEmpty();
  const events = await getEvents();
  await syncAlarmsForEvents(events);
  await updateExtensionBadge();

  // Open the events page immediately on initial install
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  }
});

// Setup on browser startup (fires only ONCE when browser application opens)
chrome.runtime.onStartup.addListener(async () => {
  await handleBrowserStartup();
});

/**
 * Handle browser launch event:
 * Opens the event reminder tab ONCE on browser start and checks today's schedule.
 */
async function handleBrowserStartup() {
  try {
    const settings = await getSettings();
    const events = await getEvents();
    await updateExtensionBadge();

    // 1. Open the event reminder tab only once when the browser is opened
    if (settings.openTabOnStartup !== false) {
      chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
    }

    // 2. Check upcoming/overdue active events for desktop notification briefing
    const now = Date.now();
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const activeEvents = events.filter(e => !e.isCompleted);
    const todayEvents = activeEvents.filter(e => {
      const t = new Date(e.targetDate).getTime();
      return t <= endOfDay.getTime();
    });

    // If user enabled startup notifications and has events today
    if (settings.notifyOnStartup && todayEvents.length > 0) {
      const overdueCount = todayEvents.filter(e => new Date(e.targetDate).getTime() < now).length;
      const upcomingTodayCount = todayEvents.length - overdueCount;

      let summary = '';
      if (overdueCount > 0 && upcomingTodayCount > 0) {
        summary = `⚠️ ${overdueCount} overdue and ${upcomingTodayCount} due today!`;
      } else if (overdueCount > 0) {
        summary = `⚠️ You have ${overdueCount} overdue event(s) waiting for you.`;
      } else {
        const nextEvent = todayEvents[0];
        const timeStr = new Date(nextEvent.targetDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        summary = `Next: "${nextEvent.title}" at ${timeStr}. (${todayEvents.length} total today)`;
      }

      chrome.notifications.create('startup_daily_digest', {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: `📌 Don't Forget: Today's Schedule`,
        message: summary,
        priority: 2
      });
    }

    // Re-verify alarms in case browser was closed
    await syncAlarmsForEvents(events);
  } catch (err) {
    console.error('Error handling startup:', err);
  }
}

/**
 * Listen for scheduled alarms
 */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  const events = await getEvents();

  if (alarm.name.startsWith('event_exact_')) {
    const eventId = alarm.name.replace('event_exact_', '');
    const event = events.find(e => e.id === eventId);
    if (event && !event.isCompleted) {
      showEventNotification(event, 'due');
    }
  } else if (alarm.name.startsWith('event_reminder_')) {
    const eventId = alarm.name.replace('event_reminder_', '');
    const event = events.find(e => e.id === eventId);
    if (event && !event.isCompleted) {
      showEventNotification(event, 'upcoming');
    }
  }

  await updateExtensionBadge();
});

/**
 * Trigger native desktop notification
 */
function showEventNotification(event, type) {
  const isUrgent = event.priority === 'urgent' || event.priority === 'high';
  let title = '';
  let message = '';

  if (type === 'due') {
    title = `⏰ Event Due Now: ${event.title}`;
    message = event.description ? `${event.description}` : `Your scheduled event is happening right now!`;
  } else {
    const minutes = event.reminderTiming || 60;
    const timeText = minutes >= 1440 ? `${Math.round(minutes / 1440)} day(s)` : minutes >= 60 ? `${Math.round(minutes / 60)} hour(s)` : `${minutes} minutes`;
    title = `🔔 Reminder: ${event.title}`;
    message = `Starting in ${timeText}! ${event.description || ''}`.trim();
  }

  chrome.notifications.create(`notify_${event.id}_${Date.now()}`, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: title,
    message: message,
    priority: isUrgent ? 2 : 1,
    requireInteraction: isUrgent
  });
}

/**
 * Handle notification clicks: bring user to dashboard
 */
chrome.notifications.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
});

/**
 * Listen for storage changes to keep badge updated
 */
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === 'local' && changes['eventpulse_events']) {
    await updateExtensionBadge();
  }
});

/**
 * Update the toolbar extension badge count
 */
async function updateExtensionBadge() {
  try {
    const events = await getEvents();
    const now = Date.now();
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const activeEvents = events.filter(e => !e.isCompleted);
    const overdueEvents = activeEvents.filter(e => new Date(e.targetDate).getTime() < now);
    const dueTodayEvents = activeEvents.filter(e => {
      const t = new Date(e.targetDate).getTime();
      return t >= now && t <= endOfDay.getTime();
    });

    const totalUrgent = overdueEvents.length + dueTodayEvents.length;

    if (totalUrgent > 0) {
      chrome.action.setBadgeText({ text: String(totalUrgent) });
      if (overdueEvents.length > 0) {
        chrome.action.setBadgeBackgroundColor({ color: '#ef4444' }); // red for overdue
      } else {
        chrome.action.setBadgeBackgroundColor({ color: '#8b5cf6' }); // violet
      }
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  } catch (_) {}
}
