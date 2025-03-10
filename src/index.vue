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
import { 
  ref, 
  reactive, 
  watch, 
  onMounted,
  nextTick, 
  computed, 
  type PropType,
  type DirectiveBinding,
} from 'vue';
import type { ElSelect as ElSelectType } from 'element-plus';

interface OptionItem {
  code: string;
  ename: string;
  cname: string;
}

interface PaginationState {
  page: number;
  total: number;
  pages: number;
  options: OptionItem[];
}

interface PaginatedResponse {
  list: OptionItem[];
  total: number;
  pages: number;
}

// 常量配置
const SCROLL_DELAY = 200;
const BOTTOM_OFFSET = 5;
const MAX_RETRY_COUNT = 5;

// 自定义指令优化
const vLoadmore = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    let retryCount = 0;
    
    const getScrollContainer = (): HTMLElement | null => {
      const dropdown = el.querySelector('.el-select-dropdown');
      return dropdown?.querySelector('.el-select-dropdown__wrap') ?? null;
    };

    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      const { scrollHeight, scrollTop, clientHeight } = target;
      console.log('scrollHeight', scrollHeight);
      console.log('scrollTop', scrollTop);
      console.log('clientHeight', clientHeight);
      if (scrollHeight - scrollTop - clientHeight <= BOTTOM_OFFSET) {
        binding.value();
      }
    };

    const throttle = (fn: Function, delay: number) => {
      let lastCall = 0;
      return (...args: any[]) => {
        const now = Date.now();
        if (now - lastCall >= delay) {
          lastCall = now;
          fn(...args);
        }
      };
    };

    const addScrollListener = () => {
      const scrollContainer = getScrollContainer();
      if (!scrollContainer && retryCount < MAX_RETRY_COUNT) {
        retryCount++;
        setTimeout(addScrollListener, 50);
        return;
      }

      if (scrollContainer) {
        const throttledScroll = throttle(handleScroll, SCROLL_DELAY);
        scrollContainer.addEventListener('scroll', throttledScroll);
        el._scrollHandler = throttledScroll;
      }
    };

    el.addEventListener('click', () => setTimeout(addScrollListener, 100));
  },

  unmounted(el: HTMLElement) {
    const scrollContainer = el.querySelector('.el-select-dropdown__wrap');
    if (scrollContainer && el._scrollHandler) {
      scrollContainer.removeEventListener('scroll', el._scrollHandler);
    }
  }
};

// Props/Emits 定义优化
const props = defineProps({
  modelValue: { type: String, required: true },
  width: { type: String, default: "100%" },
  fnGetOption: { 
    type: Function as PropType<(params: Record<string, unknown>) => Promise<PaginatedResponse>>, 
    required: true 
  },
  searchKey: { type: String, default: "searchKey" },
  relatedKey: { type: String, default: "" },
  placeholder: { type: String, default: "请选择" },
  disabled: { type: Boolean, default: false },
  filterable: { type: Boolean, default: true },
  remote: { type: Boolean, default: true },
  clearable: { type: Boolean, default: false },
  noMatchText: { type: String, default: "无匹配数据" },
  noDataText: { type: String, default: "暂无数据" },
  pageSize: { type: Number, default: 20 },
});

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "setRelatedValue", value: OptionItem): void;
  (e: "clear"): void;
}>();

// 响应式状态
const selectRef = ref<InstanceType<typeof ElSelectType>>();
const loading = ref(false);
const localValue = ref(props.modelValue);
const searchValue = ref("");

const state = reactive<PaginationState>({
  page: 1,
  total: 0,
  pages: 0,
  options: [],
});

// 计算属性优化
const hasMoreData = computed(() => 
  state.page < state.pages && 
  state.options.length < state.total
);

// 数据加载逻辑优化
const fetchData = async () => {
  const params = {
    page: state.page,
    limit: props.pageSize,
    relatedKey: props.relatedKey,
    [props.searchKey]: searchValue.value,
  };
  return props.fnGetOption(params);
};

const updatePagination = (result: PaginatedResponse) => {
  state.total = result.total ?? 0;
  state.pages = result.pages ?? Math.ceil(state.total / props.pageSize);
  state.options = [...state.options, ...result.list];
};

const loadData = async () => {
  if (loading.value || (!hasMoreData.value && state.options.length > 0)) return;
  
  try {
    loading.value = true;
    const result = await fetchData();
    result?.list && updatePagination(result);
  } catch (error) {
    console.error('加载数据出错:', error);
  } finally {
    loading.value = false;
  }
};

// 方法优化
const resetPagination = () => {
  state.page = 1;
  state.total = 0;
  state.pages = 0;
  state.options = [];
};

const handleVisible = (visible: boolean) => {
  if (visible && state.options.length === 0) {
    resetPagination();
    loadData();
  }
};

// 监听器优化
watch(() => props.modelValue, val => localValue.value = val);
watch(localValue, val => emit("update:modelValue", val));
watch(() => props.pageSize, (newVal, oldVal) => {
  if (newVal !== oldVal) {
    resetPagination();
    loadData();
  }
});

onMounted(() => {
  resetPagination();
  loadData();
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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
  
  &:not(:last-child) {
    border-right: 1px solid #ebeef5;
  }
}

.code-cell {
  flex: 0.8;
  padding-left: 0;
}

.cname-cell {
  padding-right: 0;
}
</style>
