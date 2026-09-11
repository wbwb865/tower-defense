<template>
  <div class="page">
    <h1 class="page-title">排行榜</h1>
    <p class="page-sub">各关卡的最高得分排行</p>

    <div class="card table-card">
      <el-table :data="rows" stripe style="width: 100%">
        <el-table-column label="排名" width="70">
          <template #default="{ $index }">
            <span class="rank" :class="'rank-' + ($index + 1)">{{ $index + 1 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="username" label="玩家" />
        <el-table-column prop="levelName" label="关卡" />
        <el-table-column prop="score" label="得分" sortable />
        <el-table-column prop="wave" label="波次" />
        <el-table-column prop="kills" label="击杀" />
        <el-table-column prop="result" label="结果">
          <template #default="{ row }">
            <span :class="row.result === 'win' ? 'win' : 'lose'">
              {{ row.result === 'win' ? '胜利' : '失败' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="时间" width="170" />
      </el-table>
      <div v-if="!rows.length" class="empty">暂无记录，快去挑战吧！</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { leaderboardApi } from '../api/index.js'

const rows = ref([])

onMounted(async () => {
  try {
    const res = await leaderboardApi.top()
    rows.value = res.data || []
  } catch (e) {
    ElMessage.error(e.message)
  }
})
</script>

<style scoped>
.table-card {
  width: 100%;
  max-width: 880px;
  padding: 12px;
}

.rank {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 3px;
  font-weight: 700;
  font-size: 13px;
  font-family: 'Consolas', 'Courier New', monospace;
}

.rank-1 {
  color: #fff;
  background: linear-gradient(135deg, #ffe14d, #ff9f1a);
  box-shadow: 0 0 12px rgba(255, 225, 77, 0.5);
}

.rank-2 {
  color: #fff;
  background: linear-gradient(135deg, #c0c6d2, #8a90a0);
}

.rank-3 {
  color: #fff;
  background: linear-gradient(135deg, #ff9f6a, #d65a2a);
}

.rank:not(.rank-1):not(.rank-2):not(.rank-3) {
  color: #5f8ba0;
  background: rgba(0, 229, 255, 0.08);
}

.win { color: #2effa0; font-weight: 600; }
.lose { color: #ff2bd6; }

.empty {
  text-align: center;
  color: #5f8ba0;
  padding: 30px;
  font-family: 'Consolas', 'Courier New', monospace;
}
</style>
