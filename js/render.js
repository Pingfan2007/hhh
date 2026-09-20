// ============ 工具函数 ============

// 把 "1.0"、"1"、"0001" 都统一成 "1"
function normalizeId(id) {
  if (id === null || id === undefined) return '';
  let s = String(id).trim();
  if (s.endsWith('.0')) s = s.slice(0, -2);
  return String(Number(s));
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============ 各维度的字段列表 ============
// 只要字段在 JSON 里有非空值，就会在卡片中显示

const DIM_FIELDS = {
  drug: [
    'drug_name', 'Synonyms', 'Source', 'Ref', 'IUPAC name', 'InChI', 'InChIKey',
    'SMILES', 'PubChem CID', 'CAS', 'ChEBI ID', 'ChEMBL ID', 'DrugBank ID',
    'Molecular Formula', 'Molecular weight', 'Physical Description',
    'Boiling Point', 'Solubility', 'LogP', 'Stereochemical Property',
    'Derivatives', 'Derivatives ref', 'Metabolic enzyme', 'Stability', 'Patent'
  ],
  product: [
    'Product_name', 'Product_Company', 'First approval date', 'State',
    'Approval number', 'Active Pharmaceutical Ingredient', 'Dosage form',
    'Excipient composition', 'Excipient function', 'Excipient amount',
    'Formulation steps', 'Manufacturing process', 'Preparation conditions',
    'Synthetic route', 'Key intermediates', 'Gelatin melting temperature',
    'pH range', 'Sterilization conditions', 'Temperature', 'Pressure',
    'Time', 'Rotation speed', 'Identification method', 'Assay',
    'Microbial limit', 'Dissolution/Release rate', 'Impurity name',
    'Impurity content', 'Analytical method', 'Analytical conditions',
    'Accelerated conditions', 'Assay (under accelerated conditions)',
    'Long-term conditions', 'Photostability conditions', 'Catalog number',
    'Source', 'Strength', 'Approval / Non-approval', 'Review opinion',
    'ICH Q8', 'ICH Q9', 'ICH Q10'
  ],
  disease: [
    'disease_name', 'utility_type', 'icd', 'status', 'trade_name',
    'company', 'research_type', 'Experimental methods', 'mechanism',
    'mec_ref', 'show_ref', 'clinicaltrials', 'title', 'Primary Outcome',
    'Secondary Outcomes', 'dosage_and_administration',
    'experimental_subjects', 'Efficacy', 'Safety', 'EC50', 'IC50'
  ],
  target: [
    'target_name', 'target_type', 'gene_name', 'synonyms',
    'uniprot_entry_name', 'amino_acids', 'length', 'Sequence similarities',
    'Function', 'Pathway', 'Protein families', 'modification',
    'expression', 'AlphaFoldDB', 'GeneID', 'HGNC', 'Ensembl',
    'PDB Title', 'PDB ID', 'Method', 'Resolution', 'Mutation',
    'Peptide Chain', 'Peptide Sequence', 'Peptide Sequence Start',
    'Target Sequence', 'Target Sequence Start', 'Target Residue Highlight',
    'Target Residue Distance', 'Structural Identification', 'Binding Mode',
    'Mechanism', 'Downstream Pathway', 'Kd', 'Ki', 'Kon', 'Koff',
    'Residence Time', 'EC50', 'IC50'
  ],
  pk: [
    'Product_name', 'Description Title 1', 'Description Title 2',
    'Description Value', 'Description Reference'
  ],
  extension: [
    'The newly developed product', 'Novel dosage form', 'Other ingredients',
    'Experimental methods', 'Application', 'Application ref',
    'mechanism', 'mec_ref'
  ]
};

// 各维度的中文名
const DIM_LABELS = {
  drug: '药物本质',
  product: '处方与制剂',
  disease: '适应证',
  target: '靶点与机制',
  pk: '体内暴露',
  extension: '拓展'
};

// ============ 首页统计图 ============
function renderHomeStats() {
  const left = document.getElementById('statChartLeft');
  const right = document.getElementById('statChartRight');
  if (!left || !right) return;

  const leftData = [60, 35, 55, 45];
  const rightData = [70, 40, 65, 50];

  left.innerHTML = leftData.map(h => `<div class="bar" style="height:${h}%"></div>`).join('');
  right.innerHTML = rightData.map(h => `<div class="bar" style="height:${h}%"></div>`).join('');
}

// ============ 清空结果 ============
function clearResults() {
  document.getElementById('resultList').innerHTML =
    '<p class="empty-tip">请从左侧依次选择筛选条件。</p>';
  document.getElementById('resultCount').textContent = '';
  document.getElementById('resultTitle').textContent = 'Results';
}

// ============ 取某维度下、某药物的所有记录 ============
function getRecords(drugId, dim) {
  const id = normalizeId(drugId);
  if (!window.DB) return [];

  if (dim === 'drug') {
    return window.DB.drugs.filter(d => normalizeId(d.drug_id) === id);
  }
  if (dim === 'product') {
    return window.DB.products.filter(p => normalizeId(p.drug_id) === id);
  }
  if (dim === 'disease') {
    return window.DB.diseases.filter(d => normalizeId(d.drug_id) === id);
  }
  if (dim === 'target') {
    // 靶点表里没有 drug_id 关联，全量返回
    return window.DB.targets || [];
  }
  if (dim === 'pk') {
    return window.DB.pk.filter(p => normalizeId(p.drug_id) === id);
  }
  if (dim === 'extension') {
    return window.DB.extension.filter(e => normalizeId(e.drug_id) === id);
  }
  return [];
}

// ============ 取记录的卡片标题 ============
function getCardTitle(rec, dim, idx) {
  if (dim === 'drug') return rec.drug_name || `记录 ${idx + 1}`;
  if (dim === 'product') return rec.Product_name || rec.Product_id || `产品 ${idx + 1}`;
  if (dim === 'disease') return rec.disease_name || `疾病 ${idx + 1}`;
  if (dim === 'target') return rec.target_name || `靶点 ${idx + 1}`;
  if (dim === 'pk') {
    const t = `${rec['Description Title 1'] || ''} / ${rec['Description Title 2'] || ''}`.trim();
    return t || `PK 记录 ${idx + 1}`;
  }
  if (dim === 'extension') return rec['The newly developed product'] || `拓展 ${idx + 1}`;
  return `记录 ${idx + 1}`;
}

// ============ 主渲染函数 ============
// field 参数已经不再需要，但为了兼容旧调用保留
function renderResults(drugId, dim, field) {
  const listEl = document.getElementById('resultList');
  const countEl = document.getElementById('resultCount');
  const titleEl = document.getElementById('resultTitle');

  // 标题
  const drug = window.DB.drugs.find(d => normalizeId(d.drug_id) === normalizeId(drugId));
  const drugName = drug ? drug.drug_name : drugId;
  titleEl.textContent = `${drugName} — ${DIM_LABELS[dim] || dim}`;

  // 取记录
  const records = getRecords(drugId, dim);
  if (records.length === 0) {
    listEl.innerHTML = '<p class="empty-tip">当前条件下暂无数据。</p>';
    countEl.textContent = '0 条';
    return;
  }

  const fields = DIM_FIELDS[dim] || [];
  let cardsHtml = '';
  let totalFieldCount = 0;

  records.forEach((rec, idx) => {
    // 收集所有非空字段
    const kvRows = [];
    fields.forEach(f => {
      const v = rec[f];
      if (v !== undefined && v !== null && v !== '' && v !== '.' && v !== 'nan') {
        kvRows.push({ key: f, value: v });
        totalFieldCount++;
      }
    });
    if (kvRows.length === 0) return; // 该记录所有字段都为空，跳过

    const cardTitle = getCardTitle(rec, dim, idx);
    cardsHtml += `
      <div class="result-card">
        <h4>${escapeHtml(cardTitle)}</h4>
        <div class="kv-list">
          ${kvRows.map(r => `
            <div class="kv-row">
              <span class="kv-key">${escapeHtml(r.key)}</span>
              <span class="kv-val">${escapeHtml(r.value)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  });

  if (!cardsHtml) {
    listEl.innerHTML = '<p class="empty-tip">该维度下暂无字段数据。</p>';
    countEl.textContent = '0 条';
    return;
  }

  listEl.innerHTML = cardsHtml;
  countEl.textContent = `${records.length} 条记录 / ${totalFieldCount} 个字段`;
}

// ============ 对外暴露 ============
window.renderHomeStats = renderHomeStats;
window.renderResults = renderResults;
window.clearResults = clearResults;
window.normalizeId = normalizeId;
