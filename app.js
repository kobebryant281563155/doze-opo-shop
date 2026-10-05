/* ==========================================================================
   DOZE OPO Mobile Independent Store Frontend Logic (English Version)
   Features: Dynamic Multi-Currency, Instant OEM Quote Calc, Tab Routing,
             Product Modals, Sample Cart, and WhatsApp/Tech Pack Flow
   ========================================================================== */

// 1. Global State
const APP_STATE = {
  currentCurrency: 'USD',
  currencyRates: {
    USD: { rate: 1.0, symbol: '$' },
    EUR: { rate: 0.93, symbol: '€' },
    GBP: { rate: 0.79, symbol: '£' },
    CNY: { rate: 7.25, symbol: '¥' }
  },
  currentTab: 'home',
  cartItems: [
    {
      id: 'H01',
      name: 'H01 Heavyweight Boxy Hoodie',
      priceUSD: 24.50,
      qty: 1,
      size: 'XL',
      spec: '460 GSM Terry · Vintage Charcoal',
      img: 'assets/hoodie_item.jpg'
    }
  ],
  customCalc: {
    garmentMultiplier: 1.0,
    craftTeePriceUSD: 20.00,
    qty: 1
  }
};

// 2. Product Database (Preserved categories, loaded from window.PRODUCTS_DATA)
const PRODUCTS_DATA = (typeof window !== 'undefined' && window.PRODUCTS_DATA) ? window.PRODUCTS_DATA : {
  'T012': {
    id: 'T012',
    name: 'T012 240G Raglan Sleeve Boxy Tee',
    category: 'tee',
    priceUSD: 15.00,
    gram: '240 GSM Combed Cotton',
    img: 'assets/t012/main/3.jpg',
    color: '8 Contrast Colorways',
    specs: [
      '240 GSM Combed Cotton · Double-Yarn 32S/2 Knit',
      'Athletic Raglan Color-Block Sleeve Construction',
      'Oversized Boxy Fit, Pre-shrunk Fabric (< 2%)',
      '3.0cm 1x1 Elastic Ribbed Collar with Bound Taping',
      '8 Vintage Colorways · 1-Piece Custom Tech Pack Ready'
    ],
    gallery: [
      'assets/t012/main/3.jpg',
      'assets/t012/main/1.jpg',
      'assets/t012/main/2.jpg',
      'assets/t012/main/4.jpg'
    ],
    skus: [
      { name: 'White / Black', thumb: 'assets/t012/sku/sku_white_black.jpg', hero: 'assets/t012/main/3.jpg' },
      { name: 'Beige / Light Blue', thumb: 'assets/t012/sku/sku_beige_lightblue.jpg', hero: 'assets/t012/detail/01cc0e866b32223730f1efe716572b66.png' },
      { name: 'Beige / Wheat', thumb: 'assets/t012/sku/sku_beige_wheat.jpg', hero: 'assets/t012/detail/65799724a3e5ac65b38994b98c588596.png' },
      { name: 'Sports Grey / Navy Blue', thumb: 'assets/t012/sku/sku_sportsgrey_navy.jpg', hero: 'assets/t012/detail/f6369b0a304eef1a95656a5327c562e0.png' },
      { name: 'Navy Blue / Wine Red', thumb: 'assets/t012/sku/sku_navy_winered.jpg', hero: 'assets/t012/detail/e3605f3f99641adf0242080604ffd994.png' },
      { name: 'Wheat / Jungle Green', thumb: 'assets/t012/sku/sku_wheat_junglegreen.jpg', hero: 'assets/t012/detail/2935d8187433107aa843e913c53cf7e1.png' },
      { name: 'Purple / Black', thumb: 'assets/t012/sku/sku_purple_black.jpg', hero: 'assets/t012/detail/89d552f73ea8de6fcf9e0e40ad2142cb.png' },
      { name: 'Wheat / Morandi Grey', thumb: 'assets/t012/sku/sku_wheat_morandigrey.jpg', hero: 'assets/t012/detail/9a1dda6e0215d0cd1e05cca190686f05.png' }
    ]
  }
};

