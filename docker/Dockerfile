FROM node:24-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g npm@11.17.0

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "start:dev"]