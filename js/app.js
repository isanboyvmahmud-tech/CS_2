// ==========================================================
// CS2 MARKETPLACE APP LOGIC
// ==========================================================

// Global State
const STATE = {
  currency: "USD",
  rates: {
    USD: { symbol: "$", rate: 1 },
    UZS: { symbol: " so'm", rate: 12850, isSuffix: true },
    EUR: { symbol: "€", rate: 0.92 }
  },
  balanceUSD: 1500, // boshlang'ich sinov balansi
  cart: [],
  filters: {
    category: "all",
    search: "",
    wear: "all",
    stattrakOnly: false,
    sortBy: "popular"
  },
  activeCase: null,
  isSpinning: false
};

// ==========================================================
// SOUND SYNTHESIZER (Web Audio API for realistic click & win)
// ==========================================================
const AudioController = {
  ctx: null,
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  },
  playClick() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch(e) {}
  },
  playWin() {
    try {
      this.init();
      if (!this.ctx) return;
      const notes = [440, 554, 659, 880];
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + i * 0.1);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime + i * 0.1);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + i * 0.1 + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime + i * 0.1);
        osc.stop(this.ctx.currentTime + i * 0.1 + 0.35);
      });
    } catch(e) {}
  }
};

// ==========================================================
// UTILITY FUNCTIONS
// ==========================================================
function formatPrice(usdPrice) {
  const current = STATE.rates[STATE.currency];
  const converted = usdPrice * current.rate;
  if (STATE.currency === "UZS") {
    return Math.round(converted).toLocaleString("uz-UZ") + current.symbol;
  }
  return current.symbol + converted.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function updateBalanceUI() {
  const balanceEl = document.getElementById("user-balance-val");
  if (balanceEl) {
    balanceEl.textContent = formatPrice(STATE.balanceUSD);
  }
}

function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  
  let icon = "🔔";
  if (type === "success") icon = "✅";
  if (type === "error") icon = "⚠️";

  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = "opacity 0.4s ease, transform 0.4s ease";
    toast.style.opacity = "0";
    toast.style.transform = "translateX(50px)";
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

// ==========================================================
// RENDER SKINS CATALOG
// ==========================================================
function renderSkinsCatalog() {
  const grid = document.getElementById("skins-grid");
  if (!grid) return;

  let filtered = [...SKINS_DATA];

  // 1. Kategoriya
  if (STATE.filters.category !== "all") {
    filtered = filtered.filter(s => s.category === STATE.filters.category);
  }

  // 2. Qidiruv
  if (STATE.filters.search.trim() !== "") {
    const q = STATE.filters.search.toLowerCase();
    filtered = filtered.filter(s => 
      s.name.toLowerCase().includes(q) || 
      s.weapon.toLowerCase().includes(q)
    );
  }

  // 3. Wear
  if (STATE.filters.wear !== "all") {
    filtered = filtered.filter(s => s.wearShort === STATE.filters.wear);
  }

  // 4. StatTrak
  if (STATE.filters.stattrakOnly) {
    filtered = filtered.filter(s => s.stattrak);
  }

  // 5. Saralash
  if (STATE.filters.sortBy === "price-low") {
    filtered.sort((a, b) => a.priceUSD - b.priceUSD);
  } else if (STATE.filters.sortBy === "price-high") {
    filtered.sort((a, b) => b.priceUSD - a.priceUSD);
  } else if (STATE.filters.sortBy === "float-low") {
    filtered.sort((a, b) => a.floatValue - b.floatValue);
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-catalog">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <h3>Hech qanday skin topilmadi</h3>
        <p>Qidiruv so'zini yoki filtrlarni o'zgartirib ko'ring</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(skin => {
    return `
      <div class="skin-card" style="--card-accent: ${skin.rarityColor}" onclick="openSkinModal(${skin.id})">
        <div class="skin-card-header">
          <div class="badge-group">
            ${skin.stattrak ? '<span class="badge-st">StatTrak™</span>' : ''}
            ${skin.souvenir ? '<span class="badge-souv">Souvenir</span>' : ''}
            <span class="badge-wear">${skin.wearShort}</span>
          </div>
          <span style="font-size: 0.75rem; color: ${skin.rarityColor}; font-weight: 700;">
            ${skin.rarityName.split(' ')[0]}
          </span>
        </div>

        <div class="skin-card-image-wrapper">
          <img class="skin-card-image" src="${skin.image}" alt="${skin.name}" loading="lazy" 
               onerror="this.src='img/dragon_lore.png'">
        </div>

        <div class="skin-card-info">
          <div class="skin-weapon-title">${skin.weapon}</div>
          <div class="skin-name-title" title="${skin.name}">${skin.name.split('|')[1] || skin.name}</div>
          
          <div class="float-preview-bar">
            <span>Float: ${skin.floatValue.toFixed(4)}</span>
            <div class="float-bar-track">
              <div class="float-bar-marker" style="left: ${skin.floatValue * 100}%"></div>
            </div>
          </div>

          <div class="skin-card-footer">
            <div class="skin-price">${formatPrice(skin.priceUSD)}</div>
            <button class="btn-card-buy" title="Savatga qo'shish" onclick="event.stopPropagation(); addToCart(${skin.id});">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// ==========================================================
// CASES SECTION RENDER
// ==========================================================
function renderCases() {
  const container = document.getElementById("cases-grid");
  if (!container) return;

  container.innerHTML = CASES_DATA.map(c => `
    <div class="case-card" onclick="openCaseModal('${c.id}')">
      <img src="${c.image}" alt="${c.name}">
      <h4>${c.name}</h4>
      <div class="case-card-price">${formatPrice(c.priceUSD)}</div>
      <button class="btn-open-case">Keysni ko'rish</button>
    </div>
  `).join("");
}

// ==========================================================
// SKIN DETAIL MODAL
// ==========================================================
let currentModalSkin = null;

function openSkinModal(skinId) {
  const skin = SKINS_DATA.find(s => s.id === skinId);
  if (!skin) return;
  currentModalSkin = skin;

  const modal = document.getElementById("skin-detail-modal");
  const modalContent = document.getElementById("skin-detail-content");
  if (!modal || !modalContent) return;

  modalContent.innerHTML = `
    <div class="detail-modal-header">
      <div style="color: ${skin.rarityColor}; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 0.3rem;">
        ${skin.rarityName} ${skin.stattrak ? '• StatTrak™' : ''} ${skin.souvenir ? '• Souvenir' : ''}
      </div>
      <h2 style="font-size: 2rem; color: #fff;">${skin.name}</h2>
    </div>

    <div class="detail-skin-img-wrap">
      <img src="${skin.image}" alt="${skin.name}">
    </div>

    <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 1.2rem; text-align: center;">
      ${skin.description}
    </p>

    <div class="detail-specs-grid">
      <div class="spec-item">
        <div class="label">Qurol turi</div>
        <div class="value">${skin.weapon}</div>
      </div>
      <div class="spec-item">
        <div class="label">Holati (Wear)</div>
        <div class="value">${skin.wear} (${skin.wearShort})</div>
      </div>
      <div class="spec-item">
        <div class="label">Aniq Float qiymati</div>
        <div class="value">${skin.floatValue}</div>
      </div>
      <div class="spec-item">
        <div class="label">Rarity darajasi</div>
        <div class="value" style="color: ${skin.rarityColor}">${skin.rarityName}</div>
      </div>
    </div>

    <div class="detail-actions">
      <button class="btn-primary" onclick="addToCart(${skin.id}); closeModal('skin-detail-modal');">
        Savatga qo'shish (${formatPrice(skin.priceUSD)})
      </button>
      <button class="btn-secondary" onclick="buySkinDirectly(${skin.id})">
        Darhol sotib olish
      </button>
    </div>
  `;

  modal.classList.add("active");
}

// ==========================================================
// CART MANAGEMENT
// ==========================================================
function addToCart(skinId) {
  const skin = SKINS_DATA.find(s => s.id === skinId);
  if (!skin) return;

  STATE.cart.push(skin);
  updateCartBadge();
  showToast(`"${skin.name}" savatga qo'shildi!`, "success");
}

function removeFromCart(index) {
  STATE.cart.splice(index, 1);
  updateCartBadge();
  renderCartDrawer();
  showToast("Skin savatdan olib tashlandi", "info");
}

function updateCartBadge() {
  const badge = document.getElementById("cart-badge-count");
  if (badge) {
    badge.textContent = STATE.cart.length;
  }
}

function openCartModal() {
  renderCartDrawer();
  const modal = document.getElementById("cart-modal");
  if (modal) modal.classList.add("active");
}

function renderCartDrawer() {
  const container = document.getElementById("cart-items-container");
  const totalEl = document.getElementById("cart-total-price");
  if (!container || !totalEl) return;

  if (STATE.cart.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
        <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">Savatingiz hozircha bo'sh</p>
        <p style="font-size: 0.85rem;">Katalogdan yoqqan skinlarni tanlang va savatga qo'shing!</p>
      </div>
    `;
    totalEl.textContent = formatPrice(0);
    return;
  }

  let total = 0;
  container.innerHTML = STATE.cart.map((item, index) => {
    total += item.priceUSD;
    return `
      <div class="cart-item-row">
        <div class="cart-item-info">
          <img src="${item.image}" alt="${item.name}">
          <div>
            <div class="cart-item-name">${item.name}</div>
            <div class="cart-item-sub">${item.wearShort} • ${item.rarityName.split(' ')[0]}</div>
          </div>
        </div>
        <div class="cart-item-right">
          <span class="cart-item-price">${formatPrice(item.priceUSD)}</span>
          <button class="btn-remove-item" onclick="removeFromCart(${index})" title="O'chirish">✕</button>
        </div>
      </div>
    `;
  }).join("");

  totalEl.textContent = formatPrice(total);
}

function checkoutCart() {
  if (STATE.cart.length === 0) {
    showToast("Savatingiz bo'sh!", "error");
    return;
  }

  const totalUSD = STATE.cart.reduce((sum, item) => sum + item.priceUSD, 0);
  if (STATE.balanceUSD < totalUSD) {
    showToast("Balansingizda yetarli mablag' mavjud emas! Iltimos hisobingizni to'ldiring.", "error");
    openDepositModal();
    return;
  }

  STATE.balanceUSD -= totalUSD;
  const count = STATE.cart.length;
  STATE.cart = [];
  updateCartBadge();
  updateBalanceUI();
  closeModal("cart-modal");
  AudioController.playWin();
  showToast(`Muvaffaqiyatli! ${count} ta skin hisobingizga qabul qilindi. Steam orqali yuborilmoqda.`, "success");
}

function buySkinDirectly(skinId) {
  const skin = SKINS_DATA.find(s => s.id === skinId);
  if (!skin) return;

  if (STATE.balanceUSD < skin.priceUSD) {
    showToast("Balansingizda mablag' yetarli emas!", "error");
    openDepositModal();
    return;
  }

  STATE.balanceUSD -= skin.priceUSD;
  updateBalanceUI();
  closeModal("skin-detail-modal");
  AudioController.playWin();
  showToast(`Tabriklaymiz! "${skin.name}" xarid qilindi!`, "success");
}

// ==========================================================
// CASE OPENING MINI-GAME (ROULETTE SIMULATOR)
// ==========================================================
function openCaseModal(caseId) {
  const c = CASES_DATA.find(x => x.id === caseId);
  if (!c) return;
  STATE.activeCase = c;

  const modal = document.getElementById("case-modal");
  const caseTitle = document.getElementById("case-modal-title");
  const casePrice = document.getElementById("case-modal-price");
  const resultDisplay = document.getElementById("case-result");
  const rouletteStrip = document.getElementById("roulette-strip");

  if (!modal) return;

  caseTitle.textContent = c.name;
  casePrice.textContent = `Narxi: ${formatPrice(c.priceUSD)}`;
  resultDisplay.style.display = "none";

  // Roulette qatorini to'ldiramiz (50 ta random skin)
  fillRouletteStrip(c);

  modal.classList.add("active");
}

function fillRouletteStrip(c) {
  const strip = document.getElementById("roulette-strip");
  strip.style.transition = "none";
  strip.style.transform = "translateX(0px)";

  const caseSkins = SKINS_DATA.filter(s => c.contains.includes(s.id));
  let stripHTML = "";

  // 60 ta element quramiz
  for (let i = 0; i < 60; i++) {
    const randomSkin = caseSkins[Math.floor(Math.random() * caseSkins.length)];
    stripHTML += `
      <div class="roulette-item" style="--r-color: ${randomSkin.rarityColor}" data-skin-id="${randomSkin.id}">
        <img src="${randomSkin.image}" alt="${randomSkin.name}">
        <span>${randomSkin.name}</span>
      </div>
    `;
  }

  strip.innerHTML = stripHTML;
}

function spinCaseRoulette() {
  if (STATE.isSpinning) return;
  const c = STATE.activeCase;
  if (!c) return;

  if (STATE.balanceUSD < c.priceUSD) {
    showToast("Keys ochish uchun hisobingizda mablag' yetarli emas!", "error");
    openDepositModal();
    return;
  }

  STATE.balanceUSD -= c.priceUSD;
  updateBalanceUI();
  STATE.isSpinning = true;

  const spinBtn = document.getElementById("btn-spin-case");
  if (spinBtn) spinBtn.disabled = true;

  const resultDisplay = document.getElementById("case-result");
  resultDisplay.style.display = "none";

  // Yutadigan skin (45-indeks atrofida to'xtaymiz)
  const winningIndex = 45;
  const itemWidth = 160;
  // Tasodifiy ofset (element markaziga tushish uchun)
  const randomOffset = Math.floor(Math.random() * (itemWidth - 40)) + 20;
  // Konteyner o'rtasiga kelishi kerak: container kengligi ~ 560px bo'lsa o'rtasi 280px
  const containerCenter = document.querySelector(".case-roulette-wrapper").offsetWidth / 2;
  const targetX = -(winningIndex * itemWidth - containerCenter + randomOffset);

  const strip = document.getElementById("roulette-strip");
  strip.style.transition = "transform 6s cubic-bezier(0.1, 0.88, 0.15, 1)";
  strip.style.transform = `translateX(${targetX}px)`;

  // Click tovushlari
  let clickInterval = setInterval(() => {
    AudioController.playClick();
  }, 180);

  setTimeout(() => {
    clearInterval(clickInterval);
  }, 5000);

  setTimeout(() => {
    STATE.isSpinning = false;
    if (spinBtn) spinBtn.disabled = false;

    // Yutgan elementni aniqlash
    const winningEl = strip.children[winningIndex];
    const skinId = parseInt(winningEl.getAttribute("data-skin-id"));
    const wonSkin = SKINS_DATA.find(s => s.id === skinId);

    if (wonSkin) {
      AudioController.playWin();
      resultDisplay.style.display = "block";
      resultDisplay.innerHTML = `
        <div style="font-size: 1.1rem; color: var(--cs-gold); font-weight: 800; text-transform: uppercase;">
          🎉 Tabriklaymiz! Siz yutib oldingiz:
        </div>
        <div style="font-size: 1.5rem; font-weight: 800; color: #fff; margin: 0.4rem 0;">
          ${wonSkin.name}
        </div>
        <div style="font-size: 1.2rem; color: ${wonSkin.rarityColor}; font-weight: 700; margin-bottom: 0.8rem;">
          Qiymati: ${formatPrice(wonSkin.priceUSD)}
        </div>
        <button class="btn-primary" style="margin: 0 auto;" onclick="addToCart(${wonSkin.id}); closeModal('case-modal');">
          Savatga / Inventarga olish
        </button>
      `;
      showToast(`Tabriklaymiz! Siz "${wonSkin.name}" yutdingiz!`, "success");
    }
  }, 6100);
}

// ==========================================================
// DEPOSIT MODAL LOGIC
// ==========================================================
let depositAmount = 50;

function openDepositModal() {
  const modal = document.getElementById("deposit-modal");
  if (modal) modal.classList.add("active");
}

function selectDepositAmount(amt, el) {
  depositAmount = amt;
  document.querySelectorAll(".amt-chip").forEach(c => c.classList.remove("active"));
  if (el) el.classList.add("active");
  const input = document.getElementById("custom-deposit-input");
  if (input) input.value = amt;
}

function completeDeposit() {
  const input = document.getElementById("custom-deposit-input");
  let val = depositAmount;
  if (input && parseFloat(input.value) > 0) {
    val = parseFloat(input.value);
  }

  STATE.balanceUSD += val;
  updateBalanceUI();
  closeModal("deposit-modal");
  AudioController.playWin();
  showToast(`Hisobingiz muvaffaqiyatli ${formatPrice(val)} ga to'ldirildi!`, "success");
}

// ==========================================================
// MODAL HELPERS
// ==========================================================
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("active");
}

// Backdrop bosilganda yopish
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-overlay")) {
    e.target.classList.remove("active");
  }
});

