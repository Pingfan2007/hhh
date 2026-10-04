// ============ 结构式检索 ============
// 支持 MOL 文件上传 或 SMILES 粘贴
// 用户输入 → InChIKey → 数据库比对

let RDKit = null;

// ---------- 初始化 RDKit ----------
async function initRDKit() {
  try {
    if (typeof initRDKitModule === 'undefined') {
      throw new Error('RDKit.js 未加载');
    }
    RDKit = await initRDKitModule({
      locateFile: (file) =>
        `https://unpkg.com/@rdkit/rdkit@2024.3.5/dist/${file}`
    });
    console.log('RDKit 初始化成功，版本：', RDKit.version());
    return true;
  } catch (e) {
    console.error('RDKit 初始化失败：', e);
    return false;
  }
}

// ---------- 从 MOL 生成 InChIKey ----------
function getInChIKeyFromMol(molBlock) {
  if (!RDKit) throw new Error('RDKit 尚未初始化');
  const mol = RDKit.get_mol(molBlock);
  if (!mol || !mol.is_valid()) {
    if (mol) mol.delete();
    throw new Error('无法解析 MOL 文件（格式可能不正确）');
  }
  const key = mol.get_inchi_key();
  mol.delete();
  if (!key) throw new Error('无法生成 InChIKey');
  return key;
}

// ---------- 从 SMILES 生成 InChIKey ----------
function getInChIKeyFromSmiles(smiles) {
  if (!RDKit) throw new Error('RDKit 尚未初始化');
  const mol = RDKit.get_mol(smiles);
  if (!mol || !mol.is_valid()) {
    if (mol) mol.delete();
    throw new Error('无法解析 SMILES（格式可能不正确）');
  }
  const key = mol.get_inchi_key();
  mol.delete();
  if (!key) throw new Error('无法生成 InChIKey');
  return key;
}

// ---------- 从 MOL 生成 SMILES ----------
function getSmilesFromMol(molBlock) {
  if (!RDKit) return '';
  try {
    const mol = RDKit.get_mol(molBlock);
    if (!mol) return '';
    const smiles = mol.get_smiles();
    mol.delete();
    return smiles || '';
  } catch (e) {
    return '';
  }
}

// ---------- 规范化 SMILES ----------
function normalizeSmiles(smiles) {
  if (!RDKit) return smiles;
  try {
    const mol = RDKit.get_mol(smiles);
    if (!mol) return smiles;
    const s = mol.get_smiles();
    mol.delete();
    return s || smiles;
  } catch (e) {
    return smiles;
  }
}

// ---------- 主搜索函数 ----------
async function doStructureSearch() {
  const statusEl = document.getElementById('statusMsg');
  statusEl.textContent = '';
  statusEl.className = 'status-msg';

  if (!RDKit) {
    statusEl.textContent = 'RDKit 尚未初始化，请稍候重试…';
    statusEl.className = 'status-msg error';
    return;
  }

  const fileInput = document.getElementById('molFile');
  const smilesInput = document.getElementById('smilesInput').value.trim();

  let molBlock = '';
  let querySource = '';
  let querySmiles = '';

  if (fileInput.files && fileInput.files.length > 0) {
    molBlock = await fileInput.files[0].text();
    querySource = 'MOL File';
  } else if (smilesInput) {
    querySource = 'SMILES';
  } else {
    statusEl.textContent = '请上传 MOL 文件，或粘贴 SMILES 字符串。';
    statusEl.className = 'status-msg error';
    return;
  }

  statusEl.textContent = '正在解析结构…';

  let targetInChIKey;
  try {
    if (querySource === 'MOL File') {
      targetInChIKey = getInChIKeyFromMol(molBlock);
      querySmiles = getSmilesFromMol(molBlock);
    } else {
      targetInChIKey = getInChIKeyFromSmiles(smilesInput);
      querySmiles = normalizeSmiles(smilesInput);
    }
  } catch (e) {
    statusEl.textContent = '解析失败：' + e.message;
    statusEl.className = 'status-msg error';
    return;
  }

  console.log('查询来源：', querySource);
  console.log('查询 InChIKey：', targetInChIKey);
  console.log('查询 SMILES：', querySmiles);

  const modeEl = document.querySelector('input[name="searchMode"]:checked');
  const mode = modeEl ? modeEl.value : 'exact';

  const matches = searchByInChIKey(targetInChIKey, mode);
  statusEl.textContent = `解析成功（${querySource}），匹配到 ${matches.length} 条记录。`;
  statusEl.className = 'status-msg success';

  renderStructureResults(matches, targetInChIKey, querySmiles, querySource);
}

