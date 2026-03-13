/* ===== Science Topics Data ===== */
const SCIENCE_TOPICS = {
  physics: {
    name: "물리",
    emoji: "⚡",
    topics: [
      { id: "force-motion", emoji: "🏃", name: "힘과 운동" },
      { id: "energy", emoji: "🔋", name: "에너지와 전환" },
      { id: "electricity", emoji: "💡", name: "전기와 자기" },
      { id: "wave", emoji: "🌊", name: "파동과 소리" },
      { id: "light", emoji: "🔦", name: "빛과 색" },
      { id: "heat", emoji: "🌡️", name: "열과 온도" },
      { id: "pressure", emoji: "🎈", name: "압력과 부력" },
      { id: "gravity", emoji: "🍎", name: "중력과 만유인력" },
    ],
  },
  chemistry: {
    name: "화학",
    emoji: "🧪",
    topics: [
      { id: "matter-state", emoji: "🧊", name: "물질의 상태 변화" },
      { id: "atom", emoji: "⚛️", name: "원자와 분자" },
      { id: "periodic-table", emoji: "📋", name: "주기율표와 원소" },
      { id: "chemical-reaction", emoji: "💥", name: "화학 반응" },
      { id: "acid-base", emoji: "🍋", name: "산과 염기" },
      { id: "mixture", emoji: "🥣", name: "혼합물의 분리" },
      { id: "combustion", emoji: "🔥", name: "연소와 산화" },
      { id: "solution", emoji: "💧", name: "용액과 용해" },
    ],
  },
  biology: {
    name: "생물",
    emoji: "🧬",
    topics: [
      { id: "cell", emoji: "🔬", name: "세포의 구조와 기능" },
      { id: "photosynthesis", emoji: "🌿", name: "광합성과 호흡" },
      { id: "digestion", emoji: "🍽️", name: "소화와 순환" },
      { id: "nervous", emoji: "🧠", name: "신경계와 감각" },
      { id: "reproduction", emoji: "🌱", name: "생식과 발생" },
      { id: "genetics", emoji: "🧬", name: "유전과 진화" },
      { id: "ecosystem", emoji: "🌳", name: "생태계와 환경" },
      { id: "classification", emoji: "🐾", name: "생물의 분류" },
    ],
  },
  "earth-science": {
    name: "지구과학",
    emoji: "🌍",
    topics: [
      { id: "rock-mineral", emoji: "🪨", name: "암석과 광물" },
      { id: "plate-tectonics", emoji: "🌋", name: "판 구조론과 지진" },
      { id: "weather", emoji: "🌤️", name: "날씨와 기후" },
      { id: "water-cycle", emoji: "💧", name: "물의 순환" },
      { id: "solar-system", emoji: "🪐", name: "태양계와 행성" },
      { id: "star", emoji: "⭐", name: "별과 은하" },
      { id: "atmosphere", emoji: "🌬️", name: "대기와 기압" },
      { id: "ocean", emoji: "🌊", name: "해류와 조석" },
    ],
  },
};

/* ===== Gemini API Config ===== */
const TEXT_MODEL = "gemini-2.0-flash-lite";
const IMAGE_MODEL = "gemini-3.1-flash-image-preview";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/* ===== State ===== */
let apiKey = localStorage.getItem("gemini_api_key") || "";
let currentCategory = null;
let conceptCache = {};

/* ===== DOM Elements ===== */
const $ = (sel) => document.querySelector(sel);
const modal = $("#api-modal");
const apiInput = $("#api-key-input");
const loadingOverlay = $("#loading-overlay");
const loadingText = $("#loading-text");
const categoriesSection = $("#categories");
const topicsSection = $("#topics");
const topicList = $("#topic-list");
const topicsTitle = $("#topics-title");
const conceptSection = $("#concept-detail");
const conceptContent = $("#concept-content");

/* ===== Init ===== */
function init() {
  if (apiKey) {
    modal.classList.remove("active");
  }

  // API key submit
  $("#api-key-submit").addEventListener("click", saveApiKey);
  apiInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveApiKey();
  });
  $("#change-api-key").addEventListener("click", () => {
    modal.classList.add("active");
    apiInput.value = apiKey;
    apiInput.focus();
  });

  // Category cards
  document.querySelectorAll(".category-card").forEach((card) => {
    card.addEventListener("click", () => showTopics(card.dataset.category));
  });

  // Back buttons
  $("#back-to-categories").addEventListener("click", showCategories);
  $("#back-to-topics").addEventListener("click", () =>
    showTopics(currentCategory)
  );
}

