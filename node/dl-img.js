/*

node dl-img.js
node dl-img.js URL
node dl-img.js FILE

 */

const url = require('url');
const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');

const config = {
  // 文件地址, 索引处使用 ** 代替
  src: '',
  // src: [],
  start: 0, // 开始文件索引
  end: 20, // 结束文件索引
  padNum: 0, // 补0后长度
};

const Fun = class {
  constructor() {
    // 获取传入参数
    const [
      src = config.src,
      end = config.end,
      start = config.start,
      padNum = config.padNum,
    ] = process.argv.slice(2);

    this.src = src;
    this.end = end;
    this.start = start;
    this.padNum = padNum;

    this.dir = path.join(__dirname, `${Date.now()}`);
    this.reg = /(\w+):\/\/(.+)\/([^*]+)(?:\*\*(.+))?/;

    // 协议
    this.protocolObj = {
      http,
      https,
    };
  }

  dl() {
    const { src } = this;
    if (!src) throw new Error('未输入地址');

    fs.mkdirSync(this.dir); // 生成文件夹

    if (typeof src === 'string') {
      const { protocol } = url.parse(src, true);
      if (protocol) {
        this.splitPath(src);
      } else {
        const txt = path.join(__dirname, src);
        fs.readFile(txt, 'binary', (err, data) => {
          const files = data.match(/http.+\b/g);
          const set = new Set(files);
          set.forEach((i) => {
            this.splitPath(i);
          });
        });
      }
    } else {
      src.forEach((i) => {
        this.splitPath(i);
      });
    }
  }

  // 分割地址
  splitPath(file) {
    const [, protocol, path1, path2, path3] = file.match(this.reg);
    if (path3) {
      // 如果为动态地址
      for (let i = this.start; i <= this.end; i += 1) {
        const index = this.padNum ? `${i}`.padStart(this.padNum, '0') : i; // 判断是否补0
        const name = `${path2}${index}${path3}`; // 获取文件名
        const newPath = `${protocol}://${path1}/${name}`; // 获取文件地址
        this.protocolObj[protocol].get(newPath, get => this.getFile(get, name));
      }
    } else {
      // 如果为静态地址
      this.protocolObj[protocol].get(file, get => this.getFile(get, path2));
    }
  }

  // 请求地址
  getFile(get, name) {
    // 如果不存在则终止
    if (get.statusCode !== 200) {
      console.error(`文件 ${name} 下载失败`);
      return;
    }

    const buf = [];
    get.on('data', (chunk) => {
      buf.push(chunk); // 储存数据
    });
    get.on('end', () => {
      const myPath = path.join(this.dir, name); // 新建文件地址
      const data = Buffer.concat(buf); // 合并数据

      fs.appendFile(myPath, data, () => {});
      console.log(`文件 ${name} 下载完成`);
    });
  }
};

const fun = new Fun();
fun.dl();
