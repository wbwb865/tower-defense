package com.tdgame.controller;

import com.tdgame.common.Result;
import com.tdgame.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserService userService;

    @PostMapping("/register")
    public Result<?> register(@RequestBody RegisterRequest req) {
        return userService.register(req.username(), req.password());
    }

    @PostMapping("/login")
    public Result<?> login(@RequestBody LoginRequest req) {
        return userService.login(req.username(), req.password());
    }

    public record RegisterRequest(String username, String password) {}

    public record LoginRequest(String username, String password) {}
}