function saveApiKey() {
  const key = apiInput.value.trim();
  if (!key) {
    apiInput.style.borderColor = "#ef4444";
    return;
  }
  apiKey = key;
  localStorage.setItem("gemini_api_key", key);
  modal.classList.remove("active");
}

/* ===== Navigation ===== */
function showCategories() {
  categoriesSection.classList.remove("hidden");
  topicsSection.classList.add("hidden");
  conceptSection.classList.add("hidden");
}

function showTopics(category) {
  currentCategory = category;
  const cat = SCIENCE_TOPICS[category];

  topicsTitle.textContent = `${cat.emoji} ${cat.name} — 주제 선택`;
  topicList.innerHTML = "";

  cat.topics.forEach((topic) => {
    const btn = document.createElement("button");
    btn.className = "topic-card";
    btn.innerHTML = `<span class="topic-emoji">${topic.emoji}</span>${topic.name}`;
    btn.addEventListener("click", () => loadConcept(category, topic));
    topicList.appendChild(btn);
  });

  categoriesSection.classList.add("hidden");
  topicsSection.classList.remove("hidden");
  conceptSection.classList.add("hidden");
}

/* ===== Load Concept via Gemini ===== */
async function loadConcept(category, topic) {
  const cacheKey = `${category}_${topic.id}`;

  if (conceptCache[cacheKey]) {
    renderConcept(category, topic, conceptCache[cacheKey]);
    return;
  }

  showLoading("AI가 개념을 정리하고 있어요...");

  const prompt = `당신은 중학교 과학 선생님입니다. "${topic.name}" 개념을 중학생이 이해할 수 있도록 설명해 주세요.

아래 JSON 형식으로만 응답해 주세요. 다른 텍스트 없이 JSON만 출력하세요:

{
  "title": "주제 제목",
  "summary": "한 줄 요약 (30자 이내)",
  "explanation": "핵심 개념 설명 (200-300자, 쉬운 말로)",
  "keyPoints": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3", "핵심 포인트 4"],
  "realLife": "실생활 예시 (100-150자)",
  "funFact": "재미있는 과학 사실 (50-80자)",
  "imagePrompt": "이 개념을 시각적으로 설명하는 교육용 일러스트를 영어로 설명 (50 words, educational diagram style)",
  "quiz": {
    "question": "이 개념에 대한 퀴즈 질문",
    "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
    "correctIndex": 0,
    "explanation": "정답 해설 (50-80자)"
  }
}`;

  try {
    const data = await callGeminiText(prompt);
    conceptCache[cacheKey] = data;
    renderConcept(category, topic, data);
  } catch (err) {
    hideLoading();
    alert("개념을 불러오는 데 실패했습니다: " + err.message);
  }
}

