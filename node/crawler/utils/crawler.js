let http = require('http');
let https = require('https');

let cheerio = require('cheerio');

let $ = cheerio.load(`
  <meta charset="utf-8">
  <table border="1"></table>
`);
let total = 0;

let run = (url, getData) => {
  return new Promise((resolve, reject) => {
    // 延迟请求, 避免被禁
    setTimeout(() => {
      let put = https.get(url, (get) => {
        let buf = [];
        get.on('data', (chunk) => buf.push(chunk));
        get.on('end', () => {
          let body = Buffer.concat(buf).toString();
          let data = getData(cheerio.load(body), url);
          data.forEach((elements) => {
            let list = elements.map((element) => {
              return `<td>${element}</td>`;
            });
            let tr = `<tr>${list.join('')}</tr>`;
            $('table').append(tr);
            total++;
          });

          resolve();
        });
      });
    }, 300);
  });
};

module.exports = (url, getData) => {
  let server = http.createServer(async (request, response) => {
    // 避免浏览器请求网站图标导致运行代码两遍
    if (request.url === '/favicon.ico') {
      response.writeHead(204); // No Content
      response.end();
      return;
    }

    if (Array.isArray(url)) {
      for (const i of url) {
        await run(i, getData);
      }
    } else {
      await run(url, getData);
    }

    let html = $.html();

    // response.writeHead(200, { 'Content-Type': 'application/json' });
    // response.end(JSON.stringify(data.get()));
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end(html);
    server.close(() => {
      console.log('总数', total);
    })
  });

  server.listen(5555, () => {
    console.log('http://localhost:5555/');
  });
};
