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
if (typeof window.PRODUCTS_DATA === 'undefined') {
  window.PRODUCTS_DATA = {};
}
var PRODUCTS_DATA = window.PRODUCTS_DATA;

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

  const archive = window.PRINTS_ARCHIVE_DATA || [];
  const homeCount = document.getElementById('homePrintCountTag');
  if (homeCount && archive.length > 0) homeCount.textContent = `${archive.length} EXCLUSIVE STYLES`;

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

  // Craft Chips (TEE Craft Base Prices: Heat Transfer (DTF) $20, Flock Printing $20, Screen $40, Puff $40, DTG $50, Embroidery $50)
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
    if (catFilter === 'hoodie' && p.category === 'hoodie') return true;
    if (catFilter === 'jacket' && p.category === 'jacket') return true;
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
          <div class="empty-icon">✨</div>
          <p class="empty-text">Catalog Updating</p>
          <span class="empty-hint">New season collection is currently being uploaded. Contact us on WhatsApp for latest catalogs &amp; quotes.</span>
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

// --------------------------------------------------------------------------
// TikTok Shop Interactive Size Chart Component & Live Unit Converter
// --------------------------------------------------------------------------
let CURRENT_SIZE_UNIT = 'cm';

function setGlobalSizeUnit(unit) {
  CURRENT_SIZE_UNIT = unit;
  document.querySelectorAll('.unit-toggle-pill').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.trim().toLowerCase() === unit);
  });
  document.querySelectorAll('[data-unit-label]').forEach(el => {
    el.textContent = unit;
  });
  document.querySelectorAll('.size-cell-val[data-cm]').forEach(el => {
    const cm = parseFloat(el.getAttribute('data-cm'));
    if (unit === 'in') {
      const inch = (cm / 2.54).toFixed(1);
      el.textContent = inch;
    } else {
      el.textContent = cm % 1 === 0 ? cm.toFixed(0) : cm.toFixed(1);
    }
  });
}

function selectPdpSizeFromTable(size) {
  const sizeBtns = document.querySelectorAll('#pdpSizeRow .pdp-size-btn');
  sizeBtns.forEach(btn => {
    if (btn.textContent.trim() === size) {
      btn.click();
    }
  });
}