/* ===== Render Concept ===== */
function renderConcept(category, topic, data) {
  hideLoading();
  const cat = SCIENCE_TOPICS[category];

  conceptContent.innerHTML = `
    <h2>${topic.emoji} ${data.title}</h2>
    <span class="concept-category-badge">${cat.emoji} ${cat.name}</span>

    <div class="concept-section">
      <h3>📌 요약</h3>
      <p>${data.summary}</p>
    </div>

    <div class="concept-section">
      <h3>📖 개념 설명</h3>
      <p>${data.explanation}</p>
    </div>

    <div class="concept-section">
      <h3>🔑 핵심 포인트</h3>
      <ul>
        ${data.keyPoints.map((p) => `<li>${p}</li>`).join("")}
      </ul>
    </div>

    <div class="concept-section">
      <h3>🏠 실생활 속 과학</h3>
      <p>${data.realLife}</p>
    </div>

    <div class="concept-section">
      <h3>💡 재미있는 사실</h3>
      <p>${data.funFact}</p>
    </div>

    <div class="concept-image-wrap" id="concept-image-area">
      <button class="btn-generate-image" id="btn-gen-img">
        🎨 개념 이미지 생성하기
      </button>
    </div>

    <div class="quiz-section">
      <h3>🧩 퀴즈</h3>
      <p style="margin-bottom:.6rem;font-weight:600">${data.quiz.question}</p>
      ${data.quiz.options
        .map(
          (opt, i) =>
            `<button class="quiz-option" data-index="${i}">${opt}</button>`
        )
        .join("")}
      <div class="quiz-answer" id="quiz-answer" style="display:none"></div>
    </div>
  `;

  // Quiz logic
  const quizOptions = conceptContent.querySelectorAll(".quiz-option");
  const quizAnswer = $("#quiz-answer");
  let quizAnswered = false;

  quizOptions.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (quizAnswered) return;
      quizAnswered = true;
      const idx = parseInt(btn.dataset.index);
      const correct = data.quiz.correctIndex;

      if (idx === correct) {
        btn.classList.add("correct");
        quizAnswer.style.background = "#f0fdf4";
        quizAnswer.style.color = "#166534";
        quizAnswer.innerHTML = `✅ 정답! ${data.quiz.explanation}`;
      } else {
        btn.classList.add("wrong");
        quizOptions[correct].classList.add("correct");
        quizAnswer.style.background = "#fef2f2";
        quizAnswer.style.color = "#991b1b";
        quizAnswer.innerHTML = `❌ 오답! 정답은 "${data.quiz.options[correct]}"입니다. ${data.quiz.explanation}`;
      }
      quizAnswer.style.display = "block";
    });
  });

  // Image generation button
  $("#btn-gen-img").addEventListener("click", () =>
    generateConceptImage(data.imagePrompt, data.title)
  );

  categoriesSection.classList.add("hidden");
  topicsSection.classList.add("hidden");
  conceptSection.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ===== Generate Concept Image ===== */
async function generateConceptImage(imagePrompt, title) {
  const btn = $("#btn-gen-img");
  btn.disabled = true;
  btn.textContent = "🎨 이미지 생성 중...";

  const fullPrompt = `Create a clean, colorful educational illustration for middle school students: ${imagePrompt}. Style: simple flat design diagram, labeled in English, white background, vibrant colors, no text overlays.`;

  try {
    const imageData = await callGeminiImage(fullPrompt);
    const area = $("#concept-image-area");

    if (imageData) {
      area.innerHTML = `
        <img src="data:image/png;base64,${imageData}" alt="${title} 개념 이미지" />
        <p class="img-caption">AI가 생성한 "${title}" 개념 이미지</p>
      `;
    } else {
      area.innerHTML = `<p style="color:var(--text-muted);font-size:.9rem;">이미지를 생성할 수 없었습니다. 다시 시도해 주세요.</p>
        <button class="btn-generate-image" id="btn-gen-img" onclick="generateConceptImage('${imagePrompt.replace(/'/g, "\\'")}', '${title.replace(/'/g, "\\'")}')">🎨 다시 시도</button>`;
    }
  } catch (err) {
    const area = $("#concept-image-area");
    area.innerHTML = `<p style="color:#ef4444;font-size:.9rem;">이미지 생성 실패: ${err.message}</p>
      <button class="btn-generate-image" id="btn-gen-img">🎨 다시 시도</button>`;
    $("#btn-gen-img").addEventListener("click", () =>
      generateConceptImage(imagePrompt, title)
    );
  }
}

/* ===== Gemini API Calls ===== */
async function callGeminiText(prompt) {
  const url = `${API_BASE}/${TEXT_MODEL}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err.error?.message || `API 오류 (${res.status})`
    );
  }

  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("응답이 비어 있습니다.");

  return JSON.parse(text);
}

async function callGeminiImage(prompt) {
  const url = `${API_BASE}/${IMAGE_MODEL}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["IMAGE", "TEXT"],
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err.error?.message || `이미지 API 오류 (${res.status})`
    );
  }

  const json = await res.json();
  const parts = json.candidates?.[0]?.content?.parts || [];

  for (const part of parts) {
    if (part.inlineData) {
      return part.inlineData.data;
    }
  }

  return null;
}

/* ===== Loading Helpers ===== */
function showLoading(text) {
  loadingText.textContent = text || "잠시만 기다려 주세요...";
  loadingOverlay.classList.add("active");
}
function hideLoading() {
  loadingOverlay.classList.remove("active");
}

/* ===== Start ===== */
init();
