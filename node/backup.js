let fs = require('fs');
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

/**获取路径 */
let getDir = () => {
  /* 是否有路径参数 */
  let args = process.argv.slice(2);
  if (args.length) {
    let str = args.join(' '); //支持路径有空格

    // 判断是否为绝对路径
    if (path.isAbsolute(str)) {
      return str;
    } else {
      return path.join(__dirname, str);
    }
  } else {
    return __dirname;
  }
};

/**当前目录名 */
let DIR = getDir();

/**创建目录 */
let makeDir = (dir) => {
  return new Promise((resolve) => {
    let isAbsolute = path.isAbsolute(dir);
    let src = isAbsolute ? dir : path.join(DIR, dir);
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

/**读取目录 */
let readDir = (dir, opt) => {
  return new Promise((resolve, reject) => {
    fs.readdir(dir, (err, res) => {
      if (err) {
        reject(err);
      } else {
        let files = res.reduce((p, i) => {
          let file = {
            dir: DIR,
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

/**读取文件 */
let getStat = (file) => {
  return new Promise((resolve, reject) => {
    fs.stat(file.src, (err, stat) => {
      if (err) {
        reject(err);
      } else {
        resolve({
          ...file,
          stat,
        });
      }
    });
  });
};

/**获取所有文件 */
let getFiles = (dir, opt) => {
  return readDir(dir, opt)
    .then((files) => {
      return files.map((i) => {
        return getStat(i).then((file) => {
          let isFile = file.stat.isFile();
          if (isFile) {
            return file;
          } else {
            return getFiles(file.src, opt);
          }
        });
      });
    })
    .then((proms) => Promise.all(proms))
    .then((res) => res.flat(Infinity));
};

/**复制文件 */
let copy = (source, target) => {
  return new Promise((resolve, reject) => {
    let sourceParse = path.parse(source);
    let sourceRelative = path.relative(DIR, sourceParse.dir);
    let src = path.join(target, sourceRelative);

    let targetPath = path.isAbsolute(target)
      ? path.join(src, sourceParse.base)
      : path.join(DIR, target);

    makeDir(src)
      .then(() => {
        fs.copyFile(source, targetPath, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(targetPath);
          }
        });
      })
      .catch(reject);
  });
};

/**备份文件 */
let backup = () => {
  /**备份目录名 */
  let target = path.join(DIR, BackupPath, `${Date.now()}`);

  return (
    getFiles(DIR, {
      exclude: BackupPath,
    })
      /* 备份文件 */
      .then((files) => {
        return files.map((file) => {
          log('备份文件', file.src);
          return copy(file.src, target);
        });
      })

      /* 备份结束 */
      .then((proms) => Promise.all(proms))
      .then((res) => {
        let { length } = res;

        log('备份目录', target);
        log('备份总数', length);
      })
  );
};

/**获取备份目录 */
let getBackupDIR = () => {
  let dir = path.join(DIR, BackupPath);
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
};

/**还原文件 */
let restore = () => {
  let sourcePath;

  return new Promise((resolve) => {
    getBackupDIR().then((dirs) => {
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

          /* 获取选择目录的所有文件 */
          .then((sourcePath) => {
            return getFiles(sourcePath);
          })

          /* 还原文件 */
          .then((files) => {
            return files.map((file) => {
              let source = file.src;
              let target = path.relative(sourcePath, file.src);

              log('还原文件', source);
              return copy(source, target);
            });
          })

          /* 还原结束 */
          .then((proms) => Promise.all(proms))
          .then((res) => {
            let { length } = res;
            log('还原总数', length);
          })
          .then(resolve);
      } else {
        console.log('暂无还原目录');
        resolve();
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

let fun = () => {
  console.log('输入 r 为还原文件');
  console.log('输入其它为备份文件');

  question('请输入: ')
    .then((answer) => {
      switch (answer) {
        case 'restore':
        case 'r':
        case 'R':
          return restore();

        default:
          return backup();
      }
    })
    .then(() => {
      console.log();
      console.log();
      console.log();
      fun();
    });
};

fun();