// 3. Initialization
document.addEventListener('DOMContentLoaded', () => {
  initSystemClock();
  initDevControls();
  initBannerPagination();
  initCustomCalculator();
  initSearch();
  initQuickNav();
  renderCatalogList('all');
  updateAllPrices();

  // Support deep links (e.g. ?tab=catalog, ?cat=tee, ?pdp=T012, or #catalog)
  const urlParams = new URLSearchParams(window.location.search);
  const hash = window.location.hash.replace('#', '');
  if (urlParams.get('tab')) {
    switchTab(urlParams.get('tab'));
  } else if (hash === 'catalog') {
    switchTab('catalog');
  }
  if (urlParams.get('cat')) {
    handleCategoryFilter(urlParams.get('cat'));
  }
  if (urlParams.get('pdp')) {
    openProductDetail(urlParams.get('pdp'));
  }
  if (urlParams.get('scroll')) {
    setTimeout(() => {
      const container = document.getElementById('appScrollContainer');
      if (container) container.scrollTop = parseInt(urlParams.get('scroll'));
    }, 150);
  }
});

// 4. Mobile System Clock
function initSystemClock() {
  const timeElem = document.getElementById('liveTime');
  const update = () => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    if (timeElem) timeElem.textContent = `${h}:${m}`;
  };
  update();
  setInterval(update, 30000);
}

// 5. Desktop Dev Bar Controls
function initDevControls() {
  const btnPhone = document.getElementById('btnPhoneView');
  const btnFull = document.getElementById('btnFullView');
  const wrapper = document.getElementById('viewportWrapper');
  const currSelect = document.getElementById('currencySelector');

  if (btnPhone && btnFull && wrapper) {
    btnPhone.addEventListener('click', () => {
      btnPhone.classList.add('active');
      btnFull.classList.remove('active');
      wrapper.classList.remove('fullscreen-mode');
    });

    btnFull.addEventListener('click', () => {
      btnFull.classList.add('active');
      btnPhone.classList.remove('active');
      wrapper.classList.add('fullscreen-mode');
    });
  }

  if (currSelect) {
    currSelect.addEventListener('change', (e) => {
      APP_STATE.currentCurrency = e.target.value;
      updateAllPrices();
      showToast(`Settlement currency switched to: ${e.target.value}`);
    });
  }
}

// 6. Dynamic Currency Formatting
function formatCurrency(usdAmount) {
  const cur = APP_STATE.currencyRates[APP_STATE.currentCurrency];
  const converted = usdAmount * cur.rate;
  return `${converted.toFixed(2)}`;
}

function updateAllPrices() {
  const cur = APP_STATE.currencyRates[APP_STATE.currentCurrency];
  document.querySelectorAll('.currency-symbol').forEach(el => {
    el.textContent = cur.symbol;
  });

  document.querySelectorAll('[data-base-usd]').forEach(el => {
    const baseUSD = parseFloat(el.getAttribute('data-base-usd'));
    el.textContent = formatCurrency(baseUSD);
  });

  recalcCustomQuote();
  updateCartTotal();
  if (typeof updatePdpShippingCalc === 'function') {
    updatePdpShippingCalc();
  }
}

// 7. Banner Pagination
function initBannerPagination() {
  const dots = document.querySelectorAll('.banner-pagination .dot');
  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      dots.forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
    });
  });
}

// 8. Quick Navigation & Smooth Scroll
function initQuickNav() {
  document.querySelectorAll('.quick-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const targetId = item.getAttribute('data-target');
      if (targetId) {
        scrollToSection(targetId);
      }
    });
  });
}

function scrollToSection(id) {
  if (APP_STATE.currentTab !== 'home') {
    switchTab('home');
  }
  setTimeout(() => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 100);
}

// 9. Search Filter
function initSearch() {
  const searchInput = document.getElementById('mainSearchInput');
  const clearBtn = document.getElementById('searchClearBtn');

  if (searchInput && clearBtn) {
    searchInput.addEventListener('input', (e) => {
      const val = e.target.value.trim().toLowerCase();
      clearBtn.style.display = val.length > 0 ? 'flex' : 'none';
      if (val.length > 0) {
        filterProductsOnSearch(val);
      }
    });

    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearBtn.style.display = 'none';
      document.querySelectorAll('.product-card').forEach(card => card.style.display = 'flex');
    });
  }
}

function filterProductsOnSearch(keyword) {
  let matchCount = 0;
  document.querySelectorAll('.product-card').forEach(card => {
    const text = card.textContent.toLowerCase();
    if (text.includes(keyword)) {
      card.style.display = 'flex';
      matchCount++;
    } else {
      card.style.display = 'none';
    }
  });
  if (matchCount === 0) {
    showToast(`No item matching "${keyword}". Custom tech pack available via WhatsApp.`);
  }
}

