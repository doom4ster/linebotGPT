
專案初啟化
```
npm init
```

安裝 LINE Bot 所需的 lib
```
npm install @line/bot-sdk --save 
npm install express --save 
```
安裝open ai 
```
npm install openai
```

環境變數使用
```
npm install dotenv
```

在 .env 中  配好 LINE BOT KEY 與 OPENAI KEY

執行
```
node index.js
```

使用 ngrok 將 localhost:3000 公開到 往  https://xxxxxxx.ngrok-free.app
給 LINE Bot 的 webhook 使用
```
./ngrok http 3000 
```

source code page
[github](https://github.com/doom4ster/linebotGPT)


參考文章
1.  [nodejs 建立 linebot](https://pyradise.com/%E4%BD%BF%E7%94%A8node-js%E5%BB%BA%E7%BD%AE%E4%BD%A0%E7%9A%84%E7%AC%AC%E4%B8%80%E5%80%8Bline-bot-590b7ba7a28a)

1.  [用 Node.js 建立你的第一個 LINE Bot 聊天機器人以 OpenAI GPT-3 與 GPT-3.5 為例](https://israynotarray.com/nodejs/20221210/1224824056/)

1.  [openai 官方文檔](https://platform.openai.com/docs/api-reference/chat/create?lang=node.js)

