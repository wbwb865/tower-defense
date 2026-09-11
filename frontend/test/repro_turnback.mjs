// 复现"前方放路块导致敌人回头"场景
import { GameEngine } from '../src/game/engine.js'

function makeEngine() {
  return new GameEngine({
    width: 14, height: 12,
    spawn: { x: 0, y: 6 }, exit: { x: 14, y: 6 },
    startGold: 500, lives: 20
  })
}

function spawnUpperLaneEnemy(eng) {
  eng.startWave()
  let guard = 0
  while (guard++ < 2000 && eng.enemies.length === 0) eng.update(1 / 60)
  // 找到出生在上车道（spawn line h:-1,6）的敌人
  const e = eng.enemies.find((x) => x.currentEdgeKey === 'h:-1,6')
  return e || eng.enemies[0]
}

function enemyOnTopBoundary(e) {
  return e && e.y < 0.5
}

function describeEnemy(e) {
  if (!e) return 'null'
  return `pos(${e.x.toFixed(2)},${e.y.toFixed(2)}) edge=${e.currentEdgeKey} pathIdx=${e.pathIndex}/${e.path ? e.path.length : 0}`
}

// 场景1：上车道敌人沿上边界走到 x≈7，在前方 (8,0) 放路块
{
  const eng = makeEngine()
  const e = spawnUpperLaneEnemy(eng)
  console.log('出生:', describeEnemy(e))
  // 推进到上边界 x≈7
  let guard = 0
  while (guard++ < 20000 && !(enemyOnTopBoundary(e) && e.x >= 7)) eng.update(1 / 60)
  console.log('放置前:', describeEnemy(e))
  const prevX = e.x
  const r = eng.placeBlock(8, 0, 'path')
  console.log('放置(8,0)路块:', r.ok ? '成功' : r.msg)
  console.log('放置后:', describeEnemy(e))
  // 推进几帧看方向
  eng.update(1 / 60)
  eng.update(1 / 60)
  eng.update(1 / 60)
  console.log('推进后:', describeEnemy(e))
  const dx = e.x - prevX
  console.log(dx < -0.01 ? '>>> 敌人回头了！' : (dx > 0.01 ? '>>> 敌人继续前进' : '>>> 敌人原地不动'))
}

// 场景2：下车道敌人沿下边界走到 x≈7，在前方 (8,12) 放路块
{
  const eng = makeEngine()
  eng.startWave()
  let guard = 0
  while (guard++ < 2000 && eng.enemies.length === 0) eng.update(1 / 60)
  const e = eng.enemies.find((x) => x.currentEdgeKey === 'h:-1,7') || eng.enemies[0]
  console.log('出生:', describeEnemy(e))
  guard = 0
  while (guard++ < 20000 && !(e.y > 11.5 && e.x >= 7)) eng.update(1 / 60)
  console.log('放置前:', describeEnemy(e))
  const prevX = e.x
  const r = eng.placeBlock(8, 11, 'path')
  console.log('放置(8,11)路块:', r.ok ? '成功' : r.msg)
  console.log('放置后:', describeEnemy(e))
  eng.update(1 / 60)
  eng.update(1 / 60)
  eng.update(1 / 60)
  console.log('推进后:', describeEnemy(e))
  const dx = e.x - prevX
  console.log(dx < -0.01 ? '>>> 敌人回头了！' : (dx > 0.01 ? '>>> 敌人继续前进' : '>>> 敌人原地不动'))
}
