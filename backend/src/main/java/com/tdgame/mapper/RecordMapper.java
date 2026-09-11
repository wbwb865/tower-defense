package com.tdgame.mapper;

import com.tdgame.entity.GameRecord;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface RecordMapper {
    int insert(GameRecord record);

    List<GameRecord> findByUserId(Long userId);

    List<GameRecord> findTop(@Param("levelId") Long levelId);
}
