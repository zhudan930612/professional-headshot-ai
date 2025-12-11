import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://osxwjhvlntrornibhkfu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zeHdqaHZsbnRyb3JuaWJoa2Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0Mzg0MTEsImV4cCI6MjA4MTAxNDQxMX0.k83zIxryv2ejZP2uyvj1UmB06baI33G58hXzI5dkk9o';

console.log('🧪 测试 Reference Templates API\n');
console.log('═'.repeat(80));

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * 测试1: 获取所有模板
 */
async function testGetAllTemplates() {
  console.log('\n📋 测试1: 获取所有模板\n');

  try {
    const { data, error } = await supabase
      .from('reference_templates')
      .select('*')
      .eq('is_active', true)
      .order('category')
      .order('sort_order');

    if (error) throw error;

    console.log(`   ✅ 成功获取 ${data.length} 个模板`);

    // 按分类统计
    const categoryCounts = {};
    data.forEach(item => {
      categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
    });

    console.log('\n   分类统计:');
    Object.entries(categoryCounts).forEach(([category, count]) => {
      console.log(`   - ${category}: ${count} 个`);
    });

    return true;
  } catch (error) {
    console.error('   ❌ 测试失败:', error.message);
    return false;
  }
}

/**
 * 测试2: 按分类过滤
 */
async function testFilterByCategory() {
  console.log('\n📋 测试2: 按分类过滤\n');

  const categories = ['Corporate', 'Creative', 'General', 'Medical', 'RealEstate', 'SolidColor'];
  let allPassed = true;

  for (const category of categories) {
    try {
      const { data, error } = await supabase
        .from('reference_templates')
        .select('*')
        .eq('category', category)
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;

      const status = data.length === 16 ? '✅' : '⚠️';
      console.log(`   ${status} ${category.padEnd(12)}: ${data.length} 个模板 ${data.length === 16 ? '' : '(期望16个)'}`);

      if (data.length !== 16) allPassed = false;

    } catch (error) {
      console.error(`   ❌ ${category}: ${error.message}`);
      allPassed = false;
    }
  }

  return allPassed;
}

/**
 * 测试3: 验证数据结构
 */
async function testDataStructure() {
  console.log('\n📋 测试3: 验证数据结构\n');

  try {
    const { data, error } = await supabase
      .from('reference_templates')
      .select('*')
      .limit(1);

    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('No data found');
    }

    const template = data[0];
    const requiredFields = [
      'template_id',
      'name',
      'category',
      'storage_path',
      'full_url',
      'is_active',
      'sort_order'
    ];

    let allFieldsPresent = true;

    console.log('   检查必需字段:');
    requiredFields.forEach(field => {
      const exists = template.hasOwnProperty(field);
      const status = exists ? '✅' : '❌';
      console.log(`   ${status} ${field}`);
      if (!exists) allFieldsPresent = false;
    });

    if (allFieldsPresent) {
      console.log('\n   示例模板:');
      console.log(`   - template_id: ${template.template_id}`);
      console.log(`   - name: ${template.name}`);
      console.log(`   - category: ${template.category}`);
      console.log(`   - storage_path: ${template.storage_path}`);
      console.log(`   - full_url: ${template.full_url.substring(0, 60)}...`);
      console.log(`   - is_active: ${template.is_active}`);
      console.log(`   - sort_order: ${template.sort_order}`);
    }

    return allFieldsPresent;

  } catch (error) {
    console.error('   ❌ 测试失败:', error.message);
    return false;
  }
}

/**
 * 测试4: 测试排序
 */
async function testSorting() {
  console.log('\n📋 测试4: 测试排序\n');

  try {
    const { data, error } = await supabase
      .from('reference_templates')
      .select('*')
      .eq('category', 'Corporate')
      .eq('is_active', true)
      .order('sort_order');

    if (error) throw error;

    let sortCorrect = true;
    for (let i = 0; i < data.length; i++) {
      if (data[i].sort_order !== i + 1) {
        console.log(`   ⚠️  排序错误: 位置 ${i} 的 sort_order 是 ${data[i].sort_order}，期望 ${i + 1}`);
        sortCorrect = false;
      }
    }

    if (sortCorrect) {
      console.log(`   ✅ Corporate分类排序正确（1-${data.length}）`);
    }

    return sortCorrect;

  } catch (error) {
    console.error('   ❌ 测试失败:', error.message);
    return false;
  }
}

/**
 * 测试5: 模拟API响应格式
 */
async function testAPIResponseFormat() {
  console.log('\n📋 测试5: 模拟API响应格式\n');

  try {
    const { data, error } = await supabase
      .from('reference_templates')
      .select('*')
      .eq('category', 'Corporate')
      .eq('is_active', true)
      .order('sort_order')
      .limit(3);

    if (error) throw error;

    // 转换为API响应格式
    const templates = data.map(record => ({
      templateId: record.template_id,
      id: record.template_id,
      name: record.name,
      label: record.name,
      category: record.category,
      thumbnailUrl: record.thumbnail_url || record.full_url,
      imageUrl: record.full_url,
      fullUrl: record.full_url,
      description: record.description,
      sortOrder: record.sort_order,
      isActive: record.is_active,
      storagePath: record.storage_path,
      createdAt: record.created_at
    }));

    console.log('   ✅ API响应格式示例（前3个）:\n');
    templates.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.name}`);
      console.log(`      - templateId: ${t.templateId}`);
      console.log(`      - category: ${t.category}`);
      console.log(`      - imageUrl: ${t.imageUrl.substring(0, 60)}...`);
    });

    return true;

  } catch (error) {
    console.error('   ❌ 测试失败:', error.message);
    return false;
  }
}

/**
 * 主测试函数
 */
async function main() {
  const results = {
    getAllTemplates: false,
    filterByCategory: false,
    dataStructure: false,
    sorting: false,
    apiResponseFormat: false
  };

  results.getAllTemplates = await testGetAllTemplates();
  results.filterByCategory = await testFilterByCategory();
  results.dataStructure = await testDataStructure();
  results.sorting = await testSorting();
  results.apiResponseFormat = await testAPIResponseFormat();

  console.log('\n═'.repeat(80));
  console.log('\n📊 测试结果汇总:\n');
  console.log(`   ${results.getAllTemplates ? '✅' : '❌'} 获取所有模板`);
  console.log(`   ${results.filterByCategory ? '✅' : '❌'} 按分类过滤`);
  console.log(`   ${results.dataStructure ? '✅' : '❌'} 数据结构验证`);
  console.log(`   ${results.sorting ? '✅' : '❌'} 排序测试`);
  console.log(`   ${results.apiResponseFormat ? '✅' : '❌'} API响应格式`);

  const allPassed = Object.values(results).every(r => r === true);

  console.log('\n═'.repeat(80));
  if (allPassed) {
    console.log('🎉 所有测试通过！API已准备就绪');
    console.log('\n📝 API端点:');
    console.log('   - GET /api/reference-templates (获取所有模板)');
    console.log('   - GET /api/reference-templates?category=Corporate (按分类过滤)');
    console.log('   - GET /api/reference-templates?active=false (包含未激活的)');
  } else {
    console.log('⚠️  部分测试未通过，请检查上述错误');
  }
  console.log('═'.repeat(80));
}

main().catch(console.error);
