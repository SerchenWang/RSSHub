import { load } from 'cheerio';

import type { DataItem, Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

import { absoluteUrl, browserHeaders, cleanText, fetchFullText } from './utils';

const link = 'https://www.shsmu.edu.cn/cbms/xyxw/xwdt.htm';
const baseUrl = 'https://www.shsmu.edu.cn/cbms/';

export const route: Route = {
    path: '/shsmu-basic-medical/news',
    name: '上海交通大学基础医学院新闻动态',
    url: 'www.shsmu.edu.cn',
    example: '/private-notices/shsmu-basic-medical/news',
    categories: ['university'],
    features: { requireConfig: false, requirePuppeteer: false, antiCrawler: false, supportBT: false, supportPodcast: false, supportScihub: false },
    radar: [{ source: ['www.shsmu.edu.cn/cbms/xyxw/xwdt.htm'], target: '/shsmu-basic-medical/news' }],
    maintainers: ['SerchenWang'],
    handler,
};

async function handler() {
    const html = await ofetch<string>(link, { headers: browserHeaders });
    const $ = load(html);
    const items: DataItem[] = $('span.link_14 > a[href]')
        .toArray()
        .map((element) => {
            const anchor = $(element);
            const dateText = cleanText(anchor.closest('td').find('span.link_13').text());
            return {
                title: anchor.attr('title') || cleanText(anchor.text()),
                link: absoluteUrl(anchor.attr('href'), link),
                pubDate: dateText ? parseDate(dateText, 'YYYY/MM/DD') : undefined,
            };
        })
        .filter((item) => item.title && item.link);
    return {
        title: '上海交通大学基础医学院 - 新闻动态',
        link,
        item: await fetchFullText(items, ['#vsb_content', '.v_news_content'], baseUrl),
    };
}
