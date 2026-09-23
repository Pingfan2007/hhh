// ============ 联动筛选逻辑 ============
// 分类 → 药物 → 维度（选完直接展示该维度下所有字段）

// 各维度的显示名
const DIMENSIONS = [
  { key: 'drug',      label: '药物本质 (Drug)' },
  { key: 'product',   label: '处方与制剂 (Product)' },
  { key: 'disease',   label: '适应证 (Disease)' },
  { key: 'target',    label: '靶点与机制 (Target)' },
  { key: 'pk',        label: '体内暴露 (PK)' },
  { key: 'extension', label: '拓展 (Extension)' }
];

// 工具：把 "1.0"、"1"、"0001" 统一成 "1"
function normalizeId(id) {
  if (id === null || id === undefined) return '';
  let s = String(id).trim();
  if (s.endsWith('.0')) s = s.slice(0, -2);
  return String(Number(s));
}

// ============ 初始化：先加载数据，再绑定 UI ============
async function initBrowsePage() {
  await window.loadAllData();
  console.log('数据加载完成：', {
    drugs: DB.drugs.length,
    products: DB.products.length,
    diseases: DB.diseases.length,
    targets: DB.targets.length
  });
  bindCategorySelect();
  bindReset();
}

// ============ 绑定四级联动 ============
function bindCategorySelect() {
  const catSel   = document.getElementById('filterCategory');
  const drugSel  = document.getElementById('filterDrug');
  const dimSel   = document.getElementById('filterDimension');
  const fieldSel = document.getElementById('filterField'); // 可能不存在了，做个兼容

  // ---- 第 1 级：分类 ----
  catSel.onchange = () => {
    const cat = catSel.value;

    // 重置后两级
    drugSel.innerHTML = '<option value="">-- 请选择药物 --</option>';
    dimSel.innerHTML  = '<option value="">-- 请先选择药物 --</option>';
    if (fieldSel) {
      fieldSel.innerHTML = '<option value="">-- 无需选择 --</option>';
      fieldSel.disabled = true;
    }
    dimSel.disabled = true;

    if (!cat) {
      drugSel.disabled = true;
      drugSel.innerHTML = '<option value="">-- Select Category First --</option>';
      clearResults();
      return;
    }

    const drugsInCat = getDrugsByCategory(cat);
    console.log('分类', cat, '下找到药物：', drugsInCat);

    drugSel.disabled = drugsInCat.length === 0;
    if (drugsInCat.length === 0) {
      drugSel.innerHTML = '<option value="">该分类下暂无数据</option>';
      clearResults();
      return;
    }
    drugsInCat.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.drug_id;
      opt.textContent = d.drug_name;
      drugSel.appendChild(opt);
    });
  };

  // ---- 第 2 级：药物 ----
  drugSel.onchange = () => {
    const drugId = drugSel.value;
    dimSel.innerHTML = '<option value="">-- 请选择维度 --</option>';

    if (!drugId) {
      dimSel.disabled = true;
      clearResults();
      return;
    }
    dimSel.disabled = false;
    DIMENSIONS.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.key;
      opt.textContent = d.label;
      dimSel.appendChild(opt);
    });
  };

  // ---- 第 3 级：维度（选完直接展示，不再有第 4 级） ----
  dimSel.onchange = () => {
    const dim = dimSel.value;
    const drugId = drugSel.value;
    if (!dim || !drugId) {
      clearResults();
      return;
    }
    renderResults(drugId, dim, null);
  };

  // 如果有遗留的 fieldSel，直接禁用
  if (fieldSel) {
    fieldSel.disabled = true;
  }
}

// ============ 按分类找药物 ============
function getDrugsByCategory(cat) {
  if (!window.DB || !window.DB.products || !window.DB.drugs) return [];
  const catLower = cat.toLowerCase();
  const productDrugIds = new Set(
    window.DB.products
      .filter(p => (p.category || '').toLowerCase() === catLower)
      .map(p => normalizeId(p.drug_id))
  );
  return window.DB.drugs.filter(d => productDrugIds.has(normalizeId(d.drug_id)));
}

// ============ Reset ============
function bindReset() {
  const btn = document.getElementById('resetFilter');
  if (!btn) return;
  btn.onclick = () => {
    const catSel  = document.getElementById('filterCategory');
    const drugSel = document.getElementById('filterDrug');
    const dimSel  = document.getElementById('filterDimension');
    const fieldSel = document.getElementById('filterField');

    catSel.value = '';
    drugSel.innerHTML = '<option value="">-- 请先选择分类 --</option>';
    drugSel.disabled = true;
    dimSel.innerHTML = '<option value="">-- 请先选择药物 --</option>';
    dimSel.disabled = true;
    if (fieldSel) {
      fieldSel.innerHTML = '<option value="">-- 请先选择维度 --</option>';
      fieldSel.disabled = true;
    }
    clearResults();
  };
}

// ============ 首页搜索跳转后自动选中 ============
function quickSearch(kw) {
  if (!window.DB || !window.DB.drugs) return;
  const lower = kw.toLowerCase();
  const drug = window.DB.drugs.find(d =>
    (d.drug_name || '').toLowerCase().includes(lower)
  );
  if (!drug) return;

  setTimeout(() => {
    const catSel = document.getElementById('filterCategory');
    const prod = window.DB.products.find(p =>
      normalizeId(p.drug_id) === normalizeId(drug.drug_id)
    );
    if (prod && prod.category) {
      catSel.value = prod.category;
      catSel.dispatchEvent(new Event('change'));
      setTimeout(() => {
        const drugSel = document.getElementById('filterDrug');
        drugSel.value = drug.drug_id;
        drugSel.dispatchEvent(new Event('change'));
      }, 50);
    }
  }, 100);
}

window.initBrowsePage = initBrowsePage;
window.quickSearch = quickSearch;
window.normalizeId = normalizeId;
