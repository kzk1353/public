/* 广开答案文本去重, 以两个换行符为分界线 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';

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
let log = (title: keyof typeof colors, msg = '') => {
  let start = colors[title] || '';
  let end = '\x1B[0m';
  let _title = `${start}${title}${end}`;
  console.log(`${_title}: ${msg}`);
};

/**命令行 */
let question = (str = '') => {
  return new Promise<string>((resolve) => {
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

/**忽略文件 */
let isIgnore = (
  src: string,
  opt: {
    exclude?: string | Array<string>;
    include?: string | Array<string>;
  } = {},
) => {
  if (src === __filename) return true;

  let { exclude, include } = opt;

  if (exclude) {
    if (Array.isArray(exclude)) {
      return exclude.some((i) => src.match(i));
    } else {
      return src.match(exclude);
    }
  }

  if (include) {
    if (Array.isArray(include)) {
      return !include.some((i) => src.match(i));
    } else {
      return !src.match(include);
    }
  }
};

/**读取目录 */
let readDir = (
  dir: string,
  base = __dirname,
  opt?: Parameters<typeof isIgnore>[1],
) => {
  return new Promise<
    {
      dir: string;
      relative: string;
      name: string;
      src: string;
    }[]
  >((resolve, reject) => {
    fs.readdir(dir, (err, res) => {
      if (err) {
        reject(err);
      } else {
        let files = res.reduce<
          {
            dir: string;
            relative: string;
            name: string;
            src: string;
          }[]
        >((p, i) => {
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
let makeDir = (dir: string, base = __dirname) => {
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

let FilePlus = class {
  constructor(arg: string | string[] = process.argv.slice(2)) {
    if (arg) {
      this._getPath(arg);
    } else {
      console.error('请输入文件路径');
    }
  }

  DIR = '';
  FILE = '';
  FILE_BASE_NAME = '';
  FILE_EXT_NAME = '';

  /**获取路径 */
  _getPath(arg: string | string[]) {
    let _path = arg instanceof Array ? arg.join(' ') : arg; //支持路径有空格
    let cwd = process.cwd();

    // 判断是否为绝对路径
    if (path.isAbsolute(_path)) {
      this.FILE = _path;
    } else {
      this.FILE = path.join(cwd, _path);
    }

    this.FILE_BASE_NAME = path.basename(_path);
    this.FILE_EXT_NAME = path.extname(_path);
    this.DIR = path.dirname(this.FILE);
  }

  async create() {
    await this.getStat();
    return this;
  }

  _stats?: fs.Stats;

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
  readline(opt: {
    onLine: (line: string, lineNumber: number, isDone: boolean) => void;
    onClose?: (lineNumber: number) => void;
  }) {
    let lineNumber = 0;

    return new Promise((resolve) => {
      let input = fs.createReadStream(this.FILE);
      let rl = readline.createInterface({
        input,
      });

      rl.on('line', (line) => {
        opt.onLine(line, ++lineNumber, false);
      });

      rl.on('close', () => {
        opt.onLine('', ++lineNumber, true); // 手动调用, 因为.on('line')无法获取最后一个空行
        opt.onClose?.(lineNumber);
        resolve(lineNumber);
      });
    });
  }

  /**重命名文件/剪切文件/复制文件 */
  rename(target: string, isCopy?: boolean): Promise<string> {
    let sourceParse = path.parse(this.FILE);
    let sourceDir = sourceParse.ext ? sourceParse.dir : this.FILE;

    let targetParse = path.parse(target);
    let targetDir = targetParse.ext ? targetParse.dir : target;

    let src: string;
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
    let sourcePath: string;

    return new Promise<void>((resolve) => {
      this.getBackupDIR().then((dirs) => {
        if (dirs.length) {
          console.log();
          question('请输入还原目录编号:')
            .then((answer) => {
              let dir = dirs[Number(answer)];
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
              return new FilePlus(src).create();
            })

            /* 还原文件 */
            .then((filePlus) => filePlus.rename(this.FILE, true))
            .then(() => resolve());
        } else {
          console.log('暂无还原目录');
          resolve();
        }
      });
    });
  }

  /**修改文件 */
  modify(fun: (ws: fs.WriteStream) => void, isBackup: boolean) {
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

/** 判断答案是否一致 */
let isAnswerEqual = (answerS?: string, answerT?: string): boolean => {
  if (!answerS) return false;
  if (!answerT) return false;

  let reg = /答案[是：:]*([^。]+)/;

  let answerSMatch = answerS.match(reg);
  if (!answerSMatch) return false;

  let answerTMatch = answerT.match(reg);
  if (!answerTMatch) return false;

  return answerSMatch[1] === answerTMatch[1];
};

let run = (filePath?: string) => {
  new FilePlus(filePath)
    .create()
    .then(async (e) => {
      await e.modify(async (ws) => {
        /** 问题答案映射 */
        let QA: Record<string, string> = {};

        /** 问题答案缓存 */
        let CacheQA = class {
          lineS = NaN;
          lineE = NaN;
          texts: string[] = [];
        };
        let cacheQA: InstanceType<typeof CacheQA> | null = null;

        await e.readline({
          onLine: (line, lineNumber, isDone) => {
            cacheQA ||= new CacheQA();

            if (line) {
              isNaN(cacheQA.lineS) && (cacheQA.lineS = lineNumber); // QA首行
              cacheQA.texts.push(line);
            } else {
              isNaN(cacheQA.lineE) && (cacheQA.lineE = lineNumber - 1); // QA末行

              /* 只有存在QA时才触发, 避免QA内异常换行问题 */
              if (cacheQA.texts.length > 2) {
                let Q = cacheQA.texts[0].replaceAll(' ', '');
                let A = cacheQA.texts[cacheQA.texts.length - 1].replaceAll(
                  ' ',
                  '',
                );

                // 当问题的答案不存在时
                if (!isAnswerEqual(QA[Q], A)) {
                  // 如果问题存在但答案不相同
                  if (QA[Q]) {
                    console.log('重复', cacheQA.lineS, '~', cacheQA.lineE, Q);
                  } else {
                    QA[Q] = A; // 保存题目与答案
                  }

                  cacheQA.texts.forEach((i) => ws.write(i + '\n')); // 写入临时文件
                  if (!isDone) ws.write('\n'); // 换行
                }
              }

              cacheQA = null; // 清除缓存
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
