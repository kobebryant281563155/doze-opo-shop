# DOZE OPO Product Upload SOP & Rules

This document records the mandatory standard operating procedure (SOP) for uploading new apparel products from the user's desktop folders (`C:\Users\Jackie-Zhang\Desktop\AI_Model_Photos\...`) to `www.dozeopo.com`.

---

## 1. Zero Legacy Assets & Strict Scope
- **Strict Isolation**: Use ONLY files inside the specific folder provided by the user.
- **NEVER** re-introduce old model try-on cards (e.g., Denis, Karen, ZEE) or static legacy size chart PNGs.
- **100% US English**: Absolutely zero Chinese characters across `products_data.js`, `app.js`, and `index.html`. Always verify with `scratch/check_chinese.ps1`.

---

## 2. Standard Folder Intake & Asset Pipeline
For any given product folder (e.g., `01D`, `360`, `T012-240G`, etc.):

| Folder Content | Target Location | Data Mapping (`products_data.js`) | Display Location on PDP |
|---|---|---|---|
| `主图` (Main Photos) | `assets/products/<STYLE_ID>/main/` | `gallery: [...]`, `img: "assets/products/<STYLE_ID>/main/1.jpg"` | Hero gallery swiper & lookbook |
| `SKU` (Colorways) | `assets/products/<STYLE_ID>/sku/` | `skus: [{ name, thumb, hero }]` | Color swatch grid with interactive image preview |
| `详情页` (Detail Photos) | `assets/products/<STYLE_ID>/detail/` | `detailImages: [...]` | Factory Craftsmanship macro specs grid |
| `尺寸.xlsx` (Size Sheet) | Parse via XML/Zip | `sizeTable: { columns, rows }` | Interactive TikTok Shop size table with `cm`/`in` toggle |
| `标题.txt` (Title/Specs) | Translated to English | `name`, `gram`, `specs: [...]`, `priceUSD` | Title, gram tag, feature badges, designer note card |

---

## 3. TikTok Shop Size Table Standard
- Each product must feature the interactive TikTok Shop size table:
  - Unit toggle: dynamic `[cm | in]` conversion (dividing cm by 2.54 for inches).
  - Clickable size rows: clicking a row highlights that row and selects that size.
  - Sizing columns: Length, Bust/Chest, Shoulder/Sleeve, Recommended Height, Recommended Weight.

---

## 4. Code & Deployment Workflow
1. **Asset Processing**: Optimize & compress images into `assets/products/<STYLE_ID>/`.
2. **Product Data**: Append the product entry to `window.PRODUCTS_DATA` in `products_data.js`.
3. **Verify Integrity**:
   - Check `baseGallery` and ensure no unhandled exceptions in `openProductDetail` / `renderDynamicLookbook`.
   - Run `check_chinese.ps1` to ensure 0 Chinese characters.
4. **Cache Invalidation**: Bump `v=XXX` query string in `index.html` on script tags.
5. **Git Push & Verification**:
   - Push to `origin/main`.
   - Run `scratch/check_build.ps1` to verify GitHub Pages build completes (`status: "built"`).

---

## 5. Private Workflow Sync & Strict Privacy Rule
- **Mandatory Auto-Sync**:
  - Whenever any tool, workflow step, scraper, sender, or shortcut is modified or added in `tools/`, the agent must execute `tools/sync_workflow_to_github.py` or run `d:\doze-opo-workflow-backup` git push to sync modifications to the private repository.
  - Always verify that the destination repository visibility remains `private` before pushing.

---

## 6. SDR Workflow Strategic Roadmap & 1000-Lead Milestone Trigger
- **Strategy & Blueprint Reference**: Detailed multi-phase SDR upgrades and cadence rules are maintained in `tools/STRATEGY_ROADMAP.md`.
- **1000-Lead Milestone Reminder**:
  - Whenever the agent inspects or runs the workflow and detects that total deduplicated customer leads across desktop Excel files or cumulative touches reach **1000+**, the agent **MUST automatically notify and remind the user** to initiate Phase 2 upgrades (Waterfall Enrichment cross-channel phone/email extraction, Cross-Channel Cadence multi-touch sequencing, and Unified Reply Circuit Breaker).

---

## 7. Dual-Screen (Mobile & PC Desktop) Synchronization Standard
- **Zero Redundancy**: All product data ([products_data.js](file:///d:/doze-opo-shop/products_data.js)), print data ([prints_data.js](file:///d:/doze-opo-shop/prints_data.js)), and business logic ([app.js](file:///d:/doze-opo-shop/app.js)) remain strictly single-sourced.
- **Synchronous Dual-Screen Optimization**:
  - Any new feature, layout modification, component addition, or CSS update **MUST** be styled and validated for both:
    1. **Mobile Viewport** (`< 768px`): Compact, touch-friendly, mobile navigation, native app feel.
    2. **PC Desktop Viewport** (`≥ 1024px`): Full-screen wide container (up to 1600px), top sticky navigation, multi-column grids (5-column shelves, single-row 8-category quick nav, dual-column sticky PDP).
  - Never break or leave either viewport unstyled when introducing changes.


