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
  window.PRODUCTS_DATA = {
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

  // Gallery thumbs (Includes main photos PLUS authentic Size Chart & Recommendation if configured)
  const thumbStrip = document.getElementById('pdpThumbStrip');
  const baseGallery = (prod.gallery && prod.gallery.length > 0) ? [...prod.gallery] : (prod.skus ? prod.skus.map(s => s.hero).slice(0, 4) : [prod.img]);
  const galleryItems = baseGallery.map(img => ({ src: img, isChart: false, label: '' }));
  if (prod.sizeChart) {
    galleryItems.push({ src: prod.sizeChart, isChart: true, label: '📏 Size'});
  }
  if (prod.sizeRecommend) {
    galleryItems.push({ src: prod.sizeRecommend, isChart: true, label: '📐 Guide'});
  }
  const gallery = galleryItems.map(g => g.src);

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
    if (prod.sizeChart || prod.sizeRecommend) {
      if (sizeGuideBtn) sizeGuideBtn.style.display = 'inline-flex';
      if (sizePreviewBox) {
        sizePreviewBox.innerHTML = `
          <div class="pdp-size-mini-box" onclick="openSizeGuideModal()">
            <div class="pdp-size-mini-header">
              <span class="pdp-size-mini-title">📏 官方实测尺寸表 &amp; 试穿建议</span>
              <span class="pdp-size-mini-badge">点击放大原图 🔍</span>
            </div>
            <div class="pdp-size-mini-thumbs">
              ${prod.sizeChart ? `
                <div class="pdp-mini-thumb-item">
                  <img src="${prod.sizeChart}" alt="成衣尺寸测量表">
                  <span>📐 成衣精确尺寸表</span>
                </div>` : ''}
              ${prod.sizeRecommend ? `
                <div class="pdp-mini-thumb-item">
                  <img src="${prod.sizeRecommend}" alt="身高体重推荐表">
                  <span>👤 身高体重推荐表</span>
                </div>` : ''}
            </div>
            <div class="pdp-mini-zoom-hint">点击卡片任意处或右上角【尺码表】即可弹窗全屏查看高清大图</div>
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

  // Lookbook and Details
  let extraCraftHtml = '';
  // Dynamically render size guide section if product has size charts configured
  let sizeGuideSectionHtml = '';
  if (prod.sizeChart || prod.sizeRecommend) {
    sizeGuideSectionHtml = `
      <div class="pdp-lookbook-section">
        <div class="pdp-lookbook-header">
          <span class="lb-tag">SIZING GUIDE</span>
          <h3>Size Chart &amp; Fit Recommendations</h3>
        </div>
        ${prod.sizeChart ? `<img src="${prod.sizeChart}" alt="${prod.name} Size Chart &amp; Model Sizing" class="pdp-lb-img">` : ''}
        ${prod.sizeRecommend ? `<img src="${prod.sizeRecommend}" alt="${prod.name} Height &amp; Weight Size Recommendations" class="pdp-lb-img">` : ''}
      </div>
    `;
  }
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
  } else if (prod.id === 'W510') {
    const craftDetails = [
      { img: 'assets/products/W510/detail/1.jpg', title: '01 3.5cm微高领领口', desc: '3.5cm Ergonomic Anti-Deformation Mock-Neck Ribbed Collar & Bound Taping' },
      { img: 'assets/products/W510/detail/2.jpg', title: '02 平整后领背线结构', desc: 'Ergonomic Smooth Back Collar Seam & Reinforced Drop-Shoulder Yoke' },
      { img: 'assets/products/W510/detail/3.jpg', title: '03 侧缝加固受力结构', desc: 'Precision Double-Needle Side Ribbed Insert & Structural Bar-Tacking' },
      { img: 'assets/products/W510/detail/4.jpg', title: '04 1×1高密抗变形袖口', desc: 'High-Density 1×1 Elastic Ribbed Cuffs with Maximum Shape Rebound' },
      { img: 'assets/products/W510/detail/5.jpg', title: '05 袖口精工拷边收口', desc: 'Clean Overlock Bound Edge Finish & Tapered Sleeve Construction' },
      { img: 'assets/products/W510/detail/6.jpg', title: '06 510G重磅斜纹面层', desc: '510 GSM Heavy Combed Cotton Diagonal Knit Face - Dense & Smooth' },
      { img: 'assets/products/W510/detail/7.jpg', title: '07 细腻蓄热保暖内里', desc: 'Ultra-Dense Thermal Fleece / Brushed Heat-Retention Interior' },
      { img: 'assets/products/W510/detail/8.jpg', title: '08 定制规格领标与厚度', desc: 'Authentic Factory Tech Spec Neck Label & Substantial Heavyweight Drape' }
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
      { img: 'assets/products/W352/detail/1.jpg', title: '01 双层加厚立体连帽', desc: 'Architectural Double-Layer Seamless Structured Hood & Crossover Neckline' },
      { img: 'assets/products/W352/detail/2.jpg', title: '02 三片式立体帽型与后领拼缝', desc: 'Three-Piece Ergonomic Hood Construction & Reinforced Drop-Shoulder Yoke' },
      { img: 'assets/products/W352/detail/3.jpg', title: '03 袋鼠插袋双针压线加固', desc: 'Twin-Needle Reinforced Kangaroo Pocket with Structural Bar-Tacking' },
      { img: 'assets/products/W352/detail/4.jpg', title: '04 1×1高密抗变形紧致袖口', desc: '1×1 High-Density Elastic Ribbed Cuffs with Maximum Shape Retention' },
      { img: 'assets/products/W352/detail/5.jpg', title: '05 弧形袋口细腻拷边做工', desc: 'Smooth Ergonomic Hand-Warmer Pocket Opening & Overlock Seams' },
      { img: 'assets/products/W352/detail/6.jpg', title: '06 下摆高弹罗纹收紧防风', desc: 'Heavyweight Elastic Bottom Hem Ribbing - Anti-Flaring Windproof Fit' },
      { img: 'assets/products/W352/detail/7.jpg', title: '07 350G精梳紧密棉平整面层', desc: '350 GSM Combed Cotton Heavyweight Dense Knit - Anti-Pilling Smooth Face' },
      { img: 'assets/products/W352/detail/8.jpg', title: '08 细腻磨毛蓄热保暖加绒内里', desc: 'Ultra-Soft Brushed Thermal Fleece Lining - Premium Cold-Weather Warmth' }
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
      { img: 'assets/products/W432/detail/1.jpg', title: '01 双层加厚立体连帽', desc: 'Architectural Double-Layer Seamless Structured Hood & Crossover Neckline' },
      { img: 'assets/products/W432/detail/2.jpg', title: '02 三片式立体帽型与后领拼缝', desc: 'Three-Piece Ergonomic Hood Construction & Reinforced Drop-Shoulder Yoke' },
      { img: 'assets/products/W432/detail/3.jpg', title: '03 袋鼠插袋双针压线加固', desc: 'Twin-Needle Reinforced Kangaroo Pocket with Structural Bar-Tacking' },
      { img: 'assets/products/W432/detail/4.jpg', title: '04 1×1高密抗变形紧致袖口', desc: '1×1 High-Density Elastic Ribbed Cuffs with Maximum Shape Retention' },
      { img: 'assets/products/W432/detail/5.jpg', title: '05 弧形袋口细腻拷边做工', desc: 'Smooth Ergonomic Hand-Warmer Pocket Opening & Overlock Seams' },
      { img: 'assets/products/W432/detail/6.jpg', title: '06 下摆高弹罗纹收紧防风', desc: 'Heavyweight Elastic Bottom Hem Ribbing - Anti-Flaring Windproof Fit' },
      { img: 'assets/products/W432/detail/7.jpg', title: '07 430G精梳紧密棉平整面层', desc: '430 GSM Combed Cotton Heavyweight Dense Knit - Anti-Pilling Smooth Face' },
      { img: 'assets/products/W432/detail/8.jpg', title: '08 细腻紧实斜纹毛圈内里', desc: 'High-Density Diagonal French Terry Loops - Breathable Structured Comfort' }
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
      { img: 'assets/products/W439/detail/1.jpg', title: '01 立领半拉链金属拉链', desc: 'Ergonomic Stand-Collar Half-Zip Metallic Zipper & Seamless Hood Construction' },
      { img: 'assets/products/W439/detail/2.jpg', title: '02 立体连帽与落肩拼接', desc: 'Architectural 3-Piece Structured Hood & Clean Drop-Shoulder Yoke' },
      { img: 'assets/products/W439/detail/3.jpg', title: '03 1×1高弹抗变形紧致袖口', desc: '1×1 High-Density Elastic Ribbed Cuffs with Maximum Shape Rebound' },
      { img: 'assets/products/W439/detail/4.jpg', title: '04 下摆高弹罗纹收口', desc: 'Heavyweight Elastic Bottom Ribbing - Anti-Flaring Windproof Fit' },
      { img: 'assets/products/W439/detail/5.jpg', title: '05 双针压线加固落肩袖笼', desc: 'Precision Twin-Needle Reinforced Drop-Shoulder Armhole Seam' },
      { img: 'assets/products/W439/detail/6.jpg', title: '06 袋鼠插袋双针加固拷边', desc: 'Ergonomic Hand-Warmer Kangaroo Pocket with Bar-Tack Reinforcement' },
      { img: 'assets/products/W439/detail/7.jpg', title: '07 430G重磅紧密纯棉面层', desc: '430 GSM Combed Cotton Heavyweight Dense Knit - Smooth Face' },
      { img: 'assets/products/W439/detail/8.jpg', title: '08 细腻轻刷毛圈舒适内里', desc: 'Gently Brushed French Terry Breathable Loop Interior' }
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

    <!-- Sizing Guide (Only for T040) -->
    ${sizeGuideSectionHtml}

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

  if (title) title.textContent = prod.name + ' - 真实尺码与试穿指南 (Size Guide)';
  if (imgGarment) imgGarment.src = prod.sizeChart || '';
  if (imgRecommend) imgRecommend.src = prod.sizeRecommend || '';

  if (btnGarment) btnGarment.style.display = prod.sizeChart ? 'block' : 'none';
  if (btnRec) btnRec.style.display = prod.sizeRecommend ? 'block' : 'none';

  if (prod.sizeChart) {
    switchSizeModalTab('garment');
  } else if (prod.sizeRecommend) {
    switchSizeModalTab('recommend');
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