import { load } from 'cheerio';

import type { DataItem } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';

export const browserHeaders = {
    'User-Agent': 'Mozilla/5.0 (compatible; RSSHub/1.0; +https://docs.rsshub.app/)',
};

export const cleanText = (value?: string | null) => value?.replaceAll('\u{A0}', ' ').replaceAll(/\s+/g, ' ').trim() ?? '';
export const absoluteUrl = (value: string | undefined, baseUrl: string) => (value ? new URL(value, baseUrl).href : undefined);

export const extractContent = (html: string, selectors: string[], baseUrl: string) => {
    const $ = load(html);
    for (const selector of selectors) {
        const content = $(selector).first();
        if (!content.length) {
            continue;
        }
        content.find('script, style, noscript').remove();
        content.find('a[href]').each((_, element) => {
            const href = $(element).attr('href');
            if (href) {
                $(element).attr('href', new URL(href, baseUrl).href);
            }
        });
        content.find('img').each((_, element) => {
            const image = $(element);
            const src = image.attr('src') || image.attr('data-src') || image.attr('data-original');
            if (src) {
                image.attr('src', new URL(src, baseUrl).href);
            }
            image.removeAttr('data-src').removeAttr('data-original');
        });
        return content.html() || undefined;
    }
};

export const fetchFullText = (items: DataItem[], selectors: string[], baseUrl: string, limit = 20, allowedHosts?: string[]) =>
    Promise.all(
        items.slice(0, limit).map(async (item) => {
            if (!item.link) {
                return item;
            }
            if (allowedHosts && !allowedHosts.includes(new URL(item.link).hostname)) {
                return item;
            }
            try {
                return await cache.tryGet(`private-notices:fulltext:${item.link}`, async () => {
                    const html = await ofetch<string>(item.link as string, { headers: browserHeaders });
                    return { ...item, description: extractContent(html, selectors, baseUrl) || item.description };
                });
            } catch {
                return item;
            }
        })
    );
