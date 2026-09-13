/**
 * Don't Forget - Storage & Data Management Layer
 * Handles persistent storage via chrome.storage.local, alarms, and data integrity.
 */

const STORAGE_KEYS = {
  EVENTS: 'eventpulse_events',
  SETTINGS: 'eventpulse_settings',
  INITIALIZED: 'eventpulse_initialized'
};

export const DEFAULT_SETTINGS = {
  userName: 'Friend',
  theme: 'system', // 'system' | 'dark' | 'light'
  timeFormat24h: false,
  soundEnabled: true,
  notifyOnStartup: true,
  openTabOnStartup: true, // Automatically open event page in a new tab on browser start
  defaultReminderMinutes: 60
};

export const CATEGORIES = [
  { id: 'work', label: 'Work', color: '#3b82f6', icon: '💼' },
  { id: 'meeting', label: 'Meeting', color: '#06b6d4', icon: '👥' },
  { id: 'exam', label: 'Exam / Study', color: '#8b5cf6', icon: '📚' },
  { id: 'deadline', label: 'Deadline', color: '#ef4444', icon: '⏰' },
  { id: 'birthday', label: 'Birthday / Celebration', color: '#ec4899', icon: '🎂' },
  { id: 'health', label: 'Health & Fitness', color: '#10b981', icon: '🏃' },
  { id: 'personal', label: 'Personal', color: '#f59e0b', icon: '⭐' },
  { id: 'other', label: 'Other', color: '#64748b', icon: '📌' }
];

export const PRIORITIES = [
  { id: 'urgent', label: 'Urgent', color: '#ef4444', rank: 4 },
  { id: 'high', label: 'High', color: '#f97316', rank: 3 },
  { id: 'medium', label: 'Medium', color: '#3b82f6', rank: 2 },
  { id: 'low', label: 'Low', color: '#6b7280', rank: 1 }
];

/**
 * Helper to safely call chrome.storage.local
 */
function getStorage(keys) {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(keys, (res) => resolve(res || {}));
    } else {
      // Fallback for non-extension mock/test environments
      const result = {};
      const keyList = Array.isArray(keys) ? keys : [keys];
      keyList.forEach((k) => {
        try {
          const val = localStorage.getItem(k);
          if (val) result[k] = JSON.parse(val);
        } catch (_) {}
      });
      resolve(result);
    }
  });
}

function setStorage(data) {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set(data, () => resolve());
    } else {
      Object.entries(data).forEach(([k, v]) => {
        try {
          localStorage.setItem(k, JSON.stringify(v));
        } catch (_) {}
      });
      resolve();
    }
  });
}

/**
 * Generate initial starter events for a fresh installation
 */
function getStarterEvents() {
  const now = new Date();
  
  // Sample event 1: Due in 4 hours
  const sample1Time = new Date(now.getTime() + 4 * 60 * 60 * 1000);
  // Sample event 2: Due in 2 days at 10:00 AM
  const sample2Time = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  sample2Time.setHours(10, 0, 0, 0);

  return [
    {
      id: 'evt_sample_1',
      title: "Welcome to Don't Forget! 🎯",
      description: 'Never miss what matters: explore your events, customize settings, or add your next deadline.',
      targetDate: sample1Time.toISOString(),
      category: 'personal',
      priority: 'high',
      reminderTiming: 60, // 1 hour before
      recurrence: 'none',
      isCompleted: false,
      completedAt: null,
      createdAt: now.toISOString()
    },
    {
      id: 'evt_sample_2',
      title: 'Project Milestone Review',
      description: 'Review pending deliverables and sync with the team on upcoming schedule.',
      targetDate: sample2Time.toISOString(),
      category: 'work',
      priority: 'urgent',
      reminderTiming: 1440, // 1 day before
      recurrence: 'none',
      isCompleted: false,
      completedAt: null,
      createdAt: now.toISOString()
    }
  ];
}

/**
 * Initialize storage with defaults on first run
 */
export async function initializeStorageIfEmpty() {
  const data = await getStorage([STORAGE_KEYS.INITIALIZED, STORAGE_KEYS.EVENTS, STORAGE_KEYS.SETTINGS]);
  if (!data[STORAGE_KEYS.INITIALIZED]) {
    const starterEvents = getStarterEvents();
    await setStorage({
      [STORAGE_KEYS.INITIALIZED]: true,
      [STORAGE_KEYS.EVENTS]: starterEvents,
      [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS
    });
    await syncAlarmsForEvents(starterEvents);
    return true;
  }
  return false;
}

/**
 * Retrieve all events
 */
export async function getEvents() {
  await initializeStorageIfEmpty();
  const data = await getStorage(STORAGE_KEYS.EVENTS);
  const events = data[STORAGE_KEYS.EVENTS] || [];
  return events.sort((a, b) => new Date(a.targetDate) - new Date(b.targetDate));
}

/**
 * Retrieve settings
 */
export async function getSettings() {
  const data = await getStorage(STORAGE_KEYS.SETTINGS);
  return { ...DEFAULT_SETTINGS, ...(data[STORAGE_KEYS.SETTINGS] || {}) };
}

/**
 * Save updated settings
 */
export async function saveSettings(updates) {
  const current = await getSettings();
  const updated = { ...current, ...updates };
  await setStorage({ [STORAGE_KEYS.SETTINGS]: updated });
  return updated;
}

/**
 * Save an event (Create or Update)
 */
export async function saveEvent(eventData) {
  const events = await getEvents();
  const nowIso = new Date().toISOString();
  let savedEvent;

  if (eventData.id) {
    // Update existing
    const index = events.findIndex(e => e.id === eventData.id);
    if (index !== -1) {
      savedEvent = {
        ...events[index],
        ...eventData,
        updatedAt: nowIso
      };
      events[index] = savedEvent;
    } else {
      savedEvent = {
        ...eventData,
        createdAt: eventData.createdAt || nowIso
      };
      events.push(savedEvent);
    }
  } else {
    // Create new
    savedEvent = {
      ...eventData,
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      isCompleted: false,
      completedAt: null,
      createdAt: nowIso
    };
    events.push(savedEvent);
  }

  await setStorage({ [STORAGE_KEYS.EVENTS]: events });
  await scheduleAlarmForEvent(savedEvent);
  return savedEvent;
}

/**
 * Toggle event completion status
 */
export async function toggleComplete(id) {
  const events = await getEvents();
  const event = events.find(e => e.id === id);
  if (!event) return null;

  event.isCompleted = !event.isCompleted;
  event.completedAt = event.isCompleted ? new Date().toISOString() : null;

  // Handle recurrence if marked complete
  if (event.isCompleted && event.recurrence && event.recurrence !== 'none') {
    const nextTarget = calculateNextRecurrence(event.targetDate, event.recurrence);
    if (nextTarget) {
      // Re-activate with new recurrence target
      event.targetDate = nextTarget.toISOString();
      event.isCompleted = false;
      event.completedAt = null;
    }
  }

  await setStorage({ [STORAGE_KEYS.EVENTS]: events });
  if (event.isCompleted) {
    await clearAlarmForEvent(event.id);
  } else {
    await scheduleAlarmForEvent(event);
  }
  return event;
}

/**
 * Calculate next recurrence date
 */
function calculateNextRecurrence(dateString, recurrence) {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return null;

  switch (recurrence) {
    case 'daily':
      d.setDate(d.getDate() + 1);
      break;
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1);
      break;
    default:
      return null;
  }
  return d;
}

