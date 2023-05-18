FROM --platform=$BUILDPLATFORM mcr.microsoft.com/playwright:v1.32.0-jammy as builder
WORKDIR /usr/src/app

COPY package.json yarn.lock tsconfig.json trafficlight.config.json ./
COPY src ./src
RUN yarn install && yarn build


FROM mcr.microsoft.com/playwright:v1.32.0-jammy
WORKDIR /usr/src/app

COPY package.json yarn.lock ./
COPY video ./video
RUN yarn install --prod
COPY --from=builder /usr/src/app/bin ./bin

CMD ["/bin/sh", "-c", "xvfb-run -a yarn start"]
