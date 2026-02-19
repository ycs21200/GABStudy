import { Problem } from "../types";

/**
 * Sample problems for MVP.
 * In production, these would be loaded from a bundled JSON or downloaded.
 */
export const SAMPLE_PROBLEMS: Problem[] = [
  // ===== 表の読み取り (Table) =====
  {
    id: "table-001",
    category: "table",
    difficulty: 1,
    question:
      "以下の表は、A社からE社の2023年度の売上高（百万円）と従業員数を示している。従業員1人あたりの売上高が最も高い会社はどれか。",
    imageUri: "",
    choices: [
      { label: "A", text: "A社" },
      { label: "B", text: "B社" },
      { label: "C", text: "C社" },
      { label: "D", text: "D社" },
      { label: "E", text: "E社" },
    ],
    correctIndex: 2,
    explanation: [
      { label: "Step 1", content: "各社の売上高÷従業員数を計算する" },
      {
        label: "Step 2",
        content:
          "A社: 1200÷150=8.0, B社: 800÷80=10.0, C社: 1500÷120=12.5, D社: 600÷60=10.0, E社: 900÷100=9.0",
      },
      { label: "答え", content: "C社が12.5百万円/人で最も高い" },
    ],
    commonMistakes: [
      "売上高だけを見てA社やC社と即答しないこと",
      "百万円単位を忘れて計算ミスしやすい",
    ],
    targetTimeSec: 55,
  },
  {
    id: "table-002",
    category: "table",
    difficulty: 1,
    question:
      "以下の表は、地域別の人口（万人）と面積（km²）を示している。人口密度が最も低い地域はどれか。",
    imageUri: "",
    choices: [
      { label: "A", text: "北海道" },
      { label: "B", text: "東北" },
      { label: "C", text: "関東" },
      { label: "D", text: "中部" },
      { label: "E", text: "近畿" },
    ],
    correctIndex: 0,
    explanation: [
      { label: "Step 1", content: "人口密度 = 人口 ÷ 面積 を各地域で計算" },
      {
        label: "Step 2",
        content: "北海道は面積が突出して大きく、人口密度が最も低くなる",
      },
      { label: "答え", content: "北海道" },
    ],
    commonMistakes: ["面積だけ見て判断せず、必ず割り算する"],
    targetTimeSec: 55,
  },
  {
    id: "table-003",
    category: "table",
    difficulty: 2,
    question:
      "以下の表は2020年から2023年の各部門の売上（億円）を示している。2020年から2023年で増加率が最も大きい部門はどれか。",
    imageUri: "",
    choices: [
      { label: "A", text: "営業部門" },
      { label: "B", text: "開発部門" },
      { label: "C", text: "マーケティング部門" },
      { label: "D", text: "管理部門" },
      { label: "E", text: "製造部門" },
    ],
    correctIndex: 2,
    explanation: [
      { label: "Step 1", content: "各部門の増加率 = (2023年-2020年)÷2020年×100 を計算" },
      {
        label: "Step 2",
        content: "マーケティング部門: (15-8)÷8×100 = 87.5% で最大",
      },
      { label: "答え", content: "マーケティング部門（約87.5%増）" },
    ],
    commonMistakes: [
      "増加額（差分）と増加率（割合）を混同しないこと",
      "ベースが小さいと率は大きくなる点に注意",
    ],
    targetTimeSec: 55,
  },
  {
    id: "table-004",
    category: "table",
    difficulty: 2,
    question:
      "以下の表は5つの製品の原価と販売価格を示している。利益率（(販売価格-原価)÷販売価格）が2番目に高い製品はどれか。",
    imageUri: "",
    choices: [
      { label: "A", text: "製品A" },
      { label: "B", text: "製品B" },
      { label: "C", text: "製品C" },
      { label: "D", text: "製品D" },
      { label: "E", text: "製品E" },
    ],
    correctIndex: 3,
    explanation: [
      {
        label: "Step 1",
        content: "各製品の利益率を計算: (販売価格-原価)÷販売価格",
      },
      { label: "Step 2", content: "順位を付けて2番目を特定する" },
      { label: "答え", content: "製品D" },
    ],
    commonMistakes: [
      "利益率の分母は原価ではなく販売価格",
      "「2番目に高い」を見落として最高を選ばない",
    ],
    targetTimeSec: 55,
  },
  {
    id: "table-005",
    category: "table",
    difficulty: 3,
    question:
      "以下の表はX社の部門別売上と利益を示している。全社の利益率と比べて、利益率が低い部門はいくつあるか。",
    imageUri: "",
    choices: [
      { label: "A", text: "1つ" },
      { label: "B", text: "2つ" },
      { label: "C", text: "3つ" },
      { label: "D", text: "4つ" },
      { label: "E", text: "該当なし" },
    ],
    correctIndex: 1,
    explanation: [
      { label: "Step 1", content: "全社の利益率を算出（合計利益÷合計売上）" },
      { label: "Step 2", content: "各部門の利益率を算出し、全社と比較" },
      { label: "答え", content: "2部門が全社平均を下回る" },
    ],
    commonMistakes: ["全社平均を先に出すのを忘れがち", "加重平均と単純平均を混同"],
    targetTimeSec: 55,
  },

  // ===== 棒グラフ (Bar) =====
  {
    id: "bar-001",
    category: "bar",
    difficulty: 1,
    question:
      "以下の棒グラフは、A店からE店の月間来客数を示している。来客数が最も多い店舗と最も少ない店舗の差はおよそいくらか。",
    imageUri: "",
    choices: [
      { label: "A", text: "約500人" },
      { label: "B", text: "約800人" },
      { label: "C", text: "約1,000人" },
      { label: "D", text: "約1,200人" },
      { label: "E", text: "約1,500人" },
    ],
    correctIndex: 2,
    explanation: [
      { label: "Step 1", content: "グラフから最大値と最小値を読み取る" },
      { label: "Step 2", content: "差を計算する" },
      { label: "答え", content: "約1,000人" },
    ],
    commonMistakes: ["目盛りの単位をよく確認すること"],
    targetTimeSec: 45,
  },
  {
    id: "bar-002",
    category: "bar",
    difficulty: 1,
    question:
      "以下の棒グラフは4四半期の売上を示している。前四半期比で最も増加した四半期はどれか。",
    imageUri: "",
    choices: [
      { label: "A", text: "第1四半期" },
      { label: "B", text: "第2四半期" },
      { label: "C", text: "第3四半期" },
      { label: "D", text: "第4四半期" },
      { label: "E", text: "判断できない" },
    ],
    correctIndex: 3,
    explanation: [
      { label: "Step 1", content: "各四半期間の差を算出" },
      { label: "Step 2", content: "最大の増加幅を特定" },
      { label: "答え", content: "第4四半期" },
    ],
    commonMistakes: ["第1四半期には前期がないので比較対象に注意"],
    targetTimeSec: 45,
  },
  {
    id: "bar-003",
    category: "bar",
    difficulty: 2,
    question:
      "以下の積み上げ棒グラフは製品カテゴリ別の売上構成を示している。全期間を通じて構成比が一貫して増加しているカテゴリはどれか。",
    imageUri: "",
    choices: [
      { label: "A", text: "食品" },
      { label: "B", text: "日用品" },
      { label: "C", text: "衣料" },
      { label: "D", text: "電子機器" },
      { label: "E", text: "該当なし" },
    ],
    correctIndex: 3,
    explanation: [
      { label: "Step 1", content: "各期間でカテゴリの構成比を概算" },
      { label: "Step 2", content: "一貫して増加しているものを特定" },
      { label: "答え", content: "電子機器" },
    ],
    commonMistakes: ["構成比は絶対額ではなく割合で見ること"],
    targetTimeSec: 45,
  },
  {
    id: "bar-004",
    category: "bar",
    difficulty: 2,
    question:
      "以下のグラフで、2022年の全店舗合計売上に占めるA店のシェアはおよそ何%か。",
    imageUri: "",
    choices: [
      { label: "A", text: "約15%" },
      { label: "B", text: "約20%" },
      { label: "C", text: "約25%" },
      { label: "D", text: "約30%" },
      { label: "E", text: "約35%" },
    ],
    correctIndex: 2,
    explanation: [
      { label: "Step 1", content: "全店舗の合計を概算する" },
      { label: "Step 2", content: "A店÷合計×100 を計算" },
      { label: "答え", content: "約25%" },
    ],
    commonMistakes: ["概算で十分、正確な数値を追わない"],
    targetTimeSec: 45,
  },
  {
    id: "bar-005",
    category: "bar",
    difficulty: 3,
    question:
      "以下の棒グラフと折れ線グラフの複合図で、売上高が前年比10%以上増加し、かつ利益率も改善した年はいくつあるか。",
    imageUri: "",
    choices: [
      { label: "A", text: "1年" },
      { label: "B", text: "2年" },
      { label: "C", text: "3年" },
      { label: "D", text: "4年" },
      { label: "E", text: "なし" },
    ],
    correctIndex: 0,
    explanation: [
      { label: "Step 1", content: "各年の前年比増加率を計算" },
      { label: "Step 2", content: "10%以上の年を特定し、利益率も確認" },
      { label: "答え", content: "1年のみ両条件を満たす" },
    ],
    commonMistakes: ["2つの条件をANDで判断する必要がある"],
    targetTimeSec: 45,
  },

  // ===== 円グラフ (Pie) =====
  {
    id: "pie-001",
    category: "pie",
    difficulty: 1,
    question:
      "以下の円グラフは支出の内訳を示している。食費と住居費を合わせた割合はおよそ何%か。",
    imageUri: "",
    choices: [
      { label: "A", text: "約30%" },
      { label: "B", text: "約40%" },
      { label: "C", text: "約50%" },
      { label: "D", text: "約60%" },
      { label: "E", text: "約70%" },
    ],
    correctIndex: 2,
    explanation: [
      { label: "Step 1", content: "グラフから食費と住居費の割合を読み取る" },
      { label: "Step 2", content: "合計する" },
      { label: "答え", content: "約50%" },
    ],
    commonMistakes: ["円グラフの角度から割合を正確に読む"],
    targetTimeSec: 40,
  },
  {
    id: "pie-002",
    category: "pie",
    difficulty: 1,
    question:
      "以下の円グラフで、最も大きいカテゴリの割合は2番目に大きいカテゴリの何倍か。",
    imageUri: "",
    choices: [
      { label: "A", text: "約1.2倍" },
      { label: "B", text: "約1.5倍" },
      { label: "C", text: "約2.0倍" },
      { label: "D", text: "約2.5倍" },
      { label: "E", text: "約3.0倍" },
    ],
    correctIndex: 2,
    explanation: [
      { label: "Step 1", content: "最大と2番目の割合を特定" },
      { label: "Step 2", content: "割り算で倍率を求める" },
      { label: "答え", content: "約2.0倍" },
    ],
    commonMistakes: ["倍率は大÷小で求めること"],
    targetTimeSec: 40,
  },
  {
    id: "pie-003",
    category: "pie",
    difficulty: 2,
    question:
      "全体が5000万円のとき、2番目に大きいセクターの金額はおよそいくらか。",
    imageUri: "",
    choices: [
      { label: "A", text: "約500万円" },
      { label: "B", text: "約750万円" },
      { label: "C", text: "約1,000万円" },
      { label: "D", text: "約1,250万円" },
      { label: "E", text: "約1,500万円" },
    ],
    correctIndex: 2,
    explanation: [
      { label: "Step 1", content: "2番目に大きいセクターの割合を読み取る（約20%）" },
      { label: "Step 2", content: "5000万円 × 20% = 1,000万円" },
      { label: "答え", content: "約1,000万円" },
    ],
    commonMistakes: ["%を少数に変換する際のミスに注意"],
    targetTimeSec: 40,
  },
  {
    id: "pie-004",
    category: "pie",
    difficulty: 2,
    question:
      "2つの円グラフ（2020年と2023年）を比較して、構成比が最も大きく変化したカテゴリはどれか。",
    imageUri: "",
    choices: [
      { label: "A", text: "カテゴリA" },
      { label: "B", text: "カテゴリB" },
      { label: "C", text: "カテゴリC" },
      { label: "D", text: "カテゴリD" },
      { label: "E", text: "カテゴリE" },
    ],
    correctIndex: 1,
    explanation: [
      { label: "Step 1", content: "各カテゴリの両年度の構成比を読む" },
      { label: "Step 2", content: "差の絶対値が最大のものを選ぶ" },
      { label: "答え", content: "カテゴリB" },
    ],
    commonMistakes: ["変化の方向（増減）ではなく大きさ（絶対値）で判断"],
    targetTimeSec: 40,
  },
  {
    id: "pie-005",
    category: "pie",
    difficulty: 3,
    question:
      "全体額が前年比120%に増えた場合、構成比が25%→20%に減ったカテゴリの実額は前年と比べてどうなるか。",
    imageUri: "",
    choices: [
      { label: "A", text: "減少した" },
      { label: "B", text: "変わらない" },
      { label: "C", text: "微増した" },
      { label: "D", text: "判断できない" },
      { label: "E", text: "大幅に増加した" },
    ],
    correctIndex: 0,
    explanation: [
      {
        label: "Step 1",
        content: "前年: 全体×25% = 0.25X, 今年: 1.2X×20% = 0.24X",
      },
      { label: "Step 2", content: "0.24X < 0.25X なので実額は減少" },
      { label: "答え", content: "減少した" },
    ],
    commonMistakes: ["構成比の変化と実額の変化は別物"],
    targetTimeSec: 40,
  },

  // ===== 複合 (Composite) =====
  {
    id: "comp-001",
    category: "composite",
    difficulty: 2,
    question:
      "以下の表とグラフから、2023年にA社が業界全体に占めるシェアはおよそ何%か。",
    imageUri: "",
    choices: [
      { label: "A", text: "約12%" },
      { label: "B", text: "約18%" },
      { label: "C", text: "約24%" },
      { label: "D", text: "約30%" },
      { label: "E", text: "約36%" },
    ],
    correctIndex: 2,
    explanation: [
      { label: "Step 1", content: "表からA社の売上を読み取る" },
      { label: "Step 2", content: "グラフから業界全体を概算し、シェアを計算" },
      { label: "答え", content: "約24%" },
    ],
    commonMistakes: ["複数の資料を組み合わせる際、単位を統一"],
    targetTimeSec: 55,
  },
  {
    id: "comp-002",
    category: "composite",
    difficulty: 2,
    question:
      "以下の複合グラフ（棒：売上、折れ線：利益率）から、売上と利益率がともに前年を上回った年はいくつあるか。",
    imageUri: "",
    choices: [
      { label: "A", text: "1年" },
      { label: "B", text: "2年" },
      { label: "C", text: "3年" },
      { label: "D", text: "4年" },
      { label: "E", text: "なし" },
    ],
    correctIndex: 1,
    explanation: [
      { label: "Step 1", content: "各年で棒（売上）が前年より高いか確認" },
      { label: "Step 2", content: "同時に折れ線（利益率）も上昇しているか確認" },
      { label: "答え", content: "2年が両条件を満たす" },
    ],
    commonMistakes: ["左軸と右軸のスケールを混同しない"],
    targetTimeSec: 55,
  },
  {
    id: "comp-003",
    category: "composite",
    difficulty: 3,
    question:
      "3つの資料（売上表・コスト棒グラフ・市場シェア円グラフ）から、利益額が最大の企業はどれか。",
    imageUri: "",
    choices: [
      { label: "A", text: "X社" },
      { label: "B", text: "Y社" },
      { label: "C", text: "Z社" },
      { label: "D", text: "W社" },
      { label: "E", text: "判断できない" },
    ],
    correctIndex: 1,
    explanation: [
      { label: "Step 1", content: "各社の売上（表）とコスト（棒グラフ）を読む" },
      { label: "Step 2", content: "利益 = 売上 - コスト を計算" },
      { label: "Step 3", content: "最大のものを選ぶ" },
      { label: "答え", content: "Y社" },
    ],
    commonMistakes: ["複数の資料をまたぐ計算では単位を必ず確認"],
    targetTimeSec: 55,
  },
  {
    id: "comp-004",
    category: "composite",
    difficulty: 3,
    question:
      "以下の資料から、A地区の1人あたり消費額は全国平均と比べてどうか。最も近いものを選べ。",
    imageUri: "",
    choices: [
      { label: "A", text: "全国平均の約80%" },
      { label: "B", text: "全国平均の約90%" },
      { label: "C", text: "全国平均とほぼ同じ" },
      { label: "D", text: "全国平均の約110%" },
      { label: "E", text: "全国平均の約120%" },
    ],
    correctIndex: 3,
    explanation: [
      { label: "Step 1", content: "全国の消費額÷人口 で全国平均を算出" },
      { label: "Step 2", content: "A地区の消費額÷人口 でA地区平均を算出" },
      { label: "Step 3", content: "比率を求める" },
      { label: "答え", content: "約110%（全国より約10%高い）" },
    ],
    commonMistakes: ["全国平均には全地区を含めること"],
    targetTimeSec: 55,
  },
  {
    id: "comp-005",
    category: "composite",
    difficulty: 3,
    question:
      "売上推移の表と、従業員数推移のグラフから、従業員1人あたり売上が最も改善した年はどれか。",
    imageUri: "",
    choices: [
      { label: "A", text: "2020年" },
      { label: "B", text: "2021年" },
      { label: "C", text: "2022年" },
      { label: "D", text: "2023年" },
      { label: "E", text: "変化なし" },
    ],
    correctIndex: 2,
    explanation: [
      { label: "Step 1", content: "各年の1人あたり売上を計算" },
      { label: "Step 2", content: "前年との差が最大の年を特定" },
      { label: "答え", content: "2022年" },
    ],
    commonMistakes: ["改善＝増加幅（差分）で判断。率ではない点に注意"],
    targetTimeSec: 55,
  },
];

/**
 * Get problems by category
 */
export function getProblemsByCategory(category: string): Problem[] {
  return SAMPLE_PROBLEMS.filter((p) => p.category === category);
}

/**
 * Get a specific problem by ID
 */
export function getProblemById(id: string): Problem | undefined {
  return SAMPLE_PROBLEMS.find((p) => p.id === id);
}
