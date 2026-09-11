<template>
  <canvas
    ref="canvasEl"
    class="game-canvas"
    @mousemove="onMove"
    @mouseleave="onLeave"
    @click="onClick"
    @contextmenu="onRightClick"
  ></canvas>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { Renderer } from '../game/renderer.js'
import { CELL } from '../game/config.js'

const props = defineProps({
  engine: { type: Object, required: true },
  buildMode: { type: Object, default: null }
})

const emit = defineEmits(['frame', 'notify', 'cancel-build'])

const canvasEl = ref(null)
let renderer = null
let rafId = null
let lastTime = 0

function setupRenderer() {
  const canvas = canvasEl.value
  const engine = props.engine
  const dpr = window.devicePixelRatio || 1
  canvas.width = engine.w * CELL * dpr
  canvas.height = engine.h * CELL * dpr
  canvas.style.width = engine.w * CELL + 'px'
  canvas.style.height = engine.h * CELL + 'px'
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)
  renderer = new Renderer(ctx, engine)
  renderer.buildMode = props.buildMode
}

function loop(t) {
  const dt = lastTime ? (t - lastTime) / 1000 : 0
  lastTime = t
  const engine = props.engine
  engine.update(dt)
  renderer.render()
  emit('frame', engine)
  rafId = requestAnimationFrame(loop)
}

onMounted(() => {
  setupRenderer()
  rafId = requestAnimationFrame(loop)
})

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId)
})

// 点击"再来一局"后 engine 被替换，需重建渲染器并重置计时，否则循环仍引用旧引擎
watch(
  () => props.engine,
  () => {
    setupRenderer()
    lastTime = 0
  }
)

watch(
  () => props.buildMode,
  (m) => {
    if (renderer) renderer.buildMode = m
  }
)

function mousePos(e) {
  const rect = canvasEl.value.getBoundingClientRect()
  const logicalW = props.engine.w * CELL
  const logicalH = props.engine.h * CELL
  return {
    x: ((e.clientX - rect.left) / rect.width) * logicalW,
    y: ((e.clientY - rect.top) / rect.height) * logicalH
  }
}

function onMove(e) {
  const { x, y } = mousePos(e)
  renderer.hoverX = x
  renderer.hoverY = y
  renderer.hoverCell = props.engine.cellAt(x, y)
  renderer.hoverEdge = props.engine.edgeAt(x, y)
}

function onLeave() {
  renderer.hoverX = null
  renderer.hoverY = null
  renderer.hoverCell = null
  renderer.hoverEdge = null
}

function onClick(e) {
  const { x, y } = mousePos(e)
  const mode = props.buildMode
  if (!mode) return
  if (mode.kind === 'block') {
    const cell = props.engine.cellAt(x, y)
    if (!cell) return
    const r = props.engine.placeBlock(cell.cx, cell.cy, mode.type)
    if (!r.ok) emit('notify', r.msg)
  } else if (mode.kind === 'weapon' || mode.kind === 'armor' || mode.kind === 'trap' || mode.kind === 'portal') {
    const edge = props.engine.edgeAt(x, y)
    if (!edge) return
    const r = props.engine.placeStructure(edge, mode.kind, mode.type)
    if (!r.ok) emit('notify', r.msg)
  } else if (mode.kind === 'upgrade') {
    const skey = props.engine.structureNear(x, y)
    if (!skey) return
    const r = props.engine.upgradeStructure(props.engine.graph.parseEdgeKey(skey))
    if (!r.ok) emit('notify', r.msg)
  } else if (mode.kind === 'sell') {
    // 优先拆除边上的设施（按设施中点判定，避免点中相邻路块格子）
    const skey = props.engine.structureNear(x, y)
    if (skey) {
      const r = props.engine.removeStructure(props.engine.graph.parseEdgeKey(skey))
      if (!r.ok) emit('notify', r.msg)
      return
    }
    const cell = props.engine.cellAt(x, y)
    if (cell && props.engine.getBlockAt(cell.cx, cell.cy)) {
      const r = props.engine.removeBlock(cell.cx, cell.cy)
      if (!r.ok) emit('notify', r.msg)
    }
  }
}

function onRightClick(e) {
  e.preventDefault()
  emit('cancel-build')
}
</script>

<style scoped>
.game-canvas {
  display: block;
  border-radius: 10px;
  border: 1px solid rgba(0, 229, 255, 0.25);
  background: #0a0e16;
  cursor: crosshair;
  max-width: 100%;
  height: auto;
  flex-shrink: 1;
  min-width: 0;
  box-shadow: 0 0 24px rgba(0, 229, 255, 0.12), inset 0 0 40px rgba(0, 229, 255, 0.04);
}
</style>
