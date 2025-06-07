#!/bin/bash

# Скрипт управления ботом для розыгрышей

case "$1" in
    start)
        echo "Запуск бота для розыгрышей..."
        
        # Проверка, не запущен ли уже бот
        if pgrep -f "node index.js" > /dev/null; then
            echo "Бот уже запущен!"
            exit 1
        fi
        
        # Установка зависимостей если нужно
        if [ ! -d "node_modules" ]; then
            echo "Установка зависимостей..."
            npm install
        fi
        
        # Запуск бота в фоновом режиме
        nohup node index.js > bot.log 2>&1 &
        BOT_PID=$!
        echo $BOT_PID > bot.pid
        
        echo "Бот запущен с PID: $BOT_PID"
        echo "Логи сохраняются в bot.log"
        ;;
        
    stop)
        echo "Остановка бота..."
        if [ -f bot.pid ]; then
            BOT_PID=$(cat bot.pid)
            if kill $BOT_PID 2>/dev/null; then
                echo "Бот остановлен (PID: $BOT_PID)"
                rm bot.pid
            else
                echo "Процесс с PID $BOT_PID не найден"
                rm bot.pid
            fi
        else
            echo "Файл bot.pid не найден. Попытка остановить все процессы node index.js..."
            pkill -f "node index.js"
        fi
        ;;
        
    restart)
        $0 stop
        sleep 2
        $0 start
        ;;
        
    status)
        if pgrep -f "node index.js" > /dev/null; then
            PID=$(pgrep -f "node index.js")
            echo "Бот запущен (PID: $PID)"
        else
            echo "Бот не запущен"
        fi
        ;;
        
    logs)
        if [ -f bot.log ]; then
            tail -f bot.log
        else
            echo "Файл логов не найден"
        fi
        ;;
        
    hour)
        echo "Запуск бота на час..."
        $0 start
        sleep 3600
        $0 stop
        echo "Бот остановлен после часа работы"
        ;;
        
    *)
        echo "Использование: $0 {start|stop|restart|status|logs|hour}"
        echo "  start   - Запустить бота"
        echo "  stop    - Остановить бота"
        echo "  restart - Перезапустить бота"
        echo "  status  - Проверить статус бота"
        echo "  logs    - Показать логи бота"
        echo "  hour    - Запустить бота на час"
        exit 1
        ;;
esac