<template>
  <el-select
    ref="selectRef"
    v-model="localValue"
    v-loadmore="loadMore"
    :placeholder="placeholder"
    :disabled="disabled"
    :clearable="clearable"
    :style="`width: ${width}`"
    :loading="loading"
    :no-match-text="noMatchText"
    :no-data-text="noDataText"
    :filterable="filterable"
    :remote="remote"
    :remote-method="handleRemote"
    @clear="handleClear"
    @change="handleSelect"
    @visible-change="handleVisible"
  >
    <el-option 
      v-for="item in state.options" 
      :key="item.code" 
      :label="item.ename" 
      :value="item.code"
    >
      <div class="option-container">
        <span class="code-cell">{{ item.code }}</span>
        <span class="name-cell">{{ item.ename }}</span>
        <span class="cname-cell">{{ item.cname }}</span>
      </div>
    </el-option>
  </el-select>
</template>

<script lang="ts" setup>
import { ref, reactive, watch, onMounted, nextTick, computed, PropType } from 'vue';

type OptionItem = {
  code: string;
  ename: string;
  cname: string;
};

type PaginationState = {
  page: number;
  total: number;
  totalItems: number;
  options: OptionItem[];
  hasMoreData: boolean;
};

defineOptions({ name: "PagingSelect", inheritAttrs: false });

const props = defineProps({
  modelValue: { type: String, required: true },
  width: { type: String, default: "100%" },
  getOptionFn: { type: Function as PropType<(params: any) => Promise<any>>, required: true },
  searchKey: { type: String, default: "searchKey" },
  relatedKey: { type: String, default: "" },
  placeholder: { type: String, default: "" },
  disabled: { type: Boolean, default: false },
  filterable: { type: Boolean, default: true },
  remote: { type: Boolean, default: true },
  clearable: { type: Boolean, default: false },
  noMatchText: { type: String, default: "" },
  noDataText: { type: String, default: "" },
  pageSize: { type: Number, default: 20 },
});

const emit = defineEmits(["update:modelValue", "setRelatedValue", "clear"]);

const selectRef = ref();
const loading = ref(false);
const localValue = ref(props.modelValue);
const searchValue = ref("");

const state = reactive<PaginationState>({
  page: 1,
  total: 0,
  totalItems: 0,
  options: [],
  hasMoreData: true
});

// 节流函数：限制函数调用频率
function throttle<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      return fn(...args);
    }
  };
}

// 自定义滚动加载指令，修复作用域和事件监听问题
const vLoadmore = {
  mounted(el: HTMLElement, binding: any) {
    // 使用nextTick确保DOM已更新后再添加事件监听
    nextTick(() => {
      const selectDropdown = el.querySelector('.el-select-dropdown__wrap');
      if (!selectDropdown) return;

      // 存储事件处理函数的引用，以便在unmounted时移除
      const handler = throttle(function(this: HTMLElement) {
        const { scrollHeight, scrollTop, clientHeight } = this as HTMLElement;
        // 当滚动到距离底部5px内时触发加载
        const isBottom = scrollHeight - scrollTop <= clientHeight + 5;
        console.log(scrollHeight, scrollTop, clientHeight, isBottom);
        if (isBottom) {
          console.log('滚动到底部，触发加载更多');
          binding.value();
        }
      }, 200);

      // 保存处理函数引用到元素上，以便在unmounted中访问
      (el as any).__vueScrollHandler = handler;
      
      // 先移除可能存在的旧监听器
      selectDropdown.removeEventListener('scroll', (el as any).__vueScrollHandler);
      // 添加新的监听器
      selectDropdown.addEventListener('scroll', handler);
    });
  },
  
  unmounted(el: HTMLElement) {
    // 组件卸载时移除事件监听，避免内存泄漏
    const selectDropdown = el.querySelector('.el-select-dropdown__wrap');
    if (selectDropdown && (el as any).__vueScrollHandler) {
      selectDropdown.removeEventListener('scroll', (el as any).__vueScrollHandler);
      delete (el as any).__vueScrollHandler;
    }
  }
};

