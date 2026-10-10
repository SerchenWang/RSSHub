import { load } from 'cheerio';

import type { DataItem, Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

import { absoluteUrl, browserHeaders, cleanText, fetchFullText } from './utils';

const baseUrl = 'https://news.sjtu.edu.cn';
const sections = {
    headlines: { name: '交大要闻', path: '/jdyw/index.html', selector: 'a.card[href]' },
    lectures: { name: '学术讲座', path: '/xsjz/index.html', selector: 'a.item[href]' },
} as const;

export const route: Route = {
    path: '/sjtu-news/:section?',
    name: '上海交通大学新闻学术网',
    url: 'news.sjtu.edu.cn',
    example: '/private-notices/sjtu-news/headlines',
    parameters: {
        section: {
            description: '栏目，默认为交大要闻',
            default: 'headlines',
            options: Object.entries(sections).map(([value, section]) => ({ label: section.name, value })),
        },
    },
    categories: ['university'],
    features: { requireConfig: false, requirePuppeteer: false, antiCrawler: false, supportBT: false, supportPodcast: false, supportScihub: false },
    radar: [
        { source: ['news.sjtu.edu.cn/jdyw/index.html'], target: '/sjtu-news/headlines' },
        { source: ['news.sjtu.edu.cn/xsjz/index.html'], target: '/sjtu-news/lectures' },
    ],
    maintainers: ['SerchenWang'],
    handler,
};

async function handler(ctx) {
    const sectionKey = ctx.req.param('section') || 'headlines';
    const section = sections[sectionKey] || sections.headlines;
    const link = new URL(section.path, baseUrl).href;
    const html = await ofetch<string>(link, { headers: browserHeaders });
    const $ = load(html);
    const items: DataItem[] = $(section.selector)
        .toArray()
        .map((element) => {
            const anchor = $(element);
            const href = anchor.attr('href');
            const linkDate = href?.match(/\/(20\d{6})\//)?.[1];
            const eventDate = cleanText(anchor.find('.time span').first().text()).match(/20\d{2}-\d{1,2}-\d{1,2}/)?.[0];
            const dateText = sectionKey === 'lectures' ? eventDate : linkDate;
            const description = sectionKey === 'lectures' ? cleanText(anchor.find('.address, .speaker, .tag').text()) : cleanText(anchor.find('.des').text());
            return {
                title: cleanText(anchor.find('.title, p.dot').first().text()),
                link: absoluteUrl(href, baseUrl),
                pubDate: dateText ? parseDate(dateText, dateText === linkDate ? 'YYYYMMDD' : 'YYYY-MM-DD') : undefined,
                description: description || undefined,
            };
        })
        .filter((item) => item.title && item.link);
    return {
        title: `上海交通大学新闻学术网 - ${section.name}`,
        link,
        item: await fetchFullText(items, ['.Article_content'], baseUrl),
    };
}
