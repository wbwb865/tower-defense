package com.tdgame.entity;

import java.time.LocalDateTime;

public class GameRecord {
    private Long id;
    private Long userId;
    private Long levelId;
    private Integer score;
    private Integer wave;
    private Integer kills;
    private String result;
    private Integer duration;
    private LocalDateTime createdAt;

    // 联表查询字段
    private String username;
    private String levelName;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Long getLevelId() { return levelId; }
    public void setLevelId(Long levelId) { this.levelId = levelId; }
    public Integer getScore() { return score; }
    public void setScore(Integer score) { this.score = score; }
    public Integer getWave() { return wave; }
    public void setWave(Integer wave) { this.wave = wave; }
    public Integer getKills() { return kills; }
    public void setKills(Integer kills) { this.kills = kills; }
    public String getResult() { return result; }
    public void setResult(String result) { this.result = result; }
    public Integer getDuration() { return duration; }
    public void setDuration(Integer duration) { this.duration = duration; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getLevelName() { return levelName; }
    public void setLevelName(String levelName) { this.levelName = levelName; }
}
