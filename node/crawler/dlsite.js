let crawler = require('./utils/crawler');

let base = 'https://www.dlsite.com/maniax/info/sellend/=/month/';

let sta = [2011, 2];
let end = [2010, 4];

let format = (date) => {
  let y = date.getFullYear();
  let m = date.getMonth() + 1;
  return `${y}-${m.toString().padStart(2, '0')}`;
};

let urls = [];
let endUrl = base + format(new Date(end));
for (let i = 0; urls.at(-1) !== endUrl; i++) {
  let date = new Date(sta[0], sta[1] - 1 - i);
  let current = format(date);
  let url = base + current;
  urls.push(url);
}

crawler(urls, ($, current) => {
  let elements = [];

  let list = $('.work_update_history').find('tr');
  list.each((index, element) => {
    let date = $(element).find('.update_date').text();
    let id = $(element).find('.work_no').text();
    let name = $(element).find('.work_name').text();
    let circle = $(element).find('.update_circle').text();

    /* 避免出现多个表头 */
    if (index > 0) {
      elements.push([
        `<span>${date}</span>`,
        `<span>${id}</span>`,
        `<span>${name}</span>`,
        `<span>${circle}</span>`,
      ]);
    }
  });

  console.log(current, list.length);
  return elements;
});