// 10. OEM Custom Lab Calculator
function initCustomCalculator() {
  // Garment Chips (TEE: 1x, CREWNECK SWEATSHIRT: 1.5x, HOODIES: 2x, ZIP JACKETS: 3x, PANTS: 2x, JEANS: 3x)
  const garmentChips = document.querySelectorAll('#garmentTypeChips .calc-chip');
  garmentChips.forEach(chip => {
    chip.addEventListener('click', () => {
      garmentChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      APP_STATE.customCalc.garmentMultiplier = parseFloat(chip.getAttribute('data-multiplier')) || 1.0;
      recalcCustomQuote();
    });
  });

  // Craft Chips (TEE Craft Base Prices: Heat Transfer $20, Screen $40, Puff $40, DTG $50, Embroidery $50)
  const craftChips = document.querySelectorAll('#craftTypeChips .calc-chip');
  craftChips.forEach(chip => {
    chip.addEventListener('click', () => {
      craftChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      APP_STATE.customCalc.craftTeePriceUSD = parseFloat(chip.getAttribute('data-tee-price')) || 20.00;
      recalcCustomQuote();
    });
  });

  // Quantity Stepper
  const qtyInput = document.getElementById('customQtyInput');
  const btnMinus = document.getElementById('btnQtyMinus');
  const btnPlus = document.getElementById('btnQtyPlus');
  const presetTags = document.querySelectorAll('.preset-tag');

  const setQty = (val) => {
    val = Math.max(1, parseInt(val) || 1);
    qtyInput.value = val;
    APP_STATE.customCalc.qty = val;

    presetTags.forEach(tag => {
      const q = parseInt(tag.getAttribute('data-qty'));
      tag.classList.toggle('active', q === val);
    });

    recalcCustomQuote();
  };

  btnMinus.addEventListener('click', () => setQty(parseInt(qtyInput.value) - 1));
  btnPlus.addEventListener('click', () => setQty(parseInt(qtyInput.value) + 1));
  qtyInput.addEventListener('change', () => setQty(qtyInput.value));

  presetTags.forEach(tag => {
    tag.addEventListener('click', () => {
      const q = parseInt(tag.getAttribute('data-qty'));
      setQty(q);
    });
  });

  const btnSubmitRFQ = document.getElementById('btnSubmitCustomRFQ');
  if (btnSubmitRFQ) {
    btnSubmitRFQ.addEventListener('click', () => {
      openB2BModal();
    });
  }

  recalcCustomQuote();
}

function recalcCustomQuote() {
  const { garmentMultiplier, craftTeePriceUSD, qty } = APP_STATE.customCalc;

  // Formula: Unit Price (TEE Base * Multiplier) * Quantity = Subtotal
  const finalUnitUSD = (craftTeePriceUSD || 20.00) * (garmentMultiplier || 1.0);
  const finalSubtotalUSD = finalUnitUSD * qty;
  const shippingUSD = calculateUsShipping(qty);
  const deliveredTotalUSD = finalSubtotalUSD + shippingUSD;

  const unitDisplay = document.getElementById('unitPriceDisplay');
  const subtotalDisplay = document.getElementById('customSubtotalDisplay');
  const shippingDisplay = document.getElementById('customShippingDisplay');
  const formulaDisplay = document.getElementById('customShipFormula');
  const totalDisplay = document.getElementById('totalPriceDisplay');
  const qtyLabel = document.getElementById('customQtyLabel');

  if (unitDisplay) unitDisplay.textContent = formatCurrency(finalUnitUSD);
  if (subtotalDisplay) subtotalDisplay.textContent = formatCurrency(finalSubtotalUSD);
  if (shippingDisplay) shippingDisplay.textContent = formatCurrency(shippingUSD);
  if (totalDisplay) totalDisplay.textContent = formatCurrency(deliveredTotalUSD);

  if (qtyLabel) {
    qtyLabel.textContent = `${qty} pc${qty > 1 ? 's' : ''}`;
  }

  if (formulaDisplay) {
    if (qty === 1) {
      formulaDisplay.textContent = '($8.00 base · 10–15d)';
    } else {
      formulaDisplay.textContent = `($8.00 + ${qty - 1} × $0.50 · 10–15d)`;
    }
  }
}

