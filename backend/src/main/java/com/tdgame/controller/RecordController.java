package com.tdgame.controller;

import com.tdgame.common.Result;
import com.tdgame.common.UserContext;
import com.tdgame.entity.GameRecord;
import com.tdgame.entity.User;
import com.tdgame.service.RecordService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
public class RecordController {

    @Autowired
    private RecordService recordService;

    @PostMapping("/records")
    public Result<?> save(@RequestBody GameRecord req) {
        User user = UserContext.get();
        req.setUserId(user.getId());
        recordService.save(req);
        return Result.ok(null);
    }

    @GetMapping("/user/records")
    public Result<List<GameRecord>> mine() {
        User user = UserContext.get();
        return Result.ok(recordService.listByUser(user.getId()));
    }
}
