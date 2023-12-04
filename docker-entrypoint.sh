#!/bin/bash

# Function to start the application
start() {
  echo "Starting the server"
  bun server.js
}

# Function to stop the application
stop() {
  echo "Stopping the server"
  # Send SIGTERM signal to the process
  pkill -f "bun server.js"
}

# Function to restart the application
restart() {
  stop
  start
}

# Check the command passed to the script
case "$1" in
  start)
    start
    ;;
  stop)
    stop
    ;;
  restart)
    restart
    ;;
  *)
    echo "Usage: $0 {start|stop|restart}"
    exit 1
    ;;
esac

exit 0
