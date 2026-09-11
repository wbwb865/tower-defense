package com.tdgame.service;

import com.tdgame.entity.Level;
import com.tdgame.mapper.LevelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class LevelService {

    @Autowired
    private LevelMapper levelMapper;

    public List<Map<String, Object>> list() {
        return levelMapper.findAll().stream().map(this::toView).toList();
    }

    public Map<String, Object> detail(Long id) {
        Level level = levelMapper.findById(id);
        return level == null ? null : toView(level);
    }

    private Map<String, Object> toView(Level level) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", level.getId());
        m.put("name", level.getName());
        m.put("width", level.getWidth());
        m.put("height", level.getHeight());
        m.put("spawn", Map.of("x", level.getSpawnX(), "y", level.getSpawnY()));
        m.put("exit", Map.of("x", level.getExitX(), "y", level.getExitY()));
        m.put("startGold", level.getStartGold());
        m.put("lives", level.getLives());
        m.put("config", parseConfig(level.getConfig()));
        return m;
    }

    private Map<String, Object> parseConfig(String config) {
        if (config == null || config.isBlank()) return Map.of();
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper().readValue(config, Map.class);
        } catch (Exception e) {
            return Map.of();
        }
    }
}
