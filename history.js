/**
 * history.js - translation history and learning analytics
 */

document.addEventListener('DOMContentLoaded', () => {
  if (typeof Auth !== 'undefined') Auth.requireAuth();
  if (typeof UI !== 'undefined') UI.initUserShell();

  const historyList = document.getElementById('history-list');
  const clearBtn = document.getElementById('clear-history-btn');
  const analyzeBtn = document.getElementById('analyze-btn');
  const aiInsights = document.getElementById('ai-insights');

  function loadHistory() {
    const history = UI.readStore('ling_history', []);
    historyList.innerHTML = '';

    if (history.length === 0) {
      historyList.innerHTML = `
        <div style="text-align: center; padding: 48px; color: var(--text-muted);">
          <i class="ph-duotone ph-clock" style="font-size: 3rem; margin-bottom: 16px; opacity: 0.5;"></i>
          <h3>No recent translations</h3>
          <p>Your live translation history will appear here.</p>
        </div>
      `;
      analyzeBtn.style.display = 'none';
      return;
    }

    analyzeBtn.style.display = 'block';

    history.forEach(item => {
      const date = new Date(item.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
      const div = document.createElement('div');
      div.className = 'history-item';
      div.innerHTML = `
        <div class="history-meta">
          <div class="history-langs">
            ${UI.escapeHTML(item.fromLang)} <i class="ph-bold ph-arrow-right"></i> ${UI.escapeHTML(item.toLang)}
          </div>
          <span>${UI.escapeHTML(date)}</span>
        </div>
        <div class="history-content">
          <div class="history-source">${UI.escapeHTML(item.source)}</div>
          <div class="history-target">${UI.escapeHTML(item.target)}</div>
        </div>
      `;
      historyList.appendChild(div);
    });
  }

  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', async () => {
      const history = UI.readStore('ling_history', []);
      if (history.length === 0) return;

      if (!window.API.getKey()) {
        UI.showToast('Please set your Gemini API key in the Translator page first', 'warning');
        return;
      }

      const originalHtml = analyzeBtn.innerHTML;
      analyzeBtn.innerHTML = '<i class="ph ph-spinner animate-spin"></i> Analyzing...';
      analyzeBtn.disabled = true;

      try {
        const data = await window.API.analyzeLearning(history);
        aiInsights.innerHTML = `
          <p style="margin-bottom: 16px; font-weight: 500;">${UI.escapeHTML(data.summary)}</p>
          <h4 style="margin-bottom: 8px; color: var(--primary-light);">Bonus phrases for you</h4>
          <ul style="list-style-type: none; padding: 0; display: flex; flex-direction: column; gap: 8px;">
            ${(data.suggestedPhrases || []).map(p => `
              <li style="background: rgba(0,0,0,0.2); padding: 8px 12px; border-radius: 4px;">
                <strong>${UI.escapeHTML(p.phrase)}</strong> - ${UI.escapeHTML(p.meaning)}
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">${UI.escapeHTML(p.reason)}</div>
              </li>
            `).join('')}
          </ul>
        `;
        aiInsights.style.display = 'block';
        analyzeBtn.style.display = 'none';
      } catch (err) {
        console.error(err);
        UI.showToast('Failed to analyze history', 'error');
        analyzeBtn.innerHTML = originalHtml;
        analyzeBtn.disabled = false;
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear your translation history?')) {
        UI.writeStore('ling_history', []);
        loadHistory();
        aiInsights.style.display = 'none';
      }
    });
  }

  window.addEventListener('storage', e => {
    if (e.key === 'ling_history') loadHistory();
  });
  window.addEventListener('ling:store-updated', e => {
    if (e.detail?.key === 'ling_history') loadHistory();
  });

  loadHistory();
});