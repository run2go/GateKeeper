FROM oven/bun:latest
WORKDIR /app
COPY . .
RUN bun install
 
ARG PORT
EXPOSE ${PORT:-80}
 
CMD ["bun", "server.js"]