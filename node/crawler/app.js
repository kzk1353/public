let crawler = require('./crawler');

crawler('https://cnodejs.org', ($) => {
  let arr = $('#topic_list .cell');
  return arr.map((index, element) => {
    let text = $(element).find('.topic_title');
    let img = $(element)
      .find('.user_avatar')
      .children();

    return {
      path: `https://cnodejs.org${text.attr('href')}`,
      text: text.attr('title'),
      img: img.attr('src'),
    };
  });
});