// ---------- 按 InChIKey 匹配 ----------
function searchByInChIKey(targetKey, mode) {
  const drugs = (window.DB && window.DB.drugs) || [];
  const matches = [];

  for (const d of drugs) {
    const dbKey = (d['InChIKey'] || '').trim();
    if (!dbKey || dbKey === '.') continue;

    if (mode === 'exact') {
      if (dbKey === targetKey) {
        matches.push({ drug: d, matchType: 'Exact Match', score: 1.0 });
      }
    } else if (mode === 'skeleton') {
      const tSkeleton = targetKey.split('-')[0];
      const dSkeleton = dbKey.split('-')[0];
      if (tSkeleton === dSkeleton) {
        matches.push({ drug: d, matchType: 'Skeleton Match', score: 0.9 });
      }
    }
  }
  return matches;
}

// ---------- 渲染结果 ----------
function renderStructureResults(matches, targetKey, targetSmiles, querySource) {
  const listEl = document.getElementById('resultList');
  const countEl = document.getElementById('resultCount');
  const titleEl = document.getElementById('resultTitle');

  titleEl.textContent = 'Structure Search Results';

  if (matches.length === 0) {
    listEl.innerHTML = `
      <div class="result-card">
        <h4>No Match Found</h4>
        <div class="kv-list">
          <div class="kv-row">
            <span class="kv-key">Query Source</span>
            <span class="kv-val">${escapeHtml(querySource)}</span>
          </div>
          <div class="kv-row">
            <span class="kv-key">Your InChIKey</span>
            <span class="kv-val">${escapeHtml(targetKey)}</span>
          </div>
          ${targetSmiles ? `
          <div class="kv-row">
            <span class="kv-key">Your SMILES</span>
            <span class="kv-val">${escapeHtml(targetSmiles)}</span>
          </div>` : ''}
        </div>
        <p class="empty-tip" style="margin-top:14px;">
          数据库中没有找到结构相同的分子。
        </p>
      </div>
    `;
    countEl.textContent = '0 result(s)';
    return;
  }

  listEl.innerHTML = matches.map(m => {
    const d = m.drug;
    return `
      <div class="result-card">
        <h4>${escapeHtml(d.drug_name || 'Unknown')}</h4>
        <div class="kv-list">
          <div class="kv-row">
            <span class="kv-key">Match Type</span>
            <span class="kv-val">${m.matchType}</span>
          </div>
          <div class="kv-row">
            <span class="kv-key">CAS</span>
            <span class="kv-val">${escapeHtml(d['CAS'] || '-')}</span>
          </div>
          <div class="kv-row">
            <span class="kv-key">Molecular Formula</span>
            <span class="kv-val">${escapeHtml(d['Molecular Formula'] || '-')}</span>
          </div>
          <div class="kv-row">
            <span class="kv-key">Molecular Weight</span>
            <span class="kv-val">${escapeHtml(d['Molecular weight'] || '-')}</span>
          </div>
          <div class="kv-row">
            <span class="kv-key">SMILES</span>
            <span class="kv-val">${escapeHtml(d['SMILES'] || '-')}</span>
          </div>
          <div class="kv-row">
            <span class="kv-key">InChIKey</span>
            <span class="kv-val">${escapeHtml(d['InChIKey'] || '-')}</span>
          </div>
        </div>
        <a href="browse.html?q=${encodeURIComponent(d.drug_name || '')}">在浏览页查看 →</a>
      </div>
    `;
  }).join('');

  countEl.textContent = `${matches.length} result(s)`;
}

// ---------- 清空 ----------
function clearStructureSearch() {
  document.getElementById('molFile').value = '';
  document.getElementById('smilesInput').value = '';
  document.getElementById('statusMsg').textContent = '';
  document.getElementById('statusMsg').className = 'status-msg';
  document.getElementById('resultList').innerHTML =
    '<p class="empty-tip">Search results will appear here.</p>';
  document.getElementById('resultCount').textContent = '';
  document.getElementById('resultTitle').textContent = 'Results';
}

// ---------- 拖拽上传 ----------
function bindDropZone() {
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('molFile');

  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
      fileInput.files = e.dataTransfer.files;
      updateDropZoneText(e.dataTransfer.files[0].name);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      updateDropZoneText(fileInput.files[0].name);
    }
  });
}

function updateDropZoneText(filename) {
  const dropZone = document.getElementById('dropZone');
  const textEl = dropZone.querySelector('.drop-text');
  textEl.innerHTML = `Selected: <b>${escapeHtml(filename)}</b>`;
}

// ---------- 页面加载 ----------
document.addEventListener('DOMContentLoaded', async () => {
  if (window.loadAllData) {
    await window.loadAllData();
  }
  const statusEl = document.getElementById('statusMsg');
  const ok = await initRDKit();
  if (!ok) {
    statusEl.textContent = 'RDKit 加载失败，请检查网络后刷新。';
    statusEl.className = 'status-msg error';
  } else {
    statusEl.textContent = 'RDKit 已就绪，可以开始检索。';
    statusEl.className = 'status-msg success';
  }
  document.getElementById('searchBtn').onclick = doStructureSearch;
  document.getElementById('clearBtn').onclick = clearStructureSearch;
  bindDropZone();
});
