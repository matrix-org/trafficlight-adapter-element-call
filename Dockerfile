# Ensure we keep version in sync with package.json
FROM --platform=$BUILDPLATFORM mcr.microsoft.com/playwright:v1.32.0-jammy as builder
WORKDIR /usr/src/app

# To help caching, yarn install with just dependencies
COPY package.json yarn.lock ./
RUN yarn install

COPY images ./images

# Add remaining configuration and code, rebuild
# This will be faster because all dependencies are already cached

COPY tsconfig.json trafficlight.config.json ./
COPY src ./src
RUN yarn install && yarn build


FROM mcr.microsoft.com/playwright:v1.32.0-jammy
WORKDIR /usr/src/app

# Used as storage location for screenshots, screencasts, ffmpeg temporary files
RUN mkdir /video

COPY package.json yarn.lock ./
RUN yarn install --prod
COPY --from=builder /usr/src/app/bin ./bin

CMD ["/bin/sh", "-c", "xvfb-run -a yarn start"]
