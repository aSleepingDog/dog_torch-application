# electron实现

使用electron和前端三件套实现跨平台实现

## 1支持平台

| Windows10及以上 | Linux | MacOS |
| --------------- | ----- | ----- |
| 支持            | 支持  | 支持  |

## 2构建方法

```Shell
cd electron
npm install
```

在测试或构建之前，需要构建dog_torch的Napi接口（得到` dog_torch_napi.node`），并放到 `/native`中。并将`Release`中的`resourse.zip`解压得到本目录。

```Shell
//启动测试
npm run start:win
npm run start:linux
npm run start:mac
//启动构建（目前arm64可以构建不过得自行编写命令，dog_torch_napi.node也得是在arm64上编译）
npm run dist:win-x64
npm run dist:linux-x64
npm run dist:mac
```
