import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Loading } from '../components/Loading';
import { getMealLogsByDate, saveMealLog, deleteMealLog } from '../lib/api';
import { getSession } from '../lib/auth';
import { FOOD_ITEMS, getFoodById } from '../lib/foodData';
import {
  MEAL_TYPE_LABELS,
  VK_LEVEL_LABELS,
  PORTION_LABELS,
  FOOD_CATEGORY_LABELS,
} from '../types';
import type {
  MealType,
  MealLogWithItems,
  FoodCategory,
  VkLevel,
  Portion,
  FoodItem,
} from '../types';

interface SelectedFood {
  food_id: string;
  name: string;
  icon: string;
  vk_level: VkLevel;
  portion: Portion;
  custom_name?: string;
}

export function MealFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');

  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [userId, setUserId]     = useState('');

  // 当前选择的餐次
  const [activeMeal, setActiveMeal] = useState<MealType | null>(null);
  // 当前食物分类 tab
  const [foodCategory, setFoodCategory] = useState<FoodCategory>('vegetable');
  // 已选食物列表
  const [selectedFoods, setSelectedFoods] = useState<SelectedFood[]>([]);
  // 备注
  const [notes, setNotes] = useState('');

  // 当天已有的餐食记录
  const [dayMeals, setDayMeals] = useState<MealLogWithItems[]>([]);

  // 自定义食物
  const [showCustom, setShowCustom]     = useState(false);
  const [customName, setCustomName]     = useState('');
  const [customVkLevel, setCustomVkLevel] = useState<VkLevel>('low');

  // 昨天餐食（用于"和昨天一样"）
  const [yesterdayMeals, setYesterdayMeals] = useState<MealLogWithItems[]>([]);

  useEffect(() => { loadData(); }, [dateParam]);

  const loadData = async () => {
    setLoading(true);
    try {
      const session = await getSession();
      if (!session) { navigate('/login'); return; }
      setUserId(session.user.id);

      const meals = await getMealLogsByDate(dateParam);
      setDayMeals(meals);

      // 加载昨天的记录
      const yesterday = new Date(dateParam);
      yesterday.setDate(yesterday.getDate() - 1);
      const yMeals = await getMealLogsByDate(format(yesterday, 'yyyy-MM-dd'));
      setYesterdayMeals(yMeals);
    } catch (err) {
      console.error('加载失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const openMealEditor = (meal: MealType) => {
    setActiveMeal(meal);
    setFoodCategory('vegetable');
    setNotes('');
    setShowCustom(false);

    // 如果已有记录，加载已选食物
    const existing = dayMeals.find((m) => m.meal_type === meal);
    if (existing) {
      const foods: SelectedFood[] = existing.items.map((item) => {
        const food = getFoodById(item.food_id);
        return {
          food_id: item.food_id,
          name: item.custom_name || food?.name || item.food_id,
          icon: food?.icon || '🍽️',
          vk_level: item.vk_level as VkLevel,
          portion: item.portion as Portion,
          custom_name: item.custom_name || undefined,
        };
      });
      setSelectedFoods(foods);
      setNotes(existing.notes || '');
    } else {
      setSelectedFoods([]);
    }
  };

  const toggleFood = (food: FoodItem) => {
    setSelectedFoods((prev) => {
      const idx = prev.findIndex((f) => f.food_id === food.id);
      if (idx >= 0) {
        return prev.filter((_, i) => i !== idx);
      }
      return [...prev, {
        food_id: food.id,
        name: food.name,
        icon: food.icon,
        vk_level: food.vk_level,
        portion: 'normal' as Portion,
      }];
    });
  };

  const updatePortion = (foodId: string, portion: Portion) => {
    setSelectedFoods((prev) =>
      prev.map((f) => f.food_id === foodId ? { ...f, portion } : f)
    );
  };

  const addCustomFood = () => {
    if (!customName.trim()) return;
    const id = `custom-${Date.now()}`;
    setSelectedFoods((prev) => [...prev, {
      food_id: id,
      name: customName.trim(),
      icon: '🍽️',
      vk_level: customVkLevel,
      portion: 'normal',
      custom_name: customName.trim(),
    }]);
    setCustomName('');
    setShowCustom(false);
  };

  const copyFromYesterday = (meal: MealType) => {
    const yMeal = yesterdayMeals.find((m) => m.meal_type === meal);
    if (!yMeal || yMeal.items.length === 0) {
      alert('昨天没有这餐的记录');
      return;
    }
    const foods: SelectedFood[] = yMeal.items.map((item) => {
      const food = getFoodById(item.food_id);
      return {
        food_id: item.food_id,
        name: item.custom_name || food?.name || item.food_id,
        icon: food?.icon || '🍽️',
        vk_level: item.vk_level as VkLevel,
        portion: item.portion as Portion,
        custom_name: item.custom_name || undefined,
      };
    });
    setSelectedFoods(foods);
  };

  const handleSave = async () => {
    if (!activeMeal || selectedFoods.length === 0) return;
    setSaving(true);
    try {
      await saveMealLog(
        userId,
        dateParam,
        activeMeal,
        selectedFoods.map((f) => ({
          food_id: f.food_id,
          custom_name: f.custom_name,
          vk_level: f.vk_level,
          portion: f.portion,
        })),
        notes || undefined
      );
      setActiveMeal(null);
      await loadData();
    } catch (err) {
      console.error('保存失败:', err);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMeal = async (id: string) => {
    if (!confirm('确定删除这餐记录吗？')) return;
    try {
      await deleteMealLog(id);
      await loadData();
    } catch (err) {
      console.error('删除失败:', err);
      alert('删除失败');
    }
  };

  if (loading) {
    return <Layout><div className="p-4"><Loading message="加载中..." /></div></Layout>;
  }

  const isToday = dateParam === format(new Date(), 'yyyy-MM-dd');
  const categoryFoods = FOOD_ITEMS.filter((f) => f.category === foodCategory);

  // 今日 VK 统计
  const allItems = dayMeals.flatMap((m) => m.items);
  const highCount   = allItems.filter((i) => i.vk_level === 'high').length;
  const mediumCount = allItems.filter((i) => i.vk_level === 'medium').length;

  return (
    <Layout>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>← 返回</Button>
          <h1 className="text-xl font-bold text-gray-900">
            {isToday ? '今日饮食' : `${dateParam} 饮食`}
          </h1>
          <div className="w-16" />
        </div>

        {/* 今日 VK 水平总览 */}
        {allItems.length > 0 && (
          <Card className={`border-2 ${
            highCount >= 2 ? 'border-red-300 bg-red-50' :
            highCount >= 1 || mediumCount >= 2 ? 'border-yellow-300 bg-yellow-50' :
            'border-green-300 bg-green-50'
          }`}>
            <p className="text-sm text-gray-600 mb-1">今日维K摄入</p>
            <p className="text-xl font-bold">
              {highCount >= 2 ? '🔴 偏高' :
               highCount >= 1 || mediumCount >= 2 ? '🟡 适中' : '🟢 偏低'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              高VK×{highCount}　中VK×{mediumCount}　低VK×{allItems.length - highCount - mediumCount}
            </p>
          </Card>
        )}

        {/* 餐次选择 — 当未进入编辑模式时 */}
        {!activeMeal && (
          <>
            <p className="text-base font-medium text-gray-700">选择要记录的餐次</p>
            <div className="grid grid-cols-2 gap-3">
              {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((meal) => {
                const existing = dayMeals.find((m) => m.meal_type === meal);
                return (
                  <button
                    key={meal}
                    onClick={() => openMealEditor(meal)}
                    className={`p-4 rounded-2xl border-2 text-center transition-colors ${
                      existing
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-200 bg-white hover:border-blue-300'
                    }`}
                  >
                    <p className="text-2xl mb-1">{MEAL_TYPE_LABELS[meal].split(' ')[0]}</p>
                    <p className="text-base font-medium">{MEAL_TYPE_LABELS[meal].split(' ')[1]}</p>
                    {existing && (
                      <p className="text-xs text-green-600 mt-1">{existing.items.length} 项已记录</p>
                    )}
                  </button>
                );
              })}
            </div>

            {/* 已记录餐食详情 */}
            {dayMeals.map((meal) => (
              <Card key={meal.id} className="border-l-4 border-l-green-400">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-base font-semibold">{MEAL_TYPE_LABELS[meal.meal_type]}</p>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openMealEditor(meal.meal_type)}>编辑</Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteMeal(meal.id)} className="text-red-500">删除</Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {meal.items.map((item) => {
                    const food = getFoodById(item.food_id);
                    const bgColor = item.vk_level === 'high' ? 'bg-red-100' : item.vk_level === 'medium' ? 'bg-yellow-100' : 'bg-green-100';
                    return (
                      <span key={item.id} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm ${bgColor}`}>
                        {food?.icon || '🍽️'} {item.custom_name || food?.name || item.food_id}
                        {item.portion !== 'normal' && <span className="text-xs text-gray-500">({PORTION_LABELS[item.portion as keyof typeof PORTION_LABELS]})</span>}
                      </span>
                    );
                  })}
                </div>
                {meal.notes && <p className="text-sm text-gray-500 mt-1">备注: {meal.notes}</p>}
              </Card>
            ))}
          </>
        )}

        {/* 食物选择编辑器 */}
        {activeMeal && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{MEAL_TYPE_LABELS[activeMeal]}</h2>
              <Button variant="ghost" size="sm" onClick={() => copyFromYesterday(activeMeal)}>
                📋 和昨天一样
              </Button>
            </div>

            {/* 已选食物 */}
            {selectedFoods.length > 0 && (
              <Card>
                <p className="text-sm text-gray-600 mb-2">已选 {selectedFoods.length} 项</p>
                <div className="space-y-2">
                  {selectedFoods.map((food) => {
                    const bgColor = food.vk_level === 'high' ? 'bg-red-50' : food.vk_level === 'medium' ? 'bg-yellow-50' : 'bg-green-50';
                    return (
                      <div key={food.food_id} className={`flex items-center justify-between p-2 rounded-xl ${bgColor}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{food.icon}</span>
                          <span className="font-medium">{food.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {(['small', 'normal', 'large'] as Portion[]).map((p) => (
                            <button
                              key={p}
                              onClick={() => updatePortion(food.food_id, p)}
                              className={`px-2 py-1 text-xs rounded-lg ${
                                food.portion === p ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {PORTION_LABELS[p]}
                            </button>
                          ))}
                          <button
                            onClick={() => setSelectedFoods((prev) => prev.filter((f) => f.food_id !== food.food_id))}
                            className="ml-1 text-red-400 text-lg"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* 分类 tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1">
              {(Object.keys(FOOD_CATEGORY_LABELS) as FoodCategory[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFoodCategory(cat)}
                  className={`px-3 py-2 rounded-xl text-sm whitespace-nowrap ${
                    foodCategory === cat ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {FOOD_CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>

            {/* 食物网格 */}
            <div className="grid grid-cols-4 gap-2">
              {categoryFoods.map((food) => {
                const isSelected = selectedFoods.some((f) => f.food_id === food.id);
                const vkBg = food.vk_level === 'high' ? 'border-red-300 bg-red-50' :
                             food.vk_level === 'medium' ? 'border-yellow-300 bg-yellow-50' :
                             'border-green-300 bg-green-50';
                return (
                  <button
                    key={food.id}
                    onClick={() => toggleFood(food)}
                    className={`p-2 rounded-xl border-2 text-center transition-all ${
                      isSelected ? 'ring-2 ring-blue-500 border-blue-400 bg-blue-50' : vkBg
                    }`}
                  >
                    <p className="text-2xl">{food.icon}</p>
                    <p className="text-xs font-medium mt-0.5 leading-tight">{food.name}</p>
                  </button>
                );
              })}

              {/* 自定义添加按钮 */}
              <button
                onClick={() => setShowCustom(!showCustom)}
                className="p-2 rounded-xl border-2 border-dashed border-gray-300 text-center hover:border-blue-300"
              >
                <p className="text-2xl">➕</p>
                <p className="text-xs text-gray-500 mt-0.5">自定义</p>
              </button>
            </div>

            {/* 自定义食物输入 */}
            {showCustom && (
              <Card className="border-2 border-blue-200">
                <p className="text-sm font-medium mb-2">添加自定义食物</p>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="食物名称"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-base mb-2"
                />
                <div className="flex gap-2 mb-2">
                  {(['high', 'medium', 'low'] as VkLevel[]).map((lv) => (
                    <button
                      key={lv}
                      onClick={() => setCustomVkLevel(lv)}
                      className={`flex-1 px-2 py-2 rounded-xl text-sm ${
                        customVkLevel === lv ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {VK_LEVEL_LABELS[lv]}
                    </button>
                  ))}
                </div>
                <Button variant="primary" size="sm" onClick={addCustomFood} disabled={!customName.trim()}>
                  添加
                </Button>
              </Card>
            )}

            {/* 备注 */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">备注（可选）</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="如：在外吃饭"
                className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm"
              />
            </div>

            {/* 保存/取消 */}
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setActiveMeal(null)}>取消</Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleSave}
                disabled={saving || selectedFoods.length === 0}
              >
                {saving ? '保存中...' : '保存'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
