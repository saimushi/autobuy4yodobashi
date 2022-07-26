/**
 * This is the main Node.js server script for your project
 * Check out the two endpoints this back-end API provides in fastify.get and fastify.post below
 */

const path = require("path");

// Require the fastify framework and instantiate it
const fastify = require("fastify")({
  // Set this to true for detailed logging:
  logger: false,
});

// ADD FAVORITES ARRAY VARIABLE FROM TODO HERE

// Setup our static files
fastify.register(require("@fastify/static"), {
  root: path.join(__dirname, "public"),
  prefix: "/", // optional: default '/'
});

// Formbody lets us parse incoming forms
fastify.register(require("@fastify/formbody"));

// View is a templating manager for fastify
fastify.register(require("@fastify/view"), {
  engine: {
    handlebars: require("handlebars"),
  },
});

/**
 * Our home page route
 *
 * Returns src/pages/index.hbs with data built into it
 */
 //fastify.get("/", function (request, reply) {
 fastify.register(require('fastify-markdown'), {src: true, markedOptions: { gfm: false }}).get("/", async function (request, reply) {
   // params is an object we'll pass to our handlebars template
   const readme = await reply.markdown('README.md');
   // The Handlebars code will be able to access the parameter values and build them into the page
   //return reply.view("/src/pages/index.hbs", params);
   return reply.code(200).header('Content-Type', 'text/html; charset=utf-8')
   .send('<html><head><title>Yodobashi自動購入Bot</title><body>' + readme + '</body><script>const elements = document.getElementsByTagName(\'a\'); for(let element of elements){ element.setAttribute(\'target\', \'_blank\'); }</script></html>');
 });

// Run the server and report out to the logs
fastify.listen(
  { port: process.env.PORT, host: "0.0.0.0" },
  function (err, address) {
    if (err) {
      fastify.log.error(err);
      process.exit(1);
    }
    console.log(`Your app is listening on ${address}`);
    fastify.log.info(`server listening on ${address}`);
  }
);


// autobuy batch
const identify = process.env.IDENTIFY;
const pass = process.env.PASS;
const linetoken = process.env.LINETOKEN;
const item1 = process.env.ITEM1;
const item2 = process.env.ITEM2;
const item3 = process.env.ITEM3;
const item4 = process.env.ITEM4;
const item5 = process.env.ITEM5;
const maxitems = 5;

const fs = require('fs');
const request = require('request');
const puppeteer = require('puppeteer');

// let browser = null;
// let page = null;

let items = [null, null, null, null, null, ];
if ('string' == typeof item1) {
  items[0] = { id: item1, buycount: 0, usecount: 1 };
}
if ('string' == typeof item2) {
  items[1] = { id: item2, buycount: 0, usecount: 1 };
}
if ('string' == typeof item3) {
  items[2] = { id: item3, buycount: 0, usecount: 1 };
}
if ('string' == typeof item4) {
  items[3] = { id: item4, buycount: 0, usecount: 1 };
}
if ('string' == typeof item5) {
  items[4] = { id: item5, buycount: 0, usecount: 1 };
}
console.log('items=', items);

