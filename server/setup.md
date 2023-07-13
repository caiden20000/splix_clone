Steps taken to add TS support.
Following `https://khalilstemmler.com/blogs/typescript/node-starter-project/`
```
npm init -y
npm install typescript --save-dev
npm install @types/node --save-dev
npx tsc --init --rootDir src --outDir build \
    --esModuleInterop --resolveJsonModule --lib ES2022 \
    --module commonjs --allowJs true --noImplicitAny true
npm i --save-dev express-ws
npm i --save-dev @types/express-ws
> Put TS files in src/
> Build files into build/
```

Build with `npx tsc` to compile ES2022 src/\*.ts --> ES2016 build/\*.js