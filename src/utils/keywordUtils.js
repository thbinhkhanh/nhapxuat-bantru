import { getFirestore, collection, getDocs } from "firebase/firestore";

const db = getFirestore();

/**
 * Load toàn bộ KEYWORD_RULES từ Firestore
 * Trả về object dạng: { L1: [...], L2: [...], ..., L9: [...] }
 */
export const loadKeywordRules = async () => {
  const rules = {};
  const snapshot = await getDocs(collection(db, "KEYWORD_RULES"));

  snapshot.forEach(docSnap => {
    const category = docSnap.id;
    const data = docSnap.data();

    rules[category] = Array.isArray(data?.keywords)
      ? data.keywords
          .filter(k => typeof k === "string" && k.trim().length > 0)
          .map(k => k.trim())
      : [];
  });

  console.log("✅ RULES LOADED:", rules);
  return rules;
};

/**
 * Detect loại từ tên món ăn bằng cách so sánh trực tiếp chuỗi gốc
 * @param {string} name - Tên món ăn
 * @param {object} KEYWORD_RULES - Từ khóa đã load từ Firestore
 * @returns {string} - Tên loại (L1, L2, L3 hoặc "Khác")
 */
export const detectCategory = (name, KEYWORD_RULES) => {
  if (!name || !KEYWORD_RULES) {
    console.warn("⚠️ Không có name hoặc KEYWORD_RULES:", name, KEYWORD_RULES);
    return "Khác";
  }

  const nameRaw = name.toString().trim();
  //console.log(`🔍 Tên món gốc: "${nameRaw}"`);

  for (const [category, keywords] of Object.entries(KEYWORD_RULES)) {
    if (!Array.isArray(keywords)) continue;

    for (const keyword of keywords) {
      const keywordNormalized = keyword.toString().trim();
      if (!keywordNormalized) continue;

      if (nameRaw === keywordNormalized) {
        //console.log(`✅ MATCH EXACT: "${nameRaw}" === "${keywordNormalized}" → loại: "${category}"`);
        return category;
      } else {
        //console.log(`❌ Không khớp: "${nameRaw}" !== "${keywordNormalized}"`);
      }
    }
  }

  console.log(`📌 Không tìm thấy loại cho: "${nameRaw}"`);
  return "Khác";
};