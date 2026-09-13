<<<<<<< HEAD
# Dont-Forget
Smart Event Countdown &amp; Daily Reminder Browser Extension   
=======
<div align="center">

  <a href="https://github.com/96Community">
    <img src="icons/icon128.png" width="100" height="100" alt="Don't Forget Logo" style="border-radius: 24px; box-shadow: 0 4px 20px rgba(56, 189, 248, 0.35);" />
  </a>

  # ✦ Don't Forget

  ### Smart Event Countdown & Daily Reminder Browser Extension
  
  **Never miss what matters.** A modern Chromium extension (Manifest V3) crafted with an AI-inspired design system. It reminds you of your schedule **only once when you open your browser**—without hijacking every new tab.

  <p align="center">
    <a href="https://github.com/96Community">
      <img src="https://img.shields.io/badge/Community-96_Community-38bdf8?style=for-the-badge&logo=github&logoColor=white" alt="96 Community" />
    </a>
    <img src="https://img.shields.io/badge/Manifest-V3-0284c7?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Manifest V3" />
    <img src="https://img.shields.io/badge/Chrome-Compatible-38bdf8?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Chrome" />
    <img src="https://img.shields.io/badge/Edge-Compatible-0284c7?style=for-the-badge&logo=microsoftedge&logoColor=white" alt="Edge" />
    <img src="https://img.shields.io/badge/Brave-Compatible-fb542b?style=for-the-badge&logo=brave&logoColor=white" alt="Brave" />
    <img src="https://img.shields.io/badge/Storage-100%25_Local-34d399?style=for-the-badge&logo=databricks&logoColor=white" alt="Local Storage" />
  </p>

  <p align="center">
    <a href="#-key-features">Features</a> •
    <a href="#-how-to-install">Installation</a> •
    <a href="#-keyboard-shortcuts">Shortcuts</a> •
    <a href="#-project-structure">Architecture</a> •
    <a href="#-tech-stack">Tech Stack</a> •
    <a href="#-privacy--security">Privacy</a>
  </p>

</div>

---

## 💡 Why "Don't Forget"?

Most to-do extensions either take over every single tab you open (causing distraction and slowing down your workflow) or hide silently in the toolbar where you forget they even exist.

**Don't Forget** solves this with the perfect balance:
- 🚀 **One-Time Startup Reminder**: When you first launch your browser, it opens a dedicated reminder dashboard tab once so you start your day fully aware of today's deadlines.
- 🌐 **No New Tab Hijacking**: All subsequent tabs (`Ctrl + T`) open your browser's regular homepage without interference.
- ⚡ **Rapid Toolbar Capture**: Click the extension icon from any webpage to glance at live countdowns or log an event in under 3 seconds.

---

## ✨ Key Features

### 1. 🎯 Focus Hero Spotlight
- Automatically identifies and highlights your **next closest priority deadline**.
- Real-time digital countdown cards: `[DD] Days : [HH] Hours : [MM] Mins : [SS] Secs`.
- Radiant progress bar showing time elapsed from event creation to deadline.
- Instant actions: **Mark Done**, **Snooze +1h**, or **Edit**.

### 2. 🎨 Modern AI Product Design System
- **Zinc Palette**: Designed with deep neutral tones (`#09090b` zinc-950) inspired by modern AI apps (Claude, Linear, ChatGPT, Raycast).
- **Sky Blue Accents**: High-contrast electric sky blue (`#38bdf8` / `#0284c7`) with ambient radial backdrop glow.
- **Tabular Numerals**: Monospace live tickers that update smoothly without layout jitter.
- **Dark & Light Mode**: Seamless theme toggle with automatic system preference matching.

### 3. 🔔 Background Alarms & Native Notifications
- **Chrome Alarms API**: Configurable reminder intervals: *At time of event*, *15 minutes before*, *1 hour before*, *1 day before*, or *None*.
- **Daily Briefing**: Desktop notification summarizing upcoming & overdue tasks on browser launch.
- **Dynamic Badge**: Toolbar icon displays a live badge counter for events due today or overdue.

