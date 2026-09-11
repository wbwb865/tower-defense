package com.tdgame.mapper;

import com.tdgame.entity.Level;

import java.util.List;

public interface LevelMapper {
    List<Level> findAll();

    Level findById(Long id);
}
