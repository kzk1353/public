/* 广开答案文本去重, 以两个换行符为分界线 */

let fs = require('fs');
const { request } = require('https');
let path = require('path');
let readline = require('readline');

let BackupPath = '__backup';

let colors = {
  备份文件: '\x1B[42m',
  备份目录: '\x1B[44m',
  备份总数: '\x1B[46m',

  还原目录: '\x1B[44m',
  还原文件: '\x1B[42m',
  还原总数: '\x1B[46m',
};

/**控制台 */
let log = (title, msg = '') => {
  let start = colors[title] || '';
  let end = '\x1B[0m';
  let _title = `${start}${title}${end}`;
  console.log(`${_title}: ${msg}`);
};

/**忽略文件 */
let isIgnore = (src, opt = {}) => {
  if (src === __filename) return true;

  let { exclude, include } = opt;

  if (exclude) {
    let isArray = Array.isArray(exclude);
    if (isArray) {
      return exclude.some((i) => src.match(i));
    } else {
      return src.match(exclude);
    }
  }

  if (include) {
    let isArray = Array.isArray(include);
    if (isArray) {
      return !include.some((i) => src.match(i));
    } else {
      return !src.match(include);
    }
  }
};

/**读取目录 */
let readDir = (dir, base = __dirname, opt) => {
  return new Promise((resolve, reject) => {
    fs.readdir(dir, (err, res) => {
      if (err) {
        reject(err);
      } else {
        let files = res.reduce((p, i) => {
          let file = {
            dir: base,
            relative: path.relative(base, dir),
            name: i,
            src: path.join(dir, i),
          };

          if (isIgnore(file.src, opt)) {
            return p;
          } else {
            return [...p, file];
          }
        }, []);

        resolve(files);
      }
    });
  });
};

/**创建目录 */
let makeDir = (dir, base = __dirname) => {
  return new Promise((resolve) => {
    let isAbsolute = path.isAbsolute(dir);
    let src = isAbsolute ? dir : path.join(base, dir);
    fs.access(src, (err) => {
      if (err) {
        let subName = path.dirname(dir);
        makeDir(subName).then(() => {
          fs.mkdir(src, () => resolve(src));
        });
      } else {
        resolve(src);
      }
    });
  });
};

