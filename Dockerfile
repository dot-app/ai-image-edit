# syntax=docker/dockerfile:1

FROM node:20-alpine AS build
WORKDIR /app

# 复制依赖文件
COPY package.json ./

# 安装依赖（不使用 lock 文件以避免 Alpine 可选依赖问题）
RUN npm install --legacy-peer-deps --no-audit

# 复制源代码
COPY . .

# 构建生产版本
RUN npm run build

# 生产运行阶段
FROM nginx:1.27-alpine AS runtime

# 复制 Nginx 配置
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# 复制构建产物
COPY --from=build /app/dist /usr/share/nginx/html

# 添加健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

