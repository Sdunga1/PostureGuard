'use strict';

// PostureGuard — Background Service Worker
// Handles Claude API calls and message routing between content scripts and side panel.

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-5-20241022';
const ANTHROPIC_VERSION = '2023-06-01';

// Settings cache (synced via chrome.storage)
const settings = {
  postureEnabled: false,
  alertThresholdMs: 30000,
  apiKey: ''
};

// Tip cache to avoid repetition
const recentTips = [];
const MAX_CACHED_TIPS = 10;

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
        'anthropic-version': ANTHROPIC_VERSION
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
      return { error: `API error: ${response.status}` };
    }

    const data = await response.json();
    return { content: data.content[0].text };
  } catch (err) {
    console.error('[PostureGuard] Claude API fetch error:', err);
    return { error: err.message };
  }
}

async function handleNudgeRequest(metrics, tabId) {
  const systemPrompt = `You are PostureGuard, a friendly posture coach. Given posture metrics, provide a brief, encouraging 1-sentence tip to help the user correct their posture. Be specific about what they should adjust. Do not repeat these recent tips: ${recentTips.join('; ')}`;

  const userMessage = `Current posture metrics: ${JSON.stringify(metrics)}`;
  const result = await callClaudeAPI(systemPrompt, userMessage);

  if (result.content) {
    recentTips.push(result.content);
    if (recentTips.length > MAX_CACHED_TIPS) recentTips.shift();

    // Send nudge to content script overlay
    if (tabId) {
      chrome.tabs.sendMessage(tabId, {
        type: 'SHOW_NUDGE',
        tip: result.content
      });
    }
  }

  return result;
}

async function handleReportRequest(sessionData) {
  const systemPrompt = `You are PostureGuard, an AI posture analyst. Given a session's posture data, provide:
1. A 2-sentence summary of overall posture quality
2. Top 3 issues identified (with specific metrics)
3. 3-5 recommended exercises, each with: name, reason (tied to the data), duration, and priority (1=highest)

Respond in valid JSON matching this schema:
{
  "summary": "string",
  "issues": ["string"],
  "recommendations": [{"exercise": "string", "reason": "string", "duration": "string", "priority": number}]
}`;

  const userMessage = `Session data: ${JSON.stringify(sessionData)}`;
  const result = await callClaudeAPI(systemPrompt, userMessage);

  if (result.content) {
    try {
      const parsed = JSON.parse(result.content);
      return { analysis: parsed };
    } catch {
      return { analysis: { summary: result.content, issues: [], recommendations: [] } };
    }
  }

  return result;
}
