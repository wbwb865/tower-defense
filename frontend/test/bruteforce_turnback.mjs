// 暴力搜索：找出"前方放路块导致敌人回头"的场景
import { GameEngine } from '../src/game/engine.js'

function makeEngine() {
  return new GameEngine({
    width: 14, height: 12,
    spawn: { x: 0, y: 6 }, exit: { x: 14, y: 6 },
    startGold: 5000, lives: 20
  })
}

// 推进直到敌人到达指定条件
function advanceUntil(eng, cond, maxFrames = 60000) {
  let guard = 0
  while (guard++ < maxFrames) {
    eng.update(1 / 60)
    if (cond()) return true
  }
  return false
}

// 检查敌人是否"回头"：x 坐标明显减小（左→右地图）
function checkTurnBack(eng, e, blockCell, label) {
  const before = { x: e.x, y: e.y }
  const r = eng.placeBlock(blockCell[0], blockCell[1], 'path')
  if (!r.ok) return null // 放不下，跳过
  const after = { x: e.x, y: e.y }
  // 推进 20 帧看方向
  let minX = e.x
  let maxX = e.x
  for (let i = 0; i < 20; i++) {
    eng.update(1 / 60)
    if (e.dead || e.reachedExit) break
    minX = Math.min(minX, e.x)
    maxX = Math.max(maxX, e.x)
  }
  const turned = maxX - minX < -0.05 || (e.x < before.x - 0.05)
  if (turned) {
    console.log(`>>> 回头! ${label} 敌人pos(${before.x.toFixed(1)},${before.y.toFixed(1)}) edge=${e.currentEdgeKey} 放块(${blockCell[0]},${blockCell[1]}) 放置后pos(${after.x.toFixed(1)},${after.y.toFixed(1)})`)
    return true
  }
  return false
}

let found = 0

// 上车道：沿上边界 y=0 前进，x 从 0 到 13
{
  const eng = makeEngine()
  eng.startWave()
  // 等上车道敌人出生
  advanceUntil(eng, () => eng.enemies.some((e) => e.currentEdgeKey === 'h:-1,6'))
  const e = eng.enemies.find((x) => x.currentEdgeKey === 'h:-1,6')
  // 推进到上边界
  advanceUntil(eng, () => e.y < 0.5)
  // 沿上边界逐步推进，每个 x 位置尝试在前方 1-3 格放块
  for (let x = 0; x <= 12 && !e.reachedExit; x++) {
    advanceUntil(eng, () => e.x >= x && e.y < 0.5, 2000)
    if (e.reachedExit) break
    for (let ahead = 1; ahead <= 3; ahead++) {
      const bx = x + ahead
      if (bx > 13) break
      // 尝试放块在 (bx,0) 和 (bx,1)
      for (const by of [0, 1]) {
        if (checkTurnBack(eng, e, [bx, by], `上车道x=${x.toFixed(1)}`)) found++
      }
    }
  }
}

// 下车道：沿下边界 y=12 前进
{
  const eng = makeEngine()
  eng.startWave()
  // 等下车道敌人出生
  advanceUntil(eng, () => eng.enemies.some((e) => e.currentEdgeKey === 'h:-1,7'))
  const e = eng.enemies.find((x) => x.currentEdgeKey === 'h:-1,7')
  advanceUntil(eng, () => e.y > 11.5)
  for (let x = 0; x <= 12 && !e.reachedExit; x++) {
    advanceUntil(eng, () => e.x >= x && e.y > 11.5, 2000)
    if (e.reachedExit) break
    for (let ahead = 1; ahead <= 3; ahead++) {
      const bx = x + ahead
      if (bx > 13) break
      for (const by of [11, 12]) {
        if (checkTurnBack(eng, e, [bx, by], `下车道x=${x.toFixed(1)}`)) found++
      }
    }
  }
}

console.log(found === 0 ? '未发现回头场景' : `发现 ${found} 个回头场景`)
