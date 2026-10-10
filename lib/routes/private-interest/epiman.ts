import { load } from 'cheerio';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate, parseRelativeDate } from '@/utils/parse-date';

const baseUrl = 'https://www.epiman.cn';
const browserHeaders = { 'User-Agent': 'Mozilla/5.0 (compatible; RSSHub/1.0; +https://docs.rsshub.app/)' };
const views = { new: '最新回复', newthread: '最新发表' } as const;
const cleanText = (value?: string | null) => value?.replaceAll('\u{A0}', ' ').replaceAll(/\s+/g, ' ').trim() ?? '';

export const route: Route = {
    path: '/epiman/:view?',
    name: '公卫人论坛',
    url: 'www.epiman.cn',
    example: '/private-interest/epiman/newthread',
    parameters: {
        view: {
            description: '列表类型，默认为最新发表',
            default: 'newthread',
            options: Object.entries(views).map(([value, label]) => ({ label, value })),
        },
    },
    categories: ['bbs'],
    features: { requireConfig: false, requirePuppeteer: false, antiCrawler: false, supportBT: false, supportPodcast: false, supportScihub: false },
    radar: [{ source: ['www.epiman.cn/forum.php'], target: '/epiman/newthread' }],
    maintainers: ['SerchenWang'],
    handler,
};

async function handler(ctx) {
    const requestedView = ctx.req.param('view') || 'newthread';
    const view: keyof typeof views = Object.hasOwn(views, requestedView) ? (requestedView as keyof typeof views) : 'newthread';
    const link = `${baseUrl}/forum.php?mod=guide&view=${view}`;
    const html = await ofetch<string>(link, { headers: browserHeaders });
    const $ = load(html);
    const list: DataItem[] = $('tbody[id^="normalthread_"]')
        .toArray()
        .map((element) => {
            const row = $(element);
            const anchor = row.find('a.xst').first();
            const metadataCells = row.find('td.by');
            const authorCell = metadataCells.eq(1);
            const dateCell = view === 'new' ? metadataCells.last() : authorCell;
            const dateElement = dateCell.find('[title]').last();
            const dateText = dateElement.attr('title') || cleanText(dateCell.find('em').text());
            let pubDate;
            if (/^20\d{2}-\d{1,2}-\d{1,2}(?:\s+\d{1,2}:\d{2})?$/.test(dateText)) {
                pubDate = parseDate(dateText, dateText.includes(':') ? 'YYYY-M-D HH:mm' : 'YYYY-M-D');
            } else if (dateText) {
                pubDate = parseRelativeDate(dateText);
            }
            return {
                title: cleanText(anchor.text()),
                link: anchor.attr('href') ? new URL(anchor.attr('href') as string, baseUrl).href : undefined,
                author: cleanText(authorCell.find('cite a').text()) || undefined,
                category: [cleanText(metadataCells.first().find('a').text())].filter(Boolean),
                pubDate,
            };
        })
        .filter((item) => item.title && item.link)
        .slice(0, 30);

    const items = await Promise.all(
        list.map(async (item) => {
            try {
                return await cache.tryGet(`private-interest:epiman:${item.link}`, async () => {
                    const detailHtml = await ofetch<string>(item.link as string, { headers: browserHeaders });
                    const detail$ = load(detailHtml);
                    const content = detail$('td[id^="postmessage_"]').first();
                    content.find('script, style, noscript').remove();
                    content.find('img').each((_, imageElement) => {
                        const image = detail$(imageElement);
                        const src = image.attr('src') || image.attr('file') || image.attr('zoomfile');
                        if (src) {
                            image.attr('src', new URL(src, baseUrl).href);
                        }
                    });
                    return { ...item, description: content.html() || item.description };
                });
            } catch {
                return item;
            }
        })
    );
    return { title: `公卫人论坛 - ${views[view]}`, link, item: items };
}
