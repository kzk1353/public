/* 

node tiny
node tiny DIR
node tiny ../PATH

*/

let https = require('https');
let fs = require('fs');
let path = require('path');
let readline = require('readline');

let URLS = {
  '.jpg': 'tinyjpg.com',
  '.png': 'tinypng.com',
};
let MAX_SIZE = 5242880; //最大5mb
let MAX_NUMBER = 20; //最多20张
let UPLOAD = '/web/shrink';
let BACKUP = './backup';

let dir = __dirname;

let setColor = (title) => {
  let colors = {
    超出大小: '\x1B[41m',

    开始上传: '\x1B[45m',
    开始下载: '\x1B[43m',
    开始备份: '\x1B[44m',
    开始写入: '\x1B[46m',

    已经压缩: '\x1B[42m',
    成功压缩: '\x1B[42m',
    压缩数量: '\x1B[42m',
  };

  let start = colors[title];
  let end = '\x1B[0m';

  return `${start}${title}${end}`;
};

/**控制台 */
let { stdout } = process;

let lastLine = 0;
let logLine = (text, line = lastLine) => {
  readline.cursorTo(stdout, 0, line); //移动光标
  readline.clearLine(stdout, 0); //删除光标所在行
  console.log(text);

  if (lastLine <= line) lastLine = line + 1; //设置最后一行
  readline.cursorTo(stdout, 0, lastLine);
};

let log = (title, msg = {}) => {
  let { name, index, result } = msg;

  let str = '';
  if (name) {
    if (title === '成功压缩') {
      str = `${name} - 压缩后/压缩前: ${result.output.ratio * 100}%`;
    } else {
      str = name;
    }
  } else {
    str = msg;
  }

  logLine(`${setColor(title)}: ${str}`, index);
};

/**管道函数 */
let pipe =
  (...funs) =>
  (arg) => {
    let reduce = funs.reduce((p, v, k) => {
      if (k === 0) {
        return v(p);
      } else if (p === undefined) {
        return;
      } else {
        if (p instanceof Promise) {
          return p.then((res) => {
            if (res !== undefined) return v(res);
          });
        } else {
          return v(p);
        }
      }
    }, arg);

    return reduce;
  };

/**获取路径 */
let getDir = () => {
  let args = process.argv.slice(2); //获取参数

  // 是否有路径参数
  if (args.length) {
    let str = args.join(' '); //支持路径有空格

    // 判断是否为绝对路径
    if (path.isAbsolute(str)) {
      dir = str;
    } else {
      dir = path.join(__dirname, str);
    }
  }

  return dir;
};

/**创建备份目录 */
let mkdir = () => {
  return new Promise((resolve, reject) => {
    let src = path.join(dir, BACKUP);
    fs.readdir(src, (err) => {
      if (err) {
        fs.mkdir(src, (err2) => {
          if (err2) {
            reject(err2);
          } else {
            resolve(dir);
          }
        });
      } else {
        resolve(dir);
      }
    });
  });
};

/**获取文件地址 */
let getFiles = () => {
  return new Promise((resolve, reject) => {
    fs.readdir(dir, (err, files) => {
      if (err) {
        reject(err);
      } else {
        let objs = files.map((i) => ({
          dir,
          name: i,
          path: path.join(dir, i),
        }));
        resolve(objs);
      }
    });
  });
};

/**过滤图片 */
let filterImg = (files) => {
  let imgs = files.filter((i) => {
    let extname = path.extname(i.path);
    i.extname = extname;

    let isSupport = extname === '.png' || extname === '.jpg';
    return isSupport;
  });

  return imgs;
};

/**过滤尺寸 */
let filterSize = (files) => {
  let filters = files.filter((file, index) => {
    file.index = index;

    let stats = fs.statSync(file.path);
    if (stats.size > MAX_SIZE) {
      log('超出大小', file);
      return false;
    } else {
      return true;
    }
  });

  return filters;
};

