FROM oven/bun:1.3.14
WORKDIR /app/apps/api
COPY apps/api/package.json apps/api/bun.lock ./
RUN bun install --frozen-lockfile --production
COPY apps/api/prisma.config.ts ./
COPY apps/api/prisma ./prisma
RUN bun run generate
COPY apps/api/src ./src
COPY apps/api/scripts/export-openapi.ts apps/api/scripts/employee-credentials.ts ./scripts/
COPY apps/api/scripts/docker-entrypoint.sh ./scripts/
RUN bun run openapi
COPY case_1/career_quest_dataset /app/case_1/career_quest_dataset
RUN chmod +x scripts/docker-entrypoint.sh
ENV NODE_ENV=production API_PORT=3001 API_HOST=0.0.0.0
ENV DATASET_PATH=/app/case_1/career_quest_dataset
USER bun
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=5s --start-period=40s --retries=5 \
  CMD ["bun", "-e", "fetch('http://127.0.0.1:3001/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
ENTRYPOINT ["./scripts/docker-entrypoint.sh"]
