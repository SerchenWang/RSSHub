import { load } from 'cheerio';

import type { DataItem, Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

import { absoluteUrl, browserHeaders, cleanText, fetchFullText } from './utils';

const baseUrl = 'https://www.shsmu.edu.cn/news/';
const sections = {
    jzlt: { name: '讲座论坛', path: 'jzlt.htm' },
    xykx: { name: '学院快讯', path: 'xykx.htm' },
    kydt: { name: '科研动态', path: 'kydt1.htm' },
    jjxy: { name: '菁菁校园', path: 'jjxy.htm' },
    mtjj: { name: '媒体聚焦', path: 'mtjj.htm' },
    tzgg: { name: '通知公告', path: 'tzgg.htm' },
    xyyw: { name: '学院要闻', path: 'xyyw.htm' },
} as const;

export const route: Route = {
    path: '/shsmu-news/:section?',
    name: '上海交通大学医学院新闻网',
    url: 'www.shsmu.edu.cn',
    example: '/private-notices/shsmu-news/tzgg',
    parameters: {
        section: {
            description: '栏目，默认为通知公告',
            default: 'tzgg',
            options: Object.entries(sections).map(([value, section]) => ({ label: section.name, value })),
        },
    },
    categories: ['university'],
    features: { requireConfig: false, requirePuppeteer: false, antiCrawler: false, supportBT: false, supportPodcast: false, supportScihub: false },
    radar: [
        { source: ['www.shsmu.edu.cn/news/jzlt.htm'], target: '/shsmu-news/jzlt' },
        { source: ['www.shsmu.edu.cn/news/xykx.htm'], target: '/shsmu-news/xykx' },
        { source: ['www.shsmu.edu.cn/news/kydt1.htm'], target: '/shsmu-news/kydt' },
        { source: ['www.shsmu.edu.cn/news/jjxy.htm'], target: '/shsmu-news/jjxy' },
        { source: ['www.shsmu.edu.cn/news/mtjj.htm'], target: '/shsmu-news/mtjj' },
        { source: ['www.shsmu.edu.cn/news/tzgg.htm'], target: '/shsmu-news/tzgg' },
        { source: ['www.shsmu.edu.cn/news/xyyw.htm'], target: '/shsmu-news/xyyw' },
    ],
    maintainers: ['SerchenWang'],
    handler,
};

async function handler(ctx) {
    const sectionKey = ctx.req.param('section') || 'tzgg';
    const section = sections[sectionKey] || sections.tzgg;
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
        title: `上海交通大学医学院新闻网 - ${section.name}`,
        link,
        item: await fetchFullText(items, ['#article_content', '#vsb_content', '.v_news_content'], baseUrl, 20, ['www.shsmu.edu.cn']),
    };
}
