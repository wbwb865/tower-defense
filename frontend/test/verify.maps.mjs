// 验证地图差异化机制（node test/verify.maps.mjs）
import { GameEngine } from '../src/game/engine.js'

const MAPS = [
  {
    name: '新手平原', width: 14, height: 12, spawn: { x: 0, y: 6 }, exit: { x: 14, y: 6 },
    config: { desc: '标准' }
  },
  {
    name: '峡谷险道', width: 16, height: 13, spawn: { x: 0, y: 6 }, exit: { x: 16, y: 6 },
    config: { terrain: [{ x: 2, y: 2 }, { x: 7, y: 1 }, { x: 5, y: 6 }] }
  },
  {
    name: '十字要塞', width: 15, height: 15, spawn: { x: 7, y: 0 }, exit: { x: 7, y: 15 },
    config: { terrain: [{ x: 7, y: 7 }], enemyMod: { hp: 1.3, reward: 1.3 }, weaponBan: ['missile'] }
  }
]

let failures = 0
const check = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}: ${msg}`)
  if (!cond) failures++
}

for (const m of MAPS) {
  const eng = new GameEngine({ ...m, startGold: 500, lives: 20 })
  console.log(`\n=== ${m.name} (${eng.w}x${eng.h}) ===`)
  check(eng.hasValidPath(), '默认路径有效')
  check(eng.fixedCells.size === (m.config.terrain || []).length, `岩块数量=${eng.fixedCells.size}`)

  if (m.config.terrain && m.config.terrain.length) {
    const t = m.config.terrain[0]
    // 岩块不可拆除
    const rm = eng.removeBlock(t.x, t.y)
    check(!rm.ok, '岩块不可拆除')
    // 岩块不可放置方块
    const pb = eng.placeBlock(t.x, t.y, 'normal')
    check(!pb.ok, '岩块格不可放路块')
    // 岩块边上不可建造设施（取岩块上方水平边）
    const edge = { dir: 'h', x: t.x, y: t.y }
    const ps = eng.placeStructure(edge, 'weapon', 'arrow')
    check(!ps.ok, '岩壁边上不可建造武器')
  }

  if (m.config.weaponBan) {
    const edge = { dir: 'h', x: 0, y: 0 }
    const ps = eng.placeStructure(edge, 'weapon', 'missile')
    check(!ps.ok, '禁用武器不可建造')
    check(eng.isWeaponAllowed('arrow'), '非禁用武器可建造')
  }

  if (m.config.enemyMod) {
    eng.startWave()
    eng.spawnEnemy('grunt', 1)
    const e = eng.enemies[0]
    check(Math.abs(e.hp - 90 * 1.3) < 0.01, `敌人血量倍率生效 hp=${e.hp}`)
    check(e.reward === Math.round(5 * 1.3), `敌人赏金倍率生效 reward=${e.reward}`)
  }
}

console.log(failures === 0 ? '\n地图差异化验证全部通过' : `\n${failures} 项失败`)
process.exit(failures === 0 ? 0 : 1)
