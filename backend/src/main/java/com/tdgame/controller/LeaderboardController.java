package com.tdgame.controller;

import com.tdgame.common.Result;
import com.tdgame.entity.GameRecord;
import com.tdgame.service.RecordService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/leaderboard")
public class LeaderboardController {

    @Autowired
    private RecordService recordService;

    @GetMapping
    public Result<List<GameRecord>> top(@RequestParam(required = false) Long levelId) {
        return Result.ok(recordService.top(levelId));
    }
}