// 计算属性优化
const hasInitialData = computed(() => state.options.length === 0);

// 监听优化
watch(() => props.modelValue, syncLocalValue);
watch(localValue, updateModelValue);
watch(() => props.pageSize, handlePageSizeChange);
watch(() => props.relatedKey, handleRelatedKeyChange);

function syncLocalValue(val: string) {
  localValue.value = val;
}

function updateModelValue(val: string) {
  emit("update:modelValue", val);
}

function handlePageSizeChange(newVal: number, oldVal: number) {
  if (newVal !== oldVal) {
    resetPagination();
    loadData();
  }
}

function handleRelatedKeyChange(newVal: string, oldVal: string) {
  if (newVal !== oldVal && oldVal !== "" && newVal !== "") {
    localValue.value = "";
    resetPagination();
    loadData();
  }
}

// 分页逻辑优化
const resetPagination = () => {
  Object.assign(state, {
    page: 1,
    options: [],
    total: 0,
    totalItems: 0,
    hasMoreData: true
  });
};

const loadData = async () => {
  if (loading.value || !state.hasMoreData) return;
  
  try {
    loading.value = true;
    console.log(`加载第 ${state.page} 页数据, 每页 ${props.pageSize} 条`);
    
    const result = await fetchData();
    
    if (result?.list) {
      updatePaginationState(result);
      state.options = mergeOptions(result.list);
      state.hasMoreData = checkHasMoreData(result.list);
      
      console.log(`已加载 ${state.options.length}/${state.totalItems} 条数据，总页数: ${state.total}，当前页: ${state.page}, 是否有更多: ${state.hasMoreData}`);
    }
  } catch (error) {
    console.error("加载数据出错:", error);
  } finally {
    loading.value = false;
  }
};

// 加载更多数据
const loadMore = () => {
  console.log('触发加载更多');
  if (!loading.value && state.hasMoreData) {
    state.page++;
    loadData();
  }
};

async function fetchData() {
  const params = {
    page: state.page,
    limit: props.pageSize,
    relatedKey: props.relatedKey,
    [props.searchKey]: searchValue.value,
  };
  return await props.getOptionFn(params);
}

function updatePaginationState(result: any) {
  state.totalItems = result.totalItems || result.total || 0;
  state.total = calculateTotalPages(result);
}

function calculateTotalPages(result: any) {
  return result.totalPages || Math.ceil((result.total || 0) / props.pageSize);
}

function mergeOptions(newOptions: OptionItem[]) {
  return [...state.options, ...newOptions];
}

function checkHasMoreData(newOptions: OptionItem[]) {
  return !(newOptions.length < props.pageSize || state.page >= state.total);
}

// 事件处理优化
const handleRemote = async (query = "") => {
  searchValue.value = query;
  resetPagination();
  await loadData();
};

const handleClear = () => {
  handleRemote("");
  emit("clear");
};

const handleSelect = (val: string) => {
  const selected = state.options.find(item => item.code === val);
  selected && emit("setRelatedValue", selected);
};

const handleVisible = (visible: boolean) => {
  if (visible) {
    selectRef.value?.focus();
    hasInitialData.value && loadData();
  } else {
    selectRef.value?.blur();
  }
};

// 生命周期优化
onMounted(() => {
  !hasInitialData.value && loadData();
});
</script>

<style scoped>
.option-container {
  display: flex;
  justify-content: space-between;
  width: 100%;
  white-space: nowrap;
}

.code-cell,
.name-cell,
.cname-cell {
  flex: 1;
  min-width: 0;
  padding: 0 8px;
  white-space: normal;
  border-right: 1px solid var(--el-border-color);
}

.cname-cell {
  border-right: none;
}
</style>
