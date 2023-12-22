FROM oven/bun:latest

# Define work directory
WORKDIR /app

# Copy project files into the workdir
COPY . .

# Install the bun JavaScript Runtime Environment
RUN bun install

# Install the project dependencies
RUN npm install

# Copy the script for handling start/stop/restart commands
COPY docker-entrypoint.sh /usr/src/app/docker-entrypoint.sh

# Set execute permissions on the script
RUN chmod +x /usr/src/app/docker-entrypoint.sh

# Expose the port
ARG PORT
EXPOSE ${PORT:-80}

# Use the script as the default CMD
CMD ["/usr/src/app/docker-entrypoint.sh"]
