'use strict';

// PostureGuard — QR Code Bridge
// Encodes session data into a URL and generates a QR code for the health app.

const QR_BRIDGE = {
  HEALTH_APP_URL: 'https://postureguard.vercel.app/session',
  MAX_PAYLOAD_BYTES: 2048,

  /**
   * Encode session data as a base64 URL parameter.
   * Truncates to essential metrics if payload exceeds limit.
   */
  encodeSessionData(sessionData) {
    let payload = { ...sessionData };

    // Truncate if too large
    let encoded = btoa(JSON.stringify(payload));
    if (encoded.length > this.MAX_PAYLOAD_BYTES) {
      const m = payload.metrics || {};
      payload = {
        version: payload.version,
        sessionId: payload.sessionId,
        duration: payload.duration,
        metrics: {
          avgPostureScore: m.avgPostureScore,
          avgHeadTilt: m.avgHeadTilt,
          avgSlouchAngle: m.avgSlouchAngle,
          avgScreenDistance: m.avgScreenDistance,
          alertCount: m.alertCount,
          worstPeriods: (m.worstPeriods || []).slice(0, 3),
          uprightPercent: m.uprightPercent,
          slouchEventCount: m.slouchEventCount,
          longestGoodStreak: m.longestGoodStreak,
          postureTrend: m.postureTrend,
          avgShoulderAngle: m.avgShoulderAngle,
          avgShoulderElevation: m.avgShoulderElevation
        },
        claudeAnalysis: payload.claudeAnalysis
      };
      encoded = btoa(JSON.stringify(payload));
    }

    return `${this.HEALTH_APP_URL}?data=${encodeURIComponent(encoded)}`;
  },

  /**
   * Generate a QR code data URL from session data.
   * Requires qrcode-generator to be loaded.
   */
  generateQRCode(sessionData) {
    const url = this.encodeSessionData(sessionData);

    if (typeof window.qrcode === 'undefined') {
      console.error('[PostureGuard] qrcode-generator library not loaded');
      return null;
    }

    const qr = window.qrcode(0, 'M');
    qr.addData(url);
    qr.make();

    return {
      dataUrl: qr.createDataURL(4, 0),
      rawUrl: url
    };
  }
};

if (typeof window !== 'undefined') {
  window.QR_BRIDGE = QR_BRIDGE;
}
