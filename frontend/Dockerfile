FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# NEXT_PUBLIC_* values are inlined at build time.
ARG NEXT_PUBLIC_CONVEX_URL
ENV NEXT_PUBLIC_CONVEX_URL=$NEXT_PUBLIC_CONVEX_URL

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
