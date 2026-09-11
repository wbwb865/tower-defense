-- ============================================
-- 边路塔防 数据库初始化脚本
-- 使用：mysql -uroot -p < schema.sql
-- ============================================

CREATE DATABASE IF NOT EXISTS tower_defense DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE tower_defense;

-- 用户表
CREATE TABLE IF NOT EXISTS `user` (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    username    VARCHAR(50)  NOT NULL UNIQUE,
    password    VARCHAR(100) NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 关卡表
CREATE TABLE IF NOT EXISTS `level` (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(50) NOT NULL,
    width       INT NOT NULL DEFAULT 10,
    height      INT NOT NULL DEFAULT 8,
    spawn_x     INT NOT NULL DEFAULT 0,
    spawn_y     INT NOT NULL DEFAULT 4,
    exit_x      INT NOT NULL DEFAULT 10,
    exit_y      INT NOT NULL DEFAULT 4,
    start_gold  INT NOT NULL DEFAULT 120,
    lives       INT NOT NULL DEFAULT 20,
    config      TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 战绩表
CREATE TABLE IF NOT EXISTS `game_record` (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT NOT NULL,
    level_id    BIGINT,
    score       INT NOT NULL DEFAULT 0,
    wave        INT NOT NULL DEFAULT 0,
    kills       INT NOT NULL DEFAULT 0,
    result      VARCHAR(10),
    duration    INT NOT NULL DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    KEY idx_user (user_id),
    KEY idx_score (score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 种子关卡数据（config：desc 地图规则 / terrain 悬浮岩块 / enemyMod 敌人倍率 / weaponBan 禁用武器）
INSERT INTO `level` (name, width, height, spawn_x, spawn_y, exit_x, exit_y, start_gold, lives, config) VALUES
('新手平原', 14, 12, 0, 6, 14, 6, 120, 20, '{"desc":"开阔平原：标准敌军，全部武器可用，适合熟悉基础玩法"}'),
('峡谷险道', 16, 13, 0, 6, 16, 6, 150, 18, '{"desc":"峡谷险道：悬浮岩壁遍布，岩壁不可拆除、边上不可建造武器防具","terrain":[{"x":1,"y":2},{"x":2,"y":2},{"x":3,"y":2},{"x":4,"y":2},{"x":7,"y":1},{"x":8,"y":1},{"x":9,"y":1},{"x":12,"y":2},{"x":13,"y":2},{"x":14,"y":2},{"x":1,"y":10},{"x":2,"y":10},{"x":3,"y":10},{"x":4,"y":10},{"x":7,"y":11},{"x":8,"y":11},{"x":9,"y":11},{"x":12,"y":10},{"x":13,"y":10},{"x":14,"y":10},{"x":5,"y":6},{"x":10,"y":6}]}'),
('十字要塞', 15, 15, 7, 0, 7, 15, 160, 15, '{"desc":"十字要塞：重甲敌军（血量+30%、赏金+30%），禁导弹塔，两侧悬浮十字岩壁","terrain":[{"x":3,"y":5},{"x":3,"y":6},{"x":3,"y":7},{"x":3,"y":8},{"x":3,"y":9},{"x":2,"y":7},{"x":4,"y":7},{"x":11,"y":5},{"x":11,"y":6},{"x":11,"y":7},{"x":11,"y":8},{"x":11,"y":9},{"x":10,"y":7},{"x":12,"y":7}],"enemyMod":{"hp":1.3,"reward":1.3},"weaponBan":["missile"]}');
