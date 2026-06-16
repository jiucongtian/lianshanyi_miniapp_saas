FROM node:20-alpine AS development

WORKDIR /app

COPY package.json ./
RUN npm install

COPY vite.config.ts tsconfig.json tsconfig.node.json index.html ./

EXPOSE 5174

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