// ==========================================================
// EVENT LISTENERS & INITIALIZATION
// ==========================================================
document.addEventListener("DOMContentLoaded", () => {
  // 1. Initial UI update
  updateBalanceUI();
  updateCartBadge();
  renderCases();
  renderSkinsCatalog();

  // 2. Currency Selector
  const currencySelect = document.getElementById("currency-select");
  if (currencySelect) {
    currencySelect.addEventListener("change", (e) => {
      STATE.currency = e.target.value;
      updateBalanceUI();
      renderSkinsCatalog();
      renderCases();
      renderCartDrawer();
    });
  }

  // 3. Category Filter Buttons
  const catButtons = document.querySelectorAll(".cat-btn");
  catButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      catButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      STATE.filters.category = btn.getAttribute("data-category");
      renderSkinsCatalog();
    });
  });

  // 4. Search Input
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      STATE.filters.search = e.target.value;
      renderSkinsCatalog();
    });
  }

  // 5. Wear Filter Tags
  const wearTags = document.querySelectorAll(".wear-tag");
  wearTags.forEach(tag => {
    tag.addEventListener("click", () => {
      wearTags.forEach(t => t.classList.remove("active"));
      tag.classList.add("active");
      STATE.filters.wear = tag.getAttribute("data-wear");
      renderSkinsCatalog();
    });
  });

  // 6. StatTrak Checkbox
  const stCheckbox = document.getElementById("filter-stattrak");
  if (stCheckbox) {
    stCheckbox.addEventListener("change", (e) => {
      STATE.filters.stattrakOnly = e.target.checked;
      renderSkinsCatalog();
    });
  }

  // 7. Sort Select
  const sortSelect = document.getElementById("sort-select");
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      STATE.filters.sortBy = e.target.value;
      renderSkinsCatalog();
    });
  }
});
