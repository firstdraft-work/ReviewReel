import type { GenerateScriptInput, ReviewScript } from "@/types/video";

const positiveWords = [
  "amazing",
  "best",
  "clean",
  "delicious",
  "excellent",
  "fast",
  "friendly",
  "fresh",
  "great",
  "helpful",
  "love",
  "perfect",
  "professional",
  "recommend",
  "wonderful",
  "好吃",
  "实惠",
  "热情",
  "干净",
  "推荐",
  "香",
  "快",
  "足",
];

export function normalizeReviews(reviews: string[]) {
  return reviews
    .map((review) => review.trim())
    .filter(Boolean)
    .slice(0, 5)
    .map((review) => review.slice(0, 320));
}

export function generateScript(input: GenerateScriptInput): ReviewScript {
  const businessName = input.businessName.trim();
  const reviews = normalizeReviews(input.reviews);

  if (!businessName) {
    throw new Error("Business name is required.");
  }

  if (reviews.length === 0) {
    throw new Error("Add at least one review.");
  }

  const ranked = [...reviews].sort((a, b) => scoreReview(b) - scoreReview(a));
  const chinese = isChinese([businessName, ...reviews].join(""));
  const category = detectBusinessCategory(businessName, reviews);
  const keywords = extractKeywords(reviews, chinese, category);
  const highlights = ranked.slice(0, 3).map((review) => toHighlight(review, chinese, category));

  while (highlights.length < 3) {
    highlights.push(chinese ? `${businessName}让老顾客一直回头。` : `${businessName} keeps customers coming back.`);
  }

  return {
    hook: createHook(businessName, keywords, chinese, category),
    socialProof: highlights,
    cta: createCta(businessName, chinese, category),
    language: chinese ? "zh" : "en",
    tone: chinese ? "本地生活口播" : "local social ad",
    keywords,
    businessCategory: category,
  };
}

function scoreReview(review: string) {
  const lower = review.toLowerCase();
  const sentimentScore = positiveWords.reduce(
    (score, word) => score + (lower.includes(word) ? 2 : 0),
    0,
  );
  const numberScore = /\d|five|four|stars?|rated/i.test(review) ? 3 : 0;
  const detailScore = Math.min(review.length / 90, 3);

  return sentimentScore + numberScore + detailScore;
}

function toHighlight(review: string, chinese: boolean, category: ReviewScript["businessCategory"]) {
  const compact = review.replace(/\s+/g, " ").replace(/^["']|["']$/g, "");
  const sentence = compact.match(/[^.!?。！？]+[.!?。！？]?/)?.[0]?.trim() ?? compact;
  const limit = chinese ? 24 : 88;
  const trimmed = sentence.length > limit ? `${sentence.slice(0, limit).trim()}...` : sentence;

  if (/\d|five|four|stars?|rated/i.test(trimmed)) {
    return trimmed;
  }

  if (chinese) {
    const prefix = category === "food" ? "食客都夸" : "顾客都夸";
    return `${prefix}：${trimmed}`;
  }

  return `Customers call it "${trimmed}"`;
}

function isChinese(value: string) {
  return /[\u3400-\u9fff]/.test(value);
}

function detectBusinessCategory(businessName: string, reviews: string[]): ReviewScript["businessCategory"] {
  const text = `${businessName} ${reviews.join(" ")}`.toLowerCase();
  const rules: Array<[ReviewScript["businessCategory"], RegExp]> = [
    ["food", /拉面|餐|饭|面|粉|火锅|烧烤|咖啡|奶茶|食|菜|汤|taco|restaurant|cafe|coffee|noodle|pizza|burger/],
    ["beauty", /美甲|美容|美发|理发|皮肤|spa|nail|salon|hair|beauty/],
    ["repair", /维修|修车|手机|电脑|保养|repair|fix|auto|mechanic/],
    ["fitness", /健身|瑜伽|拳击|私教|训练|gym|fitness|yoga|coach/],
    ["education", /培训|学校|课程|老师|补习|教育|class|school|teacher|tutor|course/],
  ];

  return rules.find(([, pattern]) => pattern.test(text))?.[0] ?? "general";
}

function extractKeywords(reviews: string[], chinese: boolean, category: ReviewScript["businessCategory"]) {
  const text = reviews.join(" ");
  const dictionaries: Record<ReviewScript["businessCategory"], string[]> = {
    food: ["汤头香", "汤头", "面劲道", "劲道", "分量足", "分量", "出餐快", "价格实惠", "实惠", "环境干净", "服务热情", "fresh", "fast", "friendly", "delicious"],
    beauty: ["效果好", "服务细致", "环境舒服", "手法专业", "干净", "friendly", "clean", "professional"],
    repair: ["修得快", "价格透明", "专业", "靠谱", "服务好", "fast", "honest", "professional"],
    fitness: ["教练专业", "氛围好", "课程扎实", "见效", "clean", "coach", "friendly"],
    education: ["老师负责", "讲得清楚", "进步明显", "课程系统", "teacher", "helpful", "clear"],
    general: ["服务热情", "体验好", "价格实惠", "环境干净", "fast", "friendly", "great"],
  };
  const dictionary = dictionaries[category];
  const found = dictionary.filter((keyword) => text.toLowerCase().includes(keyword.toLowerCase()));

  if (found.length > 0) {
    return found.slice(0, 4);
  }

  if (chinese) {
    return category === "food" ? ["口味好", "分量足", "值得试试"] : ["体验好", "服务稳", "值得推荐"];
  }

  return category === "food" ? ["fresh", "friendly", "local favorite"] : ["friendly", "trusted", "local favorite"];
}

function createHook(
  businessName: string,
  keywords: string[],
  chinese: boolean,
  category: ReviewScript["businessCategory"],
) {
  if (!chinese) {
    return `${businessName} is the local favorite`;
  }

  if (category === "food") {
    const foodKeyword = normalizeMarketingKeyword(keywords[0] ?? "好吃");
    return `${businessName}，${foodKeyword}别错过`;
  }

  const categoryLabel = {
    beauty: "变美",
    repair: "维修",
    fitness: "健身",
    education: "学习",
    general: "本地好店",
    food: "好味道",
  }[category];

  return `${businessName}，${categoryLabel}值得试`;
}

function normalizeMarketingKeyword(keyword: string) {
  return (
    {
      汤头: "汤头香",
      劲道: "面劲道",
      分量: "分量足",
      实惠: "价格实惠",
    }[keyword] ?? keyword
  );
}

function createCta(businessName: string, chinese: boolean, category: ReviewScript["businessCategory"]) {
  if (!chinese) {
    return `Book ${businessName} today.`;
  }

  return {
    food: `今天就去${businessName}吃一碗。`,
    beauty: `现在预约${businessName}体验一下。`,
    repair: `需要服务就找${businessName}。`,
    fitness: `现在去${businessName}练起来。`,
    education: `现在咨询${businessName}的课程。`,
    general: `今天就去${businessName}看看。`,
  }[category];
}
