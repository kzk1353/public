const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');
const xlsx = require('node-xlsx');

class Obj {
  constructor(txtName, src) {
    this.src = src ? path.join(__dirname, src) : __dirname; // 源目录
    this.txtName = path.join(__dirname, txtName); // 最终文件路径
    this.buf = []; // 数据

    // 忽略列表
    this.ignore = ['node_modules'];
  }

  start() {
    this.buf.push(['位置', '厂商', '原名', '译名', '汉化', '时间', '密码']);
    this.getFiles(this.src, true);
  }

  // 获取所有文件
  getFiles(dir, isFilter) {
    fs.readdir(dir, (err, files) => {
      files.forEach((v) => {
        // 过滤文件
        if (isFilter) {
          const isPass = this.ignore.some(item => item === v);
          if (isPass) return;
        } else {
          // for (let i = 0; i < 4; i += 1) this.buf.push([]); // 创建隔层
        }

        const file = path.join(dir, v);
        const stats = fs.statSync(file);

        // 判断是否文件夹
        const isDirectory = stats.isDirectory();
        if (isDirectory) {
          this.getFiles(file); // 进行递归
        } else {
          this.getMsg(file, stats);
        }
      });

      this.white(this.buf);
    });
  }

  // 获取文件信息
  getMsg(filePath, stats) {
    const { dir, name, ext } = path.parse(filePath);
    if (ext !== '.txt') return; // 如果非文档文件则终止

    const details = Obj.getName(name);
    if (!details) return;

    const [, firm = '', original = '', translation, version = ''] = details;

    const msg = {
      dir: path.relative(this.src, dir), // 文件所在目录
      firm, // 厂商
      original: original + version,
      translation,
      isCN: translation === undefined ? '' : '是', // 判断是否汉化
      mtime: stats.mtime.toJSON(),
      content: Obj.getContent(filePath),
    };

    const values = Object.values(msg);
    const content = values.pop();
    const row = [...values, ...content];
    this.buf.push(row);
  }

  // 获取详细名称
  static getName(name) {
    const reg = /(?:\[(.*)\])?([^{}]*)(?:\{(.*)\})?(.*)/;
    const match = name.match(reg);
    return match;
  }

  // 获取文件内容
  static getContent(filePath) {
    const fd = fs.openSync(filePath, 'r');
    const text = fs.readFileSync(fd, 'binary'); // 文件内容
    fs.close(fd, () => {});

    const decode = iconv.decode(text, 'gbk');
    const split = decode.split(/\r?\n/); // 多行内容
    return split;
  }

  // 写入终止文件
  white(data) {
    const buf = xlsx.build([{ data }]);
    fs.writeFile(this.txtName, buf, (err) => {
      if (!err) console.log('写入成功');
    });
  }
}

const src = process.argv[2] || './src'; // 源目录
const obj = new Obj('my.xlsx', src);
obj.start();
