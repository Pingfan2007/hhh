// 首页统计图
function renderHomeStats() {
  const left = document.getElementById('statChartLeft');
  const right = document.getElementById('statChartRight');
  if (!left || !right) return;

  const leftData = [60, 35, 55, 45];
  const rightData = [70, 40, 65, 50];

  left.innerHTML = leftData.map(h => `<div class="bar" style="height:${h}%"></div>`).join('');
  right.innerHTML = rightData.map(h => `<div class="bar" style="height:${h}%"></div>`).join('');
}

// 清空结果
function clearResults() {
  document.getElementById('resultList').innerHTML =
    '<p class="empty-tip">请从左侧依次选择筛选条件。</p>';
  document.getElementById('resultCount').textContent = '';
  document.getElementById('resultTitle').textContent = 'Results';
}

// 渲染结果
function renderResults(drugId, dim, field) {
  const listEl = document.getElementById('resultList');
  const countEl = document.getElementById('resultCount');
  const titleEl = document.getElementById('resultTitle');

  const drug = window.DB.drugs.find(d => d.drug_id === drugId);
  const drugName = drug ? drug.drug_name : drugId;
  titleEl.textContent = `${drugName} — ${field}`;

  let rows = [];

  if (dim === 'drug') {
    rows = window.DB.drugs.filter(d => d.drug_id === drugId)
      .map(d => ({ title: field, value: d[field] }));
  } else if (dim === 'product') {
    rows = window.DB.products
      .filter(p => p.drug_id === drugId)
      .map(p => ({ title: p.Product_name || p.Product_id, value: p[field] }));
  } else if (dim === 'disease') {
    rows = window.DB.diseases
      .filter(d => d.drug_id === drugId)
      .map(d => ({ title: d.disease_name, value: d[field] }));
  } else if (dim === 'target') {
    rows = window.DB.targets
      .filter(t => t.drug_id === drugId || true)
      .map(t => ({ title: t.target_name, value: t[field] }));
  } else if (dim === 'pk') {
    rows = window.DB.pk
      .filter(p => p.drug_id === drugId)
      .map(p => ({ title: `${p['Description Title 1']} / ${p['Description Title 2']}`, value: p[field] }));
  } else if (dim === 'extension') {
    rows = window.DB.extension
      .filter(e => e.drug_id === drugId)
      .map(e => ({ title: e['The newly developed product'], value: e[field] }));
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

window.renderHomeStats = renderHomeStats;
window.renderResults = renderResults;
window.clearResults = clearResults;