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
  PropType,
  defineProps,
  defineEmits,
  defineOptions,
  DirectiveBinding,
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

const SCROLL_DELAY = 200;
const BOTTOM_OFFSET = 5;

// 自定义指令：监听滚动到底部
const vLoadmore = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    // 获取下拉容器
    const getSelectDropdown = (): HTMLElement | null => {
      // 查找所有下拉菜单
      const dropdowns = document.querySelectorAll('.el-select-dropdown');
      // 找到可见的下拉菜单
      for (let i = 0; i < dropdowns.length; i++) {
        const dropdown = dropdowns[i] as HTMLElement;
        if (dropdown.style.display !== 'none') {
          return dropdown;
        }
      }
      return null;
    };

    // 获取滚动容器
    const getScrollContainer = (dropdown: HTMLElement): HTMLElement | null => {
      return dropdown.querySelector('.el-select-dropdown__wrap');
    };

    // 滚动处理函数
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      const { scrollHeight, scrollTop, clientHeight } = target;
      const distanceToBottom = scrollHeight - scrollTop - clientHeight;
      
      console.log('滚动事件', { scrollHeight, scrollTop, clientHeight, distanceToBottom });
      
      if (distanceToBottom <= BOTTOM_OFFSET) {
        console.log('滚动到底部，触发加载更多');
        binding.value();
      }
    };

    // 节流函数
    const throttle = (fn: Function, delay: number) => {
      let lastCall = 0;
      return function(this: any, ...args: any[]) {
        const now = Date.now();
        if (now - lastCall >= delay) {
          lastCall = now;
          fn.apply(this, args);
        }
      };
    };

    // 添加滚动监听
    const addScrollListener = () => {
      const dropdown = getSelectDropdown();
      if (!dropdown) {
        console.log('未找到下拉菜单，50ms后重试');
        setTimeout(addScrollListener, 50);
        return;
      }

      const scrollContainer = getScrollContainer(dropdown);
      if (!scrollContainer) {
        console.log('未找到滚动容器，50ms后重试');
        setTimeout(addScrollListener, 50);
        return;
      }

      // 使用节流函数包装滚动处理
      const throttledScroll = throttle(handleScroll, SCROLL_DELAY);
      
      // 保存引用以便清理
      (el as any).__loadmore_scroll_handler = throttledScroll;
      (el as any).__loadmore_scroll_container = scrollContainer;
      (el as any).__loadmore_value = binding.value;
      
      // 添加滚动监听
      scrollContainer.addEventListener('scroll', throttledScroll);
      console.log('已添加滚动监听');
      
      // 检查是否需要立即加载更多（内容不足一屏的情况）
      nextTick(() => {
        const { scrollHeight, clientHeight } = scrollContainer;
        if (scrollHeight <= clientHeight) {
          console.log('内容不足一屏，触发加载更多');
          binding.value();
        }
      });
    };

    // 监听下拉框打开事件
    el.addEventListener('click', () => {
      setTimeout(addScrollListener, 100);
    });
  },
  
  updated(el: HTMLElement) {
    // 当组件更新时，可能需要重新检查是否需要加载更多
    if ((el as any).__loadmore_scroll_container && (el as any).__loadmore_value) {
      nextTick(() => {
        const container = (el as any).__loadmore_scroll_container;
        const { scrollHeight, clientHeight } = container;
        if (scrollHeight <= clientHeight) {
          console.log('更新后内容不足一屏，触发加载更多');
          (el as any).__loadmore_value();
        }
      });
    }
  },
  
  unmounted(el: HTMLElement) {
    // 清理滚动监听
    if ((el as any).__loadmore_scroll_handler && (el as any).__loadmore_scroll_container) {
      (el as any).__loadmore_scroll_container.removeEventListener('scroll', (el as any).__loadmore_scroll_handler);
      delete (el as any).__loadmore_scroll_handler;
      delete (el as any).__loadmore_scroll_container;
    }
  }
};

