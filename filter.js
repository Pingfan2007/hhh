// 联动筛选逻辑：分类 → 药物 → 维度 → 字段

const DIMENSIONS = [
  { key: 'drug',        label: '药物本质 (Drug)' },
  { key: 'product',     label: '处方与制剂 (Product)' },
  { key: 'disease',     label: '适应证 (Disease)' },
  { key: 'target',      label: '靶点与机制 (Target)' },
  { key: 'pk',          label: '体内暴露 (PK)' },
  { key: 'extension',   label: '拓展 (Extension)' }
];

// 各维度可查询字段（用于第4级下拉）
const FIELDS = {
  drug: ['Synonyms','Source','IUPAC name','InChI','InChIKey','SMILES','PubChem CID','CAS',
         'ChEBI ID','ChEMBL ID','DrugBank ID','Molecular Formula','Molecular weight',
         'Physical Description','Boiling Point','Solubility','LogP','Stereochemical Property',
         'Derivatives','Metabolic enzyme','Stability','Patent'],
  product: ['Product_name','Product_Company','First approval date','State','Approval number',
            'Active Pharmaceutical Ingredient','Dosage form','Excipient composition',
            'Excipient function','Excipient amount','Formulation steps','Manufacturing process',
            'Preparation conditions','Synthetic route','Key intermediates','pH range',
            'Sterilization conditions','Temperature','Pressure','Time','Rotation speed',
            'Identification method','Assay','Microbial limit','Dissolution/Release rate',
            'Impurity name','Impurity content','Analytical method','Analytical conditions',
            'Accelerated conditions','Long-term conditions','Photostability conditions',
            'Catalog number','Source','Strength','Approval / Non-approval','Review opinion'],
  disease: ['disease_name','icd','status','trade_name','company','research_type',
            'Experimental methods','mechanism','clinicaltrials','title',
            'Primary Outcome','Secondary Outcomes','dosage_and_administration',
            'experimental_subjects','Efficacy','Safety','EC50','IC50'],
  target: ['target_name','target_type','gene_name','synonyms','uniprot_entry_name',
           'amino_acids','length','Sequence similarities','Function','Pathway',
           'Protein families','modification','expression','AlphaFoldDB','GeneID',
           'HGNC','Ensembl','PDB ID','Binding Mode','Mechanism','Kd','Ki','IC50'],
  pk: ['Description Title 1','Description Title 2','Description Value','Description Reference'],
  extension: ['The newly developed product','Novel dosage form','Other ingredients',
              'Experimental methods','Application','mechanism']
};

// 分类选项（预留天然药）
const CATEGORIES = [
  { value: 'Chemical Drug',     label: '化学药 (Chemical Drug)' },
  { value: 'Natural Drug',      label: '天然药 (Natural Drug) — 暂无数据' },
  { value: 'Biological product',label: '生物制品 (Biological product)' }
];

// 初始化浏览页
async function initBrowsePage() {
  if (!window.DB || Object.keys(window.DB).length === 0) {
    await window.loadAllData();
  }
  bindCategorySelect();
  bindReset();
}

// 1. 分类选择
function bindCategorySelect() {
  const catSel = document.getElementById('filterCategory');
  const drugSel = document.getElementById('filterDrug');
  const dimSel = document.getElementById('filterDimension');
  const fieldSel = document.getElementById('filterField');

  catSel.onchange = () => {
    const cat = catSel.value;
    drugSel.innerHTML = '<option value="">-- 请选择药物 --</option>';
    dimSel.innerHTML = '<option value="">-- 请先选择药物 --</option>';
    fieldSel.innerHTML = '<option value="">-- 请先选择维度 --</option>';
    dimSel.disabled = true;
    fieldSel.disabled = true;

    if (!cat) {
      drugSel.disabled = true;
      drugSel.innerHTML = '<option value="">-- 请先选择分类 --</option>';
      clearResults();
      return;
    }

    // 按分类筛选药物
    const drugsInCat = getDrugsByCategory(cat);
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

  // 2. 药物选择
  drugSel.onchange = () => {
    const drugId = drugSel.value;
    dimSel.innerHTML = '<option value="">-- 请选择维度 --</option>';
    fieldSel.innerHTML = '<option value="">-- 请先选择维度 --</option>';
    fieldSel.disabled = true;

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

  // 3. 维度选择
  dimSel.onchange = () => {
    const dim = dimSel.value;
    fieldSel.innerHTML = '<option value="">-- 请选择字段 --</option>';
    if (!dim) {
      fieldSel.disabled = true;
      clearResults();
      return;
    }
    fieldSel.disabled = false;
    (FIELDS[dim] || []).forEach(f => {
      const opt = document.createElement('option');
      opt.value = f;
      opt.textContent = f;
      fieldSel.appendChild(opt);
    });
  };

  // 4. 字段选择 → 渲染结果
  fieldSel.onchange = () => {
    const drugId = drugSel.value;
    const dim = dimSel.value;
    const field = fieldSel.value;
    if (!drugId || !dim || !field) {
      clearResults();
      return;
    }
    renderResults(drugId, dim, field);
  };
}

// 根据分类获取药物
function getDrugsByCategory(cat) {
  if (!window.DB || !window.DB.drugs) return [];
  // 通过 Product 表 category 关联
  const productDrugIds = new Set(
    window.DB.products
      .filter(p => (p.category || '').toLowerCase() === cat.toLowerCase())
      .map(p => p.drug_id)
  );
  return window.DB.drugs.filter(d => productDrugIds.has(d.drug_id));
}

// 重置
function bindReset() {
  const btn = document.getElementById('resetFilter');
  if (!btn) return;
  btn.onclick = () => {
    document.getElementById('filterCategory').value = '';
    document.getElementById('filterDrug').innerHTML = '<option value="">-- 请先选择分类 --</option>';
    document.getElementById('filterDrug').disabled = true;
    document.getElementById('filterDimension').innerHTML = '<option value="">-- 请先选择药物 --</option>';
    document.getElementById('filterDimension').disabled = true;
    document.getElementById('filterField').innerHTML = '<option value="">-- 请先选择维度 --</option>';
    document.getElementById('filterField').disabled = true;
    clearResults();
  };
}

// 首页快捷搜索
function quickSearch(kw) {
  const lower = kw.toLowerCase();
  // 尝试匹配药物名
  const drug = window.DB.drugs.find(d =>
    (d.drug_name || '').toLowerCase().includes(lower)
  );
  if (drug) {
    // 直接跳到浏览页并选中
    setTimeout(() => {
      const catSel = document.getElementById('filterCategory');
      // 找到该药物所属分类
      const prod = window.DB.products.find(p => p.drug_id === drug.drug_id);
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
}

window.initBrowsePage = initBrowsePage;
window.quickSearch = quickSearch;