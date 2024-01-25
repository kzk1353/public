/* 

// 相对路径
node get-file-name DIR
// 绝对路径
node get-file-name PATH

*/

const path = require('path');
const fs = require('fs');

let arg = process.argv.slice(2); //获取参数
let dir = arg.join(' '); //支持路径有空格

/* 获取路径 */
let getDir = (dir) => {
  // 判断是否为绝对路径
  if (path.isAbsolute(dir)) {
    return dir;
  } else {
    return path.join(__dirname, dir);
  }
};

let myPath = getDir(dir);
fs.readdir(myPath, (err, files) => {
  let myFile = path.join(__dirname, 'names.txt'); //定义写入文件路径
  files.forEach((i) => {
    fs.writeFileSync(myFile, i + '\r\n', { flag: 'a' }); //写入数据
  });
});
