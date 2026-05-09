/**
 * vocabulary.js - interactive vocabulary builder
 */

document.addEventListener('DOMContentLoaded', () => {
  if (typeof Auth !== 'undefined') Auth.requireAuth();
  if (typeof UI !== 'undefined') UI.initUserShell();

  const vocabGrid = document.getElementById('vocab-grid');
  const clearBtn = document.getElementById('clear-vocab-btn');
  const practiceBtn = document.getElementById('practice-btn');
  const modal = document.getElementById('ai-modal');
  const modalClose = document.getElementById('modal-close');
  const aiLoading = document.getElementById('ai-loading');
  const aiResult = document.getElementById('ai-result');
  const modalMnemonic = document.getElementById('modal-mnemonic');
  const modalExamples = document.getElementById('modal-examples');

  function loadVocab() {
    const vocab = UI.readStore('ling_vocab', []);
    vocabGrid.innerHTML = '';

    if (vocab.length === 0) {
      vocabGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <i class="ph-duotone ph-books" style="font-size: 3rem; margin-bottom: 16px; color: var(--border-color);"></i>
          <h3>Your vocabulary is empty</h3>
          <p style="margin-top: 8px;">Save translations from the Translator and they will appear here instantly.</p>
        </div>
      `;
      return;
    }

    [...vocab].reverse().forEach((item, index) => {
      const actualIndex = vocab.length - 1 - index;
      const card = document.createElement('div');
      card.className = 'vocab-card';
      card.innerHTML = `
        <div class="vocab-header">
          <div class="vocab-source">${UI.escapeHTML(item.source)}</div>
          <button class="delete-btn" data-index="${actualIndex}" title="Delete"><i class="ph-bold ph-trash"></i></button>
        </div>
        <div class="vocab-target">${UI.escapeHTML(item.target)}</div>
        ${item.pronunciation ? <div class="vocab-pronunciation">${UI.escapeHTML(item.pronunciation)}</div> : ''}
        <span class="vocab-lang">${UI.escapeHTML(item.toLang || 'Language')}</span>
      `;

      card.addEventListener('click', e => {
        if (e.target.closest('.delete-btn')) return;
        generateAILesson(item.source, item.toLang);
      });

      card.querySelector('.delete-btn').addEventListener('click', () => {
        const next = UI.readStore('ling_vocab', []);
        next.splice(actualIndex, 1);
        UI.writeStore('ling_vocab', next);
        loadVocab();
        UI.showToast('Word removed', 'success');
      });

      vocabGrid.appendChild(card);
    });
  }

  async function generateAILesson(word, lang) {
    if (!window.API.getKey()) {
      UI.showToast('Please set your Gemini API key in the Translator page first', 'warning');
      return;
    }

    modal.style.display = 'flex';
    aiLoading.style.display = 'block';
    aiResult.style.display = 'none';

    try {
      const data = await window.API.generateMnemonic(word, lang);

      modalMnemonic.textContent = data.mnemonic || 'No mnemonic returned.';
      modalExamples.innerHTML = (data.examples || []).map(ex => `
        <div class="example-item">
          <div style="font-weight: 500; margin-bottom: 4px;">${UI.escapeHTML(ex.sentence)}</div>
          <div style="color: var(--text-muted); font-size: 0.9rem;">${UI.escapeHTML(ex.translation)}</div>
        </div>
      `).join('');

      if (data.quiz) {
        modalExamples.insertAdjacentHTML('beforeend', `
          <div class="example-item quiz-item">
            <div style="font-weight: 600; margin-bottom: 4px;">Quick quiz</div>
            <div>${UI.escapeHTML(data.quiz.question)}</div>
            <details style="margin-top: 8px;">
              <summary>Show answer</summary>
              <div style="color: var(--text-muted); margin-top: 4px;">${UI.escapeHTML(data.quiz.answer)}</div>
            </details>
          </div>
        `);
      }

      aiLoading.style.display = 'none';
      aiResult.style.display = 'block';
    } catch (err) {
      console.error(err);
      modal.style.display = 'none';
      UI.showToast('Failed to generate AI lesson', 'error');
    }
  }

  if (practiceBtn) {
    practiceBtn.addEventListener('click', async () => {
      const vocab = UI.readStore('ling_vocab', []);
      if (!vocab.length) {
        UI.showToast('Save a few words first', 'warning');
        return;
      }
      if (!window.API.getKey()) {
        UI.showToast('Please set your Gemini API key first', 'warning');
        return;
      }

      modal.style.display = 'flex';
      aiLoading.style.display = 'block';
      aiResult.style.display = 'none';

      try {
        const data = await window.API.suggestPractice(UI.readStore('ling_history', []), vocab);
        modalMnemonic.textContent = data.drillTitle || 'Personal practice';
        modalExamples.innerHTML = (data.cards || []).map(card => `
          <div class="example-item">
            <div style="font-weight: 600;">${UI.escapeHTML(card.prompt)}</div>
            <div style="color: var(--text-muted); margin-top: 4px;">Hint: ${UI.escapeHTML(card.hint || '')}</div>
            <details style="margin-top: 8px;">
              <summary>Show model answer</summary>
              <div style="color: var(--text-muted); margin-top: 4px;">${UI.escapeHTML(card.answer)}</div>
            </details>
          </div>
        `).join('');
        aiLoading.style.display = 'none';
        aiResult.style.display = 'block';
      } catch (err) {
        console.error(err);
        modal.style.display = 'none';
        UI.showToast('Failed to build practice set', 'error');
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear your entire vocabulary?')) {
        UI.writeStore('ling_vocab', []);
        loadVocab();
      }
    });
  }

  if (modalClose) modalClose.addEventListener('click', () => { modal.style.display = 'none'; });
  window.addEventListener('click', e => {
    if (e.target === modal) modal.style.display = 'none';
  });

  window.addEventListener('storage', e => {
    if (e.key === 'ling_vocab') loadVocab();
  });
  window.addEventListener('ling:store-updated', e => {
    if (e.detail?.key === 'ling_vocab') loadVocab();
  });

  loadVocab();
});
