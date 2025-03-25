/* 

// 相对路径
node get-file-name DIR
// 绝对路径
node get-file-name PATH

*/

const path = require('path');
const fs = require('fs');

/** 写入文件路径 */
const OUTPUT = 'names.txt'

const arg = process.argv.slice(2); // 获取参数
const dir = arg.join(' '); // 支持路径有空格

/* 获取路径 */
const getDir = (dir) => {
  // 判断是否为绝对路径
  if (path.isAbsolute(dir)) {
    return dir;
  } else {
    return path.join(__dirname, dir);
  }
};

const myPath = getDir(dir);
fs.readdir(myPath, (err, files) => {
  const myFile = path.join(__dirname, OUTPUT);
  fs.writeFileSync(myFile, ''); // 初始化文件

  files
    .filter((i) => {
      if (i === OUTPUT) return false;
      if (getDir(i) === __filename) return false;
      return true;
    }).forEach((i) => {
      fs.writeFileSync(myFile, i + '\r\n', { flag: 'a' }); // 写入数据
    });
});
