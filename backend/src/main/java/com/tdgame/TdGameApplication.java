package com.tdgame;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.tdgame.mapper")
public class TdGameApplication {
    public static void main(String[] args) {
        SpringApplication.run(TdGameApplication.class, args);
    }
}
