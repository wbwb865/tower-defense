package com.tdgame.service;

import com.tdgame.common.JwtUtil;
import com.tdgame.common.Result;
import com.tdgame.entity.User;
import com.tdgame.mapper.UserMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class UserService {

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private JwtUtil jwtUtil;

    public Result<?> register(String username, String password) {
        if (userMapper.findByUsername(username) != null) {
            return Result.error("用户名已存在");
        }
        User user = new User();
        user.setUsername(username);
        user.setPassword(encoder.encode(password));
        userMapper.insert(user);
        return Result.ok(null);
    }

    public Result<?> login(String username, String password) {
        User user = userMapper.findByUsername(username);
        if (user == null || !encoder.matches(password, user.getPassword())) {
            return Result.error("用户名或密码错误");
        }
        Map<String, Object> data = new HashMap<>();
        data.put("token", jwtUtil.createToken(user.getId(), user.getUsername()));
        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("id", user.getId());
        userInfo.put("username", user.getUsername());
        data.put("user", userInfo);
        return Result.ok(data);
    }
}