function renderTikTokSizeTableHtml(tableData, activeSize) {
  if (!tableData || !tableData.columns || !tableData.rows) return '';
  const unit = CURRENT_SIZE_UNIT || 'cm';

  const ths = tableData.columns.map(col => {
    if (col.unit) {
      return `<th>${col.label} <span class="unit-sub" data-unit-label>${unit}</span></th>`;
    }
    return `<th>${col.label}</th>`;
  }).join('');

  const trs = tableData.rows.map(row => {
    const isRowActive = (row.size === activeSize);
    const tds = tableData.columns.map(col => {
      const val = row[col.key];
      if (col.isSize) {
        return `<td class="col-size">${val}</td>`;
      }
      if (col.unit && typeof val === 'number') {
        const displayVal = unit === 'in' ? (val / 2.54).toFixed(1) : (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1));
        return `<td><span class="size-cell-val" data-cm="${val}">${displayVal}</span></td>`;
      }
      return `<td>${val || '-'}</td>`;
    }).join('');

    return `<tr class="tiktok-size-tr ${isRowActive ? 'active-size-row' : ''}" data-row-size="${row.size}" onclick="selectPdpSizeFromTable('${row.size}')">${tds}</tr>`;
  }).join('');

  return `
    <div class="tiktok-size-card">
      <div class="tiktok-size-header">
        <div class="tiktok-size-title-group">
          <span class="tiktok-size-icon">📐</span>
          <span class="tiktok-size-title">Size Guide &amp; Measurements</span>
          <span class="tiktok-size-badge">TikTok Shop Style</span>
        </div>
        <div class="tiktok-unit-switch" role="group" aria-label="Measurement Unit Switch">
          <button type="button" class="unit-toggle-pill ${unit === 'cm' ? 'active' : ''}" onclick="setGlobalSizeUnit('cm')">cm</button>
          <button type="button" class="unit-toggle-pill ${unit === 'in' ? 'active' : ''}" onclick="setGlobalSizeUnit('in')">in</button>
        </div>
      </div>
      <div class="tiktok-table-scroll-wrap">
        <table class="tiktok-size-table">
          <thead>
            <tr>${ths}</tr>
          </thead>
          <tbody>
            ${trs}
          </tbody>
        </table>
      </div>
      <div class="tiktok-size-footer">
        <span class="size-hint-item">💡 Click any size row to select · Manual flat tolerance within ±1-2cm (0.4-0.8 in) is standard</span>
      </div>
    </div>
  `;
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
  const baseGallery = prod.gallery || (prod.img ? [prod.img] : []);
  const galleryItems = baseGallery.map(img => ({ src: img, isChart: false, label: '' }));
  const gallery = baseGallery;

  if (thumbStrip) {
    thumbStrip.innerHTML = '';
    galleryItems.forEach((item, idx) => {
      const tDiv = document.createElement('div');
      tDiv.className = `pdp-thumb ${idx === 0 ? 'active' : ''}`;
      tDiv.onclick = () => switchPdpHero(item.src, idx + 1);
      tDiv.innerHTML = `
        <img src="${item.src}" alt="Gallery ${idx + 1}">
        ${item.isChart ? `<span class="pdp-thumb-size-badge">${item.label}</span>` : ''}
      `;
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

  // Dynamic Size Selector Chips & Prominent Size Guide UI
  const sizeSection = document.getElementById('pdpSizeSection');
  const sizeRow = document.getElementById('pdpSizeRow');
  const sizeGuideBtn = document.getElementById('pdpSizeGuideBtn');
  const sizePreviewBox = document.getElementById('pdpSizePreviewBox');

  if (prod.sizes && Array.isArray(prod.sizes) && prod.sizes.length > 0) {
    if (sizeSection) sizeSection.style.display = 'block';
    if (sizeRow) {
      const availableSizes = prod.sizes;
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

    // Configure Size Guide Button & In-place Preview
    if (prod.sizeTable) {
      if (sizeGuideBtn) sizeGuideBtn.style.display = 'inline-flex';
      if (sizePreviewBox) {
        sizePreviewBox.innerHTML = renderTikTokSizeTableHtml(prod.sizeTable, activePdpSize);
        sizePreviewBox.style.display = 'block';
      }
    } else if (prod.sizeChart || prod.sizeRecommend) {
      if (sizeGuideBtn) sizeGuideBtn.style.display = 'inline-flex';
      if (sizePreviewBox) {
        sizePreviewBox.innerHTML = `
          <div class="pdp-size-mini-box" onclick="openSizeGuideModal()">
            <div class="pdp-size-mini-header">
              <span class="pdp-size-mini-title">📏 Official Size Guide & Fit Recommendations</span>
              <span class="pdp-size-mini-badge">Full View 🔍</span>
            </div>
            <div class="pdp-size-mini-thumbs">
              ${prod.sizeChart ? `
                <div class="pdp-mini-thumb-item">
                  <img src="${prod.sizeChart}" alt="Garment Measurements Guide">
                  <span>📐 ${prod.sizeRecommend ? 'Garment Dimensions' : 'Size & Fit Recommendations'}</span>
                </div>` : ''}
              ${prod.sizeRecommend ? `
                <div class="pdp-mini-thumb-item">
                  <img src="${prod.sizeRecommend}" alt="Body Fit & Size Recommendations">
                  <span>👤 Body Fit & Size Recommendations</span>
                </div>` : ''}
            </div>
            <div class="pdp-mini-zoom-hint">Click card or tap [Size Chart] to view high-definition full guide</div>
          </div>
        `;
        sizePreviewBox.style.display = 'block';
      }
    } else {
      if (sizeGuideBtn) sizeGuideBtn.style.display = 'none';
      if (sizePreviewBox) sizePreviewBox.style.display = 'none';
    }
  } else {
    if (sizeSection) sizeSection.style.display = 'none';
    activePdpSize = '';
  }

  const dynSection = document.getElementById('pdpDynamicLookbook');
  if (dynSection) {
    dynSection.style.display = 'block';
    renderDynamicLookbook(prod);
  }

  // Update Bottom Sticky Order Button
  const orderBtn = document.getElementById('pdpOrderBtn');
  if (orderBtn) {
    orderBtn.onclick = () => openPdpCheckout(productId);
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

  // Lookbook and Details
  let extraCraftHtml = '';
  // Dynamically render size guide section if product has size charts configured
  let lookbookImages = (prod.detailImages && prod.detailImages.length > 0) ? prod.detailImages : prod.gallery;

  if (prod.id === '01D') {
    const craftDetails = [
      { img: 'assets/products/01D/detail/1.jpg', title: '01 High-Elastic Ribbed Neckband', desc: '3.0cm Anti-Deformation High Rebound Ribbed Collar' },
      { img: 'assets/products/01D/detail/2.jpg', title: '02 Bound Shoulder-to-Shoulder Taping', desc: 'Collar-to-Shoulder Clean Bound Comfort Taping' },
      { img: 'assets/products/01D/detail/3.jpg', title: '03 Reinforced Drop-Shoulder Seams', desc: 'Reinforced Drop-Shoulder Structural Seams' },
      { img: 'assets/products/01D/detail/4.jpg', title: '04 Precision Twin-Needle Cuff', desc: 'Precision Parallel Twin-Needle Cuff Overlock' },
      { img: 'assets/products/01D/detail/5.jpg', title: '05 Anti-Curling Twin-Needle Hem', desc: 'Heavyweight Anti-Curling Twin-Needle Hem' },
      { img: 'assets/products/01D/detail/6.jpg', title: '06 20S Compact Siro-Spun Weave', desc: '20S Compact Siro-Spun Combed Cotton Weave' },
      { img: 'assets/products/01D/detail/7.jpg', title: '07 Boxy Streetwear Natural Drape', desc: 'Authentic 90s Boxy Natural Clean Drape' },
      { img: 'assets/products/01D/detail/8.jpg', title: '08 Bar-Tacked Structural Overlock', desc: 'Bar-Tacked Side Seam Structural Reinforcement' },
      { img: 'assets/products/01D/detail/9.jpg', title: '09 Eco-Friendly Reactive Dye', desc: 'Eco-Friendly Reactive Dyeing & High Colorfastness' },
      { img: 'assets/products/01D/detail/10.jpg', title: '10 Grade 4+ Anti-Pilling Finish', desc: 'Grade 4+ Anti-Pilling Low Surface Fuzz' },
      { img: 'assets/products/01D/detail/11.jpg', title: '11 100% Breathable Combed Cotton', desc: '100% Long-Staple Breathable Combed Cotton' },
      { img: 'assets/products/01D/detail/12.jpg', title: '12 Pre-Shrunk Industrial Finish', desc: 'High-Temp Industrial Pre-Shrunk (< 2% Shrink)' }
    ];

    extraCraftHtml = `
      <div class="pdp-size-tables-card craft-card-01d">
        <div class="table-header">
          <span class="table-tag">FACTORY CRAFTSMANSHIP</span>
          <h4>Product Details &amp; Macro Fabric Craft (12 Core Specs)</h4>
          <p style="font-size: 11px; color: #64748b; margin-top: 3px;">20S Compact Siro-Spun 230 GSM Combed Cotton · Double-stitched high durability</p>
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
      'assets/products/01D/main/1.jpg',
      'assets/products/01D/main/2.jpg',
      'assets/products/01D/main/3.jpg',
      'assets/products/01D/main/4.jpg',
      'assets/products/01D/main/5.jpg',
      'assets/products/01D/main/6.jpg'
    ];
  } else if (prod.id === '360') {
    const craftDetails = [
      { img: 'assets/products/360/detail/detail_1.jpg', title: '01 Signature Studio Presentation', desc: 'Modern Relaxed Fit Silhouette on Natural Timber Hanger' },
      { img: 'assets/products/360/detail/detail_2.jpg', title: '02 Duo-Colorway Styling', desc: 'Soft Lotus Pink & Bamboo Sage Green Studio Pairing' },
      { img: 'assets/products/360/detail/detail_3.jpg', title: '03 Sorona® Agile Bio-Tech Collar', desc: 'Seamless Ergonomic Crewneck with Genuine Dupont Sorona® Agile Tag' },
      { img: 'assets/products/360/detail/detail_4.jpg', title: '04 Precision Twin-Needle Cuff', desc: 'Clean-Cut Parallel Twin-Stitch Hem for Long-Lasting Durability' },
      { img: 'assets/products/360/detail/detail_5.jpg', title: '05 Ice-Cool Combed Drape', desc: '32S Combed Cotton Blend with Instant Cool-Touch Sensation & Fluid Swirl Drape' },
      { img: 'assets/products/360/detail/detail_6.jpg', title: '06 Heavy-Duty Hem Construction', desc: 'Wave-Fold Reinforced Double-Needle Bottom Hem Resists Rolling & Curling' }
    ];

    extraCraftHtml = `
      <div class="pdp-size-tables-card craft-card-01d">
        <div class="table-header">
          <span class="table-tag">FACTORY CRAFTSMANSHIP</span>
          <h4>Product Details &amp; Macro Fabric Craft (6 Core Specs)</h4>
          <p style="font-size: 11px; color: #64748b; margin-top: 3px;">210 GSM 32S Sorona® Cooling Combed Cotton · Bio-tech elastic recovery &amp; ice-cool touch</p>
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
      'assets/products/360/main/1.jpg',
      'assets/products/360/main/2.jpg',
      'assets/products/360/main/3.jpg',
      'assets/products/360/main/4.jpg',
      'assets/products/360/detail/detail_1.jpg',
      'assets/products/360/detail/detail_2.jpg'
    ];
  } else if (prod.id === 'T012') {
    const craftDetails = [
      { img: 'assets/products/T012/detail/detail_1.jpg', title: '01 Contrast Raglan Neckline', desc: '3.0cm Bound Elastic Ribbed Collar with Contrast Sleeve Joining' },
      { img: 'assets/products/T012/detail/detail_2.jpg', title: '02 High-Density Ribbed Neckband', desc: 'Pre-Shrunk Ribbed Neckband with Back Collar Clean Bound Taping' },
      { img: 'assets/products/T012/detail/detail_3.jpg', title: '03 Precision Raglan Cuff Hem', desc: 'Twin-Needle Clean Edge Sleeve Cuffs with Contrast Overlock Stitching' },
      { img: 'assets/products/T012/detail/detail_4.jpg', title: '04 Heavyweight Bottom Hem', desc: 'Reinforced Parallel Double-Needle Bottom Hem Resists Rolling' },
      { img: 'assets/products/T012/detail/detail_5.jpg', title: '05 Contrast Raglan Shoulder Seam', desc: 'Ergonomic Diagonal Raglan Flatlock Seam for Mobility & Comfort' },
      { img: 'assets/products/T012/detail/detail_6.jpg', title: '06 100% Combed Cotton 240G', desc: '240 GSM 32S/2 Double-Yarn Heavyweight Knit with Crisp Structured Drape' },
      { img: 'assets/products/T012/detail/detail_7.jpg', title: '07 8 Contrast Colorways Selection', desc: 'Curated Streetwear Two-Tone Contrast Colorway Swatches' }
    ];

    extraCraftHtml = `
      <div class="pdp-size-tables-card craft-card-01d">
        <div class="table-header">
          <span class="table-tag">FACTORY CRAFTSMANSHIP</span>
          <h4>Product Details &amp; Macro Fabric Craft (7 Core Specs)</h4>
          <p style="font-size: 11px; color: #64748b; margin-top: 3px;">240 GSM 100% combed cotton · Double-stitched contrast raglan construction</p>
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
      'assets/products/T012/main/1.jpg',
      'assets/products/T012/main/2.jpg',
      'assets/products/T012/main/3.jpg',
      'assets/products/T012/main/4.jpg'
    ];
  } else if (prod.id === 'T040') {
    const craftDetails = [
      { img: 'assets/products/T040/detail/detail_1.jpg', title: '01 Anti', desc: '3.0cm Anti-Deformation High Rebound Ribbed Collar' },
      { img: 'assets/products/T040/detail/detail_2.jpg', title: '02 Reinforced Drop', desc: 'Reinforced Drop-Shoulder Structural Seams' },
      { img: 'assets/products/T040/detail/detail_3.jpg', title: '03 Twin', desc: 'Twin-Needle Clean Edge Lockstitching' },
      { img: 'assets/products/T040/detail/detail_4.jpg', title: '04 100% Combed Compact Cotton Wea', desc: '245 GSM 100% Combed Compact Cotton Weave' },
      { img: 'assets/products/T040/detail/detail_5.jpg', title: '05 Clean Collar', desc: 'Clean Collar-to-Shoulder Bound Taping & Overlock' },
      { img: 'assets/products/T040/detail/detail_6.jpg', title: '06 Pre', desc: 'Pre-Shrunk Ribbed Neckband - Anti-Bacon Collar' },
      { img: 'assets/products/T040/detail/detail_7.jpg', title: '07 Heavyweight Streetwear Boxy Na', desc: 'Heavyweight Streetwear Boxy Natural Drape' },
      { img: 'assets/products/T040/detail/detail_8.jpg', title: '08 Double', desc: 'Double-Yarn Combed Cotton Smooth Finish' }
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
      { img: 'assets/products/T235/detail/detail_1.jpg', title: '01 Double', desc: 'Double-Stitched Contrast Ribbed Collar & Raglan Join' },
      { img: 'assets/products/T235/detail/detail_2.jpg', title: '02 Clean Back Collar Bound Taping', desc: 'Clean Back Collar Bound Taping & Reinforced Seams' },
      { img: 'assets/products/T235/detail/detail_3.jpg', title: '03 Twin', desc: 'Twin-Needle Clean Edge Sleeve Cuffs (Fitted Openings)' },
      { img: 'assets/products/T235/detail/detail_4.jpg', title: '04 Heavyweight Cotton', desc: '235 GSM Heavyweight Cotton - Structured Anti-Wrinkle Drape' },
      { img: 'assets/products/T235/detail/detail_5.jpg', title: '05 100% Combed Cotton Tech Pack S', desc: '100% Combed Cotton Tech Pack Spec Label (Pre-Shrunk < 2%)' },
      { img: 'assets/products/T235/detail/detail_6.jpg', title: '06 Reinforced Bottom Hem Double', desc: 'Reinforced Bottom Hem Double-Needle Lockstitching' },
      { img: 'assets/products/T235/detail/detail_7.jpg', title: '07 Heavy Fabric Gauge Wave', desc: 'Heavy Fabric Gauge Wave & High Tensile Tear Resistance' },
      { img: 'assets/products/T235/detail/detail_8.jpg', title: '08 Double', desc: '32S/2 Double-Yarn Compact Combed Cotton Textile Weave' }
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
      { img: 'assets/products/T238/detail/detail_1.jpg', title: '01 High', desc: '3.5cm High-Density Rebound Elastic Ribbed Collar' },
      { img: 'assets/products/T238/detail/detail_2.jpg', title: '02 Collar', desc: 'Collar-to-Shoulder Reinforced Bound Taping' },
      { img: 'assets/products/T238/detail/detail_3.jpg', title: '03 Fitted 1x1 Ribbed Wrist Cuffs', desc: 'Fitted 1x1 Ribbed Wrist Cuffs - Anti-Deformation' },
      { img: 'assets/products/T238/detail/detail_4.jpg', title: '04 Combed Compact Cotton Heavywei', desc: '235 GSM Combed Compact Cotton Heavyweight Drape' },
      { img: 'assets/products/T238/detail/detail_5.jpg', title: '05 100% Combed Cotton Tech Pack S', desc: '100% Combed Cotton Tech Pack Spec Label (< 2% Shrink)' },
      { img: 'assets/products/T238/detail/detail_6.jpg', title: '06 Twin', desc: 'Twin-Needle Clean Edge Lockstitching & Side Seams' },
      { img: 'assets/products/T238/detail/detail_7.jpg', title: '07 Heavy Fabric Gauge Wave', desc: 'Heavy Fabric Gauge Wave & High Tensile Tear Resistance' },
      { img: 'assets/products/T238/detail/detail_8.jpg', title: '08 Double', desc: '32S/2 Double-Yarn Compact Combed Cotton Textile Weave' }
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
      { img: 'assets/products/T275/detail/detail_1.jpg', title: '01 Heavyweight Anti', desc: '3.2cm Heavyweight Anti-Deformation Rebound Ribbed Collar' },
      { img: 'assets/products/T275/detail/detail_2.jpg', title: '02 Collar', desc: 'Collar-to-Shoulder Clean Bound Taping & Reinforced Overlock' },
      { img: 'assets/products/T275/detail/detail_3.jpg', title: '03 Authentic 90s American Drop', desc: 'Authentic 90s American Drop-Shoulder Structural Silhouette' },
      { img: 'assets/products/T275/detail/detail_4.jpg', title: '04 Ultra', desc: '275 GSM Ultra-Heavy Combed Cotton - Structured Anti-Wrinkle Drape' },
      { img: 'assets/products/T275/detail/detail_5.jpg', title: '05 100% Combed Cotton Factory Tec', desc: '100% Combed Cotton Factory Tech Pack Spec Label (< 2% Shrink)' },
      { img: 'assets/products/T275/detail/detail_6.jpg', title: '06 Twin', desc: 'Twin-Needle Clean Edge Lockstitching & Reinforced Side Seams' },
      { img: 'assets/products/T275/detail/detail_7.jpg', title: '07 Heavy Gauge Compact Textile We', desc: 'Heavy Gauge Compact Textile Weave - High Tensile Tear Resistance' },
      { img: 'assets/products/T275/detail/detail_8.jpg', title: '08 Compact Double', desc: 'Compact Double-Yarn Combed Cotton Smooth Surface' }
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
      { img: 'assets/products/T276/detail/detail_1.jpg', title: '01 Heavyweight Anti', desc: '3.2cm Heavyweight Anti-Deformation Rebound Ribbed Collar' },
      { img: 'assets/products/T276/detail/detail_2.jpg', title: '02 Collar', desc: 'Collar-to-Shoulder Clean Bound Taping & Reinforced Overlock' },
      { img: 'assets/products/T276/detail/detail_3.jpg', title: '03 Fitted 1x1 Elastic Ribbed Wris', desc: 'Fitted 1x1 Elastic Ribbed Wrist Cuffs - Anti-Deformation' },
      { img: 'assets/products/T276/detail/detail_4.jpg', title: '04 Authentic 90s American Drop', desc: 'Authentic 90s American Drop-Shoulder Structural Silhouette' },
      { img: 'assets/products/T276/detail/detail_5.jpg', title: '05 Twin', desc: 'Twin-Needle Clean Edge Lockstitching & Reinforced Side Seams' },
      { img: 'assets/products/T276/detail/detail_6.jpg', title: '06 Ultra', desc: '275 GSM Ultra-Heavy Combed Cotton - Structured Anti-Wrinkle Drape' },
      { img: 'assets/products/T276/detail/detail_7.jpg', title: '07 Heavy Gauge Compact Textile We', desc: 'Heavy Gauge Compact Textile Weave - High Tensile Tear Resistance' },
      { img: 'assets/products/T276/detail/detail_8.jpg', title: '08 Compact Double', desc: 'Compact Double-Yarn Combed Cotton Smooth Surface' }
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
      { img: 'assets/products/T230/detail/detail_1.jpg', title: '01 Double', desc: 'Double-Stitched Ribbed Collar & Bound Back Taping' },
      { img: 'assets/products/T230/detail/detail_2.jpg', title: '02 Precision Twin', desc: 'Precision Twin-Needle Hem & Cuff Lockstitching' },
      { img: 'assets/products/T230/detail/detail_3.jpg', title: '03 21S Artisanal Mineral Dye', desc: '21S Artisanal Mineral Dye & Vintage Snow Acid Wash Technique' },
      { img: 'assets/products/T230/detail/detail_4.jpg', title: '04 100% Combed Compact Cotton Jer', desc: '230 GSM 100% Combed Compact Cotton Jersey Weave' },
      { img: 'assets/products/T230/detail/detail_5.jpg', title: '05 Relaxed Drop', desc: 'Relaxed Drop-Shoulder Silhouette & Natural Drape' },
      { img: 'assets/products/T230/detail/detail_6.jpg', title: '06 Factory MT', desc: 'Factory MT-2651 Production Spec & Certification Standard' }
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
      { img: 'assets/products/KB02/detail/1.jpg', title: '01 Heavy Antiqued Dual Metal Full', desc: 'Heavy Antiqued Dual Metal Full-Zip Placket with Vintage Patina' },
      { img: 'assets/products/KB02/detail/2.jpg', title: '02 Architectural Double', desc: 'Architectural Double-Layer Structured Hood with Deep Neck Overlock' },
      { img: 'assets/products/KB02/detail/3.jpg', title: '03 Heavy Knitted Denim', desc: '380 GSM Heavy Knitted Denim - 93.2% Cotton 6.8% Spandex Comfort Stretch' },
      { img: 'assets/products/KB02/detail/4.jpg', title: '04 Symmetrical Deep Split Kangaro', desc: 'Symmetrical Deep Split Kangaroo Hand Pockets & Bar-Tack Stitches' },
      { img: 'assets/products/KB02/detail/5.jpg', title: '05 90s Boxy Drop', desc: '90s Boxy Drop-Shoulder Silhouette & Relaxed Armhole Cut' },
      { img: 'assets/products/KB02/detail/6.jpg', title: '06 High', desc: 'High-Density 2x2 Ribbed Cuffs & Waistband - Anti-Deformation Rebound' },
      { img: 'assets/products/KB02/detail/7.jpg', title: '07 Artisanal Snow Dye', desc: 'Artisanal Snow Dye & Vintage Mineral Stone Acid Wash' },
      { img: 'assets/products/KB02/detail/8.jpg', title: '08 Factory Authentic Oversized Cu', desc: 'Factory Authentic Oversized Cut Tech Pack Standard Specification' }
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
      { img: 'assets/products/WY18/detail/3.jpg', title: '01 Brushed Thermal Expo Fleece', desc: '355 GSM Brushed Thermal Expo Fleece - Supreme Softness & Warmth' },
      { img: 'assets/products/WY18/detail/1.jpg', title: '02 Seamless Double', desc: 'Seamless Double-Stitched Front Kangaroo Pocket for Daily Utility' },
      { img: 'assets/products/WY18/detail/2.jpg', title: '03 Heavyweight Elastic Ribbed Cuf', desc: 'Heavyweight Elastic Ribbed Cuffs & Hem - Anti-Bacon Shape Retention' },
      { img: 'assets/products/WY18/detail/4.jpg', title: '04 Clean Minimalist Double Hood C', desc: 'Clean Minimalist Double Hood Construction with Interior Neck Taping' },
      { img: 'assets/products/WY18/detail/5.jpg', title: '05 Reinforced Twin', desc: 'Reinforced Twin-Needle Armhole Seams for Vintage Boxy Drape' },
      { img: 'assets/products/WY18/detail/6.jpg', title: '06 Artisanal Garment Snow Dye', desc: 'Artisanal Garment Snow Dye & Acid Mineral Tie-Wash Vintage Distress' }
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
      { img: 'assets/products/W350/detail/1.jpg', title: '01 Anti', desc: '3.0cm Anti-Deformation Bound Ribbed Crewneck & Reinforced Neckband' },
      { img: 'assets/products/W350/detail/2.jpg', title: '02 Interior Herringbone Back Coll', desc: 'Interior Herringbone Back Collar Taping & Precision Dual Lockstitch' },
      { img: 'assets/products/W350/detail/3.jpg', title: '03 High', desc: 'High-Elasticity 1×1 Ribbed Wrist Cuffs - Shape-Retention Rebound' },
      { img: 'assets/products/W350/detail/4.jpg', title: '04 90s Boxy Drop', desc: '90s Boxy Drop-Shoulder Silhouette with Twin-Needle Armhole Seams' },
      { img: 'assets/products/W350/detail/5.jpg', title: '05 Heavyweight Elastic Bottom Hem', desc: 'Heavyweight Elastic Bottom Hem Ribbing - Anti-Flaring Structured Drape' },
      { img: 'assets/products/W350/detail/6.jpg', title: '06 Combed Cotton Heavyweight Dens', desc: '350 GSM Combed Cotton Heavyweight Dense Knit - Crisp Surface Texture' },
      { img: 'assets/products/W350/detail/7.jpg', title: '07 Authentic Specification Neck L', desc: 'Authentic Specification Neck Label & Substantial Heavyweight Thickness' },
      { img: 'assets/products/W350/detail/8.jpg', title: '08 Ultra', desc: 'Ultra-Soft Brushed Thermal Fleece Lining - Premium Cold Weather Warmth' }
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
      { img: 'assets/products/W430/detail/1.jpg', title: '01 Anti', desc: '3.0cm Anti-Deformation Bound Ribbed Crewneck & Internal Neck Taping' },
      { img: 'assets/products/W430/detail/2.jpg', title: '02 Precision Double', desc: 'Precision Double-Needle Reinforced Drop-Shoulder Structural Seams' },
      { img: 'assets/products/W430/detail/3.jpg', title: '03 High', desc: 'High-Elasticity 1×1 Ribbed Wrist Cuffs - Anti-Deformation Rebound' },
      { img: 'assets/products/W430/detail/4.jpg', title: '04 Ergonomic Smooth Back Collar S', desc: 'Ergonomic Smooth Back Collar Seam & Clean Inside-Out Structure' },
      { img: 'assets/products/W430/detail/5.jpg', title: '05 Clean Overlock Bound Edge Fini', desc: 'Clean Overlock Bound Edge Finish & Durable High-Tensile Stitching' },
      { img: 'assets/products/W430/detail/6.jpg', title: '06 Combed Cotton Heavyweight Dens', desc: '430 GSM Combed Cotton Heavyweight Dense Knit - Smooth Silk-Touch Face' },
      { img: 'assets/products/W430/detail/7.jpg', title: '07 Retractable Bound Ribbed Hem', desc: 'Retractable Bound Ribbed Hem & Breathable French Terry Loopback Knit' },
      { img: 'assets/products/W430/detail/8.jpg', title: '08 Substantial Heavyweight Street', desc: 'Substantial Heavyweight Streetwear Drape - Natural Boxy Silhouette' }
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
  } else if (prod.id === 'W510') {
    const craftDetails = [
      { img: 'assets/products/W510/detail/1.jpg', title: '01 Ergonomic Anti', desc: '3.5cm Ergonomic Anti-Deformation Mock-Neck Ribbed Collar & Bound Taping' },
      { img: 'assets/products/W510/detail/2.jpg', title: '02 Ergonomic Smooth Back Collar S', desc: 'Ergonomic Smooth Back Collar Seam & Reinforced Drop-Shoulder Yoke' },
      { img: 'assets/products/W510/detail/3.jpg', title: '03 Precision Double', desc: 'Precision Double-Needle Side Ribbed Insert & Structural Bar-Tacking' },
      { img: 'assets/products/W510/detail/4.jpg', title: '04 High', desc: 'High-Density 1×1 Elastic Ribbed Cuffs with Maximum Shape Rebound' },
      { img: 'assets/products/W510/detail/5.jpg', title: '05 Clean Overlock Bound Edge Fini', desc: 'Clean Overlock Bound Edge Finish & Tapered Sleeve Construction' },
      { img: 'assets/products/W510/detail/6.jpg', title: '06 Heavy Combed Cotton Diagonal K', desc: '510 GSM Heavy Combed Cotton Diagonal Knit Face - Dense & Smooth' },
      { img: 'assets/products/W510/detail/7.jpg', title: '07 Ultra', desc: 'Ultra-Dense Thermal Fleece / Brushed Heat-Retention Interior' },
      { img: 'assets/products/W510/detail/8.jpg', title: '08 Authentic Factory Tech Spec Ne', desc: 'Authentic Factory Tech Spec Neck Label & Substantial Heavyweight Drape' }
    ];

    extraCraftHtml = `
      <div class="pdp-size-tables-card t040-craft-card">
        <div class="table-header">
          <span class="table-tag">FACTORY CRAFTSMANSHIP</span>
          <h4>Product Details &amp; Macro Fabric Craft (8 Core Specs)</h4>
          <p style="font-size: 11px; color: #64748b; margin-top: 3px;">510 GSM diagonal heavy knit, 3.5cm mock-neck ribbing, side ribbed inserts</p>
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
      'assets/products/W510/main/1.jpg',
      'assets/products/W510/main/2.jpg',
      'assets/products/W510/main/3.jpg',
      'assets/products/W510/main/4.jpg',
      'assets/products/W510/main/5.jpg',
      'assets/products/W510/main/6.jpg'
    ];
  } else if (prod.id === 'W352') {
    const craftDetails = [
      { img: 'assets/products/W352/detail/1.jpg', title: '01 Architectural Double', desc: 'Architectural Double-Layer Seamless Structured Hood & Crossover Neckline' },
      { img: 'assets/products/W352/detail/2.jpg', title: '02 Three', desc: 'Three-Piece Ergonomic Hood Construction & Reinforced Drop-Shoulder Yoke' },
      { img: 'assets/products/W352/detail/3.jpg', title: '03 Twin', desc: 'Twin-Needle Reinforced Kangaroo Pocket with Structural Bar-Tacking' },
      { img: 'assets/products/W352/detail/4.jpg', title: '04 1×1 High', desc: '1×1 High-Density Elastic Ribbed Cuffs with Maximum Shape Retention' },
      { img: 'assets/products/W352/detail/5.jpg', title: '05 Smooth Ergonomic Hand', desc: 'Smooth Ergonomic Hand-Warmer Pocket Opening & Overlock Seams' },
      { img: 'assets/products/W352/detail/6.jpg', title: '06 Heavyweight Elastic Bottom Hem', desc: 'Heavyweight Elastic Bottom Hem Ribbing - Anti-Flaring Windproof Fit' },
      { img: 'assets/products/W352/detail/7.jpg', title: '07 Combed Cotton Heavyweight Dens', desc: '350 GSM Combed Cotton Heavyweight Dense Knit - Anti-Pilling Smooth Face' },
      { img: 'assets/products/W352/detail/8.jpg', title: '08 Ultra', desc: 'Ultra-Soft Brushed Thermal Fleece Lining - Premium Cold-Weather Warmth' }
    ];

    extraCraftHtml = `
      <div class="pdp-size-tables-card t040-craft-card">
        <div class="table-header">
          <span class="table-tag">FACTORY CRAFTSMANSHIP</span>
          <h4>Product Details &amp; Macro Fabric Craft (8 Core Specs)</h4>
          <p style="font-size: 11px; color: #64748b; margin-top: 3px;">350 GSM thermal fleece, double-layer structured hood, reinforced kangaroo pocket</p>
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
      'assets/products/W352/main/1.jpg',
      'assets/products/W352/main/2.jpg',
      'assets/products/W352/main/3.jpg',
      'assets/products/W352/main/4.jpg',
      'assets/products/W352/main/5.jpg',
      'assets/products/W352/main/6.jpg'
    ];
  } else if (prod.id === 'W432') {
    const craftDetails = [
      { img: 'assets/products/W432/detail/1.jpg', title: '01 Architectural Double', desc: 'Architectural Double-Layer Seamless Structured Hood & Crossover Neckline' },
      { img: 'assets/products/W432/detail/2.jpg', title: '02 Three', desc: 'Three-Piece Ergonomic Hood Construction & Reinforced Drop-Shoulder Yoke' },
      { img: 'assets/products/W432/detail/3.jpg', title: '03 Twin', desc: 'Twin-Needle Reinforced Kangaroo Pocket with Structural Bar-Tacking' },
      { img: 'assets/products/W432/detail/4.jpg', title: '04 1×1 High', desc: '1×1 High-Density Elastic Ribbed Cuffs with Maximum Shape Retention' },
      { img: 'assets/products/W432/detail/5.jpg', title: '05 Smooth Ergonomic Hand', desc: 'Smooth Ergonomic Hand-Warmer Pocket Opening & Overlock Seams' },
      { img: 'assets/products/W432/detail/6.jpg', title: '06 Heavyweight Elastic Bottom Hem', desc: 'Heavyweight Elastic Bottom Hem Ribbing - Anti-Flaring Windproof Fit' },
      { img: 'assets/products/W432/detail/7.jpg', title: '07 Combed Cotton Heavyweight Dens', desc: '430 GSM Combed Cotton Heavyweight Dense Knit - Anti-Pilling Smooth Face' },
      { img: 'assets/products/W432/detail/8.jpg', title: '08 High', desc: 'High-Density Diagonal French Terry Loops - Breathable Structured Comfort' }
    ];

    extraCraftHtml = `
      <div class="pdp-size-tables-card t040-craft-card">
        <div class="table-header">
          <span class="table-tag">FACTORY CRAFTSMANSHIP</span>
          <h4>Product Details &amp; Macro Fabric Craft (8 Core Specs)</h4>
          <p style="font-size: 11px; color: #64748b; margin-top: 3px;">430 GSM French Terry, double-layer structured hood, reinforced kangaroo pocket</p>
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
      'assets/products/W432/main/1.jpg',
      'assets/products/W432/main/2.jpg',
      'assets/products/W432/main/3.jpg',
      'assets/products/W432/main/4.jpg',
      'assets/products/W432/main/5.jpg',
      'assets/products/W432/main/6.jpg'
    ];
  } else if (prod.id === 'W439') {
    const craftDetails = [
      { img: 'assets/products/W439/detail/1.jpg', title: '01 Ergonomic Stand', desc: 'Ergonomic Stand-Collar Half-Zip Metallic Zipper & Seamless Hood Construction' },
      { img: 'assets/products/W439/detail/2.jpg', title: '02 Architectural 3', desc: 'Architectural 3-Piece Structured Hood & Clean Drop-Shoulder Yoke' },
      { img: 'assets/products/W439/detail/3.jpg', title: '03 1×1 High', desc: '1×1 High-Density Elastic Ribbed Cuffs with Maximum Shape Rebound' },
      { img: 'assets/products/W439/detail/4.jpg', title: '04 Heavyweight Elastic Bottom Rib', desc: 'Heavyweight Elastic Bottom Ribbing - Anti-Flaring Windproof Fit' },
      { img: 'assets/products/W439/detail/5.jpg', title: '05 Precision Twin', desc: 'Precision Twin-Needle Reinforced Drop-Shoulder Armhole Seam' },
      { img: 'assets/products/W439/detail/6.jpg', title: '06 Ergonomic Hand', desc: 'Ergonomic Hand-Warmer Kangaroo Pocket with Bar-Tack Reinforcement' },
      { img: 'assets/products/W439/detail/7.jpg', title: '07 Combed Cotton Heavyweight Dens', desc: '430 GSM Combed Cotton Heavyweight Dense Knit - Smooth Face' },
      { img: 'assets/products/W439/detail/8.jpg', title: '08 Gently Brushed French Terry Br', desc: 'Gently Brushed French Terry Breathable Loop Interior' }
    ];

    extraCraftHtml = `
      <div class="pdp-size-tables-card t040-craft-card">
        <div class="table-header">
          <span class="table-tag">FACTORY CRAFTSMANSHIP</span>
          <h4>Product Details &amp; Macro Fabric Craft (8 Core Specs)</h4>
          <p style="font-size: 11px; color: #64748b; margin-top: 3px;">430 GSM French Terry, stand-collar half-zip metallic zipper, 3-piece structured hood</p>
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
      'assets/products/W439/main/1.jpg',
      'assets/products/W439/main/2.jpg',
      'assets/products/W439/main/3.jpg',
      'assets/products/W439/main/4.jpg',
      'assets/products/W439/main/5.jpg',
      'assets/products/W439/main/6.jpg'
    ];
  } else if (prod.detailImages && prod.detailImages.length > 0) {
    extraCraftHtml = `
      <div class="pdp-size-tables-card craft-card-01d">
        <div class="table-header">
          <span class="table-tag">FACTORY CRAFTSMANSHIP</span>
          <h4>Product Details &amp; Macro Fabric Craft (${prod.detailImages.length} Core Specs)</h4>
          <p style="font-size: 11px; color: #64748b; margin-top: 3px;">${prod.gram || 'Heavyweight Combed Cotton'} · Workshop Precision Construction</p>
        </div>
        <div class="macro-craft-grid">
          ${prod.detailImages.map((src, idx) => `
            <div class="macro-craft-item">
              <img src="${src}" alt="Detail ${idx + 1}" loading="lazy">
              <div class="macro-craft-caption">
                <strong>Craft Spec ${String(idx + 1).padStart(2, '0')}</strong>
                <small>Macro Fabric &amp; Workshop Finishing</small>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
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


    <!-- Extra Craft Details for T040, T230, T235, T238, T275, T276, KB02, WY18, W350, W352, W430, W432, W439 & W510 -->
    ${extraCraftHtml}

    <!-- Editorial Lookbook Gallery -->
    <div class="pdp-editorial-gallery">
      <div class="gallery-title-box">
        <span class="g-tag">LOOKBOOK GALLERY</span>
        <h3>${(prod.id === 'T040' || prod.id === 'T230' || prod.id === 'T235' || prod.id === 'T238' || prod.id === 'T275' || prod.id === 'T276' || prod.id === 'KB02' || prod.id === 'WY18' || prod.id === 'W350' || prod.id === 'W352' || prod.id === 'W430' || prod.id === 'W432' || prod.id === 'W439' || prod.id === 'W510') ? (prod.id === 'KB02' || prod.id === 'WY18' || prod.id === 'T230' || prod.id === 'W350' || prod.id === 'W352' || prod.id === 'W430' || prod.id === 'W432' || prod.id === 'W439' || prod.id === 'W510' ? 'Product Gallery &amp; Lookbook Showcase' : 'Editorial Street Lookbook (16 Shots)') : 'Product Details &amp; Macro Fabric Craft'}</h3>
        <p>${(prod.id === 'T040' || prod.id === 'T230' || prod.id === 'T235' || prod.id === 'T238' || prod.id === 'T275' || prod.id === 'T276' || prod.id === 'KB02' || prod.id === 'WY18' || prod.id === 'W350' || prod.id === 'W352' || prod.id === 'W430' || prod.id === 'W432' || prod.id === 'W439' || prod.id === 'W510') ? 'Full Streetwear Outfit On-Model Demonstrations &amp; Colorway Silhouettes' : 'High-density weave, reinforced seams, and colorfast reactive dye detail'}</p>
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

  document.querySelectorAll('.pdp-size-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.trim() === size);
  });

  document.querySelectorAll('.tiktok-size-tr').forEach(tr => {
    tr.classList.toggle('active-size-row', tr.getAttribute('data-row-size') === size);
  });
}

function addPdpToCart(productId) {
  const prod = PRODUCTS_DATA[productId || activePdpProductId];
  if (!prod) return;

  APP_STATE.cartItems.push({
    id: prod.id,
    name: prod.name,
    priceUSD: prod.priceUSD,
    qty: activePdpQty,
    size: activePdpSize || 'Standard',
    spec: `${prod.gram} · ${activePdpColor}`,
    img: prod.img
  });

  updateCartTotal();
  const sizeDesc = activePdpSize ? ` · ${activePdpSize}` : '';
  showToast(`Added ${activePdpQty}× [${prod.name}] (${activePdpColor}${sizeDesc}) to Sample RFQ Cart!`);
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
  if (!APP_STATE.cartItems || APP_STATE.cartItems.length === 0) {
    showToast('Your sample cart is empty. Please add garments from the catalog!');
    switchTab('catalog');
    return;
  }
  openCartCheckout();
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

// 17. Size Guide Modal Controls
function openSizeGuideModal() {
  const prod = PRODUCTS_DATA[activePdpProductId];
  if (!prod) return;

  const modal = document.getElementById('sizeGuideModal');
  const title = document.getElementById('sizeModalTitle');
  const imgGarment = document.getElementById('sizeModalImgGarment');
  const imgRecommend = document.getElementById('sizeModalImgRecommend');
  const btnGarment = document.getElementById('btnTabGarment');
  const btnRec = document.getElementById('btnTabRecommend');

  if (title) title.textContent = prod.name + ' - Sizing & Fit Guide';

  const container = document.querySelector('.size-modal-content-wrap');
  let tableWrap = document.getElementById('sizeModalTableWrap');

  if (prod.sizeTable) {
    if (btnGarment) btnGarment.style.display = 'none';
    if (btnRec) btnRec.style.display = 'none';
    if (!tableWrap && container) {
      tableWrap = document.createElement('div');
      tableWrap.id = 'sizeModalTableWrap';
      tableWrap.className = 'size-modal-table-wrap';
      container.insertBefore(tableWrap, container.firstChild);
    }
    if (tableWrap) {
      tableWrap.innerHTML = renderTikTokSizeTableHtml(prod.sizeTable, activePdpSize);
      tableWrap.style.display = 'block';
    }
    if (imgGarment) imgGarment.style.display = 'none';
    if (imgRecommend) imgRecommend.style.display = 'none';
  } else {
    if (tableWrap) tableWrap.style.display = 'none';
    if (imgGarment) imgGarment.src = prod.sizeChart || '';
    if (imgRecommend) imgRecommend.src = prod.sizeRecommend || '';

    if (btnGarment) {
      btnGarment.style.display = prod.sizeChart ? 'block' : 'none';
      btnGarment.innerHTML = prod.sizeRecommend ? '📐 Garment Dimensions (Garment Dimensions)' : '📐 Size & Fit Recommendations (Size &amp; Fit Guide)';
    }
    if (btnRec) btnRec.style.display = prod.sizeRecommend ? 'block' : 'none';

    if (prod.sizeChart) {
      switchSizeModalTab('garment');
    } else if (prod.sizeRecommend) {
      switchSizeModalTab('recommend');
    }
  }

  if (modal) modal.classList.add('open');
}

function closeSizeGuideModal() {
  const modal = document.getElementById('sizeGuideModal');
  if (modal) modal.classList.remove('open');
}

function switchSizeModalTab(tab) {
  const btnGarment = document.getElementById('btnTabGarment');
  const btnRec = document.getElementById('btnTabRecommend');
  const imgGarment = document.getElementById('sizeModalImgGarment');
  const imgRecommend = document.getElementById('sizeModalImgRecommend');

  if (tab === 'garment') {
    if (btnGarment) btnGarment.classList.add('active');
    if (btnRec) btnRec.classList.remove('active');
    if (imgGarment) imgGarment.style.display = 'block';
    if (imgRecommend) imgRecommend.style.display = 'none';
  } else {
    if (btnGarment) btnGarment.classList.remove('active');
    if (btnRec) btnRec.classList.add('active');
    if (imgGarment) imgGarment.style.display = 'none';
    if (imgRecommend) imgRecommend.style.display = 'block';
  }
}

// 22. Print Design Showcase Gallery & Modal Controllers (44 Production Styles)
let currentActivePrintFilter = 'all';
let currentSelectedPrint = null;

function openPrintGallery() {
  // Hide all tab pages
  document.querySelectorAll('.tab-page-content').forEach(p => p.style.display = 'none');
  
  // Show dedicated print gallery page
  const galleryPage = document.getElementById('printGalleryPage');
  if (galleryPage) {
    galleryPage.style.display = 'block';
  }
  
  // Clear active tab on bottom bar (so user knows they are inside sub-gallery)
  document.querySelectorAll('.tab-item').forEach(b => b.classList.remove('active'));
  const homeTabBtn = document.querySelector('.tab-item[data-tab="home"]');
  if (homeTabBtn) homeTabBtn.classList.add('active');

  const container = document.getElementById('appScrollContainer');
  if (container) container.scrollTop = 0;

  renderPrintGallery(currentActivePrintFilter);
}

function closePrintGallery() {
  switchTab('home');
}

function filterPrints(category) {
  renderPrintGallery();
}

function renderPrintGallery() {
  const grid = document.getElementById('printCardsGrid');
  if (!grid) return;

  const archive = (window.PRINTS_ARCHIVE_DATA && window.PRINTS_ARCHIVE_DATA.length > 0)
    ? window.PRINTS_ARCHIVE_DATA
    : [];

  grid.innerHTML = '';

  const countBadge = document.getElementById('printTotalCountBadge');
  if (countBadge) countBadge.textContent = `${archive.length} Production Styles`;
  const filterAll = document.getElementById('printFilterAllTag');
  if (filterAll) filterAll.textContent = `ALL ${archive.length} STYLES`;
  const homeCount = document.getElementById('homePrintCountTag');
  if (homeCount) homeCount.textContent = `${archive.length} EXCLUSIVE STYLES`;
  const ctaDesc = document.getElementById('printGalleryCtaDesc');
  if (ctaDesc) ctaDesc.textContent = `Select any of our ${archive.length} studio graphics or upload your custom vector files. 1-piece physical sample proofing ready in 48 hours.`;

  archive.forEach(p => {
    const card = document.createElement('div');
    card.className = 'print-card-item';
    card.onclick = () => openPrintDetail(p.id);

    const displayName = p.name || p.title || ('Style #' + p.code);
    const widthTag = p.width ? `<span class="pci-badge-width">${p.width}</span>` : '';

    card.innerHTML = `
      <div class="pci-thumb-box">
        ${widthTag}
        <img src="${p.img}" alt="${displayName}" loading="lazy">
      </div>
      <div class="pci-info">
        <span class="pci-code-pill">STYLE #${p.code}</span>
        <h4 class="pci-title">${displayName}</h4>
        <div class="pci-tap-zoom-hint">🔍 Tap to Zoom</div>
      </div>
    `;

    grid.appendChild(card);
  });
}

function openPrintDetail(printId) {
  const archive = window.PRINTS_ARCHIVE_DATA || [];
  const item = archive.find(p => p.id === printId) || archive[0];
  if (!item) return;

  currentSelectedPrint = item;

  const modal = document.getElementById('printDetailModal');
  const titleEl = document.getElementById('printDetailModalTitle');
  const codeEl = document.getElementById('printDetailCode');
  const widthEl = document.getElementById('printDetailWidth');
  const posEl = document.getElementById('printDetailPos');
  const imgEl = document.getElementById('printDetailImg');

  const displayName = item.name || item.title || ('Style #' + item.code);
  if (titleEl) titleEl.textContent = displayName;
  if (codeEl) codeEl.textContent = 'Style #' + item.code;
  if (widthEl) widthEl.textContent = (item.width || 'Standard') + ' Width';
  if (posEl) posEl.textContent = displayName;
  if (imgEl) imgEl.src = item.img;

  setPrintPreviewBg('white');

  if (modal) {
    modal.classList.add('open');
  }
}

function closePrintDetailModal() {
  const modal = document.getElementById('printDetailModal');
  if (modal) {
    modal.classList.remove('open');
  }
}

function setPrintPreviewBg(mode) {
  const stage = document.getElementById('printDetailStage');
  const btnWhite = document.getElementById('bgToggleWhite');
  const btnBlack = document.getElementById('bgToggleBlack');

  if (!stage) return;

  if (mode === 'black') {
    stage.classList.remove('bg-white-preview');
    stage.classList.add('bg-black-preview');
    if (btnBlack) btnBlack.classList.add('active');
    if (btnWhite) btnWhite.classList.remove('active');
  } else {
    stage.classList.remove('bg-black-preview');
    stage.classList.add('bg-white-preview');
    if (btnWhite) btnWhite.classList.add('active');
    if (btnBlack) btnBlack.classList.remove('active');
  }
}

function inquireSelectedPrint() {
  if (!currentSelectedPrint) {
    inquirePrintWhatsApp();
    return;
  }
  const text = `Hello DOZE OPO, I am interested in 1-piece sample proofing with Print Graphic ${currentSelectedPrint.title} (${currentSelectedPrint.width}) on your heavyweight blanks.`;
  const url = 'https://wa.me/8618520682738?text=' + encodeURIComponent(text);
  window.open(url, '_blank');
}

function openPrintShowcaseModal() {
  openPrintGallery();
}

function closePrintShowcaseModal() {
  const modal = document.getElementById('printShowcaseModal');
  if (modal) {
    modal.classList.remove('open');
  }
}

function inquirePrintWhatsApp() {
  const url = 'https://wa.me/8618520682738?text=' + encodeURIComponent('Hello DOZE OPO, I am interested in your Print Design Showcase graphics and 1-piece sample proofing on heavyweight blanks.');
  window.open(url, '_blank');
}

// ==========================================================================
// 19. PayPal Smart Payment Buttons & Direct Checkout System
// ==========================================================================
let CURRENT_CHECKOUT_CONFIG = null;

function openPdpCheckout(productId) {
  const prod = PRODUCTS_DATA[productId || activePdpProductId];
  if (!prod) return;

  const qty = Math.max(1, parseInt(activePdpQty) || 1);
  const color = activePdpColor || (prod.skus && prod.skus[0] ? prod.skus[0].name : 'Default');
  const size = activePdpSize || (prod.sizeTable && prod.sizeTable.rows && prod.sizeTable.rows[0] ? prod.sizeTable.rows[0].size : 'L');
  
  let thumb = prod.img;
  if (prod.skus && prod.skus.length > 0) {
    const matchedSku = prod.skus.find(s => s.name === color);
    if (matchedSku && matchedSku.thumb) thumb = matchedSku.thumb;
  }

  const subtotalUSD = prod.priceUSD * qty;
  const shippingUSD = calculateUsShipping(qty);

  CURRENT_CHECKOUT_CONFIG = {
    isCartCheckout: false,
    productId: prod.id,
    titleSummary: `${prod.name} (${color}, ${size})`,
    items: [{
      id: prod.id,
      name: prod.name,
      color: color,
      size: size,
      qty: qty,
      priceUSD: prod.priceUSD,
      thumb: thumb
    }],
    subtotalUSD: subtotalUSD,
    shippingUSD: shippingUSD
  };

  updateCheckoutModalUI();
  loadCustomerAddress();
  const modal = document.getElementById('paypalCheckoutModal');
  if (modal) modal.classList.add('open');
  renderPaypalButtons();
}

function openCartCheckout() {
  if (!APP_STATE.cartItems || APP_STATE.cartItems.length === 0) {
    showToast('Your sample cart is empty. Please add garments from the catalog!');
    switchTab('catalog');
    return;
  }

  let totalPieces = 0;
  let subtotalUSD = 0;
  const items = APP_STATE.cartItems.map(item => {
    const q = Math.max(1, parseInt(item.qty) || 1);
    totalPieces += q;
    subtotalUSD += item.priceUSD * q;
    return {
      id: item.id,
      name: item.name,
      color: item.spec || 'Standard',
      size: item.size || 'L',
      qty: q,
      priceUSD: item.priceUSD,
      thumb: item.img
    };
  });

  const shippingUSD = calculateUsShipping(totalPieces);

  CURRENT_CHECKOUT_CONFIG = {
    isCartCheckout: true,
    titleSummary: `${items.length} Sample Styles (${totalPieces} pcs)`,
    items: items,
    subtotalUSD: subtotalUSD,
    shippingUSD: shippingUSD
  };

  updateCheckoutModalUI();
  loadCustomerAddress();
  const modal = document.getElementById('paypalCheckoutModal');
  if (modal) modal.classList.add('open');
  renderPaypalButtons();
}

function updateCheckoutModalUI() {
  const cfg = CURRENT_CHECKOUT_CONFIG;
  if (!cfg) return;

  const container = document.getElementById('checkoutItemsPreview');
  const subtotalElem = document.getElementById('checkoutSubtotalDisplay');
  const shippingElem = document.getElementById('checkoutShippingDisplay');
  const totalElem = document.getElementById('checkoutTotalDisplay');
  const titleElem = document.getElementById('checkoutModalTitle');

  if (titleElem) {
    titleElem.textContent = cfg.isCartCheckout ? `Cart Sample Order (${cfg.items.length} Items)` : 'Express Sample Order';
  }

  if (container) {
    container.innerHTML = cfg.items.map((it) => `
      <div class="checkout-item-card">
        <img src="${it.thumb}" alt="${it.name}" class="checkout-item-thumb">
        <div class="checkout-item-info">
          <div class="checkout-item-title">${it.name}</div>
          <div class="checkout-item-meta">Size: <strong>${it.size}</strong> · Color: <strong>${it.color}</strong></div>
          <div class="checkout-item-price-row">
            <span class="checkout-item-price">$${it.priceUSD.toFixed(2)} USD</span>
            ${!cfg.isCartCheckout ? `
              <div class="checkout-qty-stepper">
                <button type="button" class="cq-step-btn" onclick="modifyCheckoutSingleQty(-1)">−</button>
                <span class="cq-step-num">${it.qty}</span>
                <button type="button" class="cq-step-btn" onclick="modifyCheckoutSingleQty(1)">+</button>
              </div>
            ` : `
              <span class="checkout-item-meta">Qty: <strong>${it.qty}</strong></span>
            `}
          </div>
        </div>
      </div>
    `).join('');
  }

  const totalUSD = cfg.subtotalUSD + cfg.shippingUSD;
  if (subtotalElem) subtotalElem.textContent = `$${cfg.subtotalUSD.toFixed(2)} USD`;
  if (shippingElem) shippingElem.textContent = `$${cfg.shippingUSD.toFixed(2)} USD`;
  if (totalElem) totalElem.textContent = `$${totalUSD.toFixed(2)} USD`;
}

function modifyCheckoutSingleQty(delta) {
  if (!CURRENT_CHECKOUT_CONFIG || CURRENT_CHECKOUT_CONFIG.isCartCheckout) return;
  const it = CURRENT_CHECKOUT_CONFIG.items[0];
  if (!it) return;

  const newQty = Math.max(1, it.qty + delta);
  if (newQty === it.qty) return;

  it.qty = newQty;
  activePdpQty = newQty;
  updatePdpShippingCalc();

  CURRENT_CHECKOUT_CONFIG.subtotalUSD = it.priceUSD * newQty;
  CURRENT_CHECKOUT_CONFIG.shippingUSD = calculateUsShipping(newQty);

  updateCheckoutModalUI();
  renderPaypalButtons();
}

function closePaypalCheckoutModal() {
  const modal = document.getElementById('paypalCheckoutModal');
  if (modal) modal.classList.remove('open');
}

function renderPaypalButtons() {
  const container = document.getElementById('paypalButtonsContainer');
  const loading = document.getElementById('paypalLoadingPlaceholder');
  if (!container) return;

  container.innerHTML = '';
  if (loading) {
    loading.style.display = 'flex';
    loading.innerHTML = '<span>Loading PayPal Secure Payment...</span>';
  }

  if (typeof paypal === 'undefined' || !paypal.Buttons) {
    if (loading) {
      loading.innerHTML = '<span>PayPal SDK connecting... If blocked, please check your network or WhatsApp us directly.</span>';
    }
    return;
  }

  try {
    paypal.Buttons({
      style: {
        layout: 'vertical',
        color: 'gold',
        shape: 'rect',
        label: 'checkout',
        height: 48
      },
      createOrder: function(data, actions) {
        const cfg = CURRENT_CHECKOUT_CONFIG;
        const subtotal = parseFloat(cfg.subtotalUSD.toFixed(2));
        const shipping = parseFloat(cfg.shippingUSD.toFixed(2));
        const total = parseFloat((subtotal + shipping).toFixed(2));

        const addr = getCustomerAddress();
        saveCustomerAddress();

        const purchaseUnit = {
          description: `DOZE OPO Garment Sample: ${cfg.titleSummary}`.substring(0, 127),
          amount: {
            currency_code: 'USD',
            value: total.toFixed(2),
            breakdown: {
              item_total: {
                currency_code: 'USD',
                value: subtotal.toFixed(2)
              },
              shipping: {
                currency_code: 'USD',
                value: shipping.toFixed(2)
              }
            }
          },
          items: cfg.items.map(it => ({
            name: `${it.name} (${it.size}, ${it.color})`.substring(0, 127),
            unit_amount: {
              currency_code: 'USD',
              value: parseFloat(it.priceUSD).toFixed(2)
            },
            quantity: it.qty.toString(),
            category: 'PHYSICAL_GOODS'
          }))
        };

        if (addr.name && addr.address && addr.city) {
          purchaseUnit.shipping = {
            name: { full_name: addr.name },
            address: {
              address_line_1: addr.address,
              address_line_2: addr.address2 || undefined,
              admin_area_2: addr.city,
              admin_area_1: addr.state || '',
              postal_code: addr.zip || '',
              country_code: addr.country === 'GLOBAL' ? 'US' : addr.country
            }
          };
        }

        return actions.order.create({
          purchase_units: [purchaseUnit]
        });
      },
      onApprove: function(data, actions) {
        return actions.order.capture().then(function(details) {
          handleOrderSuccess(details, CURRENT_CHECKOUT_CONFIG);
        });
      },
      onError: function(err) {
        console.error('PayPal Checkout error:', err);
        showToast('Payment processing was cancelled or encountered an error. Please try again.');
      }
    }).render('#paypalButtonsContainer').then(function() {
      if (loading) loading.style.display = 'none';
    }).catch(function(err) {
      console.error('PayPal render error:', err);
      if (loading) loading.innerHTML = '<span>Failed to render PayPal buttons. Please try again or WhatsApp us.</span>';
    });
  } catch (err) {
    console.error('PayPal error:', err);
    if (loading) loading.innerHTML = '<span>Error initializing PayPal buttons.</span>';
  }
}

function handleOrderSuccess(details, cfg) {
  closePaypalCheckoutModal();

  const addr = getCustomerAddress();
  const orderId = 'DOZE-' + Math.floor(100000 + Math.random() * 900000);
  const paypalTxId = details.id || 'N/A';
  const payerName = addr.name || ((details.payer && details.payer.name) 
    ? `${details.payer.name.given_name || ''} ${details.payer.name.surname || ''}`.trim() 
    : 'Valued Client');
  const payerEmail = addr.email || ((details.payer && details.payer.email_address) ? details.payer.email_address : 'PayPal Checkout Account');
  const payerPhone = addr.phone || '';
  
  let shippingAddr = '';
  if (addr.address) {
    shippingAddr = [addr.address, addr.address2, addr.city, addr.state, addr.zip, addr.country].filter(Boolean).join(', ');
    if (payerPhone) shippingAddr += ` | Tel: ${payerPhone}`;
  } else if (details.purchase_units && details.purchase_units[0] && details.purchase_units[0].shipping && details.purchase_units[0].shipping.address) {
    const a = details.purchase_units[0].shipping.address;
    shippingAddr = [a.address_line_1, a.address_line_2, a.admin_area_2, a.admin_area_1, a.postal_code, a.country_code].filter(Boolean).join(', ');
  } else {
    shippingAddr = 'Address recorded on PayPal receipt';
  }

  const totalUSD = cfg.subtotalUSD + cfg.shippingUSD;
  const orderRecord = {
    orderId: orderId,
    paypalTxId: paypalTxId,
    createdAt: new Date().toISOString(),
    payerName: payerName,
    payerEmail: payerEmail,
    shippingAddress: shippingAddr,
    items: cfg.items,
    subtotalUSD: cfg.subtotalUSD,
    shippingUSD: cfg.shippingUSD,
    totalUSD: totalUSD,
    status: 'Paid · In Production Queue'
  };

  try {
    const saved = JSON.parse(localStorage.getItem('DOZE_OPO_ORDERS') || '[]');
    saved.unshift(orderRecord);
    localStorage.setItem('DOZE_OPO_ORDERS', JSON.stringify(saved));
  } catch (e) {
    console.error('Failed to save order to localStorage', e);
  }

  if (cfg.isCartCheckout) {
    APP_STATE.cartItems = [];
    updateCartTotal();
  }

  const receipt = document.getElementById('orderSuccessReceipt');
  if (receipt) {
    receipt.innerHTML = `
      <div class="receipt-row">
        <span class="rc-label">Order Ref:</span>
        <strong class="rc-val">${orderId}</strong>
      </div>
      <div class="receipt-row">
        <span class="rc-label">PayPal TXID:</span>
        <span class="rc-val">${paypalTxId}</span>
      </div>
      <div class="receipt-row">
        <span class="rc-label">Recipient:</span>
        <span class="rc-val">${payerName} (${payerEmail})</span>
      </div>
      <div class="receipt-row">
        <span class="rc-label">Ship To:</span>
        <span class="rc-val">${shippingAddr}</span>
      </div>
      <div class="receipt-divider"></div>
      <div class="receipt-items-list">
        ${cfg.items.map(it => `
          <div class="receipt-item-row">
            <span>${it.qty}× ${it.name} (${it.size}, ${it.color})</span>
            <strong>$${(it.priceUSD * it.qty).toFixed(2)}</strong>
          </div>
        `).join('')}
      </div>
      <div class="receipt-divider"></div>
      <div class="receipt-row receipt-total-row">
        <span>Total Paid Delivered:</span>
        <strong style="color: #c2410c; font-size: 14px;">$${totalUSD.toFixed(2)} USD</strong>
      </div>
    `;
  }

  const waBtn = document.getElementById('orderSuccessWaLink');
  if (waBtn) {
    const msg = encodeURIComponent(`Hello DOZE OPO! I have paid for Sample Order ${orderId} via PayPal (TX: ${paypalTxId}). Items: ${cfg.titleSummary}. Please confirm proofing and tracking.`);
    waBtn.href = `https://wa.me/8618520682738?text=${msg}`;
  }

  openOrderSuccessModal();
}

function openOrderSuccessModal() {
  const modal = document.getElementById('orderSuccessModal');
  if (modal) modal.classList.add('open');
}

function closeOrderSuccessModal() {
  const modal = document.getElementById('orderSuccessModal');
  if (modal) modal.classList.remove('open');
}

function openOrdersTrackingModal() {
  const modal = document.getElementById('ordersTrackingModal');
  const container = document.getElementById('ordersTrackingList');
  if (!modal || !container) return;

  let orders = [];
  try {
    orders = JSON.parse(localStorage.getItem('DOZE_OPO_ORDERS') || '[]');
  } catch (e) {
    orders = [];
  }

  if (orders.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 30px 10px; color: #64748b;">
        <div style="font-size: 32px; margin-bottom: 8px;">📦</div>
        <h4 style="color: #0f172a; margin-bottom: 4px;">No Orders Placed Yet</h4>
        <p style="font-size: 12px; margin-bottom: 16px;">When you place sample orders via PayPal, your tracking details and receipts will appear here.</p>
        <button type="button" class="btn-wa-direct" onclick="closeOrdersTrackingModal(); switchTab('catalog');">
          Browse Garment Catalog
        </button>
      </div>
    `;
  } else {
    container.innerHTML = orders.map(ord => {
      const dateStr = new Date(ord.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const itemsDesc = (ord.items || []).map(i => `${i.qty}× ${i.name} (${i.size}, ${i.color})`).join('; ');
      const waTrackMsg = encodeURIComponent(`Hello DOZE OPO, I would like to check the express tracking status for Order ${ord.orderId} (PayPal: ${ord.paypalTxId}).`);
      return `
        <div class="order-track-card">
          <div class="order-track-header">
            <strong>${ord.orderId}</strong>
            <span class="order-track-badge">${ord.status}</span>
          </div>
          <div style="font-size: 11px; color: #64748b;">Date: ${dateStr} · PayPal: ${ord.paypalTxId}</div>
          <div style="font-size: 11.5px; color: #0f172a; margin: 4px 0;"><strong>Items:</strong> ${itemsDesc}</div>
          <div style="font-size: 11px; color: #475569;"><strong>Deliver To:</strong> ${ord.shippingAddress}</div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px; padding-top: 6px; border-top: 1px dashed #e2e8f0;">
            <strong style="color: #c2410c;">Total: $${parseFloat(ord.totalUSD).toFixed(2)} USD</strong>
            <a href="https://wa.me/8618520682738?text=${waTrackMsg}" target="_blank" style="font-size: 11px; font-weight: 700; color: #0284c7; text-decoration: none;">
              💬 Inquire Tracking ➔
            </a>
          </div>
        </div>
      `;
    }).join('');
  }

  modal.classList.add('open');
}

function closeOrdersTrackingModal() {
  const modal = document.getElementById('ordersTrackingModal');
  if (modal) modal.classList.remove('open');
}

function inquireCheckoutViaWhatsApp() {
  if (!CURRENT_CHECKOUT_CONFIG) {
    openWhatsAppModal();
    return;
  }
  const cfg = CURRENT_CHECKOUT_CONFIG;
  const text = `Hello DOZE OPO, I am inquiring about ordering samples for: ${cfg.titleSummary}. Total Delivered: $${(cfg.subtotalUSD + cfg.shippingUSD).toFixed(2)} USD. Could you please provide bulk OEM proofing details?`;
  const url = 'https://wa.me/8618520682738?text=' + encodeURIComponent(text);
  window.open(url, '_blank');
}

// 20. Customer Delivery Address Management & Persistence
function loadCustomerAddress() {
  try {
    const raw = localStorage.getItem('DOZE_CUSTOMER_ADDRESS');
    if (!raw) return;
    const a = JSON.parse(raw);
    if (a.name && document.getElementById('shipName')) document.getElementById('shipName').value = a.name;
    if (a.email && document.getElementById('shipEmail')) document.getElementById('shipEmail').value = a.email;
    if (a.phone && document.getElementById('shipPhone')) document.getElementById('shipPhone').value = a.phone;
    if (a.address && document.getElementById('shipAddress')) document.getElementById('shipAddress').value = a.address;
    if (a.address2 && document.getElementById('shipAddress2')) document.getElementById('shipAddress2').value = a.address2;
    if (a.city && document.getElementById('shipCity')) document.getElementById('shipCity').value = a.city;
    if (a.state && document.getElementById('shipState')) document.getElementById('shipState').value = a.state;
    if (a.zip && document.getElementById('shipZip')) document.getElementById('shipZip').value = a.zip;
    if (a.country && document.getElementById('shipCountry')) document.getElementById('shipCountry').value = a.country;
  } catch (e) {
    console.error('Failed to load address', e);
  }
}

function saveCustomerAddress() {
  try {
    const a = {
      name: document.getElementById('shipName')?.value.trim() || '',
      email: document.getElementById('shipEmail')?.value.trim() || '',
      phone: document.getElementById('shipPhone')?.value.trim() || '',
      address: document.getElementById('shipAddress')?.value.trim() || '',
      address2: document.getElementById('shipAddress2')?.value.trim() || '',
      city: document.getElementById('shipCity')?.value.trim() || '',
      state: document.getElementById('shipState')?.value.trim() || '',
      zip: document.getElementById('shipZip')?.value.trim() || '',
      country: document.getElementById('shipCountry')?.value || 'US'
    };
    localStorage.setItem('DOZE_CUSTOMER_ADDRESS', JSON.stringify(a));
  } catch (e) {
    console.error('Failed to save address', e);
  }
}

function getCustomerAddress() {
  return {
    name: document.getElementById('shipName')?.value.trim() || '',
    email: document.getElementById('shipEmail')?.value.trim() || '',
    phone: document.getElementById('shipPhone')?.value.trim() || '',
    address: document.getElementById('shipAddress')?.value.trim() || '',
    address2: document.getElementById('shipAddress2')?.value.trim() || '',
    city: document.getElementById('shipCity')?.value.trim() || '',
    state: document.getElementById('shipState')?.value.trim() || '',
    zip: document.getElementById('shipZip')?.value.trim() || '',
    country: document.getElementById('shipCountry')?.value || 'US'
  };
}