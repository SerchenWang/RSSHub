import { load } from 'cheerio';

import type { DataItem, Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

import { absoluteUrl, browserHeaders, cleanText, fetchFullText } from './utils';

const baseUrl = 'https://www.shsmu.edu.cn/yjsy/';
const sections = {
    notices: { name: '通知公告', path: 'index/tzgg1.htm' },
    training: { name: '培养工作', path: 'pygz1.htm' },
    international: { name: '国际交流', path: 'gjjl1.htm' },
} as const;

export const route: Route = {
    path: '/shsmu-graduate/:section?',
    name: '上海交通大学医学院研究生院',
    url: 'www.shsmu.edu.cn',
    example: '/private-notices/shsmu-graduate/notices',
    parameters: {
        section: {
            description: '栏目，默认为通知公告',
            default: 'notices',
            options: Object.entries(sections).map(([value, section]) => ({ label: section.name, value })),
        },
    },
    categories: ['university'],
    features: { requireConfig: false, requirePuppeteer: false, antiCrawler: false, supportBT: false, supportPodcast: false, supportScihub: false },
    radar: [
        { source: ['www.shsmu.edu.cn/yjsy/index/tzgg1.htm'], target: '/shsmu-graduate/notices' },
        { source: ['www.shsmu.edu.cn/yjsy/pygz1.htm'], target: '/shsmu-graduate/training' },
        { source: ['www.shsmu.edu.cn/yjsy/gjjl1.htm'], target: '/shsmu-graduate/international' },
    ],
    maintainers: ['SerchenWang'],
    handler,
};

async function handler(ctx) {
    const sectionKey = ctx.req.param('section') || 'notices';
    const section = sections[sectionKey] || sections.notices;
    const link = new URL(section.path, baseUrl).href;
    const html = await ofetch<string>(link, { headers: browserHeaders });
    const $ = load(html);
    const items: DataItem[] = $('span.link_16 > a[href]')
        .toArray()
        .map((element) => {
            const anchor = $(element);
            const dateText = cleanText(anchor.closest('td').find('span.link_16').last().text()).replaceAll(/[()[\]]/g, '');
            return {
                title: anchor.attr('title') || cleanText(anchor.text()),
                link: absoluteUrl(anchor.attr('href'), link),
                pubDate: /^\d{2}-\d{2}-\d{2}$/.test(dateText) ? parseDate(`20${dateText}`, 'YYYY-MM-DD') : undefined,
            };
        })
        .filter((item) => item.title && item.link);
    return {
        title: `上海交通大学医学院研究生院 - ${section.name}`,
        link,
        item: await fetchFullText(items, ['#vsb_content', '.v_news_content'], baseUrl),
    };
}
