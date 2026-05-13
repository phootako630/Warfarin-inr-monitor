import type { FoodItem } from '../types';

/**
 * 预置食物列表 — 按维生素K含量分类
 * 参考值来源: USDA FoodData Central
 * 数据硬编码在前端，不依赖网络
 */
export const FOOD_ITEMS: FoodItem[] = [
  // ═══ 🔴 高VK 蔬菜 (>100μg/100g) ═══
  { id: 'spinach',       name: '菠菜',   icon: '🥬', category: 'vegetable', vk_level: 'high', vk_mcg_per_100g: 483 },
  { id: 'kale',          name: '芥蓝',   icon: '🥦', category: 'vegetable', vk_level: 'high', vk_mcg_per_100g: 390 },
  { id: 'broccoli',      name: '西兰花', icon: '🥦', category: 'vegetable', vk_level: 'high', vk_mcg_per_100g: 141 },
  { id: 'lettuce',       name: '生菜',   icon: '🥬', category: 'vegetable', vk_level: 'high', vk_mcg_per_100g: 174 },
  { id: 'bok-choy',      name: '油菜',   icon: '🥬', category: 'vegetable', vk_level: 'high', vk_mcg_per_100g: 346 },
  { id: 'chive',         name: '韭菜',   icon: '🌿', category: 'vegetable', vk_level: 'high', vk_mcg_per_100g: 213 },
  { id: 'cilantro',      name: '香菜',   icon: '🌿', category: 'vegetable', vk_level: 'high', vk_mcg_per_100g: 310 },
  { id: 'celery-leaf',   name: '芹菜叶', icon: '🌿', category: 'vegetable', vk_level: 'high', vk_mcg_per_100g: 290 },
  { id: 'water-spinach', name: '空心菜', icon: '🥬', category: 'vegetable', vk_level: 'high', vk_mcg_per_100g: 310 },
  { id: 'seaweed',       name: '紫菜',   icon: '🟤', category: 'vegetable', vk_level: 'high', vk_mcg_per_100g: 400 },
  { id: 'crown-daisy',   name: '茼蒿',   icon: '🌿', category: 'vegetable', vk_level: 'high', vk_mcg_per_100g: 350 },
  { id: 'pea-shoots',    name: '豌豆苗', icon: '🌱', category: 'vegetable', vk_level: 'high', vk_mcg_per_100g: 300 },

  // ═══ 🟡 中VK 蔬菜 (20-100μg/100g) ═══
  { id: 'cabbage',       name: '白菜',   icon: '🥬', category: 'vegetable', vk_level: 'medium', vk_mcg_per_100g: 76 },
  { id: 'green-bean',    name: '四季豆', icon: '🫘', category: 'vegetable', vk_level: 'medium', vk_mcg_per_100g: 43 },
  { id: 'cucumber',      name: '黄瓜',   icon: '🥒', category: 'vegetable', vk_level: 'medium', vk_mcg_per_100g: 21 },
  { id: 'tomato',        name: '番茄',   icon: '🍅', category: 'vegetable', vk_level: 'medium', vk_mcg_per_100g: 24 },
  { id: 'carrot',        name: '胡萝卜', icon: '🥕', category: 'vegetable', vk_level: 'medium', vk_mcg_per_100g: 25 },
  { id: 'celery-stem',   name: '芹菜茎', icon: '🌿', category: 'vegetable', vk_level: 'medium', vk_mcg_per_100g: 29 },
  { id: 'eggplant',      name: '茄子',   icon: '🍆', category: 'vegetable', vk_level: 'medium', vk_mcg_per_100g: 30 },
  { id: 'cauliflower',   name: '花椰菜', icon: '🥦', category: 'vegetable', vk_level: 'medium', vk_mcg_per_100g: 22 },

  // ═══ 🟢 低VK 蔬菜 (<20μg/100g) ═══
  { id: 'potato',        name: '土豆',   icon: '🥔', category: 'vegetable', vk_level: 'low', vk_mcg_per_100g: 2 },
  { id: 'sweet-potato',  name: '红薯',   icon: '🍠', category: 'vegetable', vk_level: 'low', vk_mcg_per_100g: 2 },
  { id: 'corn',          name: '玉米',   icon: '🌽', category: 'vegetable', vk_level: 'low', vk_mcg_per_100g: 1 },
  { id: 'mushroom',      name: '蘑菇',   icon: '🍄', category: 'vegetable', vk_level: 'low', vk_mcg_per_100g: 1 },
  { id: 'onion',         name: '洋葱',   icon: '🧅', category: 'vegetable', vk_level: 'low', vk_mcg_per_100g: 1 },
  { id: 'garlic',        name: '大蒜',   icon: '🧄', category: 'vegetable', vk_level: 'low', vk_mcg_per_100g: 2 },

  // ═══ 肉蛋类 ═══
  { id: 'pork-liver',    name: '猪肝',   icon: '🫀', category: 'meat', vk_level: 'high', vk_mcg_per_100g: 150 },
  { id: 'chicken-liver', name: '鸡肝',   icon: '🫀', category: 'meat', vk_level: 'high', vk_mcg_per_100g: 80 },
  { id: 'egg',           name: '鸡蛋',   icon: '🥚', category: 'meat', vk_level: 'medium', vk_mcg_per_100g: 32 },
  { id: 'tofu',          name: '豆腐',   icon: '🧈', category: 'meat', vk_level: 'medium', vk_mcg_per_100g: 25 },
  { id: 'lean-pork',     name: '瘦肉',   icon: '🥩', category: 'meat', vk_level: 'low', vk_mcg_per_100g: 5 },
  { id: 'chicken',       name: '鸡肉',   icon: '🍗', category: 'meat', vk_level: 'low', vk_mcg_per_100g: 3 },
  { id: 'fish',          name: '鱼',     icon: '🐟', category: 'meat', vk_level: 'low', vk_mcg_per_100g: 3 },
  { id: 'shrimp',        name: '虾',     icon: '🦐', category: 'meat', vk_level: 'low', vk_mcg_per_100g: 1 },
  { id: 'beef',          name: '牛肉',   icon: '🥩', category: 'meat', vk_level: 'low', vk_mcg_per_100g: 4 },
  { id: 'duck',          name: '鸭肉',   icon: '🦆', category: 'meat', vk_level: 'low', vk_mcg_per_100g: 5 },
  { id: 'milk',          name: '牛奶',   icon: '🥛', category: 'meat', vk_level: 'low', vk_mcg_per_100g: 1 },

  // ═══ 水果 ═══
  { id: 'kiwi',          name: '猕猴桃', icon: '🥝', category: 'fruit', vk_level: 'medium', vk_mcg_per_100g: 40 },
  { id: 'avocado',       name: '牛油果', icon: '🥑', category: 'fruit', vk_level: 'medium', vk_mcg_per_100g: 21 },
  { id: 'grape',         name: '葡萄',   icon: '🍇', category: 'fruit', vk_level: 'medium', vk_mcg_per_100g: 22 },
  { id: 'apple',         name: '苹果',   icon: '🍎', category: 'fruit', vk_level: 'low', vk_mcg_per_100g: 4 },
  { id: 'banana',        name: '香蕉',   icon: '🍌', category: 'fruit', vk_level: 'low', vk_mcg_per_100g: 1 },
  { id: 'orange',        name: '橙子',   icon: '🍊', category: 'fruit', vk_level: 'low', vk_mcg_per_100g: 1 },
  { id: 'watermelon',    name: '西瓜',   icon: '🍉', category: 'fruit', vk_level: 'low', vk_mcg_per_100g: 0 },
  { id: 'pear',          name: '梨',     icon: '🍐', category: 'fruit', vk_level: 'low', vk_mcg_per_100g: 5 },
  { id: 'peach',         name: '桃',     icon: '🍑', category: 'fruit', vk_level: 'low', vk_mcg_per_100g: 3 },
  { id: 'strawberry',    name: '草莓',   icon: '🍓', category: 'fruit', vk_level: 'low', vk_mcg_per_100g: 2 },

  // ═══ 主食 ═══
  { id: 'rice',          name: '米饭',   icon: '🍚', category: 'staple', vk_level: 'low', vk_mcg_per_100g: 0 },
  { id: 'noodle',        name: '面条',   icon: '🍜', category: 'staple', vk_level: 'low', vk_mcg_per_100g: 0 },
  { id: 'bread',         name: '馒头/面包', icon: '🍞', category: 'staple', vk_level: 'low', vk_mcg_per_100g: 1 },
  { id: 'congee',        name: '粥',     icon: '🥣', category: 'staple', vk_level: 'low', vk_mcg_per_100g: 0 },
  { id: 'dumpling',      name: '饺子/馄饨', icon: '🥟', category: 'staple', vk_level: 'low', vk_mcg_per_100g: 3 },

  // ═══ 其他 ═══
  { id: 'soybean-oil',   name: '大豆油', icon: '🫗', category: 'other', vk_level: 'medium', vk_mcg_per_100g: 60 },
  { id: 'peanut-oil',    name: '花生油', icon: '🫗', category: 'other', vk_level: 'medium', vk_mcg_per_100g: 30 },
  { id: 'olive-oil',     name: '橄榄油', icon: '🫒', category: 'other', vk_level: 'medium', vk_mcg_per_100g: 55 },
  { id: 'green-tea',     name: '绿茶',   icon: '🍵', category: 'other', vk_level: 'high', vk_mcg_per_100g: 262 },
  { id: 'natto',         name: '纳豆',   icon: '🫘', category: 'other', vk_level: 'high', vk_mcg_per_100g: 1000 },
  { id: 'soy-sauce',     name: '酱油',   icon: '🧉', category: 'other', vk_level: 'low', vk_mcg_per_100g: 0 },
];

/**
 * 按ID快速查找食物
 */
const FOOD_MAP = new Map<string, FoodItem>(FOOD_ITEMS.map((f) => [f.id, f]));

export function getFoodById(id: string): FoodItem | undefined {
  return FOOD_MAP.get(id);
}

/**
 * 按分类获取食物列表
 */
export function getFoodsByCategory(category: string): FoodItem[] {
  return FOOD_ITEMS.filter((f) => f.category === category);
}
