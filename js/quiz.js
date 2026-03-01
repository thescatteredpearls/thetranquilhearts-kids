// =====================================================
// QUIZ ME - Standalone Quiz Engine
// Levels:
//   Level 1: Pick a topic  → all questions from that single story
//   Level 2: Pick a category → 10 random questions from that category
//   Level 3: Full challenge  → 20 random questions from all stories
// =====================================================

var QuizMe = (function () {
  'use strict';

  var CATEGORY_META = {
    'Prophets':   { icon: '🕌', color: 'prophets',   desc: 'Stories of the Prophets' },
    'Companions': { icon: '🤝', color: 'companions', desc: 'The Sahabah' },
    'Seerah':     { icon: '📜', color: 'seerah',     desc: 'Life of the Prophet ﷺ' },
    'Scholars':   { icon: '📚', color: 'scholars',   desc: 'Great Islamic Scholars' },
    'Scientists': { icon: '🔬', color: 'scientists', desc: 'Muslim Scientists' },
    'Moral':      { icon: '❤️', color: 'moral',      desc: 'Lessons in Character' }
  };

  var LEVEL_CONFIG = {
    1: { icon: '🎯', color: 'primary', name: 'Topic Quiz',     desc: 'Pick one story — answer all its questions',    questionCount: null },
    2: { icon: '🔥', color: 'teal',    name: 'Category Quiz',  desc: 'Choose a category — 10 questions from it',     questionCount: 10   },
    3: { icon: '⭐', color: 'orange',  name: 'Full Challenge', desc: 'All sections — 20 random questions',           questionCount: 20   }
  };

  var state = {
    allItems:    [],
    level:       null,
    questions:   [],
    qIdx:        0,
    score:       0,
    answered:    false,
    quizLabel:   '',
    topicFilter: { category: 'all', search: '' }
  };

  // ── helpers ────────────────────────────────────────

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function esc(s) {
    if (!s) return '';
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function showScreen(id) {
    document.querySelectorAll('.qm-screen').forEach(function (s) {
      s.classList.toggle('active', s.id === id);
    });
    var section = document.querySelector('.quiz-me-section');
    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── init ──────────────────────────────────────────

  function init() {
    var app = document.getElementById('quiz-app');
    if (!app) return;
    app.innerHTML =
      '<div class="empty-state" style="padding:4rem 0">' +
        '<div class="empty-state-icon" style="font-size:3rem;margin-bottom:1rem">📚</div>' +
        '<h3>Loading quiz data...</h3>' +
      '</div>';

    fetch('content/inspire.json')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        state.allItems = (d.inspire || []).filter(function (i) {
          return i.published !== false && i.quiz && i.quiz.length > 0;
        });
        buildAppHTML();
        renderLevels();
      })
      .catch(function (e) {
        console.error('Quiz data load failed', e);
        app.innerHTML =
          '<div class="empty-state">' +
            '<div class="empty-state-icon">😕</div>' +
            '<h3>Could not load quiz data</h3>' +
            '<p style="color:var(--color-text-light);margin-top:0.5rem">Please try refreshing the page.</p>' +
          '</div>';
      });
  }

  // ── build app HTML ─────────────────────────────────

  function buildAppHTML() {
    document.getElementById('quiz-app').innerHTML =

      // Screen 1: Level selection
      '<div id="qm-screen-levels" class="qm-screen">' +
        '<div class="qm-section-header">' +
          '<h2>Choose Your Challenge Level</h2>' +
          '<p>Start with one story, pick a topic, or take the full challenge!</p>' +
        '</div>' +
        '<div id="qm-levels-content"></div>' +
      '</div>' +

      // Screen 2a: Topic selection (Level 1)
      '<div id="qm-screen-topics" class="qm-screen">' +
        '<div class="qm-screen-topbar">' +
          '<button class="qm-back-btn" id="qm-back-topics">← Back</button>' +
          '<h2>🎯 Pick a Topic</h2>' +
        '</div>' +
        '<div id="qm-topics-content"></div>' +
      '</div>' +

      // Screen 2b: Category selection (Level 2)
      '<div id="qm-screen-cats" class="qm-screen">' +
        '<div class="qm-screen-topbar">' +
          '<button class="qm-back-btn" id="qm-back-cats">← Back</button>' +
          '<h2>🔥 Pick a Category</h2>' +
        '</div>' +
        '<div id="qm-cats-content"></div>' +
      '</div>' +

      // Screen 3: Quiz game
      '<div id="qm-screen-quiz" class="qm-screen">' +
        '<div class="qm-game-container">' +
          '<div class="qm-game-header">' +
            '<button class="qm-back-btn" id="qm-quit-btn">✕ Quit</button>' +
            '<div class="qm-quiz-label" id="qm-quiz-label"></div>' +
            '<div class="qm-score-badge">⭐ <span id="qm-score">0</span></div>' +
          '</div>' +
          '<div class="quiz-progress">' +
            '<div class="quiz-progress-bar" id="qm-progress-bar" style="width:0%"></div>' +
          '</div>' +
          '<div class="qm-game-body">' +
            '<p class="quiz-question-number" id="qm-q-number"></p>' +
            '<p class="qm-q-source" id="qm-q-source"></p>' +
            '<h3 class="quiz-question" id="qm-q-text"></h3>' +
            '<div class="quiz-options" id="qm-options"></div>' +
            '<div id="qm-feedback"></div>' +
            '<button id="qm-next-btn" class="btn btn-primary quiz-next-btn" style="display:none;"></button>' +
          '</div>' +
        '</div>' +
      '</div>' +

      // Screen 4: Results
      '<div id="qm-screen-results" class="qm-screen">' +
        '<div class="qm-results-container">' +
          '<div class="quiz-results">' +
            '<div class="quiz-results-emoji" id="qm-result-emoji"></div>' +
            '<div class="qm-result-label" id="qm-result-label"></div>' +
            '<div class="quiz-results-stars" id="qm-result-stars"></div>' +
            '<div class="quiz-results-score" id="qm-result-score"></div>' +
            '<div class="quiz-results-percentage" id="qm-result-pct"></div>' +
            '<p class="quiz-results-message" id="qm-result-msg"></p>' +
            '<div class="quiz-results-actions">' +
              '<button class="btn btn-primary" id="qm-try-again-btn">🔄 Try Again</button>' +
              '<button class="btn btn-outline" id="qm-home-btn">🏠 Pick Another</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    setupEventListeners();
  }

  // ── event listeners ────────────────────────────────

  function setupEventListeners() {
    document.getElementById('qm-back-topics').onclick   = function () { goHome(); };
    document.getElementById('qm-back-cats').onclick     = function () { goHome(); };
    document.getElementById('qm-quit-btn').onclick      = function () { goHome(); };
    document.getElementById('qm-try-again-btn').onclick = function () { tryAgain(); };
    document.getElementById('qm-home-btn').onclick      = function () { goHome(); };
    document.getElementById('qm-next-btn').onclick      = function () { nextQuestion(); };

    // Delegation for dynamically generated cards + options
    document.getElementById('quiz-app').addEventListener('click', function (e) {
      var lv = e.target.closest('.qm-level-card');
      if (lv) { selectLevel(parseInt(lv.dataset.level)); return; }

      var cf = e.target.closest('.qm-cat-filter-btn');
      if (cf) { state.topicFilter.category = cf.dataset.cat; applyTopicFilter(); return; }

      var tp = e.target.closest('.qm-topic-card');
      if (tp) { selectTopic(tp.dataset.id); return; }

      var ca = e.target.closest('.qm-cat-card');
      if (ca) { selectCategory(ca.dataset.cat); return; }

      var op = e.target.closest('.quiz-option');
      if (op && !op.disabled) { selectAnswer(parseInt(op.dataset.idx)); return; }
    });

    // Topic search
    document.getElementById('quiz-app').addEventListener('input', function (e) {
      if (e.target.id === 'qm-topic-search') {
        state.topicFilter.search = e.target.value;
        applyTopicFilter();
      }
    });
  }

  // ── Screen 1: Level selection ──────────────────────

  function renderLevels() {
    var html = '<div class="qm-levels-grid">';
    [1, 2, 3].forEach(function (lvl) {
      var cfg = LEVEL_CONFIG[lvl];
      html +=
        '<button class="qm-level-card qm-level-' + cfg.color + '" data-level="' + lvl + '">' +
          '<div class="qm-level-icon">' + cfg.icon + '</div>' +
          '<div class="qm-level-num">Level ' + lvl + '</div>' +
          '<div class="qm-level-name">' + cfg.name + '</div>' +
          '<div class="qm-level-desc">' + cfg.desc + '</div>' +
        '</button>';
    });
    html += '</div>';
    document.getElementById('qm-levels-content').innerHTML = html;
    showScreen('qm-screen-levels');
  }

  // ── Screen 2a: Topic selection ─────────────────────

  function renderTopics() {
    state.topicFilter = { category: 'all', search: '' };
    var cats = Object.keys(CATEGORY_META);

    var filterHtml = '<div class="qm-cat-filter">';
    filterHtml += '<button class="qm-cat-filter-btn active" data-cat="all">All</button>';
    cats.forEach(function (cat) {
      filterHtml +=
        '<button class="qm-cat-filter-btn" data-cat="' + esc(cat) + '">' +
          CATEGORY_META[cat].icon + ' ' + esc(cat) +
        '</button>';
    });
    filterHtml += '</div>';

    var html =
      filterHtml +
      '<div class="qm-search-bar">' +
        '<input id="qm-topic-search" type="text" placeholder="🔍 Search by name..." class="qm-search-input">' +
        '<span class="qm-topic-count" id="qm-topic-count">' + state.allItems.length + ' topics</span>' +
      '</div>' +
      '<div id="qm-topics-grid" class="qm-topics-grid">' +
        buildTopicCards(state.allItems) +
      '</div>';

    document.getElementById('qm-topics-content').innerHTML = html;
    showScreen('qm-screen-topics');
  }

  function buildTopicCards(items) {
    if (items.length === 0) {
      return '<div class="empty-state" style="padding:2rem 0"><div class="empty-state-icon" style="font-size:2.5rem">🔍</div><h3>No topics found</h3></div>';
    }
    return items.map(function (item) {
      var meta = CATEGORY_META[item.category] || { icon: '📖', color: 'default' };
      return (
        '<button class="qm-topic-card qm-cat-' + meta.color + '" data-id="' + esc(item.id) + '">' +
          '<div class="qm-topic-cat-icon">' + meta.icon + '</div>' +
          '<div class="qm-topic-title">' + esc(item.title) + '</div>' +
          '<div class="qm-topic-meta">' +
            '<span class="qm-topic-cat">' + esc(item.category) + '</span>' +
            '<span class="qm-topic-qcount">' + item.quiz.length + ' Q</span>' +
          '</div>' +
        '</button>'
      );
    }).join('');
  }

  function applyTopicFilter() {
    var items = state.allItems;
    if (state.topicFilter.category !== 'all') {
      items = items.filter(function (i) { return i.category === state.topicFilter.category; });
    }
    if (state.topicFilter.search) {
      var s = state.topicFilter.search.toLowerCase();
      items = items.filter(function (i) {
        return i.title.toLowerCase().indexOf(s) !== -1 || i.category.toLowerCase().indexOf(s) !== -1;
      });
    }
    document.getElementById('qm-topics-grid').innerHTML = buildTopicCards(items);
    var countEl = document.getElementById('qm-topic-count');
    if (countEl) countEl.textContent = items.length + ' topic' + (items.length !== 1 ? 's' : '');

    document.querySelectorAll('.qm-cat-filter-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.cat === state.topicFilter.category);
    });
  }

  // ── Screen 2b: Category selection ─────────────────

  function renderCategories() {
    var cats = {};
    state.allItems.forEach(function (i) {
      if (!cats[i.category]) cats[i.category] = { count: 0, qTotal: 0 };
      cats[i.category].count++;
      cats[i.category].qTotal += i.quiz.length;
    });

    var html = '<div class="qm-cats-grid">';
    Object.keys(cats).forEach(function (cat) {
      var meta  = CATEGORY_META[cat] || { icon: '📖', color: 'default', desc: '' };
      var info  = cats[cat];
      var qShow = Math.min(LEVEL_CONFIG[2].questionCount, info.qTotal);
      html +=
        '<button class="qm-cat-card qm-cat-' + meta.color + '" data-cat="' + esc(cat) + '">' +
          '<div class="qm-cat-icon">' + meta.icon + '</div>' +
          '<div class="qm-cat-name">' + esc(cat) + '</div>' +
          '<div class="qm-cat-desc">' + esc(meta.desc) + '</div>' +
          '<div class="qm-cat-stats">' + info.count + ' stories · ' + qShow + ' questions</div>' +
        '</button>';
    });
    html += '</div>';
    document.getElementById('qm-cats-content').innerHTML = html;
    showScreen('qm-screen-cats');
  }

  // ── selection handlers ─────────────────────────────

  function selectLevel(lvl) {
    state.level = lvl;
    if      (lvl === 1) renderTopics();
    else if (lvl === 2) renderCategories();
    else                startFullChallenge();
  }

  function selectTopic(id) {
    var item = state.allItems.find(function (i) { return i.id === id; });
    if (!item) return;
    var meta      = CATEGORY_META[item.category] || { icon: '📖' };
    state.quizLabel   = meta.icon + ' ' + item.title;
    state.questions   = item.quiz.map(function (q) { return Object.assign({}, q, { _source: item.title }); });
    startQuiz();
  }

  function selectCategory(cat) {
    var meta = CATEGORY_META[cat] || { icon: '📖' };
    state.quizLabel = meta.icon + ' ' + cat + ' Quiz';
    var allQ = [];
    state.allItems
      .filter(function (i) { return i.category === cat; })
      .forEach(function (i) {
        i.quiz.forEach(function (q) { allQ.push(Object.assign({}, q, { _source: i.title })); });
      });
    state.questions = shuffle(allQ).slice(0, LEVEL_CONFIG[2].questionCount);
    startQuiz();
  }

  function startFullChallenge() {
    state.quizLabel = '⭐ Full Challenge';
    var allQ = [];
    state.allItems.forEach(function (i) {
      i.quiz.forEach(function (q) { allQ.push(Object.assign({}, q, { _source: i.title })); });
    });
    state.questions = shuffle(allQ).slice(0, LEVEL_CONFIG[3].questionCount);
    startQuiz();
  }

  // ── Screen 3: Quiz ─────────────────────────────────

  function startQuiz() {
    state.qIdx     = 0;
    state.score    = 0;
    state.answered = false;
    document.getElementById('qm-quiz-label').textContent = state.quizLabel;
    showScreen('qm-screen-quiz');
    renderQuestion();
  }

  function renderQuestion() {
    state.answered = false;
    var q     = state.questions[state.qIdx];
    var total = state.questions.length;

    document.getElementById('qm-progress-bar').style.width = ((state.qIdx / total) * 100) + '%';
    document.getElementById('qm-q-number').textContent = 'Question ' + (state.qIdx + 1) + ' of ' + total;
    document.getElementById('qm-score').textContent    = state.score;
    document.getElementById('qm-q-source').textContent = q._source ? 'From: ' + q._source : '';
    document.getElementById('qm-q-text').textContent   = q.question;

    var opts = '';
    q.options.forEach(function (opt, i) {
      opts +=
        '<button class="quiz-option" data-idx="' + i + '">' +
          '<span class="quiz-option-letter">' + String.fromCharCode(65 + i) + '</span>' +
          '<span class="quiz-option-text">' + esc(opt) + '</span>' +
        '</button>';
    });
    document.getElementById('qm-options').innerHTML  = opts;
    document.getElementById('qm-feedback').innerHTML = '';

    var nb = document.getElementById('qm-next-btn');
    nb.style.display = 'none';
    nb.textContent   = '';
  }

  function selectAnswer(sel) {
    if (state.answered) return;
    state.answered = true;

    var q         = state.questions[state.qIdx];
    var correct   = q.correct;
    var isCorrect = sel === correct;
    if (isCorrect) state.score++;

    document.querySelectorAll('#qm-options .quiz-option').forEach(function (btn, i) {
      btn.disabled = true;
      if (i === correct) btn.classList.add('correct');
      else if (i === sel) btn.classList.add('incorrect');
    });

    document.getElementById('qm-score').textContent = state.score;

    var isLast = state.qIdx >= state.questions.length - 1;
    document.getElementById('qm-feedback').innerHTML =
      '<div class="quiz-feedback ' + (isCorrect ? 'correct' : 'incorrect') + '">' +
        '<span class="quiz-feedback-icon">' + (isCorrect ? '🎉' : '😢') + '</span>' +
        '<span>' + (isCorrect ? 'Great job! That\'s correct!' : 'Not quite — the correct answer is highlighted above.') + '</span>' +
      '</div>';

    var nb = document.getElementById('qm-next-btn');
    nb.textContent   = isLast ? 'See Results 🎊' : 'Next Question →';
    nb.style.display = '';
  }

  function nextQuestion() {
    state.qIdx++;
    if (state.qIdx < state.questions.length) renderQuestion();
    else showResults();
  }

  // ── Screen 4: Results ──────────────────────────────

  function showResults() {
    var total = state.questions.length;
    var score = state.score;
    var pct   = Math.round((score / total) * 100);
    var emoji, msg, stars;

    if (pct === 100)    { emoji = '🏆'; msg = 'Perfect! MashaAllah!';        stars = '⭐⭐⭐⭐⭐'; }
    else if (pct >= 80) { emoji = '🌟'; msg = 'Excellent! Well done!';       stars = '⭐⭐⭐⭐'; }
    else if (pct >= 60) { emoji = '😊'; msg = 'Good job! Keep it up!';       stars = '⭐⭐⭐'; }
    else if (pct >= 40) { emoji = '📚'; msg = 'Nice try! Read more stories!'; stars = '⭐⭐'; }
    else                { emoji = '💪'; msg = 'Keep trying! You\'ll get it!'; stars = '⭐'; }

    document.getElementById('qm-result-emoji').textContent = emoji;
    document.getElementById('qm-result-label').textContent = state.quizLabel;
    document.getElementById('qm-result-stars').textContent = stars;
    document.getElementById('qm-result-score').textContent = score + '/' + total;
    document.getElementById('qm-result-pct').textContent   = pct + '%';
    document.getElementById('qm-result-msg').textContent   = msg;
    document.getElementById('qm-progress-bar').style.width = '100%';

    showScreen('qm-screen-results');
  }

  // ── utility ────────────────────────────────────────

  function tryAgain() { startQuiz(); }
  function goHome()   { state.level = null; renderLevels(); }

  // ── public API ─────────────────────────────────────

  return {
    init:           init,
    selectLevel:    selectLevel,
    selectTopic:    selectTopic,
    selectCategory: selectCategory,
    selectAnswer:   selectAnswer,
    nextQuestion:   nextQuestion,
    tryAgain:       tryAgain,
    goHome:         goHome
  };
})();

document.addEventListener('DOMContentLoaded', function () {
  if (document.getElementById('quiz-app')) {
    QuizMe.init();
  }
});
