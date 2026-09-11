package com.tdgame.mapper;

import com.tdgame.entity.User;

public interface UserMapper {
    User findByUsername(String username);

    int insert(User user);
}
