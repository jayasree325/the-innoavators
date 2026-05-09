/**
 * practice.js - Practice Lab drills
 */

document.addEventListener('DOMContentLoaded', () => {
  if (typeof Auth !== 'undefined') Auth.requireAuth();
  if (typeof UI !== 'undefined') UI.initUserShell();

  const promptEl = document.getElementById('practice-prompt');
  const answerInput = document.getElementById('answer-input');
  const answerBox = document.getElementById('answer-box');
  const showAnswerBtn = document.getElementById('show-answer-btn');
  const nextCardBtn = document.getElementById('next-card-btn');
  const aiDrillBtn = document.getElementById('ai-drill-btn');
  const rebuildLocalBtn = document.getElementById('rebuild-local-btn');
  const deckStatus = document.getElementById('deck-status');
  const cardCount = document.getElementById('card-count');
  const vocabCount = document.getElementById('vocab-count');
  const historyCount = document.getElementById('history-count');
  const scoreCount = document.getElementById('score-count');
  const sourceList = document.getElementById('source-list');

  let cards = [];
  let currentIndex = 0;
  let seenCount = Number(localStorage.getItem('ling_practice_seen') || '0');

  function shuffle(items) {
    return [...items].sort(() => Math.random() - 0.5);
  }

  function getData() {
    return {
      vocab: UI.readStore('ling_vocab', []),
      history: UI.readStore('ling_history', [])
    };
  }

  function buildLocalDeck() {
    const { vocab, history } = getData();
    const vocabCards = vocab.map(item => ({
      prompt: Translate or explain: ${item.source},
      answer: item.target,
      hint: item.toLang || 'Saved vocabulary'
    }));

    const historyCards = history.slice(0, 20).map(item => ({
      prompt: Recall this translation from ${item.fromLang} to ${item.toLang}: ${item.source},
      answer: item.target,
      hint: item.detectedLanguage ? Detected: ${item.detectedLanguage} : 'Recent translation'
    }));

    cards = shuffle([...vocabCards, ...historyCards]).slice(0, 30);
    currentIndex = 0;
    renderMeta();
    renderCard();
  }

  function renderMeta() {
    const { vocab, history } = getData();
    vocabCount.textContent = vocab.length;
    historyCount.textContent = history.length;
    scoreCount.textContent = seenCount;
    deckStatus.textContent = cards.length ? ${cards.length} cards loaded : 'Needs study data';

    const sources = [
      ...vocab.slice(-6).reverse().map(item => ${item.source} -> ${item.target}),
      ...history.slice(0, 6).map(item => ${item.source} -> ${item.target})
    ];
    sourceList.innerHTML = sources.length
      ? sources.map(item => <div class="source-item">${UI.escapeHTML(item)}</div>).join('')
      : '<div class="source-item">No sources yet. Use Translator or Vocabulary first.</div>';
  }

  function renderCard() {
    answerInput.value = '';
    answerBox.classList.remove('active');
    answerBox.innerHTML = '';

    if (!cards.length) {
      promptEl.textContent = 'Save vocabulary or make a translation to start practicing.';
      cardCount.textContent = 'Card 0 / 0';
      return;
    }

    const card = cards[currentIndex];
    promptEl.textContent = card.prompt;
    cardCount.textContent = Card ${currentIndex + 1} / ${cards.length};
  }

  function showAnswer() {
    if (!cards.length) return;
    const card = cards[currentIndex];
    const typed = answerInput.value.trim();
    answerBox.innerHTML = `
      <div><strong>Model answer:</strong> ${UI.escapeHTML(card.answer)}</div>
      ${card.hint ? <div style="margin-top: 8px;"><strong>Hint:</strong> ${UI.escapeHTML(card.hint)}</div> : ''}
      ${typed ? <div style="margin-top: 8px;"><strong>Your answer:</strong> ${UI.escapeHTML(typed)}</div> : ''}
    `;
    answerBox.classList.add('active');
  }

  function nextCard() {
    if (!cards.length) return;
    seenCount += 1;
    localStorage.setItem('ling_practice_seen', String(seenCount));
    currentIndex = (currentIndex + 1) % cards.length;
    renderMeta();
    renderCard();
  }

  async function buildAIDeck() {
    const { vocab, history } = getData();
    if (!vocab.length && !history.length) {
      UI.showToast('Add vocabulary or translations first', 'warning');
      return;
    }
    if (!window.API.getKey()) {
      UI.showToast('No API key saved, using local practice deck', 'warning');
      buildLocalDeck();
      return;
    }

    const originalHtml = aiDrillBtn.innerHTML;
    aiDrillBtn.innerHTML = '<i class="ph ph-spinner animate-spin"></i> Building';
    aiDrillBtn.disabled = true;

    try {
      const result = await window.API.suggestPractice(history, vocab);
      cards = (result.cards || []).map(card => ({
        prompt: card.prompt,
        answer: card.answer,
        hint: card.hint || result.drillTitle || 'AI practice'
      })).filter(card => card.prompt && card.answer);
      currentIndex = 0;
      if (!cards.length) buildLocalDeck();
      renderMeta();
      renderCard();
      UI.showToast('AI drill ready', 'success');
    } catch (err) {
      console.error(err);
      UI.showToast(err.message || 'AI drill failed, using local deck', 'warning');
      buildLocalDeck();
    } finally {
      aiDrillBtn.innerHTML = originalHtml;
      aiDrillBtn.disabled = false;
    }
  }

  showAnswerBtn.addEventListener('click', showAnswer);
  nextCardBtn.addEventListener('click', nextCard);
  rebuildLocalBtn.addEventListener('click', buildLocalDeck);
  aiDrillBtn.addEventListener('click', buildAIDeck);

  window.addEventListener('storage', event => {
    if (['ling_vocab', 'ling_history'].includes(event.key)) buildLocalDeck();
  });
  window.addEventListener('ling:store-updated', event => {
    if (['ling_vocab', 'ling_history'].includes(event.detail?.key)) buildLocalDeck();
  });

  buildLocalDeck();
});