// 11. Bottom Tab Navigation
function switchTab(tabName) {
  APP_STATE.currentTab = tabName;

  document.querySelectorAll('.tab-page-content').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.tab-item').forEach(btn => btn.classList.remove('active'));

  const targetPageMap = {
    'home': 'homePage',
    'catalog': 'catalogPage',
    'custom': 'customPage',
    'cart': 'cartPage',
    'profile': 'profilePage'
  };

  const targetId = targetPageMap[tabName] || 'homePage';
  const targetPage = document.getElementById(targetId);
  if (targetPage) {
    targetPage.style.display = 'block';
  }

  const activeBtn = document.querySelector(`.tab-item[data-tab="${tabName}"]`);
  if (activeBtn) {
    activeBtn.classList.add('active');
  }

  const container = document.getElementById('appScrollContainer');
  if (container) container.scrollTop = 0;
}

// 12. Catalog Page Rendering
function renderCatalogList(catFilter) {
  const container = document.getElementById('catalogProductList');
  if (!container) return;

  container.innerHTML = '';
  const products = Object.values(PRODUCTS_DATA).filter(p => {
    if (catFilter === 'all') return true;
    return p.category === catFilter;
  });

  if (products.length === 0) {
    container.innerHTML = `
      <div class="empty-catalog-box">
        <div class="empty-icon">📭</div>
        <p class="empty-text">No Products in this Category</p>
        <span class="empty-hint">1-Piece Custom Tech Pack proofing available via WhatsApp</span>
      </div>
    `;
  } else {
    products.forEach(p => {
      const item = document.createElement('div');
      item.className = 'catalog-card';
      item.onclick = () => openProductDetail(p.id);
      item.innerHTML = `
        <div class="catalog-thumb-box">
          <img src="${p.img}" alt="${p.name}" class="catalog-thumb-img" loading="lazy">
        </div>
        <div class="catalog-info">
          <h4 class="catalog-item-title">${p.name}</h4>
          <div class="catalog-item-specs">${p.gram} · ${p.color}</div>
          <div class="catalog-item-bottom">
            <div class="catalog-item-price">
              <span class="currency-symbol">$</span><span data-base-usd="${p.priceUSD}">${formatCurrency(p.priceUSD)}</span>
            </div>
            <span class="catalog-moq-tag">1 PC Sample</span>
          </div>
        </div>
      `;
      container.appendChild(item);
    });
  }

  document.querySelectorAll('.cat-nav-item').forEach(item => {
    item.onclick = () => {
      document.querySelectorAll('.cat-nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const cat = item.getAttribute('data-cat');
      renderCatalogList(cat);
    };
  });
}

function handleCategoryFilter(cat) {
  switchTab('catalog');
  const catItem = document.querySelector(`.cat-nav-item[data-cat="${cat}"]`);
  if (catItem) {
    catItem.click();
  }
}

// 12.1 Product Detail Page (PDP) Functionality
let activePdpProductId = 'T012';
let activePdpColor = 'White / Black';
let activePdpSize = 'XL';
let activePdpQty = 1;

// US Shipping Rule: $8.00 base for 1st item, +$0.50 for each additional item
function calculateUsShipping(qty) {
  qty = Math.max(0, parseInt(qty) || 0);
  if (qty <= 0) return 0;
  return 8.00 + (qty - 1) * 0.50;
}

function changePdpQty(delta) {
  setPdpQty(activePdpQty + delta);
}

function setPdpQty(val) {
  activePdpQty = Math.max(1, parseInt(val) || 1);
  const input = document.getElementById('pdpQtyInput');
  if (input) input.value = activePdpQty;

  const presets = document.querySelectorAll('.pdp-qpreset');
  presets.forEach(p => {
    const pQty = parseInt(p.textContent) || 0;
    p.classList.toggle('active', pQty === activePdpQty);
  });

  updatePdpShippingCalc();
}

function updatePdpShippingCalc() {
  const prod = PRODUCTS_DATA[activePdpProductId];
  if (!prod) return;

  const qty = activePdpQty;
  const unitPriceUSD = prod.priceUSD;
  const garmentSubtotalUSD = unitPriceUSD * qty;
  const shippingFeeUSD = calculateUsShipping(qty);
  const deliveredTotalUSD = garmentSubtotalUSD + shippingFeeUSD;

  const sym = APP_STATE.currencyRates[APP_STATE.currentCurrency]?.symbol || '$';

  const qtyDisplay = document.getElementById('pdpQtyDisplay');
  if (qtyDisplay) {
    qtyDisplay.textContent = `${qty} pc${qty > 1 ? 's' : ''}${qty === 1 ? ' (Sample)' : ''}`;
  }

  const calcQtyText = document.getElementById('pdpCalcQtyText');
  if (calcQtyText) {
    calcQtyText.textContent = `${qty} pc${qty > 1 ? 's' : ''}`;
  }

  const garmentSubtotalElem = document.getElementById('pdpGarmentSubtotal');
  if (garmentSubtotalElem) {
    garmentSubtotalElem.textContent = `${sym}${formatCurrency(garmentSubtotalUSD)}`;
  }

  const formulaNoteElem = document.getElementById('pdpShipFormulaNote');
  if (formulaNoteElem) {
    if (qty === 1) {
      formulaNoteElem.textContent = '($8.00 base)';
    } else {
      formulaNoteElem.textContent = `($8.00 + ${qty - 1} × $0.50)`;
    }
  }

  const shippingFeeElem = document.getElementById('pdpShippingFee');
  if (shippingFeeElem) {
    shippingFeeElem.textContent = `${sym}${formatCurrency(shippingFeeUSD)}`;
  }

  const deliveredTotalElem = document.getElementById('pdpDeliveredTotal');
  if (deliveredTotalElem) {
    deliveredTotalElem.textContent = `${sym}${formatCurrency(deliveredTotalUSD)}`;
  }

  // Update Bottom Sticky Order Button
  const orderBtnText = document.getElementById('pdpOrderBtnText');
  if (orderBtnText) {
    orderBtnText.textContent = `Order ${qty}-PC Sample (${sym}${formatCurrency(deliveredTotalUSD)} Delivered)`;
  }
}

function openProductDetail(productId) {
  const prod = PRODUCTS_DATA[productId];
  if (!prod) return;

  activePdpProductId = productId;
  activePdpQty = 1;
  const input = document.getElementById('pdpQtyInput');
  if (input) input.value = 1;
  const presets = document.querySelectorAll('.pdp-qpreset');
  presets.forEach(p => {
    const pQty = parseInt(p.textContent) || 0;
    p.classList.toggle('active', pQty === 1);
  });
  updatePdpShippingCalc();

  document.querySelectorAll('.tab-page-content').forEach(p => p.style.display = 'none');
  const pdp = document.getElementById('productDetailPage');
  if (pdp) pdp.style.display = 'block';

  const container = document.getElementById('appScrollContainer');
  if (container) container.scrollTop = 0;

  // Update Title & Meta
  const titleElem = document.querySelector('.pdp-title');
  if (titleElem) titleElem.textContent = prod.name;
  
  const priceVal = document.querySelector('.pdp-price-val');
  if (priceVal) {
    priceVal.textContent = formatCurrency(prod.priceUSD);
    priceVal.setAttribute('data-base-usd', prod.priceUSD);
  }
  
  const descElem = document.querySelector('.pdp-desc');
  if (descElem) descElem.textContent = prod.specs ? prod.specs.slice(0, 2).join(' · ') : '';

  // Gallery thumbs
  const thumbStrip = document.getElementById('pdpThumbStrip');
  const gallery = (prod.gallery && prod.gallery.length > 0) ? prod.gallery : (prod.skus ? prod.skus.map(s => s.hero).slice(0, 4) : [prod.img]);
  if (thumbStrip) {
    thumbStrip.innerHTML = '';
    gallery.forEach((gImg, idx) => {
      const tDiv = document.createElement('div');
      tDiv.className = `pdp-thumb ${idx === 0 ? 'active' : ''}`;
      tDiv.onclick = () => switchPdpHero(gImg, idx + 1);
      tDiv.innerHTML = `<img src="${gImg}" alt="Gallery ${idx + 1}">`;
      thumbStrip.appendChild(tDiv);
    });
  }

  // Render SKU color grid
  const colorGrid = document.getElementById('pdpColorGrid');
  if (colorGrid && prod.skus && prod.skus.length > 0) {
    colorGrid.innerHTML = '';
    prod.skus.forEach((sku, idx) => {
      const swatch = document.createElement('div');
      swatch.className = `pdp-color-swatch ${idx === 0 ? 'active' : ''}`;
      swatch.onclick = () => selectPdpColor(sku.name, sku.hero, swatch);
      swatch.innerHTML = `
        <div class="swatch-img-box">
          <img src="${sku.thumb}" alt="${sku.name}">
        </div>
        <span class="swatch-name">${sku.name}</span>
      `;
      colorGrid.appendChild(swatch);
    });
    activePdpColor = prod.skus[0].name;
    const colorLabel = document.getElementById('pdpActiveColorName');
    if (colorLabel) colorLabel.textContent = activePdpColor;
    switchPdpHero(prod.skus[0].hero || gallery[0], 1);
  } else if (gallery.length > 0) {
    switchPdpHero(gallery[0], 1);
  }

  // Lookbook view: T012 dedicated graphics vs Dynamic Lookbook for all other 18 products
  const t012Section = document.getElementById('pdpT012CustomLookbook');
  const dynSection = document.getElementById('pdpDynamicLookbook');
  if (t012Section && dynSection) {
    if (productId === 'T012') {
      t012Section.style.display = 'block';
      dynSection.style.display = 'none';
    } else {
      t012Section.style.display = 'none';
      dynSection.style.display = 'block';
      renderDynamicLookbook(prod);
    }
  }

  // Update Bottom Sticky Order Button
  const orderBtn = document.getElementById('pdpOrderBtn');
  if (orderBtn) {
    orderBtn.onclick = () => addPdpToCart(productId);
  }
  updatePdpShippingCalc();
}

function renderDynamicLookbook(prod) {
  const container = document.getElementById('pdpDynamicLookbook');
  if (!container) return;

  const specListHtml = (prod.specs || []).map(s => {
    const parts = s.split(' - ');
    const title = parts[0] || s;
    const detail = parts[1] || 'Streetwear Construction';
    return `<li><strong>${title}:</strong> ${detail}</li>`;
  }).join('');

  // Category specific sizing chart
  let sizeGuideHtml = '';
  if (prod.category === 'pants') {
    sizeGuideHtml = `
      <div class="pdp-size-tables-card">
        <div class="table-header">
          <span class="table-tag">SIZE GUIDE</span>
          <h4>Recommended Pants Sizing Guide</h4>
        </div>
        <div class="pdp-table-wrap">
          <table class="pdp-spec-table">
            <thead>
              <tr><th>Size</th><th>Waist (cm)</th><th>Pants Length (cm)</th><th>Suggested Fit</th></tr>
            </thead>
            <tbody>
              <tr><td><strong>M</strong></td><td>74 - 82</td><td>102 cm</td><td>Regular Street</td></tr>
              <tr><td><strong>L</strong></td><td>78 - 88</td><td>104 cm</td><td>Loose Relaxed</td></tr>
              <tr class="highlight-row"><td><strong>XL</strong></td><td>84 - 94</td><td>106 cm</td><td>Baggy Skate</td></tr>
              <tr><td><strong>2XL</strong></td><td>88 - 100</td><td>108 cm</td><td>Extreme Baggy</td></tr>
            </tbody>
          </table>
        </div>
        <small class="pdp-table-tip">Note: Elastic waistband with interior drawstring. Tolerance within ±1-2cm.</small>
      </div>
    `;
  } else {
    sizeGuideHtml = `
      <div class="pdp-size-tables-card">
        <div class="table-header">
          <span class="table-tag">SIZE GUIDE</span>
          <h4>Recommended Size Guide (Height &amp; Weight)</h4>
        </div>
        <div class="pdp-table-wrap">
          <table class="pdp-spec-table">
            <thead>
              <tr><th>Size</th><th>Height (cm)</th><th>Weight (kg)</th><th>Suggested Fit</th></tr>
            </thead>
            <tbody>
              <tr><td><strong>M</strong></td><td>170 - 175</td><td>60 - 68 kg</td><td>Relaxed Fit</td></tr>
              <tr><td><strong>L</strong></td><td>175 - 180</td><td>68 - 78 kg</td><td>Street Boxy</td></tr>
              <tr class="highlight-row"><td><strong>XL</strong></td><td>180 - 186</td><td>78 - 88 kg</td><td>Oversized Drop</td></tr>
              <tr><td><strong>2XL</strong></td><td>185 - 192</td><td>88 - 100 kg</td><td>Extreme Baggy</td></tr>
            </tbody>
          </table>
        </div>
        <small class="pdp-table-tip">Note: Hand-measured specifications. Flat measurement tolerance within ±1-2cm.</small>
      </div>
    `;
  }

  // Lookbook images
  const lookbookImages = (prod.detailImages && prod.detailImages.length > 0) ? prod.detailImages : prod.gallery;
  const imagesHtml = lookbookImages.map((src, i) => `
    <img src="${src}" class="pdp-gallery-img" alt="${prod.name} Lookbook ${i + 1}" loading="lazy">
  `).join('');

  container.innerHTML = `
    <!-- Designer Note Card -->
    <div class="pdp-designer-card">
      <div class="designer-badge">SETUP · TECH SPECIFICATION</div>
      <h4>${prod.name}</h4>
      <ul class="designer-bullet-list">
        ${specListHtml}
      </ul>
    </div>

    <!-- Size Guide Card -->
    ${sizeGuideHtml}

    <!-- Editorial Lookbook Gallery -->
    <div class="pdp-editorial-gallery">
      <div class="gallery-title-box">
        <span class="g-tag">LOOKBOOK GALLERY</span>
        <h3>Product Details &amp; Macro Fabric Craft</h3>
        <p>High-density weave, reinforced seams, and colorfast reactive dye detail</p>
      </div>
      ${imagesHtml}
    </div>
  `;
}

function closeProductDetail() {
  const pdp = document.getElementById('productDetailPage');
  if (pdp) pdp.style.display = 'none';
  switchTab('catalog');
}

function switchPdpHero(imgSrc, index) {
  const mainImg = document.getElementById('pdpMainImg');
  const counter = document.getElementById('pdpImgCounter');
  if (mainImg) mainImg.src = imgSrc;
  if (counter && index) counter.textContent = `${index} / 4`;

  const thumbs = document.querySelectorAll('.pdp-thumb');
  thumbs.forEach((t, i) => {
    t.classList.toggle('active', i === index - 1);
  });
}

function selectPdpColor(colorName, heroImg, elem) {
  activePdpColor = colorName;
  const label = document.getElementById('pdpActiveColorName');
  if (label) label.textContent = colorName;

  document.querySelectorAll('.pdp-color-swatch').forEach(s => s.classList.remove('active'));
  if (elem) elem.classList.add('active');

  if (heroImg) {
    const mainImg = document.getElementById('pdpMainImg');
    if (mainImg) mainImg.src = heroImg;
  }
}

function selectPdpSize(size, elem) {
  activePdpSize = size;
  const sizeLabel = document.getElementById('pdpActiveSizeName');
  if (sizeLabel) sizeLabel.textContent = `${size} (Oversized Street Fit)`;

  document.querySelectorAll('.pdp-size-btn').forEach(btn => btn.classList.remove('active'));
  if (elem) elem.classList.add('active');
}

function addPdpToCart(productId) {
  const prod = PRODUCTS_DATA[productId || activePdpProductId];
  if (!prod) return;

  APP_STATE.cartItems.push({
    id: prod.id,
    name: prod.name,
    priceUSD: prod.priceUSD,
    qty: activePdpQty,
    size: activePdpSize,
    spec: `${prod.gram} · ${activePdpColor}`,
    img: prod.img
  });

  updateCartTotal();
  showToast(`Added ${activePdpQty}× [${prod.name}] (${activePdpColor} · ${activePdpSize}) to Sample RFQ Cart!`);
}

// 13. Product Quick View Modal
let activeModalProductId = 'H01';
function openProductModal(productId) {
  const prod = PRODUCTS_DATA[productId];
  if (!prod) return;

  activeModalProductId = productId;
  document.getElementById('modalProdTitle').textContent = prod.name;
  document.getElementById('modalProdImg').src = prod.img;
  document.getElementById('modalProdPrice').textContent = formatCurrency(prod.priceUSD);

  const specList = document.getElementById('modalSpecList');
  if (specList) {
    specList.innerHTML = prod.specs.map(s => `<li>• ${s}</li>`).join('');
  }

  document.querySelectorAll('.size-chip').forEach(c => {
    c.onclick = () => {
      document.querySelectorAll('.size-chip').forEach(x => x.classList.remove('active'));
      c.classList.add('active');
    };
  });

  document.getElementById('productModal').classList.add('open');
}

function closeProductModal() {
  document.getElementById('productModal').classList.remove('open');
}

function addProductToCart() {
  const prod = PRODUCTS_DATA[activeModalProductId];
  if (!prod) return;

  const activeSize = document.querySelector('.size-chip.active')?.textContent.split(' ')[0] || 'L';

  APP_STATE.cartItems.push({
    id: prod.id,
    name: prod.name,
    priceUSD: prod.priceUSD,
    qty: 1,
    size: activeSize,
    spec: `${prod.gram} · ${prod.color}`,
    img: prod.img
  });

  updateCartTotal();
  closeProductModal();
  showToast(`Added [${prod.name}] to Sample RFQ Cart!`);
}

// 14. Cart & RFQ List Management
function updateCartTotal() {
  const count = APP_STATE.cartItems.length;
  const floatBadge = document.getElementById('floatBadgeCount');
  const cartTitle = document.getElementById('cartCountTitle');

  if (floatBadge) floatBadge.textContent = count;
  if (cartTitle) cartTitle.textContent = count;

  let subtotalUSD = 0;
  let totalPieces = 0;
  const listContainer = document.getElementById('cartItemsList');

  if (listContainer) {
    listContainer.innerHTML = '';
    APP_STATE.cartItems.forEach((item, idx) => {
      const itemQty = parseInt(item.qty) || 1;
      totalPieces += itemQty;
      subtotalUSD += item.priceUSD * itemQty;
      const el = document.createElement('div');
      el.className = 'cart-item-card';
      el.innerHTML = `
        <img src="${item.img}" alt="${item.name}" class="cart-thumb">
        <div class="cart-item-details">
          <h4>${item.name}</h4>
          <div class="cart-specs">Size: ${item.size} · ${item.spec}</div>
          <div class="cart-price-qty">
            <span class="cart-price"><span class="currency-symbol">$</span>${formatCurrency(item.priceUSD)}</span>
            <div class="cart-qty-ctrl">
              <button type="button" class="cq-btn" onclick="modifyCartQty(${idx}, -1)">-</button>
              <span>${item.qty}</span>
              <button type="button" class="cq-btn" onclick="modifyCartQty(${idx}, 1)">+</button>
            </div>
          </div>
        </div>
      `;
      listContainer.appendChild(el);
    });
  }

  const shippingUSD = calculateUsShipping(totalPieces);
  const deliveredTotalUSD = subtotalUSD + shippingUSD;

  const subtotalDisplay = document.getElementById('cartSubtotalSum');
  if (subtotalDisplay) {
    subtotalDisplay.textContent = formatCurrency(subtotalUSD);
  }

  const shippingDisplay = document.getElementById('cartShippingSum');
  if (shippingDisplay) {
    shippingDisplay.textContent = formatCurrency(shippingUSD);
  }

  const sumDisplay = document.getElementById('cartTotalSum');
  if (sumDisplay) {
    sumDisplay.textContent = formatCurrency(deliveredTotalUSD);
  }
}

function modifyCartQty(index, delta) {
  if (APP_STATE.cartItems[index]) {
    APP_STATE.cartItems[index].qty += delta;
    if (APP_STATE.cartItems[index].qty <= 0) {
      APP_STATE.cartItems.splice(index, 1);
    }
    updateCartTotal();
  }
}

// 15. Modals Controls
function openWhatsAppModal() {
  document.getElementById('whatsappModal').classList.add('open');
}
function closeWhatsAppModal() {
  document.getElementById('whatsappModal').classList.remove('open');
}

function openContactModal() {
  document.getElementById('contactModal').classList.add('open');
}
function closeContactModal() {
  document.getElementById('contactModal').classList.remove('open');
}

function openB2BModal() {
  document.getElementById('b2bModal').classList.add('open');
}
function closeB2BModal() {
  document.getElementById('b2bModal').classList.remove('open');
}

function copyContactText(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(`Copied to clipboard: ${text}`);
  }).catch(() => {
    showToast(`Please copy manually: ${text}`);
  });
}

function handleTechPackSubmit(e) {
  e.preventDefault();
  closeB2BModal();
  showToast('✓ Tech Pack received! Account manager will follow up within 2 hours.');
}

// 16. Toast Notifications
let toastTimer = null;
function showToast(msg) {
  const toast = document.getElementById('appToast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2400);
}