### 4. ⚡ Rapid Quick Popup
- Access your upcoming schedule from any tab without interrupting your work.
- Inline form for fast event logging with automatic date/time presets.
- 1-click completion checkboxes with confetti bursts.

### 5. 🎵 Gentle Audio Chimes & Confetti
- Synthesizes gentle harmonic chords using the browser's native **Web Audio API** (no external audio files to buffer or fail).
- Celebratory visual confetti animation when completing milestones.

### 6. 🔒 100% Private Local Storage & Backup
- Powered by `chrome.storage.local`. All data stays on your machine.
- 1-click **Export to JSON** and **Import from JSON** for complete backup and restore.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | Where |
| :--- | :--- | :--- |
| <kbd>N</kbd> | Open **New Event** modal | Anywhere on Dashboard |
| <kbd>/</kbd> | Instantly focus **Search** bar | Anywhere on Dashboard |
| <kbd>Esc</kbd> | Close any open modal | Dashboard |

---

## 🚀 How to Install

You can load and use **Don't Forget** immediately in any Chromium-based browser (**Google Chrome**, **Microsoft Edge**, **Brave**, **Opera**, **Vivaldi**):

### Step 1: Download or Clone
```bash
git clone https://github.com/96Community/dont-forget.git
```
*(Or download and extract the ZIP to your computer)*

### Step 2: Load into Browser
1. Open your browser and navigate to:
   - **Chrome / Brave:** `chrome://extensions/`
   - **Edge:** `edge://extensions/`
2. In the top-right corner, toggle **Developer mode** to **ON**.
3. Click the **Load unpacked** button in the top-left corner.
4. Select the `To-do` folder.

### Step 3: Start Using
- The **Don't Forget** dashboard will open automatically on install.
- Pin **Don't Forget** to your toolbar for quick popup access!
- Whenever you open your browser, your event schedule will be there waiting for you.

---

## 📁 Project Structure

```
To-do/
├── manifest.json       # Manifest V3 specification (permissions, background, popup)
├── background.js       # Background service worker (alarms, launch tab opener, badge)
├── storage.js          # chrome.storage.local helper, schema, alarm sync
├── dashboard.html      # Main reminder dashboard (AI product layout)
├── dashboard.css       # Sky Blue & Zinc design system stylesheet
├── dashboard.js        # Controller (live ticker, audio synth, CRUD, filters)
├── popup.html          # Quick toolbar popup UI
├── popup.css           # Popup stylesheet
├── popup.js            # Popup controller & rapid event capture
└── icons/              # Multi-resolution extension icons
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    ├── icon128.png
    └── icon.svg
```

---

## 🛠️ Tech Stack

- **Core**: Vanilla JavaScript (ES6+ Modules)
- **Extension Platform**: Google Chrome Manifest V3
- **Storage**: `chrome.storage.local`
- **Background Engine**: Chrome Service Worker (`chrome.alarms`, `chrome.notifications`, `chrome.action`, `chrome.runtime`)
- **Styling**: Modern CSS3 Custom Properties, Glassmorphism, Flexbox & CSS Grid
- **Audio**: Web Audio API (`AudioContext` harmonic sine oscillators)
- **Zero Dependencies**: 100% plug-and-play with zero `npm install` or bundler build steps needed.

---

## 🔒 Privacy & Security

- **No Remote Tracking**: Does not collect, transmit, or analyze any telemetry or user data.
- **No External Servers**: Works completely offline.
- **No Account Required**: Ready to use immediately without signup.

---

## 🤝 Community & Credits

Developed with care for the **[96 Community](https://github.com/96Community)**.

- **GitHub**: [https://github.com/96Community](https://github.com/96Community)
- **Contributions**: Pull requests, feature ideas, and feedback are always welcome! Feel free to open an issue or fork the repository.

---

<div align="center">
  <sub>Built with ✦ by the 96 Community. If you like this project, star it on GitHub! ⭐</sub>
</div>
>>>>>>> 39dbf26 (Initial commits)
