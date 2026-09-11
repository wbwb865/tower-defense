// 精确复现：上边界不同位置的敌人，前方放块后是否回头
import { GameEngine } from '../src/game/engine.js'

function makeEngine() {
  return new GameEngine({
    width: 14, height: 12,
    spawn: { x: 0, y: 6 }, exit: { x: 14, y: 6 },
    startGold: 5000, lives: 20
  })
}

function describeEnemy(e) {
  if (!e) return 'null'
  return `pos(${e.x.toFixed(2)},${e.y.toFixed(2)}) edge=${e.currentEdgeKey} pathIdx=${e.pathIndex}/${e.path ? e.path.length : 0}`
}

// 推进直到敌人到达指定 x（上边界）
function advanceToX(eng, e, x, maxFrames = 60000) {
  let guard = 0
  while (guard++ < maxFrames) {
    eng.update(1 / 60)
    if (e.dead || e.reachedExit) return false
    if (e.x >= x && e.y < 0.5) return true
  }
  return false
}

// 检查放块后 60 帧内敌人 x 是否明显减小（回头）
function checkTurnBack(eng, e, blockCell) {
  const beforeX = e.x
  const r = eng.placeBlock(blockCell[0], blockCell[1], 'path')
  if (!r.ok) return null
  let minX = e.x
  let maxX = e.x
  for (let i = 0; i < 60; i++) {
    eng.update(1 / 60)
    if (e.dead || e.reachedExit) break
    minX = Math.min(minX, e.x)
    maxX = Math.max(maxX, e.x)
  }
  const turned = e.x < beforeX - 0.1
  return { turned, beforeX, afterX: e.x, minX, maxX }
}

console.log('=== 上车道：敌人不同位置，前方 1-3 格放块 ===')
for (let x = 0; x <= 12; x++) {
  const eng = makeEngine()
  eng.startWave()
  let guard = 0
  while (guard++ < 3000 && eng.enemies.length === 0) eng.update(1 / 60)
  const e = eng.enemies.find((en) => en.currentEdgeKey === 'h:-1,6') || eng.enemies[0]
  if (!advanceToX(eng, e, x)) continue
  for (let ahead = 1; ahead <= 3; ahead++) {
    const bx = x + ahead
    if (bx > 13) break
    for (const by of [0, 1]) {
      const res = checkTurnBack(eng, e, [bx, by])
      if (res && res.turned) {
        console.log(`>>> 回头! 敌人在x=${x} 放块(${bx},${by}) beforeX=${res.beforeX.toFixed(2)} afterX=${res.afterX.toFixed(2)} minX=${res.minX.toFixed(2)}`)
      }
    }
  }
}
console.log('=== 上车道扫描完成 ===')
