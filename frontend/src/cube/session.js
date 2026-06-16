// 跨「v-if 切换重挂载」存活的会话状态:模块只加载一次,组件卸载也不丢。
import { ref } from "vue";

// 识别训练:本次会话计数 + 公式列表缓存(缓存避免每次进入都重新请求后端)
// 用 ref(对象) 而非 reactive,让组件里沿用的 session.value.xxx 写法不变。
export const recogSession = ref({ count: 0, times: [], good: 0 });
export const recogAlgs = ref([]);
export function resetRecogSession() {
  recogSession.value = { count: 0, times: [], good: 0 };
}
