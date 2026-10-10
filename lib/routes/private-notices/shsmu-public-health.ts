import { load } from 'cheerio';

import type { DataItem, Route } from '@/types';
import ofetch from '@/utils/ofetch';

import { absoluteUrl, browserHeaders, cleanText, fetchFullText } from './utils';

const baseUrl = 'https://www.shsmu.edu.cn/sph/';
const link = new URL('jzlt1.htm', baseUrl).href;

export const route: Route = {
    path: '/shsmu-public-health/lectures',
    name: '上海交通大学公共卫生学院讲座论坛',
    url: 'www.shsmu.edu.cn',
    example: '/private-notices/shsmu-public-health/lectures',
    categories: ['university'],
    features: { requireConfig: false, requirePuppeteer: false, antiCrawler: false, supportBT: false, supportPodcast: false, supportScihub: false },
    radar: [{ source: ['www.shsmu.edu.cn/sph/jzlt1.htm'], target: '/shsmu-public-health/lectures' }],
    maintainers: ['SerchenWang'],
    handler,
};

async function handler() {
    const html = await ofetch<string>(link, { headers: browserHeaders });
    const $ = load(html);
    const items: DataItem[] = $('a.hd[href]')
        .toArray()
        .map((element) => {
            const anchor = $(element);
            const title = cleanText(anchor.find('h3').text());
            const metadata = cleanText(anchor.find('.txt').text()).replace(title, '').trim();
            return { title, link: absoluteUrl(anchor.attr('href'), baseUrl), description: metadata || undefined };
        })
        .filter((item) => item.title && item.link);
    return {
        title: '上海交通大学公共卫生学院 - 讲座论坛',
        link,
        item: await fetchFullText(items, ['#vsb_content_4', '.v_news_content'], baseUrl),
    };
}