/**过滤备份文件 */
let filterBackup = (files) => {
  return new Promise((resolve, reject) => {
    let src = path.join(dir, BACKUP);
    fs.readdir(src, (err, backups) => {
      if (err) {
        reject(err);
      } else {
        let filters = files.filter((file) => {
          let hasBackup = backups.includes(file.name);
          if (hasBackup) {
            log('已经压缩', file);
            return false;
          } else {
            return true;
          }
        });

        resolve(filters);
      }
    });
  });
};

/**分割文件数组 */
let sliceFiles = (files) => {
  let { length } = files;
  let arr = [];
  while (length > 0) {
    let index = length - MAX_NUMBER;
    let slice = files.slice(index < 0 ? 0 : index, length);
    arr.push(slice);
    length -= MAX_NUMBER;
  }
  return arr;
};

/**获取IP */
let getIP = (file) => {
  let ip = Array.from({ length: 4 }, () =>
    Math.floor(Math.random() * 255),
  ).join('.');
  file.ip = ip;
  return file;
};

/**获取请求参数 */
let getRequest = (file) => {
  let request = {
    headers: {
      // 'Content-Type': 'application/x-www-form-urlencoded',
      // 'Postman-Token': Date.now(),
      'X-Forwarded-For': file.ip,
      'Cache-Control': 'no-cache',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:78.0) Gecko/20100101 Firefox/78.0',
    },
    hostname: URLS[file.extname],
    path: UPLOAD,
    method: 'POST',
    rejectUnauthorized: false,
  };

  return {
    ...file,
    request,
  };
};

/**读取文件 */
let readFile = (file) => {
  return new Promise((resolve, reject) => {
    fs.readFile(file.path, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve({
          ...file,
          data,
        });
      }
    });
  });
};

/**上传图片 */
let upload = (file) => {
  log('开始上传', file);
  return new Promise((resolve, reject) => {
    let result = (res) => {
      res.on('data', (chunk) => {
        let json = JSON.parse(chunk.toString());
        if (json.error) {
          reject(json.message);
        } else {
          resolve({
            ...file,
            result: json,
          });
        }
      });
    };

    let req = https.request(file.request, result);
    req.on('error', reject);
    req.write(file.data, 'binary');
    req.end();
  });
};

/**下载图片 */
let download = (file) => {
  log('开始下载', file);
  return new Promise((resolve, reject) => {
    let src = file.result.output.url;
    let result = (res) => {
      let buf = [];

      res.on('data', (chunk) => {
        buf.push(chunk);
      });

      res.on('end', () => {
        resolve({
          ...file,
          compress: Buffer.concat(buf),
        });
      });
    };

    let req = https.get(src, result);
    req.on('error', (e) => reject(e));
  });
};

/**备份文件 */
let backupFile = (file) => {
  log('开始备份', file);
  return new Promise((resolve, reject) => {
    let oldPath = path.join(file.dir, file.name);
    let newPath = path.join(file.dir, BACKUP, file.name);
    fs.rename(oldPath, newPath, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(file);
      }
    });
  });
};

/**写入文件 */
let writeFile = (file) => {
  log('开始写入', file);
  return new Promise((resolve, reject) => {
    let src = path.join(file.dir, file.name);
    fs.writeFile(src, file.compress, 'binary', (err) => {
      if (err) {
        reject(err);
      } else {
        log('成功压缩', file);
        resolve(file);
      }
    });
  });
};

let getImgs = pipe(
  getDir,
  mkdir,
  getFiles,
  filterImg,
  filterSize,
  filterBackup,
);
let compress = pipe(
  getIP,
  getRequest,
  readFile,
  upload,
  download,
  backupFile,
  writeFile,
);

console.clear();
getImgs()
  .then((files) => files.map(compress))
  .then((proms) => Promise.all(proms))
  .then((res) => {
    log('压缩数量', res.length);
  });