/**命令行 */
let question = (str = '') => {
  return new Promise((resolve) => {
    let rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(str, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
};

let FilePlus = class {
  constructor(_path = process.argv.slice(2)) {
    this._getPath(_path);
    return this.getStat().then(() => this);
  }

  DIR;
  FILE;
  FILE_BASE_NAME;
  FILE_EXT_NAME;

  /**获取路径 */
  _getPath(_path) {
    if (!_path) return console.error('请输入文件路径');

    let str = _path instanceof Array ? _path.join(' ') : _path; //支持路径有空格

    // 判断是否为绝对路径
    if (path.isAbsolute(str)) {
      this.FILE = str;
    } else {
      this.FILE = path.join(__dirname, str);
    }

    this.FILE_BASE_NAME = path.basename(str);
    this.FILE_EXT_NAME = path.extname(str);
    this.DIR = path.dirname(this.FILE);
  }

  _stats;

  /**读取文件 */
  getStat() {
    if (this._stats) {
      return Promise.resolve(this._stats);
    } else {
      return new Promise((resolve, reject) => {
        fs.stat(this.FILE, (err, stats) => {
          if (err) {
            reject(err);
          } else {
            let isDirectory = stats.isDirectory();
            if (isDirectory) {
              reject(new Error('请输入文件路径'));
            } else {
              this._stats = stats;
              resolve(stats);
            }
          }
        });
      });
    }
  }

  /**读取文本 */
  readline({ onLine, onClose }) {
    let lineNumber = 0;

    return new Promise((resolve) => {
      let input = fs.createReadStream(this.FILE);
      let rl = readline.createInterface({
        input,
      });

      rl.on('line', (line) => {
        onLine(line, ++lineNumber, false);
      });

      rl.on('close', () => {
        onLine('', ++lineNumber, true); // 手动调用, 因为.on('line')无法获取最后一个空行
        onClose?.(lineNumber);
        resolve(lineNumber);
      });
    });
  }

  /**重命名文件/剪切文件/复制文件 */
  rename(target, isCopy) {
    let sourceParse = path.parse(this.FILE);
    let sourceDir = sourceParse.ext ? sourceParse.dir : source;

    let targetParse = path.parse(target);
    let targetDir = targetParse.ext ? targetParse.dir : target;

    let src;
    let isAbsolute = path.isAbsolute(target);
    if (isAbsolute) {
      src = targetDir;
    } else {
      let relative = path.relative(this.DIR, sourceDir);
      src = path.join(this.DIR, targetDir, relative);
    }

    let targetPath = path.join(
      src,
      targetParse.ext ? targetParse.base : sourceParse.base,
    );

    return new Promise((resolve, reject) => {
      if (targetPath === this.FILE) return resolve(targetPath); // 如果路径一致则直接跳过

      makeDir(src, this.DIR).then(() => {
        let fun = isCopy ? fs.copyFile : fs.rename;
        fun(this.FILE, targetPath, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(targetPath);
          }
        });
      });
    });
  }

  /**备份文件 */
  backup() {
    /**备份目录名 */
    let target = path.join(this.DIR, BackupPath, `${Date.now()}`);
    return this.rename(target, true).then(() => {
      log('备份目录', target);
    });
  }

  /**获取备份目录 */
  getBackupDIR() {
    let dir = path.join(this.DIR, BackupPath);
    return (
      /* 输出所有备份目录 */
      readDir(dir).then((res) => {
        res.reverse();

        return res.map((item, index) => {
          let { name } = item;
          let date = new Date(+name);
          let time = date.toLocaleString();

          console.log(`${index}: ${time}`);

          return {
            path: path.join(dir, name),
            name,
            time,
          };
        });
      })
    );
  }

  /**还原文件 */
  restore() {
    let sourcePath;

    return new Promise((resolve) => {
      this.getBackupDIR().then((dirs) => {
        if (dirs.length) {
          console.log();
          question('请输入还原目录编号:')
            .then((answer) => {
              let dir = dirs[answer];
              if (dir) {
                sourcePath = dir.path;
                log('还原目录', sourcePath);
                return sourcePath;
              } else {
                console.log('无此目录编号');
                setTimeout(resolve);
                throw '';
              }
            })

            /* 获取备份文件 */
            .then((sourcePath) => {
              let src = path.join(sourcePath, this.FILE_BASE_NAME);
              return new FilePlus(src);
            })

            /* 还原文件 */
            .then((filePlus) => filePlus.rename(this.FILE, true))
            .then(resolve);
        } else {
          console.log('暂无还原目录');
          resolve();
        }
      });
    });
  }

  /**修改文件 */
  modify(fun, isBackup) {
    /**修改时间 */
    let time = Date.now();

    /**临时文件路径 */
    let tempFile = this.FILE + '.' + time;

    return new Promise((resolve, reject) => {
      let ws = fs.createWriteStream(tempFile);
      ws.on('close', resolve);
      ws.on('error', reject);

      fun(ws);
    })
      .then(async () => {
        if (isBackup) {
          let dir = path.join(this.DIR, BackupPath, `${time}`);
          return this.rename(dir); /* 移动到备份目录 */
        }
      })
      .then((dir) => {
        if (isBackup) log('备份目录', dir);

        /* 将临时文件改名为来源文件 */
        return fs.rename(tempFile, this.FILE, (err) => {
          if (err) Promise.reject(err);
        });
      });
  }
};

let run = (filePath = process.argv[2]) => {
  if (!filePath) return console.error('请输入文件路径');

  return new FilePlus(filePath)
    .then(async (e) => {
      await e.modify(async (ws) => {
        /* 写入临时文件 */
        let QA = {};

        let Cache = class {
          lineS = null;
          lineE = null;
          texts = [];
        };
        let cache;

        await e.readline({
          onLine: (line, lineNumber, isDone) => {
            cache ||= new Cache();

            if (line) {
              cache.lineS ??= lineNumber; // QA首行
              cache.texts.push(line);
            } else {
              cache.lineE ??= lineNumber - 1; // QA末行

              let Q = cache.texts[0];
              let A = cache.texts[cache.texts.length - 1];

              if (QA[Q]) {
                // console.log('重复', cache.lineS, '~', cache.lineE, question);
              } else {
                QA[Q] = A; // 保存题目与答案

                cache.texts.forEach((i) => ws.write(i + '\n')); // 写入临时文件
                if (!isDone) ws.write('\n'); // 换行
              }

              cache = null; // 清除缓存
            }
          },

          onClose() {
            ws.end(); // 写入完成后关闭流
          },
        });
      }, true);

      return e;
    })
    .then((e) => {
      console.log('输入 a: 再次执行');
      console.log('输入 r: 还原文件');
      question('请输入:').then((res) => {
        switch (res) {
          case 'a':
            run(filePath);
            break;

          case 'r':
            e.restore();
            break;

          default:
            break;
        }
      });
    });
};

run();