/**
 * Delete an event
 */
export async function deleteEvent(id) {
  let events = await getEvents();
  events = events.filter(e => e.id !== id);
  await setStorage({ [STORAGE_KEYS.EVENTS]: events });
  await clearAlarmForEvent(id);
  return true;
}

/**
 * Clear all completed events
 */
export async function clearCompletedEvents() {
  let events = await getEvents();
  const completedIds = events.filter(e => e.isCompleted).map(e => e.id);
  events = events.filter(e => !e.isCompleted);
  await setStorage({ [STORAGE_KEYS.EVENTS]: events });
  for (const id of completedIds) {
    await clearAlarmForEvent(id);
  }
  return events;
}

/**
 * Snooze an event by N minutes
 */
export async function snoozeEvent(id, minutes = 60) {
  const events = await getEvents();
  const event = events.find(e => e.id === id);
  if (!event) return null;

  const currentTarget = new Date(event.targetDate).getTime();
  const baseTime = currentTarget > Date.now() ? currentTarget : Date.now();
  event.targetDate = new Date(baseTime + minutes * 60 * 1000).toISOString();
  event.isCompleted = false;
  event.completedAt = null;

  await setStorage({ [STORAGE_KEYS.EVENTS]: events });
  await scheduleAlarmForEvent(event);
  return event;
}

/**
 * Synchronize chrome.alarms for all events
 */
export async function syncAlarmsForEvents(eventsList) {
  if (typeof chrome === 'undefined' || !chrome.alarms) return;
  chrome.alarms.clearAll(async () => {
    const list = eventsList || (await getEvents());
    for (const evt of list) {
      if (!evt.isCompleted) {
        await scheduleAlarmForEvent(evt);
      }
    }
  });
}

/**
 * Schedule Chrome Alarm for a single event
 */
export async function scheduleAlarmForEvent(event) {
  if (typeof chrome === 'undefined' || !chrome.alarms || event.isCompleted) return;

  const targetMs = new Date(event.targetDate).getTime();
  const nowMs = Date.now();

  // Clear existing alarms for this event
  await clearAlarmForEvent(event.id);

  // 1. Alarm at exact time
  if (targetMs > nowMs) {
    chrome.alarms.create(`event_exact_${event.id}`, { when: targetMs });
  }

  // 2. Alarm for pre-event reminder if configured
  const reminderMinutes = Number(event.reminderTiming);
  if (reminderMinutes > 0) {
    const reminderMs = targetMs - reminderMinutes * 60 * 1000;
    if (reminderMs > nowMs) {
      chrome.alarms.create(`event_reminder_${event.id}`, { when: reminderMs });
    }
  }
}

/**
 * Clear alarms for an event
 */
export function clearAlarmForEvent(eventId) {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.alarms) return resolve();
    chrome.alarms.clear(`event_exact_${eventId}`, () => {
      chrome.alarms.clear(`event_reminder_${eventId}`, () => resolve());
    });
  });
}

/**
 * Export all data to a JSON string
 */
export async function exportData() {
  const events = await getEvents();
  const settings = await getSettings();
  const exportPayload = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    events,
    settings
  };
  return JSON.stringify(exportPayload, null, 2);
}

/**
 * Import data from JSON string
 */
export async function importData(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (!data || !Array.isArray(data.events)) {
      throw new Error('Invalid backup file format: missing "events" array.');
    }

    const currentEvents = await getEvents();
    const currentMap = new Map(currentEvents.map(e => [e.id, e]));

    // Merge events, updating existing or adding new
    data.events.forEach(evt => {
      if (evt && evt.title && evt.targetDate) {
        const id = evt.id || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        currentMap.set(id, { ...evt, id });
      }
    });

    const mergedEvents = Array.from(currentMap.values());
    await setStorage({ [STORAGE_KEYS.EVENTS]: mergedEvents });

    if (data.settings) {
      await saveSettings(data.settings);
    }

    await syncAlarmsForEvents(mergedEvents);
    return { success: true, count: mergedEvents.length };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

