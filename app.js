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
  cartItems: [],
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
    if (catFilter === 'hoodie' && (p.category === 'hoodie' || p.id === 'KB02')) return true;
    if (catFilter === 'jacket' && (p.category === 'jacket' || p.id === 'KB02')) return true;
    return p.category === catFilter;
  });

  if (products.length === 0) {
    if (catFilter === 'jeans') {
      container.innerHTML = `
        <div class="empty-catalog-box">
          <div class="empty-icon">👖</div>
          <p class="empty-text">Custom Denim &amp; Jeans Studio</p>
          <span class="empty-hint">1-Piece Custom Denim Sample Proofing, Vintage Stone Wash, Distressing &amp; Private Label OEM Tech Pack ready.</span>
          <button type="button" class="btn-empty-cart-action" style="margin-top: 14px;" onclick="openB2BModal()">
            <span>Inquire Denim Tech Pack</span>
            <span class="btn-arrow">➔</span>
          </button>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="empty-catalog-box">
          <div class="empty-icon">📭</div>
          <p class="empty-text">No Products in this Category</p>
          <span class="empty-hint">1-Piece Custom Tech Pack proofing available via WhatsApp</span>
        </div>
      `;
    }
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

  // Dynamic Feature Tags Update
  const featureTags = document.querySelector('.pdp-feature-tags');
  if (featureTags) {
    const gramTag = prod.gram ? prod.gram.split(' (')[0] : 'Heavyweight Cotton';
    const neckTag = prod.category === 'pants' ? 'Elastic Drawstring Waist' : (prod.category === 'hoodie' ? 'Double-Layer Warm Hood' : '3.0cm Bound Ribbed Collar');
    featureTags.innerHTML = `
      <span class="pdp-ftag">${gramTag}</span>
      <span class="pdp-ftag">Pre-Shrunk &lt; 2%</span>
      <span class="pdp-ftag">${neckTag}</span>
      <span class="pdp-ftag">Flexible OEM Printing</span>
    `;
  }

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
    switchPdpHero(gallery[0] || prod.skus[0].hero, 1);
  } else if (gallery.length > 0) {
    switchPdpHero(gallery[0], 1);
  }

  // Dynamic Size Selector Chips
  const sizeRow = document.getElementById('pdpSizeRow');
  if (sizeRow) {
    const availableSizes = prod.sizes || ['S', 'M', 'L', 'XL', '2XL'];
    sizeRow.innerHTML = '';
    availableSizes.forEach(s => {
      const btn = document.createElement('button');
      btn.type = 'button';
      const isDefault = (availableSizes.includes('XL') && s === 'XL') || (!availableSizes.includes('XL') && s === availableSizes[0]);
      btn.className = `pdp-size-btn ${isDefault ? 'active' : ''}`;
      btn.textContent = s;
      btn.onclick = () => selectPdpSize(s, btn);
      sizeRow.appendChild(btn);
    });
    activePdpSize = availableSizes.includes('XL') ? 'XL' : availableSizes[0];
    const activeSizeLabel = document.getElementById('pdpActiveSizeName');
    if (activeSizeLabel) activeSizeLabel.textContent = `${activePdpSize} (Oversized Street Fit)`;
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

  // Category / Product specific sizing chart
  let sizeGuideHtml = '';
  if (prod.id === 'T040') {
    sizeGuideHtml = `
      <div class="pdp-size-tables-card t040-size-card">
        <div class="table-header">
          <span class="table-tag">OFFICIAL TECH SIZING &amp; TRY-ON</span>
          <h4>T040 245G Oversized Boxy Tee - Sizing &amp; Measurement Guide</h4>
        </div>

        <!-- Model Try-On Card -->
        <div class="t040-models-badge-row">
          <div class="model-stat-pill">
            <span class="m-avatar">👨</span>
            <div class="m-info">
              <strong>Denis (Model)</strong>
              <small>188cm / 77kg · Wearing XL · Loose Street Fit</small>
            </div>
          </div>
          <div class="model-stat-pill">
            <span class="m-avatar">👩</span>
            <div class="m-info">
              <strong>Karen (Model)</strong>
              <small>173cm / 55kg · Wearing L · Loose Boxy Fit</small>
            </div>
          </div>
        </div>

        <!-- Garment Measurements Table -->
        <h5 class="sub-table-title">📏 Garment Dimensions (Flat Measurement / cm &amp; in)</h5>
        <div class="pdp-table-wrap">
          <table class="pdp-spec-table">
            <thead>
              <tr>
                <th>Size</th>
                <th>Length (衣长)</th>
                <th>Chest (胸围)</th>
                <th>Shoulder (肩宽)</th>
                <th>Sleeve (袖长)</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><strong>S</strong></td><td>71 cm (28.0")</td><td>110 cm (43.3")</td><td>51 cm (20.1")</td><td>20 cm (7.9")</td></tr>
              <tr><td><strong>M</strong></td><td>74 cm (29.1")</td><td>120 cm (47.2")</td><td>54 cm (21.3")</td><td>21 cm (8.3")</td></tr>
              <tr><td><strong>L</strong></td><td>77 cm (30.3")</td><td>126 cm (49.6")</td><td>57 cm (22.4")</td><td>22 cm (8.7")</td></tr>
              <tr class="highlight-row"><td><strong>XL</strong></td><td>80 cm (31.5")</td><td>136 cm (53.5")</td><td>61 cm (24.0")</td><td>23 cm (9.1")</td></tr>
              <tr><td><strong>2XL</strong></td><td>82 cm (32.3")</td><td>146 cm (57.5")</td><td>65 cm (25.6")</td><td>24 cm (9.4")</td></tr>
            </tbody>
          </table>
        </div>

        <!-- Height & Weight Recommended Fit Table -->
        <h5 class="sub-table-title">⚖️ Height &amp; Weight Recommendations (建议尺码)</h5>
        <div class="pdp-table-wrap">
          <table class="pdp-spec-table">
            <thead>
              <tr>
                <th>Size</th>
                <th>Suggested Height</th>
                <th>Suggested Weight</th>
                <th>Fit Profile</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><strong>S</strong></td><td>160 - 170 cm</td><td>50 - 55 kg (100-110 lbs)</td><td>Relaxed Street</td></tr>
              <tr><td><strong>M</strong></td><td>170 - 175 cm</td><td>60 - 65 kg (130-145 lbs)</td><td>Boxy Drop Shoulder</td></tr>
              <tr><td><strong>L</strong></td><td>175 - 180 cm</td><td>70 - 80 kg (155-175 lbs)</td><td>Authentic Oversized</td></tr>
              <tr class="highlight-row"><td><strong>XL</strong></td><td>180 - 190 cm</td><td>85 - 100 kg (185-220 lbs)</td><td>90s Heavyweight Baggy</td></tr>
              <tr><td><strong>2XL</strong></td><td>200 - 210 cm</td><td>105 - 125 kg (230-275 lbs)</td><td>Max Plus Size Loose</td></tr>
            </tbody>
          </table>
        </div>

        <!-- Visual Size Chart Image Cards -->
        <div class="t040-size-graphics-strip">
          <a class="size-graphic-thumb" href="assets/products/T040/size/size_chart_garment.jpg" target="_blank">
            <img src="assets/products/T040/size/size_chart_garment.jpg" alt="T040 Garment Size Chart &amp; Model Measurements" loading="lazy">
            <span>🔍 View Original Measurement Chart</span>
          </a>
          <a class="size-graphic-thumb" href="assets/products/T040/size/size_chart_recommend.jpg" target="_blank">
            <img src="assets/products/T040/size/size_chart_recommend.jpg" alt="T040 Height &amp; Weight Recommendations" loading="lazy">
            <span>🔍 View Height &amp; Weight Guide</span>
          </a>
        </div>
        <small class="pdp-table-tip">Note: Hand-measured specifications. Flat measurement tolerance within ±1-2cm.</small>
      </div>
    `;
  } else if (prod.id === 'T235') {
    sizeGuideHtml = `
      <div class="pdp-size-tables-card t040-size-card">
        <div class="table-header">
          <span class="table-tag">OFFICIAL TECH SIZING &amp; TRY-ON</span>
          <h4>T235 235G Oversized Raglan Long-Sleeve - Sizing &amp; Measurement Guide</h4>
        </div>

        <!-- Model Try-On Card -->
        <div class="t040-models-badge-row">
          <div class="model-stat-pill">
            <span class="m-avatar">👨</span>
            <div class="m-info">
              <strong>Denis (Male Model)</strong>
              <small>188cm / 77kg · Wearing XL · Loose Street Fit</small>
            </div>
          </div>
          <div class="model-stat-pill">
            <span class="m-avatar">👩</span>
            <div class="m-info">
              <strong>Model (Female)</strong>
              <small>172cm / 52kg · Wearing L · Oversized Drop Fit</small>
            </div>
          </div>
        </div>

        <!-- Garment Measurements Table -->
        <h5 class="sub-table-title">📏 Garment Dimensions (Flat Measurement / cm &amp; in)</h5>
        <div class="pdp-table-wrap">
          <table class="pdp-spec-table">
            <thead>
              <tr>
                <th>Size</th>
                <th>Length (衣长)</th>
                <th>Chest (胸围)</th>
                <th>Raglan Sleeve (插肩袖长)</th>
                <th>Fit Profile</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><strong>S</strong></td><td>72 cm (28.3")</td><td>114 cm (44.9")</td><td>76 cm (29.9")</td><td>Relaxed Street</td></tr>
              <tr><td><strong>M</strong></td><td>75 cm (29.5")</td><td>120 cm (47.2")</td><td>78 cm (30.7")</td><td>Boxy Drop Shoulder</td></tr>
              <tr><td><strong>L</strong></td><td>78 cm (30.7")</td><td>126 cm (49.6")</td><td>80 cm (31.5")</td><td>Authentic Oversized</td></tr>
              <tr class="highlight-row"><td><strong>XL</strong></td><td>81 cm (31.9")</td><td>134 cm (52.8")</td><td>82 cm (32.3")</td><td>90s Vintage Baggy (Denis Fit)</td></tr>
              <tr><td><strong>2XL</strong></td><td>83 cm (32.7")</td><td>142 cm (55.9")</td><td>84 cm (33.1")</td><td>Max Plus Size Loose</td></tr>
            </tbody>
          </table>
        </div>

        <!-- Height & Weight Recommended Fit Table -->
        <h5 class="sub-table-title">⚖️ Height &amp; Weight Recommendations (建议尺码)</h5>
        <div class="pdp-table-wrap">
          <table class="pdp-spec-table">
            <thead>
              <tr>
                <th>Size</th>
                <th>Suggested Height</th>
                <th>Suggested Weight</th>
                <th>Fit Profile</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><strong>S</strong></td><td>160 - 170 cm</td><td>50 - 58 kg (110-128 lbs)</td><td>Relaxed Street</td></tr>
              <tr><td><strong>M</strong></td><td>170 - 176 cm</td><td>58 - 68 kg (128-150 lbs)</td><td>Boxy Drop Shoulder</td></tr>
              <tr><td><strong>L</strong></td><td>175 - 182 cm</td><td>68 - 78 kg (150-172 lbs)</td><td>Authentic Oversized</td></tr>
              <tr class="highlight-row"><td><strong>XL</strong></td><td>180 - 188 cm</td><td>78 - 90 kg (172-198 lbs)</td><td>Skatewear 90s Vintage Baggy</td></tr>
              <tr><td><strong>2XL</strong></td><td>185 - 195 cm</td><td>90 - 110 kg (198-242 lbs)</td><td>Max Statement Oversized</td></tr>
            </tbody>
          </table>
        </div>

        <!-- Visual Size Chart Image Cards -->
        <div class="t040-size-graphics-strip">
          <a class="size-graphic-thumb" href="assets/products/T235/size/size_chart_garment.jpg" target="_blank">
            <img src="assets/products/T235/size/size_chart_garment.jpg" alt="T235 Garment Size Chart &amp; Measurements" loading="lazy">
            <span>🔍 View Original Measurement Chart</span>
          </a>
          <a class="size-graphic-thumb" href="assets/products/T235/size/size_chart_recommend.jpg" target="_blank">
            <img src="assets/products/T235/size/size_chart_recommend.jpg" alt="T235 Height &amp; Weight Recommendations" loading="lazy">
            <span>🔍 View Height &amp; Weight Guide</span>
          </a>
        </div>
        <small class="pdp-table-tip">Note: Hand-measured specifications. Flat measurement tolerance within ±1-2cm.</small>
      </div>
    `;
  } else if (prod.id === 'T238') {
    sizeGuideHtml = `
      <div class="pdp-size-tables-card t040-size-card">
        <div class="table-header">
          <span class="table-tag">OFFICIAL TECH SIZING &amp; TRY-ON</span>
          <h4>T238 235G High-Ribbed Collar Long-Sleeve Tee - Sizing &amp; Measurement Guide</h4>
        </div>

        <!-- Model Try-On Card -->
        <div class="t040-models-badge-row">
          <div class="model-stat-pill">
            <span class="m-avatar">👨</span>
            <div class="m-info">
              <strong>Denis (Male Model)</strong>
              <small>188cm / 77kg · Wearing XL · Loose Street Fit</small>
            </div>
          </div>
          <div class="model-stat-pill">
            <span class="m-avatar">👩</span>
            <div class="m-info">
              <strong>Model (Female)</strong>
              <small>172cm / 52kg · Wearing L · Oversized Drop Fit</small>
            </div>
          </div>
        </div>

        <!-- Garment Measurements Table -->
        <h5 class="sub-table-title">📏 Garment Dimensions (Flat Measurement / cm &amp; in)</h5>
        <div class="pdp-table-wrap">
          <table class="pdp-spec-table">
            <thead>
              <tr>
                <th>Size</th>
                <th>Length (衣长)</th>
                <th>Chest (胸围)</th>
                <th>Shoulder (肩宽)</th>
                <th>Sleeve (袖长)</th>
                <th>Fit Profile</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><strong>S</strong></td><td>72 cm (28.3")</td><td>114 cm (44.9")</td><td>54 cm (21.3")</td><td>59 cm (23.2")</td><td>Relaxed Street</td></tr>
              <tr><td><strong>M</strong></td><td>75 cm (29.5")</td><td>120 cm (47.2")</td><td>56 cm (22.0")</td><td>60 cm (23.6")</td><td>Boxy Drop Shoulder</td></tr>
              <tr><td><strong>L</strong></td><td>78 cm (30.7")</td><td>126 cm (49.6")</td><td>58 cm (22.8")</td><td>61 cm (24.0")</td><td>Authentic Oversized</td></tr>
              <tr class="highlight-row"><td><strong>XL</strong></td><td>81 cm (31.9")</td><td>134 cm (52.8")</td><td>61 cm (24.0")</td><td>62 cm (24.4")</td><td>90s Vintage Baggy (Denis Fit)</td></tr>
              <tr><td><strong>2XL</strong></td><td>83 cm (32.7")</td><td>142 cm (55.9")</td><td>64 cm (25.2")</td><td>63 cm (24.8")</td><td>Max Plus Size Loose</td></tr>
            </tbody>
          </table>
        </div>

        <!-- Height & Weight Recommended Fit Table -->
        <h5 class="sub-table-title">⚖️ Height &amp; Weight Recommendations (建议尺码)</h5>
        <div class="pdp-table-wrap">
          <table class="pdp-spec-table">
            <thead>
              <tr>
                <th>Size</th>
                <th>Suggested Height</th>
                <th>Suggested Weight</th>
                <th>Fit Profile</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><strong>S</strong></td><td>160 - 170 cm</td><td>50 - 58 kg (110-128 lbs)</td><td>Relaxed Street</td></tr>
              <tr><td><strong>M</strong></td><td>170 - 176 cm</td><td>58 - 68 kg (128-150 lbs)</td><td>Boxy Drop Shoulder</td></tr>
              <tr><td><strong>L</strong></td><td>175 - 182 cm</td><td>68 - 78 kg (150-172 lbs)</td><td>Authentic Oversized</td></tr>
              <tr class="highlight-row"><td><strong>XL</strong></td><td>180 - 188 cm</td><td>78 - 90 kg (172-198 lbs)</td><td>Skatewear 90s Vintage Baggy</td></tr>
              <tr><td><strong>2XL</strong></td><td>185 - 195 cm</td><td>90 - 110 kg (198-242 lbs)</td><td>Max Statement Oversized</td></tr>
            </tbody>
          </table>
        </div>

        <!-- Visual Size Chart Image Cards -->
        <div class="t040-size-graphics-strip">
          <a class="size-graphic-thumb" href="assets/products/T238/size/size_chart_garment.jpg" target="_blank">
            <img src="assets/products/T238/size/size_chart_garment.jpg" alt="T238 Garment Size Chart &amp; Measurements" loading="lazy">
            <span>🔍 View Original Measurement Chart</span>
          </a>
          <a class="size-graphic-thumb" href="assets/products/T238/size/size_chart_recommend.jpg" target="_blank">
            <img src="assets/products/T238/size/size_chart_recommend.jpg" alt="T238 Height &amp; Weight Recommendations" loading="lazy">
            <span>🔍 View Height &amp; Weight Guide</span>
          </a>
        </div>
        <small class="pdp-table-tip">Note: 3.5cm high-density rebound elastic collar. Flat measurement tolerance within ±1-2cm.</small>
      </div>
    `;
  } else if (prod.id === 'T275') {
    sizeGuideHtml = `
      <div class="pdp-size-tables-card t040-size-card">
        <div class="table-header">
          <span class="table-tag">OFFICIAL TECH SIZING &amp; TRY-ON</span>
          <h4>T275 275G Ultra-Heavy American Drop-Shoulder Tee - Sizing &amp; Measurement Guide</h4>
        </div>

        <!-- Model Try-On Card -->
        <div class="t040-models-badge-row">
          <div class="model-stat-pill">
            <span class="m-avatar">👨</span>
            <div class="m-info">
              <strong>Male Model (White Tee)</strong>
              <small>186cm / 75kg · Wearing XL · American Loose Fit</small>
            </div>
          </div>
          <div class="model-stat-pill">
            <span class="m-avatar">👩</span>
            <div class="m-info">
              <strong>Female Model (Purple Tee)</strong>
              <small>170cm / 50kg · Wearing L · Oversized Drop Fit</small>
            </div>
          </div>
        </div>

        <!-- Garment Measurements Table -->
        <h5 class="sub-table-title">📏 Garment Dimensions (Flat Measurement / cm &amp; in)</h5>
        <div class="pdp-table-wrap">
          <table class="pdp-spec-table">
            <thead>
              <tr>
                <th>Size</th>
                <th>Length (衣长)</th>
                <th>Chest (胸围)</th>
                <th>Shoulder (肩宽)</th>
                <th>Sleeve (袖长)</th>
                <th>Fit Profile</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><strong>S</strong></td><td>71 cm (28.0")</td><td>112 cm (44.1")</td><td>52 cm (20.5")</td><td>22 cm (8.7")</td><td>Natural Drop Shoulder</td></tr>
              <tr><td><strong>M</strong></td><td>74 cm (29.1")</td><td>118 cm (46.5")</td><td>55 cm (21.7")</td><td>23 cm (9.1")</td><td>Boxy Drop Shoulder</td></tr>
              <tr><td><strong>L</strong></td><td>77 cm (30.3")</td><td>124 cm (48.8")</td><td>58 cm (22.8")</td><td>24 cm (9.4")</td><td>Authentic Oversized</td></tr>
              <tr class="highlight-row"><td><strong>XL</strong></td><td>80 cm (31.5")</td><td>132 cm (52.0")</td><td>61 cm (24.0")</td><td>25 cm (9.8")</td><td>90s Heavyweight Baggy (Featured)</td></tr>
              <tr><td><strong>2XL</strong></td><td>83 cm (32.7")</td><td>140 cm (55.1")</td><td>64 cm (25.2")</td><td>26 cm (10.2")</td><td>Max Plus Size Loose</td></tr>
            </tbody>
          </table>
        </div>

        <!-- Height & Weight Recommended Fit Table -->
        <h5 class="sub-table-title">⚖️ Height &amp; Weight Recommendations (建议尺码)</h5>
        <div class="pdp-table-wrap">
          <table class="pdp-spec-table">
            <thead>
              <tr>
                <th>Size</th>
                <th>Suggested Height</th>
                <th>Suggested Weight</th>
                <th>Fit Profile</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><strong>S</strong></td><td>160 - 170 cm</td><td>50 - 60 kg (110-132 lbs)</td><td>Natural Drop Shoulder</td></tr>
              <tr><td><strong>M</strong></td><td>170 - 176 cm</td><td>60 - 70 kg (132-154 lbs)</td><td>Boxy Drop Shoulder</td></tr>
              <tr><td><strong>L</strong></td><td>175 - 182 cm</td><td>70 - 80 kg (154-176 lbs)</td><td>Authentic American Oversized</td></tr>
              <tr class="highlight-row"><td><strong>XL</strong></td><td>180 - 188 cm</td><td>80 - 95 kg (176-209 lbs)</td><td>Skatewear 90s Vintage Baggy</td></tr>
              <tr><td><strong>2XL</strong></td><td>185 - 195 cm</td><td>95 - 115 kg (209-253 lbs)</td><td>Max Statement Oversized</td></tr>
            </tbody>
          </table>
        </div>

        <!-- Visual Size Chart Image Cards -->
        <div class="t040-size-graphics-strip">
          <a class="size-graphic-thumb" href="assets/products/T275/size/size_chart_garment.jpg" target="_blank">
            <img src="assets/products/T275/size/size_chart_garment.jpg" alt="T275 Garment Size Chart &amp; Measurements" loading="lazy">
            <span>🔍 View Original Measurement Chart</span>
          </a>
          <a class="size-graphic-thumb" href="assets/products/T275/size/size_chart_recommend.jpg" target="_blank">
            <img src="assets/products/T275/size/size_chart_recommend.jpg" alt="T275 Height &amp; Weight Recommendations" loading="lazy">
            <span>🔍 View Height &amp; Weight Guide</span>
          </a>
        </div>
        <small class="pdp-table-tip">Note: 3.2cm heavy ribbed collar. Pre-shrunk compact double-yarn cotton. Flat measurement tolerance ±1-2cm.</small>
      </div>
    `;
  } else if (prod.id === 'T276') {
    sizeGuideHtml = `
      <div class="pdp-size-tables-card t040-size-card">
        <div class="table-header">
          <span class="table-tag">OFFICIAL TECH SIZING &amp; TRY-ON</span>
          <h4>T276 275G Heavy Drop-Shoulder Long-Sleeve Tee - Sizing &amp; Measurement Guide</h4>
        </div>

        <!-- Model Try-On Card -->
        <div class="t040-models-badge-row">
          <div class="model-stat-pill">
            <span class="m-avatar">👨</span>
            <div class="m-info">
              <strong>Male Model (White Long-Sleeve)</strong>
              <small>186cm / 75kg · Wearing XL · Loose Boxy Fit</small>
            </div>
          </div>
          <div class="model-stat-pill">
            <span class="m-avatar">👩</span>
            <div class="m-info">
              <strong>Female Model (Pink Long-Sleeve)</strong>
              <small>170cm / 50kg · Wearing L · Oversized Drop Fit</small>
            </div>
          </div>
        </div>

        <!-- Garment Measurements Table -->
        <h5 class="sub-table-title">📏 Garment Dimensions (Flat Measurement / cm &amp; in)</h5>
        <div class="pdp-table-wrap">
          <table class="pdp-spec-table">
            <thead>
              <tr>
                <th>Size</th>
                <th>Length (衣长)</th>
                <th>Chest (胸围)</th>
                <th>Shoulder (肩宽)</th>
                <th>Sleeve (袖长)</th>
                <th>Fit Profile</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><strong>S</strong></td><td>71 cm (28.0")</td><td>112 cm (44.1")</td><td>52 cm (20.5")</td><td>61 cm (24.0")</td><td>Natural Drop Shoulder</td></tr>
              <tr><td><strong>M</strong></td><td>74 cm (29.1")</td><td>118 cm (46.5")</td><td>55 cm (21.7")</td><td>62 cm (24.4")</td><td>Boxy Drop Shoulder</td></tr>
              <tr><td><strong>L</strong></td><td>77 cm (30.3")</td><td>124 cm (48.8")</td><td>58 cm (22.8")</td><td>63 cm (24.8")</td><td>Authentic Oversized</td></tr>
              <tr class="highlight-row"><td><strong>XL</strong></td><td>80 cm (31.5")</td><td>132 cm (52.0")</td><td>61 cm (24.0")</td><td>64 cm (25.2")</td><td>90s Heavyweight Baggy (Featured)</td></tr>
              <tr><td><strong>2XL</strong></td><td>83 cm (32.7")</td><td>140 cm (55.1")</td><td>64 cm (25.2")</td><td>65 cm (25.6")</td><td>Max Plus Size Loose</td></tr>
            </tbody>
          </table>
        </div>

        <!-- Height & Weight Recommended Fit Table -->
        <h5 class="sub-table-title">⚖️ Height &amp; Weight Recommendations (建议尺码)</h5>
        <div class="pdp-table-wrap">
          <table class="pdp-spec-table">
            <thead>
              <tr>
                <th>Size</th>
                <th>Suggested Height</th>
                <th>Suggested Weight</th>
                <th>Fit Profile</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><strong>S</strong></td><td>160 - 170 cm</td><td>50 - 60 kg (110-132 lbs)</td><td>Natural Drop Shoulder</td></tr>
              <tr><td><strong>M</strong></td><td>170 - 176 cm</td><td>60 - 70 kg (132-154 lbs)</td><td>Boxy Drop Shoulder</td></tr>
              <tr><td><strong>L</strong></td><td>175 - 182 cm</td><td>70 - 80 kg (154-176 lbs)</td><td>Authentic American Oversized</td></tr>
              <tr class="highlight-row"><td><strong>XL</strong></td><td>180 - 188 cm</td><td>80 - 95 kg (176-209 lbs)</td><td>Skatewear 90s Vintage Baggy</td></tr>
              <tr><td><strong>2XL</strong></td><td>185 - 195 cm</td><td>95 - 115 kg (209-253 lbs)</td><td>Max Statement Oversized</td></tr>
            </tbody>
          </table>
        </div>

        <!-- Visual Size Chart Image Cards -->
        <div class="t040-size-graphics-strip">
          <a class="size-graphic-thumb" href="assets/products/T276/size/size_chart_garment.jpg" target="_blank">
            <img src="assets/products/T276/size/size_chart_garment.jpg" alt="T276 Garment Size Chart &amp; Measurements" loading="lazy">
            <span>🔍 View Original Measurement Chart</span>
          </a>
          <a class="size-graphic-thumb" href="assets/products/T276/size/size_chart_recommend.jpg" target="_blank">
            <img src="assets/products/T276/size/size_chart_recommend.jpg" alt="T276 Height &amp; Weight Recommendations" loading="lazy">
            <span>🔍 View Height &amp; Weight Guide</span>
          </a>
        </div>
        <small class="pdp-table-tip">Note: 3.2cm heavy ribbed collar &amp; 1x1 fitted cuffs. Pre-shrunk compact double-yarn cotton. Flat measurement tolerance ±1-2cm.</small>
      </div>
    `;
  } else if (prod.id === 'T230') {
    sizeGuideHtml = `
      <div class="pdp-size-tables-card t040-size-card">
        <div class="table-header">
          <span class="table-tag">OFFICIAL TECH SIZING &amp; TRY-ON</span>
          <h4>T230 230G Mineral-Washed Long-Sleeve Street Tee - Sizing &amp; Measurement Guide</h4>
        </div>

        <!-- Model Try-On Card -->
        <div class="t040-models-badge-row">
          <div class="model-stat-pill">
            <span class="m-avatar">👨</span>
            <div class="m-info">
              <strong>Male Model (Washed Black)</strong>
              <small>184cm / 74kg · Wearing XL · Relaxed Baggy Street Fit</small>
            </div>
          </div>
          <div class="model-stat-pill">
            <span class="m-avatar">👩</span>
            <div class="m-info">
              <strong>Female Model (Apricot)</strong>
              <small>168cm / 50kg · Wearing L · Oversized Drop Fit</small>
            </div>
          </div>
        </div>

        <!-- Garment Measurements Table -->
        <h5 class="sub-table-title">📏 Garment Dimensions (Flat Measurement / cm &amp; in)</h5>
        <div class="pdp-table-wrap">
          <table class="pdp-spec-table">
            <thead>
              <tr>
                <th>Size</th>
                <th>Length (衣长)</th>
                <th>Chest (胸围)</th>
                <th>Shoulder (肩宽)</th>
                <th>Sleeve (袖长)</th>
                <th>Fit Profile</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><strong>S</strong></td><td>62 cm (24.4")</td><td>122 cm (48.0")</td><td>51.5 cm (20.3")</td><td>59 cm (23.2")</td><td>Natural Drop Shoulder</td></tr>
              <tr><td><strong>M</strong></td><td>64 cm (25.2")</td><td>126 cm (49.6")</td><td>53.0 cm (20.9")</td><td>60 cm (23.6")</td><td>Boxy Drop Shoulder</td></tr>
              <tr><td><strong>L</strong></td><td>66 cm (26.0")</td><td>130 cm (51.2")</td><td>54.5 cm (21.5")</td><td>61 cm (24.0")</td><td>Authentic Oversized</td></tr>
              <tr class="highlight-row"><td><strong>XL</strong></td><td>68 cm (26.8")</td><td>134 cm (52.8")</td><td>56.0 cm (22.0")</td><td>62 cm (24.4")</td><td>Vintage Baggy Streetwear (Featured)</td></tr>
              <tr><td><strong>2XL</strong></td><td>70 cm (27.6")</td><td>138 cm (54.3")</td><td>57.5 cm (22.6")</td><td>63 cm (24.8")</td><td>Max Plus Size Loose</td></tr>
            </tbody>
          </table>
        </div>

        <!-- Height & Weight Recommended Fit Table -->
        <h5 class="sub-table-title">⚖️ Height &amp; Weight Recommendations (建议尺码)</h5>
        <div class="pdp-table-wrap">
          <table class="pdp-spec-table">
            <thead>
              <tr>
                <th>Size</th>
                <th>Suggested Height</th>
                <th>Suggested Weight</th>
                <th>Fit Silhouette</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><strong>S</strong></td><td>160 - 165 cm</td><td>45 - 55 kg (99-121 lbs)</td><td>Natural Drop Shoulder</td></tr>
              <tr><td><strong>M</strong></td><td>165 - 170 cm</td><td>55 - 65 kg (121-143 lbs)</td><td>Boxy Drop Shoulder</td></tr>
              <tr><td><strong>L</strong></td><td>170 - 175 cm</td><td>65 - 75 kg (143-165 lbs)</td><td>Authentic Oversized</td></tr>
              <tr class="highlight-row"><td><strong>XL</strong></td><td>175 - 180 cm</td><td>75 - 85 kg (165-187 lbs)</td><td>Vintage Baggy Drape (Featured)</td></tr>
              <tr><td><strong>2XL</strong></td><td>180+ cm</td><td>85 - 100 kg (187-220 lbs)</td><td>Max Plus Size Loose</td></tr>
            </tbody>
          </table>
        </div>

        <!-- Visual Size Chart Image Cards -->
        <div class="t040-size-graphics-strip">
          <a class="size-graphic-thumb" href="assets/products/T230/size/size_chart_garment.jpg" target="_blank">
            <img src="assets/products/T230/size/size_chart_garment.jpg" alt="T230 Garment Size Chart &amp; Measurements" loading="lazy">
            <span>🔍 View Original Measurement Chart</span>
          </a>
          <a class="size-graphic-thumb" href="assets/products/T230/size/size_chart_recommend.jpg" target="_blank">
            <img src="assets/products/T230/size/size_chart_recommend.jpg" alt="T230 Height &amp; Weight Recommendations" loading="lazy">
            <span>🔍 View Height &amp; Weight Guide</span>
          </a>
          <a class="size-graphic-thumb" href="assets/products/T230/size/size_chart_factory.jpg" target="_blank">
            <img src="assets/products/T230/size/size_chart_factory.jpg" alt="T230 Factory MT-2651 Spec Card" loading="lazy">
            <span>🔍 View Factory Spec Card</span>
          </a>
        </div>
        <small class="pdp-table-tip">Note: Official factory MT-2651 specifications. Flat measurement tolerance within ±1-2cm. Pre-shrunk 100% combed cotton jersey.</small>
      </div>
    `;
  } else if (prod.category === 'pants') {
    sizeGuideHtml = `
      <div class="pdp-size-tables-card">
        <div class="table-header">
          <span class="table-tag">SIZE GUIDE</span>
          <h4>Recommended Casual Pants &amp; Sweatpants Sizing Guide</h4>
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
  } else if (prod.category === 'jeans') {
    sizeGuideHtml = `
      <div class="pdp-size-tables-card">
        <div class="table-header">
          <span class="table-tag">SIZE GUIDE</span>
          <h4>Recommended Denim Jeans Sizing Guide</h4>
        </div>
        <div class="pdp-table-wrap">
          <table class="pdp-spec-table">
            <thead>
              <tr><th>Waist Size</th><th>Waist (in/cm)</th><th>Pants Length (cm)</th><th>Suggested Fit</th></tr>
            </thead>
            <tbody>
              <tr><td><strong>30</strong></td><td>30" / 76 cm</td><td>104 cm</td><td>Slim Straight</td></tr>
              <tr><td><strong>32</strong></td><td>32" / 81 cm</td><td>106 cm</td><td>Classic Regular</td></tr>
              <tr class="highlight-row"><td><strong>34</strong></td><td>34" / 86 cm</td><td>108 cm</td><td>Baggy Street</td></tr>
              <tr><td><strong>36</strong></td><td>36" / 91 cm</td><td>110 cm</td><td>Extreme Loose</td></tr>
            </tbody>
          </table>
        </div>
        <small class="pdp-table-tip">Note: Authentic 14oz rigid &amp; washed denim. Tolerance within ±1cm.</small>
      </div>
    `;
  } else if (prod.category === 'shorts') {
    sizeGuideHtml = `
      <div class="pdp-size-tables-card">
        <div class="table-header">
          <span class="table-tag">SIZE GUIDE</span>
          <h4>Recommended Street Shorts Sizing Guide</h4>
        </div>
        <div class="pdp-table-wrap">
          <table class="pdp-spec-table">
            <thead>
              <tr><th>Size</th><th>Waist (cm)</th><th>Shorts Length (cm)</th><th>Suggested Fit</th></tr>
            </thead>
            <tbody>
              <tr><td><strong>S</strong></td><td>64 - 72</td><td>48 cm</td><td>Slim Street</td></tr>
              <tr><td><strong>M</strong></td><td>68 - 78</td><td>49 cm</td><td>Regular Above Knee</td></tr>
              <tr><td><strong>L</strong></td><td>72 - 84</td><td>50 cm</td><td>Relaxed Street</td></tr>
              <tr class="highlight-row"><td><strong>XL</strong></td><td>76 - 90</td><td>51 cm</td><td>Loose Drop Crotch</td></tr>
              <tr><td><strong>2XL</strong></td><td>80 - 96</td><td>52 cm</td><td>Oversized Baggy</td></tr>
            </tbody>
          </table>
        </div>
        <small class="pdp-table-tip">Note: Elasticated waistband with contrast knitted drawstrings. Tolerance ±1-2cm.</small>
      </div>
    `;
  } else if (prod.id === 'KB02') {
    sizeGuideHtml = `
      <div class="pdp-size-tables-card t040-size-card">
        <div class="table-header">
          <span class="table-tag">OFFICIAL TECH SIZING &amp; MEASUREMENTS</span>
          <h4>KB02 380G Washed Knitted Denim Zip Hoodie - Sizing Guide</h4>
        </div>

        <div class="t040-models-badge-row">
          <div class="model-stat-pill">
            <span class="m-avatar">👨</span>
            <div class="m-info">
              <strong>Denis (Model)</strong>
              <small>188cm / 77kg · Wearing XL · Relaxed Streetwear Oversized Fit</small>
            </div>
          </div>
        </div>

        <h5 class="sub-table-title">📏 Garment Dimensions (Flat Measurement / cm &amp; in)</h5>
        <div class="pdp-table-wrap">
          <table class="pdp-spec-table">
            <thead>
              <tr>
                <th>Size</th>
                <th>Length (衣长)</th>
                <th>Chest (胸围)</th>
                <th>Shoulder (肩宽)</th>
                <th>Sleeve (袖长)</th>
                <th>Fit Profile</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><strong>S</strong></td><td>68.0 cm (26.8")</td><td>124 cm (48.8")</td><td>57.0 cm (22.4")</td><td>57.0 cm (22.4")</td><td>Relaxed Street</td></tr>
              <tr><td><strong>M</strong></td><td>69.5 cm (27.4")</td><td>128 cm (50.4")</td><td>59.0 cm (23.2")</td><td>58.0 cm (22.8")</td><td>Boxy Drop Shoulder</td></tr>
              <tr><td><strong>L</strong></td><td>71.0 cm (28.0")</td><td>132 cm (52.0")</td><td>61.0 cm (24.0")</td><td>59.0 cm (23.2")</td><td>Authentic Oversized</td></tr>
              <tr class="highlight-row"><td><strong>XL</strong></td><td>72.5 cm (28.5")</td><td>136 cm (53.5")</td><td>63.0 cm (24.8")</td><td>60.0 cm (23.6")</td><td>90s Vintage Baggy (Denis Fit)</td></tr>
            </tbody>
          </table>
        </div>

        <h5 class="sub-table-title">⚖️ Height &amp; Weight Recommendations (建议尺码)</h5>
        <div class="pdp-table-wrap">
          <table class="pdp-spec-table">
            <thead>
              <tr>
                <th>Size</th>
                <th>Suggested Height</th>
                <th>Suggested Weight</th>
                <th>Fit Profile</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><strong>S</strong></td><td>160 - 165 cm</td><td>45 - 55 kg (99-121 lbs)</td><td>Relaxed Street</td></tr>
              <tr><td><strong>M</strong></td><td>165 - 170 cm</td><td>55 - 65 kg (121-143 lbs)</td><td>Boxy Drop Shoulder</td></tr>
              <tr><td><strong>L</strong></td><td>170 - 175 cm</td><td>65 - 77 kg (143-170 lbs)</td><td>Authentic Oversized</td></tr>
              <tr class="highlight-row"><td><strong>XL</strong></td><td>175 - 188 cm</td><td>77 - 88 kg (170-194 lbs)</td><td>Skatewear 90s Vintage Baggy</td></tr>
            </tbody>
          </table>
        </div>

        <div class="t040-size-graphics-strip">
          <a class="size-graphic-thumb" href="assets/products/KB02/size/size_chart_garment.jpg" target="_blank">
            <img src="assets/products/KB02/size/size_chart_garment.jpg" alt="KB02 Garment Size Chart &amp; Measurements" loading="lazy">
            <span>🔍 View Original Tech Pack Size Sheet</span>
          </a>
        </div>
        <small class="pdp-table-tip">Note: Hand-measured specifications. Flat measurement tolerance within ±1-2cm.</small>
      </div>
    `;
  } else if (prod.id === 'WY18') {
    sizeGuideHtml = `
      <div class="pdp-size-tables-card t040-size-card">
        <div class="table-header">
          <span class="table-tag">OFFICIAL TECH SIZING &amp; MEASUREMENTS</span>
          <h4>WY18 355G Vintage Snow-Washed Fleece Pullover Hoodie - Sizing Guide</h4>
        </div>

        <div class="t040-models-badge-row">
          <div class="model-stat-pill">
            <span class="m-avatar">👨</span>
            <div class="m-info">
              <strong>Denis (Model)</strong>
              <small>188cm / 77kg · Wearing XL · Oversized Streetwear Fit</small>
            </div>
          </div>
        </div>

        <h5 class="sub-table-title">📏 Garment Dimensions (Flat Measurement / cm &amp; in)</h5>
        <div class="pdp-table-wrap">
          <table class="pdp-spec-table">
            <thead>
              <tr>
                <th>Size</th>
                <th>Length (衣长)</th>
                <th>Chest (胸围)</th>
                <th>Shoulder (肩宽)</th>
                <th>Sleeve (袖长)</th>
                <th>Fit Profile</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><strong>S</strong></td><td>70.0 cm (27.6")</td><td>134 cm (52.8")</td><td>57.0 cm (22.4")</td><td>61.0 cm (24.0")</td><td>Relaxed Street</td></tr>
              <tr><td><strong>M</strong></td><td>72.0 cm (28.3")</td><td>138 cm (54.3")</td><td>58.5 cm (23.0")</td><td>62.0 cm (24.4")</td><td>Boxy Drop Shoulder</td></tr>
              <tr><td><strong>L</strong></td><td>74.0 cm (29.1")</td><td>142 cm (55.9")</td><td>60.0 cm (23.6")</td><td>63.0 cm (24.8")</td><td>Authentic Oversized</td></tr>
              <tr class="highlight-row"><td><strong>XL</strong></td><td>76.0 cm (29.9")</td><td>146 cm (57.5")</td><td>61.5 cm (24.2")</td><td>64.0 cm (25.2")</td><td>90s Vintage Baggy (Denis Fit)</td></tr>
              <tr><td><strong>2XL</strong></td><td>78.0 cm (30.7")</td><td>150 cm (59.1")</td><td>63.0 cm (24.8")</td><td>65.0 cm (25.6")</td><td>Max Plus Size Loose</td></tr>
            </tbody>
          </table>
        </div>

        <h5 class="sub-table-title">⚖️ Height &amp; Weight Recommendations (建议尺码)</h5>
        <div class="pdp-table-wrap">
          <table class="pdp-spec-table">
            <thead>
              <tr>
                <th>Size</th>
                <th>Suggested Height</th>
                <th>Suggested Weight</th>
                <th>Fit Profile</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><strong>S</strong></td><td>160 - 165 cm</td><td>45 - 55 kg (99-121 lbs)</td><td>Relaxed Street</td></tr>
              <tr><td><strong>M</strong></td><td>165 - 170 cm</td><td>55 - 65 kg (121-143 lbs)</td><td>Boxy Drop Shoulder</td></tr>
              <tr><td><strong>L</strong></td><td>170 - 175 cm</td><td>65 - 77 kg (143-170 lbs)</td><td>Authentic Oversized</td></tr>
              <tr class="highlight-row"><td><strong>XL</strong></td><td>175 - 180 cm</td><td>77 - 88 kg (170-194 lbs)</td><td>Skatewear 90s Vintage Baggy</td></tr>
              <tr><td><strong>2XL</strong></td><td>180 - 195 cm</td><td>88 - 95 kg (194-209 lbs)</td><td>Max Statement Oversized</td></tr>
            </tbody>
          </table>
        </div>

        <div class="t040-size-graphics-strip">
          <a class="size-graphic-thumb" href="assets/products/WY18/size/size_chart_garment.jpg" target="_blank">
            <img src="assets/products/WY18/size/size_chart_garment.jpg" alt="WY18 Garment Size Chart &amp; Measurements" loading="lazy">
            <span>🔍 View Original Tech Pack Size Sheet</span>
          </a>
        </div>
        <small class="pdp-table-tip">Note: Hand-measured specifications. Flat measurement tolerance within ±1-2cm.</small>
      </div>
    `;
  } else if (prod.id === 'W350') {
    sizeGuideHtml = `
      <div class="pdp-size-tables-card t040-size-card">
        <div class="table-header">
          <span class="table-tag">OFFICIAL TECH SIZING &amp; MEASUREMENTS</span>
          <h4>W350 350G Fleece-Lined Oversized Crewneck - Sizing Guide</h4>
        </div>

        <div class="t040-models-badge-row">
          <div class="model-stat-pill">
            <span class="m-avatar">👨</span>
            <div class="m-info">
              <strong>Denis (Male Model)</strong>
              <small>188cm / 77kg · Wearing XL · Oversized Streetwear Fit</small>
            </div>
          </div>
          <div class="model-stat-pill">
            <span class="m-avatar">👩</span>
            <div class="m-info">
              <strong>Karen (Female Model)</strong>
              <small>173cm / 55kg · Wearing L · Loose Boxy Fit</small>
            </div>
          </div>
        </div>

        <h5 class="sub-table-title">📏 Garment Dimensions (Flat Measurement / cm &amp; in)</h5>
        <div class="pdp-table-wrap">
          <table class="pdp-spec-table">
            <thead>
              <tr>
                <th>Size</th>
                <th>Length (衣长)</th>
                <th>Chest (胸围)</th>
                <th>Shoulder (肩宽)</th>
                <th>Sleeve (袖长)</th>
                <th>Fit Profile</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><strong>S</strong></td><td>70.0 cm (27.6")</td><td>120 cm (47.2")</td><td>55.0 cm (21.7")</td><td>59.0 cm (23.2")</td><td>Relaxed Street</td></tr>
              <tr><td><strong>M</strong></td><td>72.0 cm (28.3")</td><td>126 cm (49.6")</td><td>57.0 cm (22.4")</td><td>60.0 cm (23.6")</td><td>Boxy Drop Shoulder</td></tr>
              <tr><td><strong>L</strong></td><td>74.0 cm (29.1")</td><td>132 cm (52.0")</td><td>59.0 cm (23.2")</td><td>61.0 cm (24.0")</td><td>Authentic Oversized</td></tr>
              <tr class="highlight-row"><td><strong>XL</strong></td><td>76.0 cm (29.9")</td><td>138 cm (54.3")</td><td>61.0 cm (24.0")</td><td>62.0 cm (24.4")</td><td>90s Vintage Baggy (Denis Fit)</td></tr>
              <tr><td><strong>2XL</strong></td><td>78.0 cm (30.7")</td><td>144 cm (56.7")</td><td>63.0 cm (24.8")</td><td>63.0 cm (24.8")</td><td>Plus Size Loose</td></tr>
            </tbody>
          </table>
        </div>

        <h5 class="sub-table-title">⚖️ Height &amp; Weight Recommendations (建议尺码)</h5>
        <div class="pdp-table-wrap">
          <table class="pdp-spec-table">
            <thead>
              <tr>
                <th>Size</th>
                <th>Suggested Height</th>
                <th>Suggested Weight</th>
                <th>Fit Profile</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><strong>S</strong></td><td>160 - 168 cm</td><td>48 - 58 kg (105-128 lbs)</td><td>Comfortable Relaxed Street</td></tr>
              <tr><td><strong>M</strong></td><td>168 - 175 cm</td><td>58 - 68 kg (128-150 lbs)</td><td>Structured Boxy Drop Shoulder</td></tr>
              <tr><td><strong>L</strong></td><td>173 - 180 cm</td><td>68 - 78 kg (150-172 lbs)</td><td>Authentic Oversized Drape</td></tr>
              <tr class="highlight-row"><td><strong>XL</strong></td><td>178 - 188 cm</td><td>77 - 88 kg (170-194 lbs)</td><td>90s Heavyweight Baggy (Denis Fit)</td></tr>
              <tr><td><strong>2XL</strong></td><td>182 - 195 cm</td><td>88 - 105 kg (194-230 lbs)</td><td>Max Plus Size Baggy Fit</td></tr>
            </tbody>
          </table>
        </div>

        <div class="t040-size-graphics-strip">
          <a class="size-graphic-thumb" href="assets/products/W350/size/size_chart_garment.jpg" target="_blank">
            <img src="assets/products/W350/size/size_chart_garment.jpg" alt="W350 Garment Size Chart &amp; Measurements" loading="lazy">
            <span>🔍 View Original Tech Pack Size Sheet</span>
          </a>
        </div>
        <small class="pdp-table-tip">Note: Hand-measured specifications. Flat measurement tolerance within ±1-2cm.</small>
      </div>
    `;
  } else if (prod.id === 'W430') {
    sizeGuideHtml = `
      <div class="pdp-size-tables-card t040-size-card">
        <div class="table-header">
          <span class="table-tag">OFFICIAL TECH SIZING &amp; MEASUREMENTS</span>
          <h4>W430 430G French Terry Premium Crewneck - Sizing Guide</h4>
        </div>

        <div class="t040-models-badge-row">
          <div class="model-stat-pill">
            <span class="m-avatar">👨</span>
            <div class="m-info">
              <strong>Denis (Male Model)</strong>
              <small>188cm / 77kg · Wearing XL · Oversized Streetwear Fit</small>
            </div>
          </div>
          <div class="model-stat-pill">
            <span class="m-avatar">👩</span>
            <div class="m-info">
              <strong>Karen (Female Model)</strong>
              <small>173cm / 55kg · Wearing L · Loose Boxy Fit</small>
            </div>
          </div>
        </div>

        <h5 class="sub-table-title">📏 Garment Dimensions (Flat Measurement / cm &amp; in)</h5>
        <div class="pdp-table-wrap">
          <table class="pdp-spec-table">
            <thead>
              <tr>
                <th>Size</th>
                <th>Length (衣长)</th>
                <th>Chest (胸围)</th>
                <th>Shoulder (肩宽)</th>
                <th>Sleeve (袖长)</th>
                <th>Fit Profile</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><strong>S</strong></td><td>70.0 cm (27.6")</td><td>120 cm (47.2")</td><td>55.0 cm (21.7")</td><td>59.0 cm (23.2")</td><td>Relaxed Street</td></tr>
              <tr><td><strong>M</strong></td><td>72.0 cm (28.3")</td><td>126 cm (49.6")</td><td>57.0 cm (22.4")</td><td>60.0 cm (23.6")</td><td>Boxy Drop Shoulder</td></tr>
              <tr><td><strong>L</strong></td><td>74.0 cm (29.1")</td><td>132 cm (52.0")</td><td>59.0 cm (23.2")</td><td>61.0 cm (24.0")</td><td>Authentic Oversized</td></tr>
              <tr class="highlight-row"><td><strong>XL</strong></td><td>76.0 cm (29.9")</td><td>138 cm (54.3")</td><td>61.0 cm (24.0")</td><td>62.0 cm (24.4")</td><td>90s Vintage Baggy (Denis Fit)</td></tr>
              <tr><td><strong>2XL</strong></td><td>78.0 cm (30.7")</td><td>144 cm (56.7")</td><td>63.0 cm (24.8")</td><td>63.0 cm (24.8")</td><td>Plus Size Loose</td></tr>
            </tbody>
          </table>
        </div>

        <h5 class="sub-table-title">⚖️ Height &amp; Weight Recommendations (建议尺码)</h5>
        <div class="pdp-table-wrap">
          <table class="pdp-spec-table">
            <thead>
              <tr>
                <th>Size</th>
                <th>Suggested Height</th>
                <th>Suggested Weight</th>
                <th>Fit Profile</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><strong>S</strong></td><td>160 - 168 cm</td><td>48 - 58 kg (105-128 lbs)</td><td>Comfortable Relaxed Street</td></tr>
              <tr><td><strong>M</strong></td><td>168 - 175 cm</td><td>58 - 68 kg (128-150 lbs)</td><td>Structured Boxy Drop Shoulder</td></tr>
              <tr><td><strong>L</strong></td><td>173 - 180 cm</td><td>68 - 78 kg (150-172 lbs)</td><td>Authentic Oversized Drape</td></tr>
              <tr class="highlight-row"><td><strong>XL</strong></td><td>178 - 188 cm</td><td>77 - 88 kg (170-194 lbs)</td><td>90s Heavyweight Baggy (Denis Fit)</td></tr>
              <tr><td><strong>2XL</strong></td><td>182 - 195 cm</td><td>88 - 105 kg (194-230 lbs)</td><td>Max Plus Size Baggy Fit</td></tr>
            </tbody>
          </table>
        </div>

        <div class="t040-size-graphics-strip">
          <a class="size-graphic-thumb" href="assets/products/W430/size/size_chart_garment.jpg" target="_blank">
            <img src="assets/products/W430/size/size_chart_garment.jpg" alt="W430 Garment Size Chart &amp; Measurements" loading="lazy">
            <span>🔍 View Original Tech Pack Size Sheet</span>
          </a>
        </div>
        <small class="pdp-table-tip">Note: Hand-measured specifications. Flat measurement tolerance within ±1-2cm.</small>
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

  // Lookbook and Details
  let extraCraftHtml = '';
  let lookbookImages = (prod.detailImages && prod.detailImages.length > 0) ? prod.detailImages : prod.gallery;

  if (prod.id === 'T040') {
    const craftDetails = [
      { img: 'assets/products/T040/detail/detail_1.jpg', title: '01 领口细节', desc: '3.0cm Anti-Deformation High Rebound Ribbed Collar' },
      { img: 'assets/products/T040/detail/detail_2.jpg', title: '02 肩袖做工', desc: 'Reinforced Drop-Shoulder Structural Seams' },
      { img: 'assets/products/T040/detail/detail_3.jpg', title: '03 下摆双针', desc: 'Twin-Needle Clean Edge Lockstitching' },
      { img: 'assets/products/T040/detail/detail_4.jpg', title: '04 面料质感', desc: '245 GSM 100% Combed Compact Cotton Weave' },
      { img: 'assets/products/T040/detail/detail_5.jpg', title: '05 内里压条', desc: 'Clean Collar-to-Shoulder Bound Taping & Overlock' },
      { img: 'assets/products/T040/detail/detail_6.jpg', title: '06 高弹韧性', desc: 'Pre-Shrunk Ribbed Neckband - Anti-Bacon Collar' },
      { img: 'assets/products/T040/detail/detail_7.jpg', title: '07 挺括垂坠', desc: 'Heavyweight Streetwear Boxy Natural Drape' },
      { img: 'assets/products/T040/detail/detail_8.jpg', title: '08 双股织造', desc: 'Double-Yarn Combed Cotton Smooth Finish' }
    ];

    extraCraftHtml = `
      <div class="pdp-size-tables-card t040-craft-card">
        <div class="table-header">
          <span class="table-tag">FACTORY CRAFTSMANSHIP</span>
          <h4>Product Details &amp; Macro Fabric Craft (8 Core Specs)</h4>
          <p style="font-size: 11px; color: #64748b; margin-top: 3px;">High-density weave, reinforced seams, and colorfast reactive dye detail</p>
        </div>
        <div class="macro-craft-grid">
          ${craftDetails.map(c => `
            <div class="macro-craft-item">
              <img src="${c.img}" alt="${c.title}" loading="lazy">
              <div class="macro-craft-caption">
                <strong>${c.title}</strong>
                <small>${c.desc}</small>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // 16 full editorial lookbook shots
    lookbookImages = [
      'assets/products/T040/editorial/model_1.jpg',
      'assets/products/T040/editorial/model_2.jpg',
      'assets/products/T040/editorial/model_3.jpg',
      'assets/products/T040/editorial/model_4.jpg',
      'assets/products/T040/editorial/model_5.jpg',
      'assets/products/T040/editorial/model_6.jpg',
      'assets/products/T040/editorial/model_7.jpg',
      'assets/products/T040/editorial/model_8.jpg',
      'assets/products/T040/editorial/model_9.jpg',
      'assets/products/T040/editorial/model_10.jpg',
      'assets/products/T040/editorial/model_11.jpg',
      'assets/products/T040/editorial/model_12.jpg',
      'assets/products/T040/editorial/model_13.jpg',
      'assets/products/T040/editorial/model_14.jpg',
      'assets/products/T040/editorial/model_15.jpg',
      'assets/products/T040/editorial/model_16.jpg'
    ];
  } else if (prod.id === 'T235') {
    const craftDetails = [
      { img: 'assets/products/T235/detail/detail_1.jpg', title: '01 领口拼接', desc: 'Double-Stitched Contrast Ribbed Collar & Raglan Join' },
      { img: 'assets/products/T235/detail/detail_2.jpg', title: '02 后领压条', desc: 'Clean Back Collar Bound Taping & Reinforced Seams' },
      { img: 'assets/products/T235/detail/detail_3.jpg', title: '03 袖口做工', desc: 'Twin-Needle Clean Edge Sleeve Cuffs (Fitted Openings)' },
      { img: 'assets/products/T235/detail/detail_4.jpg', title: '04 挺括垂坠', desc: '235 GSM Heavyweight Cotton - Structured Anti-Wrinkle Drape' },
      { img: 'assets/products/T235/detail/detail_5.jpg', title: '05 领标质感', desc: '100% Combed Cotton Tech Pack Spec Label (Pre-Shrunk < 2%)' },
      { img: 'assets/products/T235/detail/detail_6.jpg', title: '06 下摆双针', desc: 'Reinforced Bottom Hem Double-Needle Lockstitching' },
      { img: 'assets/products/T235/detail/detail_7.jpg', title: '07 密实落差', desc: 'Heavy Fabric Gauge Wave & High Tensile Tear Resistance' },
      { img: 'assets/products/T235/detail/detail_8.jpg', title: '08 紧密双纱', desc: '32S/2 Double-Yarn Compact Combed Cotton Textile Weave' }
    ];

    extraCraftHtml = `
      <div class="pdp-size-tables-card t040-craft-card">
        <div class="table-header">
          <span class="table-tag">FACTORY CRAFTSMANSHIP</span>
          <h4>Product Details &amp; Macro Fabric Craft (8 Core Specs)</h4>
          <p style="font-size: 11px; color: #64748b; margin-top: 3px;">235 GSM combed compact cotton, contrast raglan joins, and colorfast reactive dye</p>
        </div>
        <div class="macro-craft-grid">
          ${craftDetails.map(c => `
            <div class="macro-craft-item">
              <img src="${c.img}" alt="${c.title}" loading="lazy">
              <div class="macro-craft-caption">
                <strong>${c.title}</strong>
                <small>${c.desc}</small>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // 16 full editorial lookbook shots
    lookbookImages = [
      'assets/products/T235/editorial/model_1.jpg',
      'assets/products/T235/editorial/model_2.jpg',
      'assets/products/T235/editorial/model_3.jpg',
      'assets/products/T235/editorial/model_4.jpg',
      'assets/products/T235/editorial/model_5.jpg',
      'assets/products/T235/editorial/model_6.jpg',
      'assets/products/T235/editorial/model_7.jpg',
      'assets/products/T235/editorial/model_8.jpg',
      'assets/products/T235/editorial/model_9.jpg',
      'assets/products/T235/editorial/model_10.jpg',
      'assets/products/T235/editorial/model_11.jpg',
      'assets/products/T235/editorial/model_12.jpg',
      'assets/products/T235/editorial/model_13.jpg',
      'assets/products/T235/editorial/model_14.jpg',
      'assets/products/T235/editorial/model_15.jpg',
      'assets/products/T235/editorial/model_16.jpg'
    ];
  } else if (prod.id === 'T238') {
    const craftDetails = [
      { img: 'assets/products/T238/detail/detail_1.jpg', title: '01 高螺纹领口', desc: '3.5cm High-Density Rebound Elastic Ribbed Collar' },
      { img: 'assets/products/T238/detail/detail_2.jpg', title: '02 通肩压条', desc: 'Collar-to-Shoulder Reinforced Bound Taping' },
      { img: 'assets/products/T238/detail/detail_3.jpg', title: '03 螺纹袖口', desc: 'Fitted 1x1 Ribbed Wrist Cuffs - Anti-Deformation' },
      { img: 'assets/products/T238/detail/detail_4.jpg', title: '04 面料垂坠', desc: '235 GSM Combed Compact Cotton Heavyweight Drape' },
      { img: 'assets/products/T238/detail/detail_5.jpg', title: '05 科技规格标', desc: '100% Combed Cotton Tech Pack Spec Label (< 2% Shrink)' },
      { img: 'assets/products/T238/detail/detail_6.jpg', title: '06 下摆双针', desc: 'Twin-Needle Clean Edge Lockstitching & Side Seams' },
      { img: 'assets/products/T238/detail/detail_7.jpg', title: '07 密实落差', desc: 'Heavy Fabric Gauge Wave & High Tensile Tear Resistance' },
      { img: 'assets/products/T238/detail/detail_8.jpg', title: '08 紧密双纱', desc: '32S/2 Double-Yarn Compact Combed Cotton Textile Weave' }
    ];

    extraCraftHtml = `
      <div class="pdp-size-tables-card t040-craft-card">
        <div class="table-header">
          <span class="table-tag">FACTORY CRAFTSMANSHIP</span>
          <h4>Product Details &amp; Macro Fabric Craft (8 Core Specs)</h4>
          <p style="font-size: 11px; color: #64748b; margin-top: 3px;">235 GSM combed compact cotton, 3.5cm high ribbed collar, and reactive dye detail</p>
        </div>
        <div class="macro-craft-grid">
          ${craftDetails.map(c => `
            <div class="macro-craft-item">
              <img src="${c.img}" alt="${c.title}" loading="lazy">
              <div class="macro-craft-caption">
                <strong>${c.title}</strong>
                <small>${c.desc}</small>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // 16 full editorial lookbook shots
    lookbookImages = [
      'assets/products/T238/editorial/model_1.jpg',
      'assets/products/T238/editorial/model_2.jpg',
      'assets/products/T238/editorial/model_3.jpg',
      'assets/products/T238/editorial/model_4.jpg',
      'assets/products/T238/editorial/model_5.jpg',
      'assets/products/T238/editorial/model_6.jpg',
      'assets/products/T238/editorial/model_7.jpg',
      'assets/products/T238/editorial/model_8.jpg',
      'assets/products/T238/editorial/model_9.jpg',
      'assets/products/T238/editorial/model_10.jpg',
      'assets/products/T238/editorial/model_11.jpg',
      'assets/products/T238/editorial/model_12.jpg',
      'assets/products/T238/editorial/model_13.jpg',
      'assets/products/T238/editorial/model_14.jpg',
      'assets/products/T238/editorial/model_15.jpg',
      'assets/products/T238/editorial/model_16.jpg'
    ];
  } else if (prod.id === 'T275') {
    const craftDetails = [
      { img: 'assets/products/T275/detail/detail_1.jpg', title: '01 加厚螺纹领口', desc: '3.2cm Heavyweight Anti-Deformation Rebound Ribbed Collar' },
      { img: 'assets/products/T275/detail/detail_2.jpg', title: '02 通肩压条加固', desc: 'Collar-to-Shoulder Clean Bound Taping & Reinforced Overlock' },
      { img: 'assets/products/T275/detail/detail_3.jpg', title: '03 美式落肩剪裁', desc: 'Authentic 90s American Drop-Shoulder Structural Silhouette' },
      { img: 'assets/products/T275/detail/detail_4.jpg', title: '04 275G 重磅挺括', desc: '275 GSM Ultra-Heavy Combed Cotton - Structured Anti-Wrinkle Drape' },
      { img: 'assets/products/T275/detail/detail_5.jpg', title: '05 纯棉科技规格标', desc: '100% Combed Cotton Factory Tech Pack Spec Label (< 2% Shrink)' },
      { img: 'assets/products/T275/detail/detail_6.jpg', title: '06 下摆双针锁边', desc: 'Twin-Needle Clean Edge Lockstitching & Reinforced Side Seams' },
      { img: 'assets/products/T275/detail/detail_7.jpg', title: '07 高密紧致纹理', desc: 'Heavy Gauge Compact Textile Weave - High Tensile Tear Resistance' },
      { img: 'assets/products/T275/detail/detail_8.jpg', title: '08 双股紧密织造', desc: 'Compact Double-Yarn Combed Cotton Smooth Surface' }
    ];

    extraCraftHtml = `
      <div class="pdp-size-tables-card t040-craft-card">
        <div class="table-header">
          <span class="table-tag">FACTORY CRAFTSMANSHIP</span>
          <h4>Product Details &amp; Macro Fabric Craft (8 Core Specs)</h4>
          <p style="font-size: 11px; color: #64748b; margin-top: 3px;">275 GSM combed compact cotton, 3.2cm heavyweight ribbed collar, and reactive dye detail</p>
        </div>
        <div class="macro-craft-grid">
          ${craftDetails.map(c => `
            <div class="macro-craft-item">
              <img src="${c.img}" alt="${c.title}" loading="lazy">
              <div class="macro-craft-caption">
                <strong>${c.title}</strong>
                <small>${c.desc}</small>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // 16 full editorial lookbook shots (upright)
    lookbookImages = [
      'assets/products/T275/editorial/model_1.jpg',
      'assets/products/T275/editorial/model_2.jpg',
      'assets/products/T275/editorial/model_3.jpg',
      'assets/products/T275/editorial/model_4.jpg',
      'assets/products/T275/editorial/model_5.jpg',
      'assets/products/T275/editorial/model_6.jpg',
      'assets/products/T275/editorial/model_7.jpg',
      'assets/products/T275/editorial/model_8.jpg',
      'assets/products/T275/editorial/model_9.jpg',
      'assets/products/T275/editorial/model_10.jpg',
      'assets/products/T275/editorial/model_11.jpg',
      'assets/products/T275/editorial/model_12.jpg',
      'assets/products/T275/editorial/model_13.jpg',
      'assets/products/T275/editorial/model_14.jpg',
      'assets/products/T275/editorial/model_15.jpg',
      'assets/products/T275/editorial/model_16.jpg'
    ];
  } else if (prod.id === 'T276') {
    const craftDetails = [
      { img: 'assets/products/T276/detail/detail_1.jpg', title: '01 加厚螺纹领口', desc: '3.2cm Heavyweight Anti-Deformation Rebound Ribbed Collar' },
      { img: 'assets/products/T276/detail/detail_2.jpg', title: '02 后领通肩压条', desc: 'Collar-to-Shoulder Clean Bound Taping & Reinforced Overlock' },
      { img: 'assets/products/T276/detail/detail_3.jpg', title: '03 螺纹收口袖口', desc: 'Fitted 1x1 Elastic Ribbed Wrist Cuffs - Anti-Deformation' },
      { img: 'assets/products/T276/detail/detail_4.jpg', title: '04 美式落肩剪裁', desc: 'Authentic 90s American Drop-Shoulder Structural Silhouette' },
      { img: 'assets/products/T276/detail/detail_5.jpg', title: '05 下摆双针锁边', desc: 'Twin-Needle Clean Edge Lockstitching & Reinforced Side Seams' },
      { img: 'assets/products/T276/detail/detail_6.jpg', title: '06 275G 重磅挺括', desc: '275 GSM Ultra-Heavy Combed Cotton - Structured Anti-Wrinkle Drape' },
      { img: 'assets/products/T276/detail/detail_7.jpg', title: '07 高密紧致纹理', desc: 'Heavy Gauge Compact Textile Weave - High Tensile Tear Resistance' },
      { img: 'assets/products/T276/detail/detail_8.jpg', title: '08 双股紧密织造', desc: 'Compact Double-Yarn Combed Cotton Smooth Surface' }
    ];

    extraCraftHtml = `
      <div class="pdp-size-tables-card t040-craft-card">
        <div class="table-header">
          <span class="table-tag">FACTORY CRAFTSMANSHIP</span>
          <h4>Product Details &amp; Macro Fabric Craft (8 Core Specs)</h4>
          <p style="font-size: 11px; color: #64748b; margin-top: 3px;">275 GSM combed compact cotton, 3.2cm heavyweight ribbed collar, 1x1 fitted cuffs</p>
        </div>
        <div class="macro-craft-grid">
          ${craftDetails.map(c => `
            <div class="macro-craft-item">
              <img src="${c.img}" alt="${c.title}" loading="lazy">
              <div class="macro-craft-caption">
                <strong>${c.title}</strong>
                <small>${c.desc}</small>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // 16 full editorial lookbook shots (upright)
    lookbookImages = [
      'assets/products/T276/editorial/model_1.jpg',
      'assets/products/T276/editorial/model_2.jpg',
      'assets/products/T276/editorial/model_3.jpg',
      'assets/products/T276/editorial/model_4.jpg',
      'assets/products/T276/editorial/model_5.jpg',
      'assets/products/T276/editorial/model_6.jpg',
      'assets/products/T276/editorial/model_7.jpg',
      'assets/products/T276/editorial/model_8.jpg',
      'assets/products/T276/editorial/model_9.jpg',
      'assets/products/T276/editorial/model_10.jpg',
      'assets/products/T276/editorial/model_11.jpg',
      'assets/products/T276/editorial/model_12.jpg',
      'assets/products/T276/editorial/model_13.jpg',
      'assets/products/T276/editorial/model_14.jpg',
      'assets/products/T276/editorial/model_15.jpg',
      'assets/products/T276/editorial/model_16.jpg'
    ];
  } else if (prod.id === 'T230') {
    const craftDetails = [
      { img: 'assets/products/T230/detail/detail_1.jpg', title: '01 领口压条', desc: 'Double-Stitched Ribbed Collar & Bound Back Taping' },
      { img: 'assets/products/T230/detail/detail_2.jpg', title: '02 袖口精密双针', desc: 'Precision Twin-Needle Hem & Cuff Lockstitching' },
      { img: 'assets/products/T230/detail/detail_3.jpg', title: '03 炒雪花碧纹染', desc: '21S Artisanal Mineral Dye & Vintage Snow Acid Wash Technique' },
      { img: 'assets/products/T230/detail/detail_4.jpg', title: '04 230G重磅纯棉', desc: '230 GSM 100% Combed Compact Cotton Jersey Weave' },
      { img: 'assets/products/T230/detail/detail_5.jpg', title: '05 街头落肩剪裁', desc: 'Relaxed Drop-Shoulder Silhouette & Natural Drape' },
      { img: 'assets/products/T230/detail/detail_6.jpg', title: '06 原厂技术规格', desc: 'Factory MT-2651 Production Spec & Certification Standard' }
    ];

    extraCraftHtml = `
      <div class="pdp-size-tables-card t040-craft-card">
        <div class="table-header">
          <span class="table-tag">FACTORY CRAFTSMANSHIP</span>
          <h4>Product Details &amp; Macro Fabric Craft (6 Core Specs)</h4>
          <p style="font-size: 11px; color: #64748b; margin-top: 3px;">230 GSM combed cotton, artisanal mineral acid snow wash, bound collar taping</p>
        </div>
        <div class="macro-craft-grid">
          ${craftDetails.map(c => `
            <div class="macro-craft-item">
              <img src="${c.img}" alt="${c.title}" loading="lazy">
              <div class="macro-craft-caption">
                <strong>${c.title}</strong>
                <small>${c.desc}</small>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    lookbookImages = [
      'assets/products/T230/main/1.jpg',
      'assets/products/T230/main/2.jpg',
      'assets/products/T230/main/3.jpg',
      'assets/products/T230/main/4.jpg',
      'assets/products/T230/main/5.jpg',
      'assets/products/T230/main/6.jpg'
    ];
  } else if (prod.id === 'KB02') {
    const craftDetails = [
      { img: 'assets/products/KB02/detail/1.jpg', title: '01 重工金属拉链', desc: 'Heavy Antiqued Dual Metal Full-Zip Placket with Vintage Patina' },
      { img: 'assets/products/KB02/detail/2.jpg', title: '02 双层连帽领口', desc: 'Architectural Double-Layer Structured Hood with Deep Neck Overlock' },
      { img: 'assets/products/KB02/detail/3.jpg', title: '03 380G 针织牛仔', desc: '380 GSM Heavy Knitted Denim - 93.2% Cotton 6.8% Spandex Comfort Stretch' },
      { img: 'assets/products/KB02/detail/4.jpg', title: '04 袋鼠分体插袋', desc: 'Symmetrical Deep Split Kangaroo Hand Pockets & Bar-Tack Stitches' },
      { img: 'assets/products/KB02/detail/5.jpg', title: '05 美式落肩结构', desc: '90s Boxy Drop-Shoulder Silhouette & Relaxed Armhole Cut' },
      { img: 'assets/products/KB02/detail/6.jpg', title: '06 高弹螺纹收口', desc: 'High-Density 2x2 Ribbed Cuffs & Waistband - Anti-Deformation Rebound' },
      { img: 'assets/products/KB02/detail/7.jpg', title: '07 炒雪花洗水质感', desc: 'Artisanal Snow Dye & Vintage Mineral Stone Acid Wash' },
      { img: 'assets/products/KB02/detail/8.jpg', title: '08 原厂版型标', desc: 'Factory Authentic Oversized Cut Tech Pack Standard Specification' }
    ];

    extraCraftHtml = `
      <div class="pdp-size-tables-card t040-craft-card">
        <div class="table-header">
          <span class="table-tag">FACTORY CRAFTSMANSHIP</span>
          <h4>Product Details &amp; Macro Fabric Craft (8 Core Specs)</h4>
          <p style="font-size: 11px; color: #64748b; margin-top: 3px;">380 GSM knitted denim, antiqued metal zipper, snow wash tie-dye detail</p>
        </div>
        <div class="macro-craft-grid">
          ${craftDetails.map(c => `
            <div class="macro-craft-item">
              <img src="${c.img}" alt="${c.title}" loading="lazy">
              <div class="macro-craft-caption">
                <strong>${c.title}</strong>
                <small>${c.desc}</small>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    lookbookImages = [
      'assets/products/KB02/main/1.jpg',
      'assets/products/KB02/main/2.jpg',
      'assets/products/KB02/main/3.jpg',
      'assets/products/KB02/main/4.jpg',
      'assets/products/KB02/main/5.jpg',
      'assets/products/KB02/main/6.jpg'
    ];
  } else if (prod.id === 'WY18') {
    const craftDetails = [
      { img: 'assets/products/WY18/detail/3.jpg', title: '01 355G 世博绒保暖', desc: '355 GSM Brushed Thermal Expo Fleece - Supreme Softness & Warmth' },
      { img: 'assets/products/WY18/detail/1.jpg', title: '02 袋鼠深插袋细节', desc: 'Seamless Double-Stitched Front Kangaroo Pocket for Daily Utility' },
      { img: 'assets/products/WY18/detail/2.jpg', title: '03 弹力螺纹收口', desc: 'Heavyweight Elastic Ribbed Cuffs & Hem - Anti-Bacon Shape Retention' },
      { img: 'assets/products/WY18/detail/4.jpg', title: '04 双层保暖无绳帽', desc: 'Clean Minimalist Double Hood Construction with Interior Neck Taping' },
      { img: 'assets/products/WY18/detail/5.jpg', title: '05 加固落肩双线缝', desc: 'Reinforced Twin-Needle Armhole Seams for Vintage Boxy Drape' },
      { img: 'assets/products/WY18/detail/6.jpg', title: '06 美式炒雪花水洗', desc: 'Artisanal Garment Snow Dye & Acid Mineral Tie-Wash Vintage Distress' }
    ];

    extraCraftHtml = `
      <div class="pdp-size-tables-card t040-craft-card">
        <div class="table-header">
          <span class="table-tag">FACTORY CRAFTSMANSHIP</span>
          <h4>Product Details &amp; Macro Fabric Craft (6 Core Specs)</h4>
          <p style="font-size: 11px; color: #64748b; margin-top: 3px;">355 GSM thermal expo fleece, artisanal snow acid tie-dye, seamless double hood</p>
        </div>
        <div class="macro-craft-grid">
          ${craftDetails.map(c => `
            <div class="macro-craft-item">
              <img src="${c.img}" alt="${c.title}" loading="lazy">
              <div class="macro-craft-caption">
                <strong>${c.title}</strong>
                <small>${c.desc}</small>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    lookbookImages = [
      'assets/products/WY18/main/1.jpg',
      'assets/products/WY18/main/2.jpg',
      'assets/products/WY18/main/3.jpg',
      'assets/products/WY18/main/4.jpg',
      'assets/products/WY18/main/5.jpg',
      'assets/products/WY18/main/6.jpg'
    ];
  } else if (prod.id === 'W350') {
    const craftDetails = [
      { img: 'assets/products/W350/detail/1.jpg', title: '01 3.0cm高弹加厚领口', desc: '3.0cm Anti-Deformation Bound Ribbed Crewneck & Reinforced Neckband' },
      { img: 'assets/products/W350/detail/2.jpg', title: '02 后领加固包条双线', desc: 'Interior Herringbone Back Collar Taping & Precision Dual Lockstitch' },
      { img: 'assets/products/W350/detail/3.jpg', title: '03 1×1高密罗纹袖口', desc: 'High-Elasticity 1×1 Ribbed Wrist Cuffs - Shape-Retention Rebound' },
      { img: 'assets/products/W350/detail/4.jpg', title: '04 复古落肩双针拼缝', desc: '90s Boxy Drop-Shoulder Silhouette with Twin-Needle Armhole Seams' },
      { img: 'assets/products/W350/detail/5.jpg', title: '05 下摆加固罗纹收口', desc: 'Heavyweight Elastic Bottom Hem Ribbing - Anti-Flaring Structured Drape' },
      { img: 'assets/products/W350/detail/6.jpg', title: '06 350G精梳棉紧密织造', desc: '350 GSM Combed Cotton Heavyweight Dense Knit - Crisp Surface Texture' },
      { img: 'assets/products/W350/detail/7.jpg', title: '07 定制领标与折叠厚度', desc: 'Authentic Specification Neck Label & Substantial Heavyweight Thickness' },
      { img: 'assets/products/W350/detail/8.jpg', title: '08 细腻磨毛加绒内里', desc: 'Ultra-Soft Brushed Thermal Fleece Lining - Premium Cold Weather Warmth' }
    ];

    extraCraftHtml = `
      <div class="pdp-size-tables-card t040-craft-card">
        <div class="table-header">
          <span class="table-tag">FACTORY CRAFTSMANSHIP</span>
          <h4>Product Details &amp; Macro Fabric Craft (8 Core Specs)</h4>
          <p style="font-size: 11px; color: #64748b; margin-top: 3px;">350 GSM brushed thermal fleece, 3.0cm bound collar, 1x1 elastic ribbing</p>
        </div>
        <div class="macro-craft-grid">
          ${craftDetails.map(c => `
            <div class="macro-craft-item">
              <img src="${c.img}" alt="${c.title}" loading="lazy">
              <div class="macro-craft-caption">
                <strong>${c.title}</strong>
                <small>${c.desc}</small>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    lookbookImages = [
      'assets/products/W350/main/1.jpg',
      'assets/products/W350/main/2.jpg',
      'assets/products/W350/main/3.jpg',
      'assets/products/W350/main/4.jpg',
      'assets/products/W350/main/5.jpg',
      'assets/products/W350/main/6.jpg'
    ];
  } else if (prod.id === 'W430') {
    const craftDetails = [
      { img: 'assets/products/W430/detail/1.jpg', title: '01 3.0cm高弹加厚领口', desc: '3.0cm Anti-Deformation Bound Ribbed Crewneck & Internal Neck Taping' },
      { img: 'assets/products/W430/detail/2.jpg', title: '02 双针落肩袖笼拼缝', desc: 'Precision Double-Needle Reinforced Drop-Shoulder Structural Seams' },
      { img: 'assets/products/W430/detail/3.jpg', title: '03 1×1高密高弹罗纹袖口', desc: 'High-Elasticity 1×1 Ribbed Wrist Cuffs - Anti-Deformation Rebound' },
      { img: 'assets/products/W430/detail/4.jpg', title: '04 符合人体工学平整后领', desc: 'Ergonomic Smooth Back Collar Seam & Clean Inside-Out Structure' },
      { img: 'assets/products/W430/detail/5.jpg', title: '05 袖口精工拷边与内衬', desc: 'Clean Overlock Bound Edge Finish & Durable High-Tensile Stitching' },
      { img: 'assets/products/W430/detail/6.jpg', title: '06 430G精梳紧密棉面层', desc: '430 GSM Combed Cotton Heavyweight Dense Knit - Smooth Silk-Touch Face' },
      { img: 'assets/products/W430/detail/7.jpg', title: '07 下摆回弹罗纹与毛圈内里', desc: 'Retractable Bound Ribbed Hem & Breathable French Terry Loopback Knit' },
      { img: 'assets/products/W430/detail/8.jpg', title: '08 挺括垂坠感重磅质感', desc: 'Substantial Heavyweight Streetwear Drape - Natural Boxy Silhouette' }
    ];

    extraCraftHtml = `
      <div class="pdp-size-tables-card t040-craft-card">
        <div class="table-header">
          <span class="table-tag">FACTORY CRAFTSMANSHIP</span>
          <h4>Product Details &amp; Macro Fabric Craft (8 Core Specs)</h4>
          <p style="font-size: 11px; color: #64748b; margin-top: 3px;">430 GSM French Terry loopback knit, 3.0cm bound collar, 1x1 elastic ribbing</p>
        </div>
        <div class="macro-craft-grid">
          ${craftDetails.map(c => `
            <div class="macro-craft-item">
              <img src="${c.img}" alt="${c.title}" loading="lazy">
              <div class="macro-craft-caption">
                <strong>${c.title}</strong>
                <small>${c.desc}</small>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    lookbookImages = [
      'assets/products/W430/main/1.jpg',
      'assets/products/W430/main/2.jpg',
      'assets/products/W430/main/3.jpg',
      'assets/products/W430/main/4.jpg',
      'assets/products/W430/main/5.jpg',
      'assets/products/W430/main/6.jpg'
    ];
  }

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

    <!-- Extra Craft Details for T040, T230, T235, T238, T275, T276, KB02, WY18, W350 & W430 -->
    ${extraCraftHtml}

    <!-- Editorial Lookbook Gallery -->
    <div class="pdp-editorial-gallery">
      <div class="gallery-title-box">
        <span class="g-tag">LOOKBOOK GALLERY</span>
        <h3>${(prod.id === 'T040' || prod.id === 'T230' || prod.id === 'T235' || prod.id === 'T238' || prod.id === 'T275' || prod.id === 'T276' || prod.id === 'KB02' || prod.id === 'WY18' || prod.id === 'W350' || prod.id === 'W430') ? (prod.id === 'KB02' || prod.id === 'WY18' || prod.id === 'T230' || prod.id === 'W350' || prod.id === 'W430' ? 'Product Gallery &amp; Lookbook Showcase' : 'Editorial Street Lookbook (16 Shots)') : 'Product Details &amp; Macro Fabric Craft'}</h3>
        <p>${(prod.id === 'T040' || prod.id === 'T230' || prod.id === 'T235' || prod.id === 'T238' || prod.id === 'T275' || prod.id === 'T276' || prod.id === 'KB02' || prod.id === 'WY18' || prod.id === 'W350' || prod.id === 'W430') ? 'Full Streetwear Outfit On-Model Demonstrations &amp; Colorway Silhouettes' : 'High-density weave, reinforced seams, and colorfast reactive dye detail'}</p>
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
  const total = document.querySelectorAll('.pdp-thumb').length || 4;
  if (mainImg) mainImg.src = imgSrc;
  if (counter && index) counter.textContent = `${index} / ${total}`;

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
  const cartTabBadge = document.getElementById('cartTabBadge');

  if (floatBadge) floatBadge.textContent = count;
  if (cartTitle) cartTitle.textContent = count;
  if (cartTabBadge) {
    cartTabBadge.textContent = count;
    cartTabBadge.style.display = count > 0 ? 'inline-block' : 'none';
  }

  let subtotalUSD = 0;
  let totalPieces = 0;
  const listContainer = document.getElementById('cartItemsList');
  const checkoutBtn = document.getElementById('cartCheckoutBtn') || document.querySelector('.btn-checkout');

  if (listContainer) {
    listContainer.innerHTML = '';
    if (count === 0) {
      listContainer.innerHTML = `
        <div class="empty-cart-container">
          <div class="empty-cart-icon-circle">
            <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" x2="21" y1="6" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          </div>
          <h4 class="empty-cart-title">Your Sample Cart is Empty</h4>
          <p class="empty-cart-desc">No sample garments added yet. Explore our oversized heavyweight blanks &amp; custom streetwear catalog to start proofing.</p>
          <button type="button" class="btn-empty-cart-action" onclick="switchTab('catalog')">
            <span>Explore Product Catalog</span>
            <span class="btn-arrow">➔</span>
          </button>
        </div>
      `;
    } else {
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
  }

  const shippingUSD = count > 0 ? calculateUsShipping(totalPieces) : 0;
  const deliveredTotalUSD = count > 0 ? (subtotalUSD + shippingUSD) : 0;

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

  if (checkoutBtn) {
    if (count === 0) {
      checkoutBtn.disabled = true;
      checkoutBtn.classList.add('disabled');
      checkoutBtn.textContent = 'Cart is Empty';
    } else {
      checkoutBtn.disabled = false;
      checkoutBtn.classList.remove('disabled');
      checkoutBtn.textContent = 'Submit RFQ / Order Sample';
    }
  }
}

function handleCartCheckout() {
  if (APP_STATE.cartItems.length === 0) {
    showToast('Your sample cart is empty. Please add garments from the catalog!');
    switchTab('catalog');
    return;
  }
  openWhatsAppModal();
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
  const modal = document.getElementById('whatsappModal');
  if (modal) {
    modal.classList.add('open');
    const waDirectBtn = modal.querySelector('.btn-wa-direct');
    if (waDirectBtn) {
      if (APP_STATE.cartItems.length > 0) {
        const summary = APP_STATE.cartItems.map(i => `${i.qty}x ${i.name} (${i.size}, ${i.spec})`).join(', ');
        const text = encodeURIComponent(`Hello DOZE OPO, I would like to inquire/order samples for: ${summary}.`);
        waDirectBtn.href = `https://wa.me/8618520682738?text=${text}`;
      } else {
        waDirectBtn.href = `https://wa.me/8618520682738?text=Hello%20DOZE%20OPO,%20I%20am%20interested%20in%20custom%20heavyweight%20hoodies%20and%20t-shirts.`;
      }
    }
  }
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
