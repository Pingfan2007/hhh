// 统一数据加载模块
const DB = {
  drugs: [],
  products: [],
  diseases: [],
  targets: [],
  pk: [],
  extension: [],
  card: [],
  // 关联关系
  drugProduct: [],
  drugDisease: [],
  drugTarget: [],
  interactions: []
};

// 从静态 JSON 加载
async function loadAllData() {
  const files = [
    'drugs', 'products', 'diseases', 'targets',
    'pk', 'extension', 'card'
  ];
  for (const f of files) {
    try {
      const res = await fetch(`data/${f}.json`);
      if (res.ok) DB[f] = await res.json();
    } catch (e) {
      console.warn(`加载 ${f}.json 失败`, e);
    }
  }
  // 从 products 中抽取关联
  DB.products.forEach(p => {
    if (p.drug_id) {
      DB.drugProduct.push({
        drug_id: p.drug_id,
        Product_id: p.Product_id,
        Product_name: p.Product_name
      });
    }
  });
  return DB;
}

// 对外暴露初始化
window.DB = DB;
window.loadAllData = loadAllData;