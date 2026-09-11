package com.tdgame.service;

import com.tdgame.entity.GameRecord;
import com.tdgame.mapper.RecordMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RecordService {

    @Autowired
    private RecordMapper recordMapper;

    public void save(GameRecord record) {
        recordMapper.insert(record);
    }

    public List<GameRecord> listByUser(Long userId) {
        return recordMapper.findByUserId(userId);
    }

    public List<GameRecord> top(Long levelId) {
        return recordMapper.findTop(levelId);
    }
}
