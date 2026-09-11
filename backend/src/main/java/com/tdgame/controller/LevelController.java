package com.tdgame.controller;

import com.tdgame.common.Result;
import com.tdgame.service.LevelService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/levels")
public class LevelController {

    @Autowired
    private LevelService levelService;

    @GetMapping
    public Result<List<Map<String, Object>>> list() {
        return Result.ok(levelService.list());
    }

    @GetMapping("/{id}")
    public Result<Map<String, Object>> detail(@PathVariable Long id) {
        Map<String, Object> level = levelService.detail(id);
        if (level == null) {
            return Result.error("关卡不存在");
        }
        return Result.ok(level);
    }
}
