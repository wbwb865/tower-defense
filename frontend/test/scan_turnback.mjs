// 全面扫描：默认路径四个段（左墙上行/上边界/右墙下行/下边界）放块回头检测
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
  return `pos(${e.x.toFixed(2)},${e.y.toFixed(2)}) edge=${e.currentEdgeKey}`
}

// 检查放块后 90 帧内敌人是否回头（沿路径方向坐标明显倒退）
function checkTurnBack(eng, e, blockCell, axis, dir, label) {
  const before = axis === 'x' ? e.x : e.y
  const r = eng.placeBlock(blockCell[0], blockCell[1], 'path')
  if (!r.ok) return null
  let minProg = before
  let maxProg = before
  for (let i = 0; i < 90; i++) {
    eng.update(1 / 60)
    if (e.dead || e.reachedExit) break
    const p = axis === 'x' ? e.x : e.y
    minProg = Math.min(minProg, p)
    maxProg = Math.max(maxProg, p)
  }
  const cur = axis === 'x' ? e.x : e.y
  // dir=+1 表示沿坐标增大方向前进；回头 = 当前进度明显小于放置前
  const turned = dir === 1 ? cur < before - 0.1 : cur > before + 0.1
  if (turned) {
    console.log(`>>> 回头! ${label} 敌人${describeEnemy(e)} 放块(${blockCell[0]},${blockCell[1]}) before=${before.toFixed(2)} after=${cur.toFixed(2)}`)
    return true
  }
  return false
}

let found = 0

// 段1：左墙上行 (0,6)→(0,0)，y 从 6 降到 0
{
  const eng = makeEngine()
  eng.startWave()
  let guard = 0
  while (guard++ < 3000 && eng.enemies.length === 0) eng.update(1 / 60)
  const e = eng.enemies.find((en) => en.currentEdgeKey === 'h:-1,6') || eng.enemies[0]
  for (let y = 5; y >= 1; y--) {
    // 推进到左墙 y 位置
    guard = 0
    while (guard++ < 60000 && !(e.x < 0.5 && e.y <= y)) eng.update(1 / 60)
    if (e.reachedExit || e.dead) break
    // 前方 1-2 格放块（左墙内侧 (0,y-1) 或 (0,y-2)）
    for (let ahead = 1; ahead <= 2; ahead++) {
      const by = y - ahead
      if (by < 0) break
      for (const bx of [0, 1]) {
        if (checkTurnBack(eng, e, [bx, by], 'y', -1, `左墙y=${y}`)) found++
      }
    }
  }
}

// 段2：上边界 (0,0)→(14,0)，x 从 0 到 14
{
  const eng = makeEngine()
  eng.startWave()
  let guard = 0
  while (guard++ < 3000 && eng.enemies.length === 0) eng.update(1 / 60)
  const e = eng.enemies.find((en) => en.currentEdgeKey === 'h:-1,6') || eng.enemies[0]
  for (let x = 0; x <= 12; x++) {
    guard = 0
    while (guard++ < 60000 && !(e.y < 0.5 && e.x >= x)) eng.update(1 / 60)
    if (e.reachedExit || e.dead) break
    for (let ahead = 1; ahead <= 2; ahead++) {
      const bx = x + ahead
      if (bx > 13) break
      for (const by of [0, 1]) {
        if (checkTurnBack(eng, e, [bx, by], 'x', 1, `上边界x=${x}`)) found++
      }
    }
  }
}

// 段3：右墙下行 (14,0)→(14,6)，y 从 0 升到 6
{
  const eng = makeEngine()
  eng.startWave()
  let guard = 0
  while (guard++ < 3000 && eng.enemies.length === 0) eng.update(1 / 60)
  const e = eng.enemies.find((en) => en.currentEdgeKey === 'h:-1,6') || eng.enemies[0]
  for (let y = 1; y <= 5; y++) {
    guard = 0
    while (guard++ < 60000 && !(e.x > 13.5 && e.y >= y)) eng.update(1 / 60)
    if (e.reachedExit || e.dead) break
    for (let ahead = 1; ahead <= 2; ahead++) {
      const by = y + ahead
      if (by > 6) break
      for (const bx of [13, 14]) {
        if (checkTurnBack(eng, e, [bx, by], 'y', 1, `右墙y=${y}`)) found++
      }
    }
  }
}

// 段4：下边界 (0,12)→(14,12)，x 从 0 到 14
{
  const eng = makeEngine()
  eng.startWave()
  let guard = 0
  while (guard++ < 3000 && eng.enemies.length === 0) eng.update(1 / 60)
  const e = eng.enemies.find((en) => en.currentEdgeKey === 'h:-1,7') || eng.enemies[0]
  for (let x = 0; x <= 12; x++) {
    guard = 0
    while (guard++ < 60000 && !(e.y > 11.5 && e.x >= x)) eng.update(1 / 60)
    if (e.reachedExit || e.dead) break
    for (let ahead = 1; ahead <= 2; ahead++) {
      const bx = x + ahead
      if (bx > 13) break
      for (const by of [11, 12]) {
        if (checkTurnBack(eng, e, [bx, by], 'x', 1, `下边界x=${x}`)) found++
      }
    }
  }
}

console.log(found === 0 ? '未发现回头场景' : `发现 ${found} 个回头场景`)
