//載入環境變數
require('dotenv').config();
// 引用linebot SDK
var linebot = require('linebot');
const line = require('@line/bot-sdk');

const express = require('express');

//引用 request library
const request = require('request')

//載入OPENAI
const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
	apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const app = express();

//寫檔用
const fs = require('fs')

// create LINE SDK config from env variables
const config = {
  channelAccessToken: process.env.linebot_channelAccessToken,
  channelSecret: process.env.linebot_channelSecret,
};

// create LINE SDK client
const client = new line.Client(config);

//call GPT API 
async function callGPT (lineMsg) {
	// TODO 加入 SQLite 以記錄 上文  以便 傳送給 GPT
	try {
		const completion = await openai.createChatCompletion({
		//model 列表  https://platform.openai.com/docs/models/model-endpoint-compatibility
		// role 有 system, user, assistant, or function  (不過 我不知道 role:function 是什麼含義)
		//https://platform.openai.com/docs/api-reference/chat/create
			"model": "gpt-3.5-turbo",
			"messages": [{ "role": "system", "content": "你將扮演知識淵博的朋友,以戰鎚40000中獸人的口吻回答,WAAAGH!,以繁體中文回覆" }, { "role": "user", "content": lineMsg }]
		});

		//console.log("COMPLETION", completion.data.choices);
		console.log("COMPLETION replyMessage=", completion.data.choices[0].message.content);
		return completion.data.choices[0].message.content;
	} catch (error) {
		console.log("GPT API ERROR")
		if (error.response) {
			console.log(error.response.status);
			console.log(error.response.data);
		} else {
			console.log(error.message);
		}
	}
}

// register a webhook handler with middleware
// about the middleware, please refer to doc
app.post('/linewebhook', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// event handler
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    // ignore non-text-message event
    return Promise.resolve(null);
  }

	let gptMsg = await callGPT(event.message.text);
  // create a echoing text message
  const echo = { type: 'text', text: gptMsg };

  // use reply API
  return client.replyMessage(event.replyToken, echo);
}

// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});