const notifyLine = async function (argtoken, argmessage, argimagepath) {
  let formdata = { message: 'a4y ' + argmessage };
  if ('string' == typeof argimagepath && 0 < argimagepath.length) {
    formdata['imageFile'] = fs.createReadStream(argimagepath);
  }
  const options = {
    url: 'https://notify-api.line.me/api/notify',
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Bearer ${argtoken}` },
    formData: formdata,
    json: true,
  };
  const res = await new Promise (function (resolve) {
    request(options, function (error, response, body) {
      //console.log('response=', response);
      if (response.statusCode == 200) {
        resolve(body);
      }
      else {
        resolve(error);
      }
    });
  });
  console.log('notify res=', res);
  return res;
};

const checkYodobashi = async function (argid, argpass, argitemid) {
  // await initYodobashi();

  let result = null;
  console.log('ブラウザ初期化');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-web-security', '--disable-features=IsolateOrigins,site-per-process'], });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 7_0 like Mac OSX) AppleWebKit/537.51.1 (KHTML, like Gecko) Version/7.0 Mobile/11A465 Safari/9537.53');
  //await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15');
  await page.setViewport({ width: 480, height: 960, });
  // await page.setCookie({
  //     'name': 'JSESSIONID',
  //     'value': 'D6EE63F0AE053C356B2E9AAF176D1F8B',
  //     'domain': 'order.yodobashi.com', // ドメイン（省略可）
  //     'path': '/' // パス（省略可）
  // });
  await page.setDefaultTimeout(20000);
  console.log('ブラウザ初期化 OK');

  // await loginYodobashi(argid, argpass);

  let targetURL = 'https://www.yodobashi.com/?word=' + argitemid;
  console.log('商品検索', targetURL);
  try {
    await page.goto(targetURL);
    await page.waitForSelector('#wrapper');
    console.log('商品検索 OK');
  }
  catch (error) {
    console.log('商品検索 失敗', error);
    return false;
  }

  console.log('検索結果があるかどうか');
  try {
    const itemname = await page.evaluate(function(selector) {
      return document.querySelector(selector).textContent.trim();
    }, '.js_productList .js_productBox:first-child .fs14');
    console.log('検索結果の一番上のアイテム名=', itemname);
    const words = argitemid.split(' ');
    console.log('検索結果が正しいか？ words=', words);
    let hitcnt = 0;
    for (var hidx=0; hidx < words.length; hidx++) {
      if (-1 < itemname.indexOf(words[hidx])) {
        hitcnt++;
      }
    }
    console.log('検索結果があったか？ hitcnt=', hitcnt);
    if (hitcnt === words.length) {
      console.log('検索結果があったので詳細に遷移する', itemname);
      const producturl = await page.evaluate(function(selector) {
        return document.querySelector(selector).getAttribute('hrefurl');
      }, '.js_productList .js_productBox:first-child a.js_productListPostTag');
      const targetURL = 'https://www.yodobashi.com' + producturl;
      console.log('検索結果があったので詳細に遷移する url=', targetURL);
      //await page.goto(targetURL, { waitUntil: 'networkidle2' });
      //await page.click('.js_productList .js_productBox:first-child a.js_productListPostTag');
      console.log('検索結果があったので在庫確認をする', itemname);
      const is = await page.evaluate(function(selector) {
        return document.querySelector(selector).className;
      }, '.js_productList .js_productBox:first-child .fs12 li:nth-child(2) span');
      console.log('is=', is);
      if ('string' == typeof is && -1 < is.indexOf('gray')) {
        console.log('在庫ナシ', itemname);
      }
      else {
        console.log('在庫恐らくアリ', itemname);
        await page.screenshot({ path: 'screenshot.png'});
        await notifyLine(linetoken, targetURL + ' は在庫が補充された可能性があります。', 'screenshot.png');
        // 購入処理があるならこの下
        result = true;
      }
    }
    else {
      console.log('検索結果がそもそも無い');
    }
  }
  catch (error) {
    console.log('検索にそもそも失敗', error);
  }
  await browser.close();
  return result;
};

const initYodobashi = async function () {
  if (browser) {
    return;
  }
  console.log('ブラウザ初期化');
  browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-web-security', '--disable-features=IsolateOrigins,site-per-process'], });
  //browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox']});
  // page = await browser.newPage();
  // await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 7_0 like Mac OSX) AppleWebKit/537.51.1 (KHTML, like Gecko) Version/7.0 Mobile/11A465 Safari/9537.53');
  // //await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15');
  // await page.setViewport({ width: 480, height: 960, });
  // // await page.setCookie({
  // //     'name': 'JSESSIONID',
  // //     'value': 'D6EE63F0AE053C356B2E9AAF176D1F8B',
  // //     'domain': 'order.yodobashi.com', // ドメイン（省略可）
  // //     'path': '/' // パス（省略可）
  // // });
  // await page.setDefaultTimeout(20000);
  console.log('ブラウザ初期化 OK');
  return;
};

let authorized = true;
const loginYodobashi = async function (argid, argpassd) {
  if (authorized) {
    console.log('ログイン済 スキップ');
    return;
  }
  try {
    console.log('ログイン id=', argid);
    console.log('ログイン pass=', argpassd);
    await page.setViewport({width: 1920, height: 2000});
    await page.goto('https://order.yodobashi.com/yc/login/index.html', { waitUntil: 'networkidle2',});
    console.log('ログイン？-');
    await page.waitForSelector('form#js_i_form');
    await page.type('#memberId', argid);
    await page.type('#password', argpassd);
    await page.click('#js_i_login0');
    console.log('ログイン？？');
    await page.waitForSelector('#wrapper');
    console.log('ログイン wait？');
    await page.screenshot({ path: 'screenshot.png'});
    await notifyLine(linetoken, 'ログイン成功？', 'screenshot.png');
    authorized = await page.evaluate(function(selector) {
      return (document.querySelector(selector)) ? true : false;
    }, '.cntsHead');
    console.log('ログイン OK？ authorized=', authorized);
    if (authorized) {
      console.log('ログイン OK');
      await page.screenshot({ path: 'screenshot.png'});
      await notifyLine(linetoken, 'ログイン成功', 'screenshot.png');
      return true;
    }
    console.log('ログイン NG');
    return;
  }
  catch (error) {
    console.log('error=', error);
  }
  throw new Error('ログインfail');
  //await notifyLine(linetoken, 'ログイン成功');
  return;
};

const buyYodobashi = async function (argitemid, argViewCartSkiped, argReserve) {
  let result = false;
  const targetURL = 'https://www.Yodobashi.co.jp/dp/' + argitemid;
  try {
    if (true !== argViewCartSkiped) {
      console.log('カートを表示');
      await page.goto('https://www.Yodobashi.co.jp/gp/aw/c?ref_=navm_hdr_cart');
      await page.waitForSelector('#nav-cart-count');
      console.log('カートを表示 OK');
    }

    if (argReserve) {
      console.log('予約注文の確定');
      await page.evaluate(function(selector) {
        return document.querySelector(selector).click();
      }, 'input[name="placeYourOrder1"]');
      await page.waitForSelector('#widget-purchaseConfirmationStatus');
      console.log('予約注文完了 OK');
      await page.screenshot({ path: 'screenshot.png'});
      await notifyLine(linetoken, targetURL + '?m=AN1VRQENFRJN5\nは予約完了しました。\n成功したかどうか確認して下さい。\nhttps://www.Yodobashi.co.jp/gp/css/order-history?ref_=nav_orders_first', 'screenshot.png');
    }
    else {
      console.log('レジに進む');
      await page.evaluate(function(selector) {
        return document.querySelector(selector).click();
      }, 'input[name="proceedToRetailCheckout"]');
      await page.waitForSelector('#shipping-summary');
      console.log('レジに進む OK');

      console.log('注文の確定');
      await page.evaluate(function(selector) {
        return document.querySelector(selector).click();
      }, 'input[name="placeYourOrder1"]');
      await page.waitForSelector('#widget-purchaseConfirmationStatus');
      console.log('注文完了');
      await page.screenshot({ path: 'screenshot.png'});
      await notifyLine(linetoken, targetURL + '?m=AN1VRQENFRJN5\nは注文完了しました。\n成功したかどうか確認して下さい。\nhttps://www.Yodobashi.co.jp/gp/css/order-history?ref_=nav_orders_first', 'screenshot.png');
    }

    console.log('注文が成功したかどうかをチェック');
    const success = await page.evaluate(function(selector) {
      return document.querySelector(selector).textContent;
    }, '#widget-purchaseConfirmationStatus');
    console.log('success=', success);
    if (-1 < success.indexOf('注文が確定')) {
      console.log('注文成功');
      //await page.screenshot({ path: 'screenshot.png'});
      return true;
    }
    console.log('注文失敗');
  }
  catch (error) {
    console.log('注文完了出来す', error);
  }

  console.log('実は既に購入済みでは無かったかをエラーから確認を試みる1');
  try {
    let aleadybuy = await page.evaluate(function(selector) {
      return document.querySelector(selector).textContent;
    }, '.a-alert-content [data-messageid="quantityPermittedLimitViolation"]');
    console.log('aleadybuy=', aleadybuy);
    if ('string' == typeof aleadybuy && -1 < aleadybuy.indexOf('購入数の制限があります')) {
      console.log('実は既に購入済みだったので購入成功として処理2');
      result = true;
      await notifyLine(linetoken, targetURL + '?m=AN1VRQENFRJN5\nは注文済みでした。\n注文済みかどうか確認して下さい。\nhttps://www.Yodobashi.co.jp/gp/css/order-history?ref_=nav_orders_first');
    }
  }
  catch (error) {
    console.log('既に購入済みかどうか確認出来ず1', error);
  }

  if (true !== result) {
    console.log('実は既に購入済みでは無かったかをエラーから確認を試みる2');
    try {
      let aleadybuy = await page.evaluate(function(selector) {
        return document.querySelector(selector).textContent;
      }, '.a-spacing-base.item-row:first-child .a-alert-inline-error .a-spacing-small');
      console.log('aleadybuy=', aleadybuy);
      if ('string' == typeof aleadybuy && -1 < aleadybuy.indexOf('購入数に制限があります')) {
        console.log('実は既に購入済みだったので購入成功として処理2');
        result = true;
        await notifyLine(linetoken, targetURL + '?m=AN1VRQENFRJN5\nは注文済みでした。\n注文済みかどうか確認して下さい。\nhttps://www.Yodobashi.co.jp/gp/css/order-history?ref_=nav_orders_first');
      }
    }
    catch (error) {
      console.log('既に購入済みかどうか確認出来ず2', error);
    }
  }

  if (true === result) {
    console.log('カートに残ってたら削除しておく');
    try {
      console.log('空にする為のカートを表示');
      await page.goto('https://www.Yodobashi.co.jp/gp/aw/c?ref_=navm_hdr_cart');
      await page.waitForSelector('#nav-cart-count');
      console.log('空にする為のカートを表示 OK');
      let is = await page.evaluate(function(selector) {
        return (document.querySelector(selector)) ? true : false;
      }, 'input[name="proceedToRetailCheckout"]');
      if (is) {
        console.log('アイテム削除');
        await page.evaluate(function(selector) {
          return document.querySelector(selector).click();
        }, '.sc-list-item:first-child .sc-list-item-content input[data-action="delete"]');
        console.log('アイテム削除 OK?');
        await page.waitForSelector('.sc-list-item-removed-msg .a-padding-mini[data-action="delete"]');
        console.log('アイテム削除 OK');
      }
    }
    catch (error) {
      console.log('カートを空に出来ず', error);
    }
  }
  else {
    await page.screenshot({ path: 'screenshot.png'});
    await notifyLine(linetoken, targetURL + '?m=AN1VRQENFRJN5\nは注文失敗しました。リトライします。\n実際に失敗したかどうか確認して下さい。\nhttps://www.Yodobashi.co.jp/gp/css/order-history?ref_=nav_orders_first', 'screenshot.png');
  }

  return result;
};

// autoby Core
const autobuyCore = async function () {
  console.log('loop batch start', new Date().toLocaleString());
  await notifyLine(linetoken, '監視をスタート');
  let targetidx = 0;
  while(true) {
    console.log('ループ開始', (targetidx+1));
    let res = null;
    let item = items[targetidx];
    if (item) {
      if (item.buycount < item.usecount) {
        console.log('購入が完了していないアイテムを検知 行番号' + (targetidx+1), item);
        res = await checkYodobashi(identify, pass, item.id);
        console.log('res=', res);
        if (true === res) {
          items[targetidx].buycount++;
        }
      }
    }
    console.log('ループ終了', (targetidx+1));
    if (null === res) {
      // 次のアイテムのチェック
      targetidx++;
      if ((maxitems-1) < targetidx) {
        // アイテムは5つまでなので5つのチェックが終わったら30秒待って頭に戻る
        targetidx = 0;
        // 30秒後に再トライ
        console.log('30秒のインターバルを挟む 次の行番号', (targetidx+1));
        const timer = await new Promise(function (resolve) {
          setTimeout(function () {
            resolve(true);
          }, 30000);
        });
      }
    }
    // XXX 購入の失敗はしつこく再処理するのでidxはインクリメントしない！
  }
};

autobuyCore();
