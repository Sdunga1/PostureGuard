'use strict';

// PostureGuard — Background Service Worker
// Handles Claude API calls and message routing between content scripts and side panel.

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-5-20241022';
const ANTHROPIC_VERSION = '2023-06-01';

// Settings cache (synced via chrome.storage)
const settings = {
  postureEnabled: false,
  alertThresholdMs: 5000,
  apiKey: ''
};

// Rate limiting for Claude API calls
let lastNudgeTime = 0;
const NUDGE_COOLDOWN_MS = 120000; // 2 minutes between Claude calls

// Tip cache to avoid repetition
const recentTips = [];
const MAX_CACHED_TIPS = 10;

// Fallback tips when Claude API is unavailable
const FALLBACK_TIPS = [
  'Your head is tilting forward \u2014 try pulling your chin back gently.',
  'Shoulders are uneven. Roll them back and down.',
  'You\'re leaning too close to the screen. Sit back to arm\'s length.',
  'Your head is tilting to one side. Center it over your shoulders.',
  'Time for a posture reset! Sit tall, feet flat, shoulders relaxed.',
  'You\'ve been slouching \u2014 imagine a string pulling the top of your head up.'
];

// ─── Initialization ───────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  console.log('[PostureGuard] Extension installed');
  loadSettings();
});

chrome.runtime.onStartup.addListener(() => {
  loadSettings();
});

// Open side panel on extension icon click
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// ─── Settings ─────────────────────────────────────────────────

async function loadSettings() {
  const stored = await chrome.storage.local.get([
    'postureEnabled', 'alertThresholdMs', 'apiKey'
  ]);
  Object.assign(settings, stored);
}

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== 'local') return;
  for (const [key, { newValue }] of Object.entries(changes)) {
    if (key in settings) {
      settings[key] = newValue;
    }
  }
});

// ─── Message Routing ──────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'REQUEST_NUDGE':
      handleNudgeRequest(message.metrics, sender.tab?.id)
        .then(sendResponse);
      return true; // async response

    case 'GENERATE_REPORT':
      handleReportRequest(message.sessionData)
        .then(sendResponse);
      return true;

    case 'GET_SETTINGS':
      sendResponse(settings);
      return false;

    case 'POSTURE_SCORE_UPDATE':
      // Relay score from content script to side panel
      // chrome.runtime.sendMessage broadcasts to all extension pages
      // The side panel listens for this
      return false;

    case 'POSTURE_STATUS_UPDATE':
      // Relay status from content script to side panel
      return false;

    default:
      return false;
  }
});

// ─── Claude API Integration ───────────────────────────────────

async function callClaudeAPI(systemPrompt, userMessage) {
  if (!settings.apiKey) {
    return { error: 'API key not configured. Set it in the PostureGuard side panel.' };
  }

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[PostureGuard] Claude API error:', err);
      return { error: 'API error: ' + response.status };
    }

    const data = await response.json();
    return { content: data.content[0].text };
  } catch (err) {
    console.error('[PostureGuard] Claude API fetch error:', err);
    return { error: err.message };
  }
}

function getFallbackTip() {
  const unused = FALLBACK_TIPS.filter(t => !recentTips.includes(t));
  const pool = unused.length > 0 ? unused : FALLBACK_TIPS;
  const tip = pool[Math.floor(Math.random() * pool.length)];
  recentTips.push(tip);
  if (recentTips.length > MAX_CACHED_TIPS) recentTips.shift();
  return tip;
}

async function handleNudgeRequest(metrics, tabId) {
  const now = Date.now();

  // Rate limit Claude API calls
  if (now - lastNudgeTime < NUDGE_COOLDOWN_MS || !settings.apiKey) {
    // Use fallback tip
    const tip = getFallbackTip();
    if (tabId) {
      chrome.tabs.sendMessage(tabId, { type: 'SHOW_NUDGE', tip }).catch(() => {});
    }
    return { content: tip, source: 'fallback' };
  }

  lastNudgeTime = now;

  const systemPrompt = [
    'You are PostureGuard, a friendly posture coach embedded in a Chrome extension.',
    'Given posture metrics, provide a brief, encouraging 1-sentence tip.',
    'Be specific about what the user should adjust.',
    'Never diagnose medical conditions. Be encouraging, not alarming.',
    'Do not repeat these recent tips: ' + recentTips.join('; ')
  ].join(' ');

  const userMessage = 'Current posture metrics: ' + JSON.stringify(metrics);
  const result = await callClaudeAPI(systemPrompt, userMessage);

  const tip = result.content || getFallbackTip();
  recentTips.push(tip);
  if (recentTips.length > MAX_CACHED_TIPS) recentTips.shift();

  // Send nudge to content script overlay
  if (tabId) {
    chrome.tabs.sendMessage(tabId, { type: 'SHOW_NUDGE', tip }).catch(() => {});
  }

  return result;
}

async function handleReportRequest(sessionData) {
  if (!settings.apiKey) {
    return { error: 'API key not configured' };
  }

  const systemPrompt = [
    'You are PostureGuard, an AI posture analyst.',
    'Given a session\'s posture data, provide:',
    '1. A 2-sentence summary of overall posture quality',
    '2. Top 3 issues identified (with specific metrics)',
    '3. 3-5 recommended exercises with: name, reason, duration, priority (1=highest)',
    '',
    'Respond in valid JSON:',
    '{"summary":"string","issues":["string"],"recommendations":[{"exercise":"string","reason":"string","duration":"string","priority":number}]}'
  ].join('\n');

  const userMessage = 'Session data: ' + JSON.stringify(sessionData);
  const result = await callClaudeAPI(systemPrompt, userMessage);

  if (result.content) {
    try {
      const parsed = JSON.parse(result.content);
      return { analysis: parsed };
    } catch (_e) {
      return { analysis: { summary: result.content, issues: [], recommendations: [] } };
    }
  }

  return result;
}
