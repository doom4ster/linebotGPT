//載入環境變數
require('dotenv').config();

const systemPrompt = require('./systemPrompt.js');
// 引用linebot SDK
var linebot = require('linebot');
const line = require('@line/bot-sdk');

const express = require('express');

//引用 request library
const request = require('request')

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./linebot.db');

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
			"messages": [{ "role": "system", "content": systemPrompt }, { "role": "user", "content": lineMsg }]
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
async function handleEvent (event) {
	if (event.type !== 'message' || event.message.type !== 'text') {
		// ignore non-text-message event
		return Promise.resolve(null);
	}

	let linehistory = [];//user 發的 line history
	let gpthistory = [];//gpt 回應的 line history

	db.all("SELECT * FROM line_messages WHERE userId = ? AND groupId = ? ORDER BY id DESC LIMIT 10", event.source.userId, event.source.groupId, function (err, rows) {
		if (err) {
			console.error(err.message);
		}
		// 打印查询到的行
		rows.forEach((row) => {
			console.log(row)
			linehistory.push(row.text)
		});
	});

	linehistory.reverse();
	console.log("linehistory", linehistory);

	db.all("SELECT * FROM gpt_messages WHERE userId = ? AND groupId = ? ORDER BY id DESC LIMIT 10", event.source.userId, event.source.groupId, function (err, rows) {
		if (err) {
			console.error(err.message);
		}
		// 打印查询到的行
		rows.forEach((row) => {
			console.log(row)
			gpthistory.push(row.gptMsg)
		});
	});

	gpthistory.reverse();
	console.log("gpthistory", gpthistory);

	// 插入一条数据
	var lineMsgInsert = db.prepare("INSERT INTO line_messages (message_type, message_id, text, webhookEventId, isRedelivery, timestamp, source_type, userId, groupId, replyToken, mode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
	lineMsgInsert.run(event.message.type, event.message.id, event.message.text, event.webhookEventId, event.deliveryContext.isRedelivery, event.timestamp, event.source.type, event.source.userId, event.source.groupId, event.replyToken, event.mode);
	lineMsgInsert.finalize();



	let gptMsg = await callGPT(event.message.text);

	var gptMsgInsert = db.prepare("INSERT INTO gpt_messages (gptMsg, userId, groupId) VALUES (?, ?, ?)");
	gptMsgInsert.run(gptMsg, event.source.userId, event.source.groupId);
	gptMsgInsert.finalize();


	// create a echoing text message
	const echo = { type: 'text', text: gptMsg };

	//db.close();
	// use reply API
	return client.replyMessage(event.replyToken, echo);
}

// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
	console.log(`listening on ${port}`);
	db.serialize(function () { })
});
