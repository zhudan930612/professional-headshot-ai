import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://osxwjhvlntrornibhkfu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zeHdqaHZsbnRyb3JuaWJoa2Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0Mzg0MTEsImV4cCI6MjA4MTAxNDQxMX0.k83zIxryv2ejZP2uyvj1UmB06baI33G58hXzI5dkk9o';

console.log('🔍 开始验证数据库数据...\n');
console.log('═'.repeat(80));

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyTotalCount() {
  console.log('\n📊 验证总记录数...');

  const { count, error } = await supabase
    .from('reference_templates')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error(`❌ 查询失败: ${error.message}`);
    return false;
  }

  console.log(`   总记录数: ${count}`);
  if (count === 96) {
    console.log('   ✅ 正确！应该是96条记录\n');
    return true;
  } else {
    console.log(`   ⚠️  错误！应该是96条记录，实际是${count}条\n`);
    return false;
  }
}

async function verifyCategoryDistribution() {
  console.log('📋 验证分类分布...\n');

  const categories = ['Corporate', 'Creative', 'General', 'Medical', 'RealEstate', 'SolidColor'];
  let allCorrect = true;

  for (const category of categories) {
    const { count, error } = await supabase
      .from('reference_templates')
      .select('*', { count: 'exact', head: true })
      .eq('category', category);

    if (error) {
      console.error(`   ❌ ${category}: 查询失败 - ${error.message}`);
      allCorrect = false;
      continue;
    }

    const status = count === 16 ? '✅' : '⚠️';
    console.log(`   ${status} ${category.padEnd(12)}: ${count} 条记录 ${count === 16 ? '' : '(应该是16条)'}`);

    if (count !== 16) allCorrect = false;
  }

  console.log();
  return allCorrect;
}

async function verifyDataStructure() {
  console.log('🔧 验证数据结构...\n');

  const { data, error } = await supabase
    .from('reference_templates')
    .select('*')
    .limit(3);

  if (error) {
    console.error(`   ❌ 查询失败: ${error.message}\n`);
    return false;
  }

  console.log('   示例记录（前3条）:');
  data.forEach((record, index) => {
    console.log(`\n   记录 ${index + 1}:`);
    console.log(`   - template_id: ${record.template_id}`);
    console.log(`   - name: ${record.name}`);
    console.log(`   - category: ${record.category}`);
    console.log(`   - storage_path: ${record.storage_path}`);
    console.log(`   - is_active: ${record.is_active}`);
    console.log(`   - sort_order: ${record.sort_order}`);
    console.log(`   - full_url: ${record.full_url.substring(0, 80)}...`);
  });

  console.log('\n   ✅ 数据结构正确\n');
  return true;
}

async function testImageURLs() {
  console.log('🌐 测试图片URL可访问性...\n');

  const { data, error } = await supabase
    .from('reference_templates')
    .select('template_id, full_url, category')
    .limit(6);

  if (error) {
    console.error(`   ❌ 查询失败: ${error.message}\n`);
    return false;
  }

  console.log('   测试每个分类的第一张图片:\n');

  let allAccessible = true;
  const testedCategories = new Set();

  for (const record of data) {
    if (testedCategories.has(record.category)) continue;
    testedCategories.add(record.category);

    try {
      const response = await fetch(record.full_url, { method: 'HEAD' });
      const status = response.ok ? '✅' : '❌';
      console.log(`   ${status} ${record.category.padEnd(12)}: ${record.template_id} - ${response.status} ${response.statusText}`);

      if (!response.ok) allAccessible = false;
    } catch (err) {
      console.log(`   ❌ ${record.category.padEnd(12)}: ${record.template_id} - 网络错误`);
      allAccessible = false;
    }
  }

  console.log();
  return allAccessible;
}

async function verifySortOrder() {
  console.log('🔢 验证排序顺序...\n');

  const { data, error } = await supabase
    .from('reference_templates')
    .select('category, sort_order')
    .order('category')
    .order('sort_order');

  if (error) {
    console.error(`   ❌ 查询失败: ${error.message}\n`);
    return false;
  }

  let currentCategory = '';
  let expectedOrder = 1;
  let allCorrect = true;

  data.forEach(record => {
    if (record.category !== currentCategory) {
      currentCategory = record.category;
      expectedOrder = 1;
    }

    if (record.sort_order !== expectedOrder) {
      console.log(`   ⚠️  ${record.category}: sort_order错误，期望${expectedOrder}，实际${record.sort_order}`);
      allCorrect = false;
    }
    expectedOrder++;
  });

  if (allCorrect) {
    console.log('   ✅ 所有记录的sort_order都正确（1-16）\n');
  }

  return allCorrect;
}

async function main() {
  const results = {
    totalCount: false,
    categoryDistribution: false,
    dataStructure: false,
    imageURLs: false,
    sortOrder: false
  };

  results.totalCount = await verifyTotalCount();
  results.categoryDistribution = await verifyCategoryDistribution();
  results.dataStructure = await verifyDataStructure();
  results.imageURLs = await testImageURLs();
  results.sortOrder = await verifySortOrder();

  console.log('═'.repeat(80));
  console.log('\n📊 验证结果汇总:\n');
  console.log(`   ${results.totalCount ? '✅' : '❌'} 总记录数: ${results.totalCount ? '96条（正确）' : '不正确'}`);
  console.log(`   ${results.categoryDistribution ? '✅' : '❌'} 分类分布: ${results.categoryDistribution ? '每个分类16条（正确）' : '不正确'}`);
  console.log(`   ${results.dataStructure ? '✅' : '❌'} 数据结构: ${results.dataStructure ? '完整' : '不完整'}`);
  console.log(`   ${results.imageURLs ? '✅' : '❌'} 图片URL: ${results.imageURLs ? '可访问' : '有问题'}`);
  console.log(`   ${results.sortOrder ? '✅' : '❌'} 排序顺序: ${results.sortOrder ? '正确' : '有问题'}`);

  const allPassed = Object.values(results).every(r => r === true);

  console.log('\n═'.repeat(80));
  if (allPassed) {
    console.log('🎉 恭喜！所有验证通过，数据库初始化成功！');
    console.log('\n📝 下一步:');
    console.log('   1. 实现 /api/reference-templates API');
    console.log('   2. 实现 /api/upload API');
    console.log('   3. 实现 /api/generate API');
  } else {
    console.log('⚠️  部分验证未通过，请检查上述错误信息');
  }
  console.log('═'.repeat(80));
}

main().catch(console.error);
