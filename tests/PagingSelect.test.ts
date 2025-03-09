import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';
import PagingSelect from '../src/index.vue';

// 模拟数据
const mockOptions = {
  list: [
    { code: '1001', ename: 'Apple', cname: '苹果' },
    { code: '1002', ename: 'Banana', cname: '香蕉' },
    { code: '1003', ename: 'Orange', cname: '橙子' }
  ],
  total: 10 // 总记录数，不是总页数
};

// 使用更丰富的数据用于滚动分页测试
const createMockData = (page, limit) => {
  const startIndex = (page - 1) * limit;
  return {
    list: Array.from({ length: Math.min(limit, 30 - startIndex) }, (_, i) => ({
      code: `${page}${(i + 1).toString().padStart(3, '0')}`,
      ename: `Item ${startIndex + i + 1}`,
      cname: `选项 ${startIndex + i + 1}`
    })),
    total: 30 // 总共30条记录
  };
};

// 模拟获取选项的函数
const mockGetOptionFn = vi.fn().mockImplementation(({ page, limit }) => {
  return Promise.resolve(createMockData(page, limit));
});

describe('PagingSelect 组件', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('正确渲染组件', async () => {
    const wrapper = mount(PagingSelect, {
      props: {
        modelValue: '',
        getOptionFn: mockGetOptionFn
      },
      global: {
        stubs: {
          'el-select': true,
          'el-option': true
        }
      }
    });

    expect(wrapper.exists()).toBe(true);
    expect(mockGetOptionFn).toHaveBeenCalledWith(expect.objectContaining({
      page: 1,
      limit: 20
    }));
  });

  it('选择选项时正确发出事件', async () => {
    const simpleGetOptionFn = vi.fn().mockResolvedValue(mockOptions);
    
    const wrapper = mount(PagingSelect, {
      props: {
        modelValue: '',
        getOptionFn: simpleGetOptionFn
      },
      global: {
        stubs: {
          'el-select': false,
          'el-option': false
        }
      }
    });

    await flushPromises();

    // 模拟选择一个选项
    wrapper.vm.handleSelect('1001');
    
    // 检查是否发出了正确的事件
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')?.[0][0]).toBe('1001');
    
    // 检查setRelatedValue事件
    expect(wrapper.emitted('setRelatedValue')).toBeTruthy();
    expect(wrapper.emitted('setRelatedValue')?.[0][0]).toEqual(mockOptions.list[0]);
  });

  it('清除选项时正确发出事件', async () => {
    const wrapper = mount(PagingSelect, {
      props: {
        modelValue: '1001',
        getOptionFn: vi.fn().mockResolvedValue(mockOptions)
      },
      global: {
        stubs: {
          'el-select': false,
          'el-option': false
        }
      }
    });

    await flushPromises();

    // 模拟清除选择
    wrapper.vm.handleClear();
    
    // 检查是否发出了clear事件
    expect(wrapper.emitted('clear')).toBeTruthy();
  });

  it('加载更多数据时正确处理分页', async () => {
    const pageSize = 10;
    const mockPagingFn = vi.fn().mockImplementation(({ page, limit }) => {
      return Promise.resolve(createMockData(page, limit));
    });
    
    const wrapper = mount(PagingSelect, {
      props: {
        modelValue: '',
        getOptionFn: mockPagingFn,
        pageSize
      },
      global: {
        stubs: {
          'el-select': false,
          'el-option': false
        }
      }
    });

    await flushPromises();
    
    // 模拟初始加载后的状态
    expect(wrapper.vm.state.page).toBe(1);
    expect(mockPagingFn).toHaveBeenCalledTimes(1);
    expect(wrapper.vm.state.options.length).toBe(pageSize); // 第一页应该有10条数据
    
    // 模拟加载更多
    wrapper.vm.loadMore();
    await flushPromises();
    
    // 检查页码是否增加并调用了加载函数
    expect(wrapper.vm.state.page).toBe(2);
    expect(mockPagingFn).toHaveBeenCalledTimes(2);
    expect(mockPagingFn).toHaveBeenLastCalledWith(expect.objectContaining({
      page: 2,
      limit: pageSize
    }));
    expect(wrapper.vm.state.options.length).toBe(pageSize * 2); // 应该有20条数据
    
    // 再次加载更多
    wrapper.vm.loadMore();
    await flushPromises();
    
    // 第三页但总记录只有30条，所以只会再增加10条
    expect(wrapper.vm.state.page).toBe(3);
    expect(wrapper.vm.state.options.length).toBe(30);
    expect(wrapper.vm.state.hasMoreData).toBe(false); // 没有更多数据了
  });

  it('当pageSize变化时重置分页并重新加载数据', async () => {
    const wrapper = mount(PagingSelect, {
      props: {
        modelValue: '',
        getOptionFn: mockGetOptionFn,
        pageSize: 5
      },
      global: {
        stubs: {
          'el-select': false,
          'el-option': false
        }
      }
    });

    await flushPromises();
    
    // 初始加载
    expect(mockGetOptionFn).toHaveBeenCalledTimes(1);
    expect(mockGetOptionFn).toHaveBeenLastCalledWith(expect.objectContaining({
      page: 1,
      limit: 5
    }));
    
    // 加载一些数据
    wrapper.vm.loadMore();
    await flushPromises();
    
    // 期望页码增加
    expect(wrapper.vm.state.page).toBe(2);
    expect(wrapper.vm.state.options.length).toBe(10); // 5条/页 x 2页 = 10条
    
    // 改变页面大小
    await wrapper.setProps({ pageSize: 10 });
    await nextTick();
    
    // 检查是否重置分页并重新加载
    expect(wrapper.vm.state.page).toBe(1);
    expect(mockGetOptionFn).toHaveBeenCalledTimes(3);
    expect(mockGetOptionFn).toHaveBeenLastCalledWith(expect.objectContaining({
      page: 1,
      limit: 10
    }));
    
    // 由于pageSize变为10，新的第一页应该有10条数据
    expect(wrapper.vm.state.options.length).toBe(10);
  });

  it('接收新的relatedKey时重置选择器', async () => {
    const wrapper = mount(PagingSelect, {
      props: {
        modelValue: '1001',
        getOptionFn: mockGetOptionFn,
        relatedKey: 'type1'
      },
      global: {
        stubs: {
          'el-select': false,
          'el-option': false
        }
      }
    });

    await flushPromises();
    
    // 更改relatedKey
    await wrapper.setProps({ relatedKey: 'type2' });
    await nextTick();
    
    // 检查值是否重置
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')?.slice(-1)[0][0]).toBe('');
    
    // 检查是否重新加载了数据
    expect(mockGetOptionFn).toHaveBeenCalledTimes(2);
    expect(mockGetOptionFn).toHaveBeenLastCalledWith(expect.objectContaining({
      relatedKey: 'type2'
    }));
  });
  
  it('处理下拉框可见性变化', async () => {
    const mockFn = vi.fn().mockResolvedValue(mockOptions);
    const wrapper = mount(PagingSelect, {
      props: {
        modelValue: '',
        getOptionFn: mockFn
      },
      global: {
        stubs: {
          'el-select': false,
          'el-option': false
        }
      }
    });
    
    // 模拟打开下拉框
    wrapper.vm.handleVisible(true);
    expect(mockFn).toHaveBeenCalledTimes(1); // 初始挂载时已调用一次
    
    // 清空选项后再次打开下拉框应该重新加载
    wrapper.vm.state.options = [];
    wrapper.vm.handleVisible(true);
    expect(mockFn).toHaveBeenCalledTimes(2);
  });
}); 