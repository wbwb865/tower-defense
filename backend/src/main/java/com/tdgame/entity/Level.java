package com.tdgame.entity;

import java.time.LocalDateTime;

public class Level {
    private Long id;
    private String name;
    private Integer width;
    private Integer height;
    private Integer spawnX;
    private Integer spawnY;
    private Integer exitX;
    private Integer exitY;
    private Integer startGold;
    private Integer lives;
    private String config;
    private LocalDateTime createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Integer getWidth() { return width; }
    public void setWidth(Integer width) { this.width = width; }
    public Integer getHeight() { return height; }
    public void setHeight(Integer height) { this.height = height; }
    public Integer getSpawnX() { return spawnX; }
    public void setSpawnX(Integer spawnX) { this.spawnX = spawnX; }
    public Integer getSpawnY() { return spawnY; }
    public void setSpawnY(Integer spawnY) { this.spawnY = spawnY; }
    public Integer getExitX() { return exitX; }
    public void setExitX(Integer exitX) { this.exitX = exitX; }
    public Integer getExitY() { return exitY; }
    public void setExitY(Integer exitY) { this.exitY = exitY; }
    public Integer getStartGold() { return startGold; }
    public void setStartGold(Integer startGold) { this.startGold = startGold; }
    public Integer getLives() { return lives; }
    public void setLives(Integer lives) { this.lives = lives; }
    public String getConfig() { return config; }
    public void setConfig(String config) { this.config = config; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
