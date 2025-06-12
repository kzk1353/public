let crawler = require('./utils/crawler');

crawler('https://cnodejs.org', ($) => {
  let elements = [];

  let arr = $('#topic_list .cell');
  arr.each((index, element) => {
    let text = $(element).find('.topic_title');
    let img = $(element).find('.user_avatar').children();

    elements.push([
      `<a href="https://cnodejs.org${text.attr('href')}">链接</a>`,
      `<span>${text.attr('title')}</span>`,
      `<img src="${img.attr('src')}" />`,
    ]);
  });

  return elements;
});
