let crawler = require('./utils/crawler');

let base = 'https://www.dlsite.com/maniax/info/sellend/=/month/';

let start = ((date) => {
  let y = date.getUTCFullYear();
  let m = date.getUTCMonth() + 1;
  return `${y}-${m.toString().padStart(2, '0')}`;
})(new Date(2008, 1));

let end = ((date) => {
  let lastMonth = new Date(date.getFullYear(), date.getMonth());
  let y = lastMonth.getFullYear();
  let m = lastMonth.getMonth();
  return `${y}-${m.toString().padStart(2, '0')}`;
})(new Date());

let url = base + start;

crawler(url, ($) => {
  let elements = [
    [
      '<span>日付</span>',
      '<span>作品ID</span>',
      '<span>作品名</span>',
      '<span>サークル名</span>',
    ],
  ];

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

  return elements;
});
