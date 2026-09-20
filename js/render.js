// 把 "1.0"、"1"、"0001" 都统一成 "1"
function normalizeId(id) {
  if (id === null || id === undefined) return '';
  let s = String(id).trim();
  if (s.endsWith('.0')) s = s.slice(0, -2);
  return String(Number(s));
}

function renderResults(drugId, dim, field) {
  const listEl = document.getElementById('resultList');
  const countEl = document.getElementById('resultCount');
  const titleEl = document.getElementById('resultTitle');

  const drug = window.DB.drugs.find(d => normalizeId(d.drug_id) === normalizeId(drugId));
  const drugName = drug ? drug.drug_name : drugId;
  titleEl.textContent = `${drugName} — ${field}`;

  let rows = [];

  if (dim === 'drug') {
    // 药物本质：直接从 drugs.json 取
    rows = window.DB.drugs
      .filter(d => normalizeId(d.drug_id) === normalizeId(drugId))
      .map(d => ({ title: field, value: d[field] }));

  } else if (dim === 'product') {
    // 处方与制剂：从 products.json 取，按 drug_id 匹配
    rows = window.DB.products
      .filter(p => normalizeId(p.drug_id) === normalizeId(drugId))
      .map(p => ({
        title: `${p.Product_name || p.Product_id} — ${field}`,
        value: p[field]
      }));

  } else if (dim === 'disease') {
    // 适应证：从 diseases.json 取
    rows = window.DB.diseases
      .filter(d => normalizeId(d.drug_id) === normalizeId(drugId))
      .map(d => ({
        title: `${d.disease_name || d.disease_id} — ${field}`,
        value: d[field]
      }));

  } else if (dim === 'target') {
    // 靶点与机制：从 targets.json 取
    rows = window.DB.targets
      .map(t => ({
        title: `${t.target_name || ''} — ${field}`,
        value: t[field]
      }));

  } else if (dim === 'pk') {
    // 体内暴露：从 pk.json 取
    rows = window.DB.pk
      .filter(p => normalizeId(p.drug_id) === normalizeId(drugId))
      .map(p => ({
        title: `${p['Description Title 1'] || ''} / ${p['Description Title 2'] || ''} — ${field}`,
        value: p[field]
      }));

  } else if (dim === 'extension') {
    // 拓展：从 extension.json 取
    rows = window.DB.extension
      .filter(e => normalizeId(e.drug_id) === normalizeId(drugId))
      .map(e => ({
        title: `${e['The newly developed product'] || ''} — ${field}`,
        value: e[field]
      }));
  }

  // 过滤空值
  rows = rows.filter(r => r.value !== undefined && r.value !== null && r.value !== '' && r.value !== '.');

  if (rows.length === 0) {
    listEl.innerHTML = '<p class="empty-tip">当前条件下暂无数据。</p>';
    countEl.textContent = '0 条';
    return;
  }

  listEl.innerHTML = rows.map(r => `
    <div class="result-card">
      <h4>${escapeHtml(String(r.title || ''))}</h4>
      <p>${escapeHtml(String(r.value))}</p>
    </div>
  `).join('');
  countEl.textContent = `${rows.length} 条`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

window.renderResults = renderResults;
