let http = require('http');
let https = require('https');

let cheerio = require('cheerio');

module.exports = (url, getData) => {
  let server = http.createServer((request, response) => {
    let put = https.get(url, (get) => {
      let buf = [];
      get.on('data', (chunk) => buf.push(chunk));
      get.on('end', () => {
        let body = Buffer.concat(buf).toString();

        let $ = cheerio.load(body);
        let data = getData($);

        // response.writeHead(200, { 'Content-Type': 'application/json' });
        // response.end(JSON.stringify(data.get()));

        let arr = data
          .map(
            (k, v) => `
            <tr>
              <td>
                <img src="${v.img}" />
              </td>
              <td>
                <span>${v.text}</span>
              </td>
              <td>
                <a href="${v.path}">跳转</a>
              </td>
            </tr>
          `
          )
          .get();

        arr.unshift('<meta charset="utf-8"><table>');
        arr.push('</table>');

        let str = arr.join('');

        response.writeHead(200, { 'Content-Type': 'text/html' });
        response.end(str);
      });
    });
  });

  server.listen(5555);
};
