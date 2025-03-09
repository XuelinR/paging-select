<template>
  <div class="container">
    <h1>分页选择器示例</h1>
    
    <div class="demo-section">
      <h2>基础用法</h2>
      <div class="settings-panel">
        <label>每页加载数量：</label>
        <el-input-number v-model="pageSizeValue" :min="5" :max="50" :step="5" @change="handlePageSizeChange" />
      </div>
      <div class="form-row">
        <div class="form-item">
          <label>类型：</label>
          <PagingSelect
            v-model="selectedValue"
            :fn-get-option="fetchOptions"
            :page-size="pageSizeValue"
            @setRelatedValue="handleSetRelated"
            width="300px"
          />
        </div>
      </div>
      <div class="result">
        <p>当前选中值: {{ selectedValue }}</p>
        <p v-if="selectedItem">选中项详情: {{ selectedItem }}</p>
        <p>每页加载数量: {{ pageSizeValue }}</p>
      </div>
    </div>
    
    <div class="demo-section">
      <h2>带关联值的用法</h2>
      <div class="form-row">
        <div class="form-item">
          <label>类型：</label>
          <el-select v-model="typeValue" placeholder="请选择类型" @change="handleTypeChange">
            <el-option
              v-for="item in typeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </div>
        <div class="form-item">
          <label>选项：</label>
          <PagingSelect
            v-model="relatedValue"
            :fn-get-option="fetchRelatedOptions"
            :related-key="typeValue"
            @setRelatedValue="handleSetRelated"
            width="300px"
          />
        </div>
      </div>
      <div class="result">
        <p>类型: {{ typeValue }}</p>
        <p>选中值: {{ relatedValue }}</p>
        <p v-if="selectedItem">选中项详情: {{ selectedItem }}</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive } from 'vue';
import { PagingSelect } from '../src';

// 模拟数据
const mockData = reactive({
  type1: [
    { code: '1001', ename: 'Apple', cname: '苹果' },
    { code: '1002', ename: 'Banana', cname: '香蕉' },
    { code: '1003', ename: 'Orange', cname: '橙子' },
    { code: '1004', ename: 'Grape', cname: '葡萄' },
    { code: '1005', ename: 'Strawberry', cname: '草莓' },
    // 模拟更多数据
    ...Array.from({ length: 30 }, (_, i) => ({
      code: `10${i + 6}`.padStart(4, '0'),
      ename: `Fruit${i + 6}`,
      cname: `水果${i + 6}`
    }))
  ],
  type2: [
    { code: '2001', ename: 'Carrot', cname: '胡萝卜' },
    { code: '2002', ename: 'Potato', cname: '土豆' },
    { code: '2003', ename: 'Tomato', cname: '番茄' },
    { code: '2004', ename: 'Cucumber', cname: '黄瓜' },
    { code: '2005', ename: 'Eggplant', cname: '茄子' },
    // 模拟更多数据
    ...Array.from({ length: 30 }, (_, i) => ({
      code: `20${i + 6}`.padStart(4, '0'),
      ename: `Vegetable${i + 6}`,
      cname: `蔬菜${i + 6}`
    }))
  ]
});

// 状态
const selectedValue = ref('');
const relatedValue = ref('');
const typeValue = ref('type1');
const selectedItem = ref(null);
const pageSizeValue = ref(10);

// 类型选项
const typeOptions = [
  { value: 'type1', label: '水果' },
  { value: 'type2', label: '蔬菜' }
];

// 模拟API调用
const fetchOptions = (params: any) => {
  console.log('Fetching options with params:', params);
  return new Promise(resolve => {
    setTimeout(() => {
      const { page, limit, searchKey } = params;
      const data = mockData.type1;
      
      // 搜索过滤
      let filteredData = data;
      if (searchKey) {
        filteredData = data.filter((item: { ename: string; cname: string|any[]; code: string|any[]; }) => 
          item.ename.toLowerCase().includes(searchKey.toLowerCase()) || 
          item.cname.includes(searchKey) ||
          item.code.includes(searchKey)
        );
      }
      
      // 分页
      const start = (page - 1) * limit;
      const end = page * limit;
      const list = filteredData.slice(start, end);
      
      resolve({
        list,
        total: filteredData.length,
        pages: Math.ceil(filteredData.length / limit)
      });
    }, 300);
  });
};

// 带关联值的API调用
const fetchRelatedOptions = (params: any) => {
  console.log('Fetching related options with params:', params);
  return new Promise(resolve => {
    setTimeout(() => {
      const { page, limit, relatedKey, searchKey } = params;
      const data = mockData[relatedKey as 'type1' | 'type2'] || [];
      
      // 搜索过滤
      let filteredData = data;
      if (searchKey) {
        filteredData = data.filter((item: { ename: string; cname: string|any[]; code: string|any[]; }) => 
          item.ename.toLowerCase().includes(searchKey.toLowerCase()) || 
          item.cname.includes(searchKey) ||
          item.code.includes(searchKey)
        );
      }
      
      // 分页
      const start = (page - 1) * limit;
      const end = page * limit;
      const list = filteredData.slice(start, end);
      
      resolve({
        list,
        total: filteredData.length,
        pages: Math.ceil(filteredData.length / limit)
      });
    }, 300);
  });
};

// 处理选中事件
const handleSetRelated = (item: any) => {
  console.log('Selected item:', item);
  selectedItem.value = item;
};

// 处理类型变更
const handleTypeChange = () => {
  relatedValue.value = '';
  selectedItem.value = null;
};

// 处理页面大小变更
const handlePageSizeChange = (val: number) => {
  console.log('Page size changed to:', val);
  pageSizeValue.value = val;
};
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

h1 {
  text-align: center;
  margin-bottom: 30px;
  color: #409EFF;
}

.demo-section {
  margin-bottom: 40px;
  padding: 20px;
  border: 1px solid #EBEEF5;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

h2 {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 18px;
  color: #303133;
  border-bottom: 1px solid #EBEEF5;
  padding-bottom: 10px;
}

.result {
  margin-top: 20px;
  background-color: #F5F7FA;
  padding: 10px;
  border-radius: 4px;
}

.form-row {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.form-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}

label {
  /* width: 60px; */
  text-align: right;
}
.el-select {
  width: 300px;
}
.settings-panel {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}
</style> 