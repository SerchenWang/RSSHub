import { load } from 'cheerio';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

import { absoluteUrl, browserHeaders, cleanText, extractContent } from './utils';

const baseUrl = 'https://life.sjtu.edu.cn';
const link = `${baseUrl}/Data/List/bg`;

export const route: Route = {
    path: '/sjtu-life-science/lectures',
    name: '上海交通大学生命科学技术学院学术报告',
    url: 'life.sjtu.edu.cn',
    example: '/private-notices/sjtu-life-science/lectures',
    categories: ['university'],
    features: { requireConfig: false, requirePuppeteer: false, antiCrawler: false, supportBT: false, supportPodcast: false, supportScihub: false },
    radar: [{ source: ['life.sjtu.edu.cn/Data/List/bg'], target: '/sjtu-life-science/lectures' }],
    maintainers: ['SerchenWang'],
    handler,
};

async function handler() {
    const html = await ofetch<string>(link, { headers: browserHeaders });
    const $ = load(html);
    const list: DataItem[] = $('ul.data-list2 > li > a[href]')
        .toArray()
        .map((element) => {
            const anchor = $(element);
            const parts = anchor
                .text()
                .split(/\r?\n/)
                .map((part) => cleanText(part))
                .filter(Boolean);
            return {
                title: parts.at(-1) || cleanText(anchor.text()),
                link: absoluteUrl(anchor.attr('href'), baseUrl),
                description: parts.length > 1 ? `<p>${parts.slice(0, -1).join('<br>')}</p>` : undefined,
            };
        })
        .filter((item) => item.title && item.link)
        .slice(0, 20);

    const items = await Promise.all(
        list.map(async (item) => {
            try {
                return await cache.tryGet(`private-notices:life:${item.link}`, async () => {
                    const detailHtml = await ofetch<string>(item.link as string, { headers: browserHeaders });
                    const detail$ = load(detailHtml);
                    const pageText = cleanText(detail$('.nycon').text());
                    const dateText = pageText.match(/发布时间\s*[：:]\s*(\d{4}-\d{1,2}-\d{1,2})/)?.[1];
                    return {
                        ...item,
                        pubDate: dateText ? parseDate(dateText, 'YYYY-MM-DD') : undefined,
                        description: extractContent(detailHtml, ['.view-cnt'], baseUrl) || item.description,
                    };
                });
            } catch {
                return item;
            }
        })
    );

    return { title: '上海交通大学生命科学技术学院 - 学术报告', link, item: items };
}
