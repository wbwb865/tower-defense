// 验证 gap 边禁用逻辑
import { GameEngine } from '../src/game/engine.js'

function makeEngine() {
  return new GameEngine({
    width: 14, height: 12,
    spawn: { x: 0, y: 6 }, exit: { x: 14, y: 6 },
    startGold: 500, lives: 20
  })
}

const eng = makeEngine()
console.log('spawnLines:', eng.spawnLines.map((e) => eng.graph.edgeKey(e)))
console.log('exitLines:', eng.exitLines.map((e) => eng.graph.edgeKey(e)))
console.log('disabledKeys:', [...eng.graph.disabledKeys])

// 检查 gap 边是否不可走
const gapSpawn = { dir: 'v', x: -1, y: 6 }
const gapExit = { dir: 'v', x: 14, y: 6 }
console.log('gapSpawn V(-1,6) walkable:', eng.graph.edgeWalkable(eng.cells, gapSpawn))
console.log('gapExit V(14,6) walkable:', eng.graph.edgeWalkable(eng.cells, gapExit))

// 检查默认路径是否用到 gap 边
const targets = eng.laneTargets()
for (let i = 0; i < 2; i++) {
  const path = eng.graph.greedyPath(eng.cells, eng.spawnLines[i], targets[i])
  const keys = path.map((e) => eng.graph.edgeKey(e))
  console.log(`车道${i} 路径(${keys.length}条边):`, keys.join(' '))
  console.log(`车道${i} 是否用到gap边:`, keys.includes('v:-1,6') || keys.includes('v:14,6'))
}

// 检查 enemyForwardNode 在默认路径上是否始终返回前进节点
eng.startWave()
let guard = 0
while (guard++ < 2000 && eng.enemies.length === 0) eng.update(1 / 60)
const e = eng.enemies[0]
console.log('敌人出生 edge:', e.currentEdgeKey)
for (let i = 0; i < 10; i++) {
  const edge = eng.graph.parseEdgeKey(e.currentEdgeKey)
  const fwd = eng.enemyForwardNode(e, edge)
  const ends = eng.graph.edgeEnds(edge)
  const targetPt = e.path[e.pathIndex]
  console.log(`step${i}: edge=${e.currentEdgeKey} pos=(${e.x.toFixed(2)},${e.y.toFixed(2)}) fwd=(${fwd ? fwd.x + ',' + fwd.y : 'null'}) path[pathIndex]=(${targetPt ? targetPt.x + ',' + targetPt.y : 'null'})`)
  eng.update(1 / 60)
}
