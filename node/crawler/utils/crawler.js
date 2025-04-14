let http = require('http');
let https = require('https');

let cheerio = require('cheerio');

module.exports = (url, getData) => {
  let server = http.createServer((request, response) => {
    let put = https.get(url, (get) => {
      let buf = [];
      get.on('data', (chunk) => buf.push(chunk));
      get.on('end', () => {
        let $ = cheerio.load(`
          <meta charset="utf-8">
          <table border="1"></table>
        `);

        let body = Buffer.concat(buf).toString();
        let data = getData(cheerio.load(body));
        data
          .forEach(
            (elements) => {
              let list = elements.map(element => {
                return `<td>${element}</td>`;
              });
              let tr = `<tr>${list.join('')}</tr>`
              $('table').append(tr);
            }
          );

        let html = $.html();

        response.writeHead(200, { 'Content-Type': 'text/html' });
        response.end(html);
        // response.writeHead(200, { 'Content-Type': 'application/json' });
        // response.end(JSON.stringify(data.get()));
      });
    });
  });

  console.log('http://localhost:5555/');
  server.listen(5555);
};
