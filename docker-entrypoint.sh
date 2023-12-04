#!/bin/bash

# Function to start the Node.js application
start() {
  echo "Starting Node.js application..."
  bun server.js
}

# Function to stop the Node.js application
stop() {
  echo "Stopping Node.js application..."
  # Send SIGTERM signal to the Node.js process
  pkill -f "bun server.js"
}

# Function to restart the Node.js application
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
