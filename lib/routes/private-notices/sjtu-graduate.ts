import { load } from 'cheerio';

import type { DataItem, Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

import { absoluteUrl, browserHeaders, cleanText, fetchFullText } from './utils';

const baseUrl = 'https://gs.sjtu.edu.cn';
const link = `${baseUrl}/news/xs`;

export const route: Route = {
    path: '/sjtu-graduate/lectures',
    name: '上海交通大学研究生院学术活动',
    url: 'gs.sjtu.edu.cn',
    example: '/private-notices/sjtu-graduate/lectures',
    categories: ['university'],
    features: { requireConfig: false, requirePuppeteer: false, antiCrawler: false, supportBT: false, supportPodcast: false, supportScihub: false },
    radar: [{ source: ['gs.sjtu.edu.cn/news/xs'], target: '/sjtu-graduate/lectures' }],
    maintainers: ['SerchenWang'],
    handler,
};

async function handler() {
    const html = await ofetch<string>(link, { headers: browserHeaders });
    const $ = load(html);
    const items: DataItem[] = $('a.news-item[href]')
        .toArray()
        .map((element) => {
            const anchor = $(element);
            const image = absoluteUrl(anchor.find('img').attr('src'), baseUrl);
            const dateText = cleanText(anchor.find('.date').text());
            return {
                title: cleanText(anchor.find('.title').text()),
                link: absoluteUrl(anchor.attr('href'), baseUrl),
                pubDate: dateText ? parseDate(dateText, 'YYYY-MM-DD') : undefined,
                image,
                description: image ? `<img src="${image}">` : undefined,
            };
        })
        .filter((item) => item.title && item.link);
    return {
        title: '上海交通大学研究生院 - 学术活动',
        link,
        item: await fetchFullText(items, ['.mce-content-body'], baseUrl),
    };
}