defineOptions({ name: "PagingSelect", inheritAttrs: false });

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

const emit = defineEmits(["update:modelValue", "setRelatedValue", "clear"]);

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

const hasInitialData = computed(() => state.options.length === 0);
const hasMoreData = computed(() => {
  const result = state.pages === 0 || (state.page < state.pages && state.options.length < state.total);
  console.log(`hasMoreData: page=${state.page}, pages=${state.pages}, options=${state.options.length}, total=${state.total}, result=${result}`);
  return result;
});

// 数据加载逻辑
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

// 事件处理
const handleRemote = async (query = "") => {
  searchValue.value = query;
  resetPagination();
  await loadData();
};

const loadData = async () => {
  console.log('loadData调用', {
    loading: loading.value,
    hasMoreData: hasMoreData.value,
    page: state.page,
    pages: state.pages,
    options: state.options.length
  });
  
  // 已在加载中或没有更多数据时，跳过加载
  if (loading.value) {
    console.log('正在加载中，跳过此次请求');
    return;
  }
  
  // 判断是否初始加载或者是否有更多数据可加载
  const isInitialLoad = state.options.length === 0;
  if (!isInitialLoad && !hasMoreData.value) {
    console.log('没有更多数据，跳过加载');
    return;
  }
  
  try {
    loading.value = true;
    console.log('发起数据请求...');
    const result = await fetchData();
    console.log('获取到数据结果', result);
    
    if (result?.list) {
      updatePagination(result);
      console.log('数据更新完成', {
        page: state.page,
        pages: state.pages,
        total: state.total,
        options: state.options.length
      });
    }
  } catch (error) {
    console.error('加载数据出错:', error);
  } finally {
    loading.value = false;
  }
};

const loadMore = () => {
  console.log('loadMore被触发', {
    loading: loading.value,
    hasMoreData: hasMoreData.value,
    page: state.page,
    pages: state.pages,
    optionsLength: state.options.length,
    total: state.total
  });
  
  if (!loading.value && hasMoreData.value) {
    state.page++;
    console.log(`loadMore增加页码: page=${state.page}`);
    loadData();
  } else {
    console.log(`loadMore条件不满足: loading=${loading.value}, hasMoreData=${hasMoreData.value}`);
  }
};

// 公共方法
const resetPagination = () => {
  state.page = 1;
  state.total = 0;
  state.pages = 0;
  state.options = [];
};

// 各种事件处理
const handleClear = () => {
  emit("clear");
  resetPagination();
};

const handleSelect = (val: string) => {
  const selectedOption = state.options.find((item: OptionItem) => item.code === val);
  if (selectedOption && props.relatedKey) {
    emit("setRelatedValue", selectedOption);
  }
};

const handleVisible = (visible: boolean) => {
  console.log('下拉可见性变化', visible);
  if (visible) {
    // 只有在选项为空时才重新加载数据
    if (state.options.length === 0) {
      console.log('下拉框打开且没有数据，重置并加载');
      resetPagination();
      loadData();
    } else {
      console.log('下拉框打开但已有数据，不重新加载');
    }
  }
};

// 监听器优化
watch(() => props.modelValue, (val: any) => localValue.value = val);
watch(localValue, (val: any) => emit("update:modelValue", val));
watch(() => props.pageSize, (newVal: any, oldVal: any) => {
  if (newVal !== oldVal) {
    resetPagination();
    loadData();
  }
});

onMounted(() => {
  // 初始化时强制加载数据
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
  white-space: normal;
  overflow: hidden;
  text-overflow: ellipsis;
}

.code-cell {
  flex: 0.8;
  padding-left: 0;
  border-right: 1px solid #ebeef5;
}

.name-cell {
  flex: 1;
  border-right: 1px solid #ebeef5;
}

.cname-cell {
  flex: 1;
  padding-right: 0;
}
</style>
